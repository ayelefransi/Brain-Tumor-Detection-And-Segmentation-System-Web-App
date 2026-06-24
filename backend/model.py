import torch
import torch.nn as nn
import torch.nn.functional as F

class ConvBlock3D(nn.Module):
    """Residual 3D convolution block with instance normalisation."""

    def __init__(self, in_ch: int, out_ch: int, stride: int = 1):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv3d(in_ch, out_ch, 3, stride=stride, padding=1, bias=False),
            nn.InstanceNorm3d(out_ch, affine=True),
            nn.LeakyReLU(0.01, inplace=True),
            nn.Conv3d(out_ch, out_ch, 3, padding=1, bias=False),
            nn.InstanceNorm3d(out_ch, affine=True),
            nn.LeakyReLU(0.01, inplace=True),
        )
        # Residual projection if channels change
        self.skip = nn.Sequential(
            nn.Conv3d(in_ch, out_ch, 1, stride=stride, bias=False),
            nn.InstanceNorm3d(out_ch, affine=True),
        ) if (in_ch != out_ch or stride != 1) else nn.Identity()

    def forward(self, x):
        return self.conv(x) + self.skip(x)


class AttentionGate3D(nn.Module):
    """
    Soft attention gate for skip connections (Oktay et al., 2018).
    Focuses decoder on relevant spatial regions.
    """

    def __init__(self, f_g: int, f_l: int, f_int: int):
        super().__init__()
        self.W_g = nn.Sequential(
            nn.Conv3d(f_g, f_int, 1, bias=True),
            nn.InstanceNorm3d(f_int, affine=True),
        )
        self.W_x = nn.Sequential(
            nn.Conv3d(f_l, f_int, 1, bias=True),
            nn.InstanceNorm3d(f_int, affine=True),
        )
        self.psi = nn.Sequential(
            nn.Conv3d(f_int, 1, 1, bias=True),
            nn.InstanceNorm3d(1, affine=True),
            nn.Sigmoid(),
        )
        self.relu = nn.LeakyReLU(0.01, inplace=True)

    def forward(self, g, x):
        # g: gating signal from decoder  (lower res)
        # x: skip connection from encoder (higher res)
        g_up = F.interpolate(self.W_g(g), size=x.shape[2:],
                              mode="trilinear", align_corners=False)
        attn = self.relu(g_up + self.W_x(x))
        attn = self.psi(attn)
        return x * attn


class BraTSNet(nn.Module):
    """
    3D Attention U-Net + Classification Head for BraTS segmentation.

    Inputs  : (B, 4, H, W, D)  — 4 MRI modalities
    Outputs :
        seg_out   (B, 3, H, W, D)  — WT / TC / ET probability maps
        cls_out   (B, 3)           — tumor class logits
                                     (no tumor / LGG / HGG)
        deep_sup  list of tensors  — deep supervision outputs
    """

    def __init__(self,
                 in_channels:   int = 4,
                 seg_classes:   int = 3,
                 cls_classes:   int = 3,
                 base_features: int = 16):   # 16 saves ~40% VRAM vs 32
        super().__init__()

        f = base_features
        # ── Encoder ──────────────────────────────────────────────────────
        self.enc1 = ConvBlock3D(in_channels, f)         # (B,16, H,  W,  D )
        self.enc2 = ConvBlock3D(f,    f*2,  stride=2)   # (B,32, H/2,W/2,D/2)
        self.enc3 = ConvBlock3D(f*2,  f*4,  stride=2)   # (B,64, H/4,W/4,D/4)
        self.enc4 = ConvBlock3D(f*4,  f*8,  stride=2)   # (B,128,H/8,W/8,D/8)

        # ── Bottleneck ───────────────────────────────────────────────────
        self.bottleneck = ConvBlock3D(f*8, f*16)        # (B,256, ...)

        # ── Classification head (from bottleneck) ─────────────────────
        self.cls_head = nn.Sequential(
            nn.AdaptiveAvgPool3d(1),
            nn.Flatten(),
            nn.Linear(f*16, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.4),
            nn.Linear(128, cls_classes),
        )

        # ── Decoder with attention gates ─────────────────────────────────
        self.attn4 = AttentionGate3D(f_g=f*16, f_l=f*8,  f_int=f*4)
        self.up4   = ConvBlock3D(f*16 + f*8,  f*8)

        self.attn3 = AttentionGate3D(f_g=f*8,  f_l=f*4,  f_int=f*2)
        self.up3   = ConvBlock3D(f*8  + f*4,   f*4)

        self.attn2 = AttentionGate3D(f_g=f*4,  f_l=f*2,  f_int=f)
        self.up2   = ConvBlock3D(f*4  + f*2,   f*2)

        self.attn1 = AttentionGate3D(f_g=f*2,  f_l=f,    f_int=f//2)
        self.up1   = ConvBlock3D(f*2  + f,     f)

        # ── Deep supervision heads ────────────────────────────────────────
        self.ds4  = nn.Conv3d(f*8, seg_classes, 1)
        self.ds3  = nn.Conv3d(f*4, seg_classes, 1)
        self.out  = nn.Conv3d(f,   seg_classes, 1)

    # ── Upsampling helper ──────────────────────────────────────────────────
    @staticmethod
    def _up(x, target):
        return F.interpolate(x, size=target.shape[2:],
                             mode="trilinear", align_corners=False)

    def forward(self, x):
        # Encoder
        e1 = self.enc1(x)
        e2 = self.enc2(e1)
        e3 = self.enc3(e2)
        e4 = self.enc4(e3)

        # Bottleneck
        b  = self.bottleneck(e4)

        # Classification
        cls_out = self.cls_head(b)

        # Decoder
        d4 = self._up(b, e4)
        d4 = self.up4(torch.cat([d4, self.attn4(b, e4)], dim=1))

        d3 = self._up(d4, e3)
        d3 = self.up3(torch.cat([d3, self.attn3(d4, e3)], dim=1))

        d2 = self._up(d3, e2)
        d2 = self.up2(torch.cat([d2, self.attn2(d3, e2)], dim=1))

        d1 = self._up(d2, e1)
        d1 = self.up1(torch.cat([d1, self.attn1(d2, e1)], dim=1))

        # Deep supervision
        seg_out  = self.out(d1)
        ds4_out  = F.interpolate(self.ds4(d4), size=seg_out.shape[2:],
                                  mode="trilinear", align_corners=False)
        ds3_out  = F.interpolate(self.ds3(d3), size=seg_out.shape[2:],
                                  mode="trilinear", align_corners=False)

        return seg_out, cls_out, [ds4_out, ds3_out]
