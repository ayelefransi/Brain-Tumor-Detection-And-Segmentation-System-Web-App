export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tumorType,
      confidence,
      volumeCm3,
      regionVolumes,
      classProbs,
      diceScores,
      aiSummary,
      radiologistNotes,
      axialImage,
      coronalImage,
      sagittalImage,
    } = body;

    // Dynamic import jspdf (server-side)
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    // ─── Header ───
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 36, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(241, 245, 249);
    doc.text("NeuroScan AI", margin, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("Brain Tumor Detection & Segmentation Report", margin, 28);

    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated: ${new Date().toISOString().split("T")[0]}`,
      pageWidth - margin,
      28,
      { align: "right" }
    );

    y = 46;

    // ─── Patient Info Bar ───
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 14, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 14, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Patient: Scan Patient`, margin + 4, y + 6);
    doc.text(`Date: ${new Date().toISOString().split("T")[0]}`, margin + 60, y + 6);
    doc.text(`Modality: MRI (T1, T1ce, T2, FLAIR)`, margin + 110, y + 6);
    doc.text(`System: BraTSNet 3D Attention U-Net`, margin + 4, y + 11);
    y += 20;

    // ─── Diagnosis Section ───
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("AI Diagnosis", margin, y);
    y += 8;

    doc.setFillColor(239, 246, 255);
    doc.rect(margin, y, contentWidth, 20, "F");
    doc.setDrawColor(191, 219, 254);
    doc.rect(margin, y, contentWidth, 20, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.text(tumorType || "Unknown", margin + 4, y + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Confidence: ${((confidence || 0) * 100).toFixed(1)}%`,
      margin + 4,
      y + 16
    );

    if (classProbs) {
      doc.text(
        `No Tumor: ${(classProbs.no_tumor * 100).toFixed(1)}%  |  LGG: ${(classProbs.lgg * 100).toFixed(1)}%  |  HGG: ${(classProbs.hgg * 100).toFixed(1)}%`,
        pageWidth - margin - 4,
        y + 16,
        { align: "right" }
      );
    }
    y += 28;

    // ─── Volumetric Metrics Table ───
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Volumetric Analysis", margin, y);
    y += 8;

    const metrics = [
      ["Total Tumor Volume", `${(volumeCm3 || 0).toFixed(2)} cm³`],
      ["Enhancing Tumor", `${regionVolumes?.enhancing_tumor ?? "N/A"} cm³`],
      ["Necrotic Core", `${regionVolumes?.necrotic_core ?? "N/A"} cm³`],
      ["Peritumoral Edema", `${regionVolumes?.peritumoral_edema ?? "N/A"} cm³`],
      ["Whole Tumor", `${regionVolumes?.whole_tumor ?? "N/A"} cm³`],
      ["Tumor Core", `${regionVolumes?.tumor_core ?? "N/A"} cm³`],
    ];

    // Table header
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("METRIC", margin + 4, y + 5.5);
    doc.text("VALUE", pageWidth - margin - 4, y + 5.5, { align: "right" });
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);

    for (const [label, value] of metrics) {
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, pageWidth - margin, y);
      doc.text(label, margin + 4, y + 5.5);
      doc.setFont("helvetica", "bold");
      doc.text(value, pageWidth - margin - 4, y + 5.5, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 8;
    }
    y += 6;

    // ─── Segmentation Confidence ───
    if (diceScores) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("Segmentation Confidence", margin, y);
      y += 8;

      const diceMetrics = [
        ["Whole Tumor (WT)", String(diceScores.wt_dice)],
        ["Tumor Core (TC)", String(diceScores.tc_dice)],
        ["Enhancing Tumor (ET)", String(diceScores.et_dice)],
      ];

      for (const [label, value] of diceMetrics) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(label, margin + 4, y + 5);
        doc.setFont("helvetica", "bold");
        doc.text(value, pageWidth - margin - 4, y + 5, { align: "right" });
        y += 8;
      }
      y += 6;
    }

    // ─── MRI Thumbnails ───
    const images = [
      { data: axialImage, label: "Axial" },
      { data: coronalImage, label: "Coronal" },
      { data: sagittalImage, label: "Sagittal" },
    ].filter((img) => img.data);

    if (images.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("MRI Slice Views", margin, y);
      y += 6;

      const imgSize = 40;
      const gap = 8;
      let x = margin;

      for (const img of images) {
        try {
          doc.addImage(img.data, "JPEG", x, y, imgSize, imgSize);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(img.label, x + imgSize / 2, y + imgSize + 4, { align: "center" });
        } catch {
          // Skip if image fails
        }
        x += imgSize + gap;
      }
      y += imgSize + 12;
    }

    // ─── AI Summary ───
    if (aiSummary) {
      // Check if we need a new page
      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("AI-Generated Clinical Summary", margin, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      const summaryLines = doc.splitTextToSize(aiSummary, contentWidth - 8);
      doc.text(summaryLines, margin + 4, y);
      y += summaryLines.length * 5 + 6;
    }

    // ─── Radiologist Notes ───
    if (radiologistNotes) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("Radiologist Notes", margin, y);
      y += 8;

      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      const noteLines = doc.splitTextToSize(radiologistNotes, contentWidth - 8);
      doc.text(noteLines, margin + 4, y);
      y += noteLines.length * 5 + 6;
    }

    // ─── Disclaimer Footer ───
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    const disclaimer =
      "DISCLAIMER: This report was generated by NeuroScan AI, an AI-assisted analysis tool. All findings are preliminary and must be verified by a qualified radiologist or neurosurgeon before any clinical decisions are made. This tool is not a substitute for professional medical judgment.";
    const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth);
    doc.text(disclaimerLines, margin, y);

    // Output
    const pdfArrayBuffer = doc.output("arraybuffer");
    return new NextResponse(Buffer.from(pdfArrayBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="NeuroScan_Report_${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: error.message || "PDF generation failed" },
      { status: 500 }
    );
  }
}
