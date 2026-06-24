"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, Layers, ShieldAlert, FileText, CheckCircle2, Activity, BrainCircuit, User, LayoutDashboard, Search, Database } from "lucide-react";
import dynamic from 'next/dynamic';

const Brain3D = dynamic(() => import('@/components/Brain3D'), { ssr: false });

export default function Home() {
  const [activeTab, setActiveTab] = useState("mri"); // mri, report, training
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProgress(10);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Animate progress bar during inference
      const progressInterval = setInterval(() => {
        setProgress(p => (p < 90 ? p + 5 : p));
      }, 1000);

      // Step 1: Call FastAPI DIRECTLY from the browser (bypasses Node.js 5-min timeout)
      const fastApiUrl = "http://127.0.0.1:8000";
      const backendRes = await fetch(`${fastApiUrl}/api/predict`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(95);

      if (!backendRes.ok) {
        throw new Error("Backend inference failed");
      }

      const backendData = await backendRes.json();
      const metrics = backendData.metrics;

      // Step 2: Save to DB via lightweight Next.js API (no timeout risk, tiny payload)
      try {
        await fetch("/api/save-prediction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: "PT-88392",
            filename: backendData.filename,
            metrics: {
              volume_cm3: metrics.volume_cm3,
              confidence: metrics.confidence,
              type: metrics.type,
              metrics: metrics.metrics,
            }
          }),
        });
      } catch (dbErr) {
        console.warn("DB save failed (non-blocking):", dbErr);
      }

      setProgress(100);

      // Map backend response to the shape the UI expects
      setPredictionData({
        volumeCm3: metrics.volume_cm3,
        confidence: metrics.confidence,
        tumorType: metrics.type,
        classProbs: metrics.class_probabilities,
        regionVolumes: metrics.region_volumes,
        diceScores: metrics.metrics,
        images: metrics.images,
      });

      setTimeout(() => {
        setIsUploading(false);
      }, 800);
    } catch (error) {
      console.error(error);
      setIsUploading(false);
      alert("Error during prediction. Make sure the FastAPI backend is running on port 8000.");
    }
  };

  return (
    <div className="app">
      {/* Background Cyber Grid */}
      <div className="cyber-grid"></div>

      {/* TOPBAR */}
      <header className="topbar">
        <div className="logo">
          <div className="logo-icon">NS</div>
          NeuroScan <span>AI</span>
        </div>
        <div className="topbar-nav">
          <button
            className={`nav-btn ${activeTab === "mri" ? "active" : ""}`}
            onClick={() => setActiveTab("mri")}
          >
            <LayoutDashboard size={14} className="inline mr-2" />
            Viewer
          </button>
          <button
            className={`nav-btn ${activeTab === "report" ? "active" : ""}`}
            onClick={() => setActiveTab("report")}
          >
            <FileText size={14} className="inline mr-2" />
            Report
          </button>
          <button
            className={`nav-btn ${activeTab === "training" ? "active" : ""}`}
            onClick={() => setActiveTab("training")}
          >
            <BrainCircuit size={14} className="inline mr-2" />
            Model
          </button>
        </div>
        <div className="topbar-right">
          <div className="status-dot"></div>
          <div className="status-text">SYSTEM SECURE</div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="main">
        {/* SIDEBAR */}
        <aside className="sidebar scroll-x">
          <div className="sidebar-section">
            <div className="sidebar-label">Recent Patients</div>

            {/* Patient Card 1 */}
            <div className="patient-card active">
              <div className="patient-header">
                <div className="patient-avatar">
                  <User size={14} />
                </div>
                <div>
                  <div className="patient-name">Elias Jenkins</div>
                  <div className="patient-id">ID: PT-88392</div>
                </div>
              </div>
              <div className="patient-meta">
                {predictionData ? (
                  <>
                    <span className={`tag ${predictionData.tumorType.includes('HGG') ? 'tag-hgg' : predictionData.tumorType.includes('LGG') ? 'tag-lgg' : 'tag-clear'}`}>
                      {predictionData.tumorType.includes('No') ? 'Clear' : predictionData.tumorType.includes('LGG') ? 'LGG Detected' : 'HGG Detected'}
                    </span>
                    <span className="tag">{predictionData.volumeCm3.toFixed(1)} cm³</span>
                  </>
                ) : (
                  <span className="tag tag-pending">Awaiting Scan</span>
                )}
              </div>
            </div>

            {/* Patient Card 2 */}
            <div className="patient-card">
              <div className="patient-header">
                <div className="patient-avatar">
                  <User size={14} />
                </div>
                <div>
                  <div className="patient-name">Maria Rodriguez</div>
                  <div className="patient-id">ID: PT-88391</div>
                </div>
              </div>
              <div className="patient-meta">
                <span className="tag tag-clear">Clear</span>
              </div>
            </div>
          </div>

          <div className="sidebar-divider"></div>

          <div className="control-panel">
            <div className="sidebar-label">Inference Controls</div>
            <div className="ctrl-item">
              <div className="ctrl-label">Confidence Threshold <span>{predictionData ? (predictionData.confidence * 100).toFixed(0) : 0}%</span></div>
              <input type="range" min="50" max="99" value={predictionData ? Math.round(predictionData.confidence * 100) : 50} readOnly />
            </div>
            <div className="ctrl-item">
              <div className="toggle-row">
                <div className="ctrl-label" style={{ marginBottom: 0 }}>Enable 3D Render</div>
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <div className="toggle-slider"></div>
                </label>
              </div>
            </div>
            <div className="ctrl-item">
              <div className="toggle-row">
                <div className="ctrl-label" style={{ marginBottom: 0 }}>Auto-segmentation</div>
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <div className="toggle-slider"></div>
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER PANEL */}
        <section className="center">
          {activeTab === "mri" && (
            <>
              <div className="viewer-header">
                <div className="viewer-title">Multi-modal MRI Analysis</div>
                <div className="viewer-controls">
                  <button className={`view-btn ${viewMode === '2d' ? 'active' : ''}`} onClick={() => setViewMode('2d')}>2D Multi-planar</button>
                  <button className={`view-btn ${viewMode === '3d' ? 'active' : ''}`} onClick={() => setViewMode('3d')}>3D Volume</button>
                </div>
              </div>

              {/* Viewer Body (Upload or Render) */}
              {!isUploading && !predictionData ? (
                <div className="analysis-upload">
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    accept=".nii,.nii.gz,.dcm"
                  />
                  <div className="upload-zone" onClick={handleUploadClick}>
                    <UploadCloud className="upload-icon mx-auto" size={64} />
                    <div className="upload-title">Initialize Scan Data</div>
                    <div className="upload-sub">
                      Supports NIfTI (<code>.nii.gz</code>) or DICOM directories.<br />
                      Requires T1, T1ce, T2, and FLAIR modalities for accurate segmentation.
                    </div>
                  </div>
                </div>
              ) : isUploading ? (
                <div className="analysis-upload">
                  <div className="upload-title">Processing Pipeline</div>
                  <div className="inference-progress w-64 mt-4">
                    <div className="prog-header">
                      <span className="prog-label">Inference</span>
                      <span className="prog-pct">{progress}%</span>
                    </div>
                    <div className="prog-bar-bg">
                      <div className="prog-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                </div>
              ) : viewMode === '2d' ? (
                <div className="viewer-body">
                  <div className="mri-grid">
                    <div className="mri-pane">
                      <div className="mri-label">AXIAL [T1ce]</div>
                      <div className="mri-overlay-controls">
                        <button className="mri-btn">⊕</button>
                        <button className="mri-btn">⊙</button>
                      </div>
                      {predictionData?.images?.axial && (
                        <img src={predictionData.images.axial} alt="Axial" className="mri-slice-img" />
                      )}
                    </div>
                    <div className="mri-pane">
                      <div className="mri-label">CORONAL [FLAIR]</div>
                      {predictionData?.images?.coronal && (
                        <img src={predictionData.images.coronal} alt="Coronal" className="mri-slice-img" />
                      )}
                    </div>
                    <div className="mri-pane">
                      <div className="mri-label">SAGITTAL [T2]</div>
                      {predictionData?.images?.sagittal && (
                        <img src={predictionData.images.sagittal} alt="Sagittal" className="mri-slice-img" />
                      )}
                    </div>
                    <div className="mri-pane">
                      <div className="mri-label">3D SEGMENTATION</div>
                      <Brain3D />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="viewer-body">
                  <div className="volume-3d-full">
                    <Brain3D />
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "report" && (
            <div className="report-view">
              <div className="report-header">
                <div className="report-title-main">Radiological Report</div>
                <div className="report-meta">
                  <div className="report-meta-item">Patient: <span>Elias Jenkins</span></div>
                  <div className="report-meta-item">ID: <span>PT-88392</span></div>
                  <div className="report-meta-item">Date: <span>{new Date().toISOString().split('T')[0]}</span></div>
                </div>
              </div>
              <div className="report-section">
                <div className="report-section-title"><Search size={16} /> Findings</div>
                <div className="report-findings">
                  {predictionData ? (
                    <>
                      Multi-modal MRI sequences reveal an anomaly. AI Segmentation indicates <span className="highlight">{predictionData.tumorType}</span> with a total tumor volume of <strong>{predictionData.volumeCm3.toFixed(2)} cm³</strong>.
                      <br /><br />
                      <strong>Region Breakdown:</strong> Enhancing Tumor: {predictionData.regionVolumes?.enhancing_tumor ?? 'N/A'} cm³ | Necrotic Core: {predictionData.regionVolumes?.necrotic_core ?? 'N/A'} cm³ | Peritumoral Edema: {predictionData.regionVolumes?.peritumoral_edema ?? 'N/A'} cm³
                      <br /><br />
                      The model processed the 3D volume with a confidence score of <strong>{(predictionData.confidence * 100).toFixed(1)}%</strong>.
                      {predictionData.classProbs && (<> Class probabilities — No Tumor: {(predictionData.classProbs.no_tumor * 100).toFixed(1)}% | LGG: {(predictionData.classProbs.lgg * 100).toFixed(1)}% | HGG: {(predictionData.classProbs.hgg * 100).toFixed(1)}%</>)}
                      <br /><br />
                      Further review by a radiologist is recommended to verify these AI-assisted findings.
                    </>
                  ) : (
                    "No scan uploaded yet. Please upload a scan in the Viewer tab to generate a radiological report."
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "training" && (
            <div className="training-view">
              <div className="training-title">Model Architecture & Training</div>
              <div className="training-sub mb-4">3D Attention U-Net (BraTSNet) — BraTS 2021 dataset</div>
              <div className="train-card">
                <div className="train-card-title"><Database size={14} className="inline mr-2" /> Architecture</div>
                <div className="train-stat-row">
                  <span className="train-stat-name">Model</span>
                  <span className="train-stat-val info">BraTSNet</span>
                </div>
                <div className="train-stat-row">
                  <span className="train-stat-name">Input Channels</span>
                  <span className="train-stat-val info">4 (T1, T1ce, T2, FLAIR)</span>
                </div>
                <div className="train-stat-row">
                  <span className="train-stat-name">Segmentation Classes</span>
                  <span className="train-stat-val info">3 (WT, TC, ET)</span>
                </div>
                <div className="train-stat-row">
                  <span className="train-stat-name">Classification Classes</span>
                  <span className="train-stat-val info">3 (None, LGG, HGG)</span>
                </div>
                <div className="train-stat-row">
                  <span className="train-stat-name">Base Features</span>
                  <span className="train-stat-val info">16</span>
                </div>
              </div>
              {predictionData && (
                <div className="train-card" style={{ marginTop: 16 }}>
                  <div className="train-card-title">Last Inference — Segmentation Confidence</div>
                  <div className="train-stat-row">
                    <span className="train-stat-name">Whole Tumor (WT)</span>
                    <span className="train-stat-val good">{predictionData.diceScores.wt_dice}</span>
                  </div>
                  <div className="train-stat-row">
                    <span className="train-stat-name">Tumor Core (TC)</span>
                    <span className="train-stat-val warn">{predictionData.diceScores.tc_dice}</span>
                  </div>
                  <div className="train-stat-row">
                    <span className="train-stat-name">Enhancing Tumor (ET)</span>
                    <span className="train-stat-val info">{predictionData.diceScores.et_dice}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* RIGHT PANEL */}
        <aside className="right-panel scroll-x">
          <div className="rp-section">
            <div className="rp-title">AI Diagnosis</div>
            <div className="diagnosis-card">
              <div className="diagnosis-type text-red-400">{predictionData ? predictionData.tumorType : "Awaiting Scan"}</div>
              <div className="diagnosis-sub">{predictionData ? "AI Generated Prediction" : "Please upload scan"}</div>
              <div className="confidence-row">
                <div className="confidence-label">Confidence</div>
                <div className="confidence-bar">
                  <div className="confidence-fill bg-blue-500" style={{ width: `${predictionData ? (predictionData.confidence * 100).toFixed(0) : 0}%` }}></div>
                </div>
                <div className="confidence-val text-blue-400">{predictionData ? (predictionData.confidence * 100).toFixed(0) : 0}%</div>
              </div>
            </div>
          </div>

          <div className="rp-section">
            <div className="rp-title">Volumetric Metrics</div>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-val text-white">{predictionData ? predictionData.volumeCm3.toFixed(1) : "0.0"}</div>
                <div className="metric-label">Total Volume (cm³)</div>
              </div>
              <div className="metric-card">
                <div className="metric-val text-red-400">{predictionData?.regionVolumes ? predictionData.regionVolumes.necrotic_core.toFixed(1) : "0.0"}</div>
                <div className="metric-label">Necrotic Core</div>
              </div>
              <div className="metric-card">
                <div className="metric-val text-blue-400">{predictionData?.regionVolumes ? predictionData.regionVolumes.enhancing_tumor.toFixed(1) : "0.0"}</div>
                <div className="metric-label">Enhancing Tumor</div>
              </div>
              <div className="metric-card">
                <div className="metric-val text-green-400">{predictionData?.regionVolumes ? predictionData.regionVolumes.peritumoral_edema.toFixed(1) : "0.0"}</div>
                <div className="metric-label">Peritumoral Edema</div>
              </div>
            </div>
          </div>

          <div className="rp-section">
            <div className="rp-title">Activity Log</div>
            {predictionData ? (
              <>
                <div className="log-entry">
                  <div className="log-time">{new Date().toLocaleTimeString()}</div>
                  <div className="log-msg">Segmentation mask generated <span className="log-badge lb-ok">OK</span></div>
                </div>
                <div className="log-entry">
                  <div className="log-time">{new Date(Date.now() - 11000).toLocaleTimeString()}</div>
                  <div className="log-msg">Inference completed successfully</div>
                </div>
                <div className="log-entry">
                  <div className="log-time">{new Date(Date.now() - 17000).toLocaleTimeString()}</div>
                  <div className="log-msg">Loaded modalities into memory</div>
                </div>
              </>
            ) : (
              <div className="log-entry">
                <div className="log-time">Now</div>
                <div className="log-msg">Waiting for user upload...</div>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
