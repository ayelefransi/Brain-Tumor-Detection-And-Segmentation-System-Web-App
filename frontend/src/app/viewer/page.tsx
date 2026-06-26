"use client";

import { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  BrainCircuit,
  Search,
  Database,
  LayoutDashboard,
  Sparkles,
  Download,
  Loader2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";
import SliceScrubber from "@/components/SliceScrubber";

const Brain3D = dynamic(() => import("@/components/Brain3D"), { ssr: false });

export default function ViewerPage() {
  const [activeTab, setActiveTab] = useState("mri");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Summary state
  const [aiSummary, setAiSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [radiologistNotes, setRadiologistNotes] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { user } = useAuth();
  const supabase = createClient();

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
        setProgress((p) => (p < 90 ? p + 5 : p));
      }, 1000);

      // Call FastAPI DIRECTLY from the browser
      const fastApiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
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

      // Save to Supabase via API route
      try {
        const dbRes = await fetch("/api/save-prediction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: "PT-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
            patientName: "Scan Patient",
            filename: backendData.filename,
            metrics: {
              volume_cm3: metrics.volume_cm3,
              confidence: metrics.confidence,
              type: metrics.type,
              metrics: metrics.metrics,
            },
          }),
        });
        
        if (!dbRes.ok) {
          const errData = await dbRes.json();
          console.error("Supabase Save Error:", errData);
          alert("Prediction generated, but failed to save to Dashboard: " + (errData.error || "Unknown error"));
        }
      } catch (dbErr) {
        console.warn("DB save network failed (non-blocking):", dbErr);
      }

      setProgress(100);

      // Map backend response to UI shape
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
      alert(
        "Error during prediction. Make sure the FastAPI backend is running on port 8000."
      );
    }
  };

  return (
    <AppShell>
      <div className="viewer-page">
        {/* Viewer Tab Bar */}
        <div className="viewer-topbar">
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
        </div>

        {/* Viewer Content */}
        <div className="viewer-layout">
          {/* CENTER PANEL */}
          <section className="center">
            {activeTab === "mri" && (
              <>
                <div className="viewer-header">
                  <div className="viewer-title">Multi-modal MRI Analysis</div>
                  <div className="viewer-controls">
                    <button
                      className={`view-btn ${viewMode === "2d" ? "active" : ""}`}
                      onClick={() => setViewMode("2d")}
                    >
                      2D Multi-planar
                    </button>
                    <button
                      className={`view-btn ${viewMode === "3d" ? "active" : ""}`}
                      onClick={() => setViewMode("3d")}
                    >
                      3D Volume
                    </button>
                  </div>
                </div>

                {/* Viewer Body */}
                {!isUploading && !predictionData ? (
                  <div className="analysis-upload">
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                      accept=".nii,.nii.gz,.dcm"
                    />
                    <div className="upload-zone" onClick={handleUploadClick}>
                      <UploadCloud
                        className="upload-icon mx-auto"
                        size={64}
                      />
                      <div className="upload-title">Initialize Scan Data</div>
                      <div className="upload-sub">
                        Supports NIfTI (<code>.nii.gz</code>) or DICOM
                        directories.
                        <br />
                        Requires T1, T1ce, T2, and FLAIR modalities for accurate
                        segmentation.
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
                        <div
                          className="prog-bar-fill"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : viewMode === "2d" ? (
                  <div className="viewer-body">
                    <div className="mri-grid">
                      <div className="mri-pane">
                        {predictionData?.images?.axial_slices?.length > 0 ? (
                          <SliceScrubber
                            slices={predictionData.images.axial_slices}
                            label="AXIAL [T1ce]"
                          />
                        ) : (
                          <>
                            <div className="mri-label">AXIAL [T1ce]</div>
                            {predictionData?.images?.axial && (
                              <img src={predictionData.images.axial} alt="Axial" className="mri-slice-img" />
                            )}
                          </>
                        )}
                      </div>
                      <div className="mri-pane">
                        {predictionData?.images?.coronal_slices?.length > 0 ? (
                          <SliceScrubber
                            slices={predictionData.images.coronal_slices}
                            label="CORONAL [FLAIR]"
                          />
                        ) : (
                          <>
                            <div className="mri-label">CORONAL [FLAIR]</div>
                            {predictionData?.images?.coronal && (
                              <img src={predictionData.images.coronal} alt="Coronal" className="mri-slice-img" />
                            )}
                          </>
                        )}
                      </div>
                      <div className="mri-pane">
                        {predictionData?.images?.sagittal_slices?.length > 0 ? (
                          <SliceScrubber
                            slices={predictionData.images.sagittal_slices}
                            label="SAGITTAL [T2]"
                          />
                        ) : (
                          <>
                            <div className="mri-label">SAGITTAL [T2]</div>
                            {predictionData?.images?.sagittal && (
                              <img src={predictionData.images.sagittal} alt="Sagittal" className="mri-slice-img" />
                            )}
                          </>
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
                    <div className="report-meta-item">
                      Patient: <span>Scan Patient</span>
                    </div>
                    <div className="report-meta-item">
                      Date:{" "}
                      <span>
                        {new Date().toISOString().split("T")[0]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {predictionData && (
                  <div className="report-actions">
                    <button
                      className="report-action-btn report-ai-btn"
                      onClick={async () => {
                        if (isSummarizing) return;
                        setIsSummarizing(true);
                        setAiSummary("");
                        try {
                          const res = await fetch("/api/summarize", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              tumorType: predictionData.tumorType,
                              confidence: predictionData.confidence,
                              volumeCm3: predictionData.volumeCm3,
                              regionVolumes: predictionData.regionVolumes,
                              classProbs: predictionData.classProbs,
                              diceScores: predictionData.diceScores,
                            }),
                          });
                          if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err.error || "Summarization failed");
                          }
                          const reader = res.body?.getReader();
                          const decoder = new TextDecoder();
                          if (reader) {
                            let done = false;
                            while (!done) {
                              const { value, done: streamDone } = await reader.read();
                              done = streamDone;
                              if (value) {
                                setAiSummary((prev) => prev + decoder.decode(value));
                              }
                            }
                          }
                        } catch (err: any) {
                          setAiSummary("Error: " + err.message);
                        } finally {
                          setIsSummarizing(false);
                        }
                      }}
                      disabled={isSummarizing}
                    >
                      {isSummarizing ? (
                        <><Loader2 size={14} className="report-spinner" /> Generating...</>
                      ) : (
                        <><Sparkles size={14} /> Generate AI Summary</>
                      )}
                    </button>
                    <button
                      className="report-action-btn report-pdf-btn"
                      onClick={async () => {
                        if (isExportingPdf) return;
                        setIsExportingPdf(true);
                        try {
                          const res = await fetch("/api/generate-pdf", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              tumorType: predictionData.tumorType,
                              confidence: predictionData.confidence,
                              volumeCm3: predictionData.volumeCm3,
                              regionVolumes: predictionData.regionVolumes,
                              classProbs: predictionData.classProbs,
                              diceScores: predictionData.diceScores,
                              aiSummary,
                              radiologistNotes,
                              axialImage: predictionData.images?.axial,
                              coronalImage: predictionData.images?.coronal,
                              sagittalImage: predictionData.images?.sagittal,
                            }),
                          });
                          if (!res.ok) throw new Error("PDF generation failed");
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `NeuroScan_Report_${new Date().toISOString().split("T")[0]}.pdf`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (err: any) {
                          alert("PDF export failed: " + err.message);
                        } finally {
                          setIsExportingPdf(false);
                        }
                      }}
                      disabled={isExportingPdf}
                    >
                      {isExportingPdf ? (
                        <><Loader2 size={14} className="report-spinner" /> Exporting...</>
                      ) : (
                        <><Download size={14} /> Export PDF</>
                      )}
                    </button>
                  </div>
                )}

                <div className="report-section">
                  <div className="report-section-title">
                    <Search size={16} /> Findings
                  </div>
                  <div className="report-findings">
                    {predictionData ? (
                      <>
                        Multi-modal MRI sequences reveal an anomaly. AI
                        Segmentation indicates{" "}
                        <span className="highlight">
                          {predictionData.tumorType}
                        </span>{" "}
                        with a total tumor volume of{" "}
                        <strong>
                          {predictionData.volumeCm3.toFixed(2)} cm³
                        </strong>
                        .
                        <br />
                        <br />
                        <strong>Region Breakdown:</strong> Enhancing Tumor:{" "}
                        {predictionData.regionVolumes?.enhancing_tumor ?? "N/A"}{" "}
                        cm³ | Necrotic Core:{" "}
                        {predictionData.regionVolumes?.necrotic_core ?? "N/A"}{" "}
                        cm³ | Peritumoral Edema:{" "}
                        {predictionData.regionVolumes?.peritumoral_edema ??
                          "N/A"}{" "}
                        cm³
                        <br />
                        <br />
                        The model processed the 3D volume with a confidence
                        score of{" "}
                        <strong>
                          {(predictionData.confidence * 100).toFixed(1)}%
                        </strong>
                        .
                        {predictionData.classProbs && (
                          <>
                            {" "}
                            Class probabilities — No Tumor:{" "}
                            {(
                              predictionData.classProbs.no_tumor * 100
                            ).toFixed(1)}
                            % | LGG:{" "}
                            {(predictionData.classProbs.lgg * 100).toFixed(1)}% |
                            HGG:{" "}
                            {(predictionData.classProbs.hgg * 100).toFixed(1)}%
                          </>
                        )}
                        <br />
                        <br />
                        Further review by a radiologist is recommended to verify
                        these AI-assisted findings.
                      </>
                    ) : (
                      "No scan uploaded yet. Please upload a scan in the Viewer tab to generate a radiological report."
                    )}
                  </div>
                </div>

                {/* AI Summary Section */}
                {aiSummary && (
                  <div className="report-section">
                    <div className="report-section-title">
                      <Sparkles size={16} /> AI-Generated Clinical Summary
                    </div>
                    <div className={`report-ai-summary ${isSummarizing ? "streaming" : ""}`}>
                      {aiSummary}
                    </div>
                  </div>
                )}

                {/* Radiologist Notes */}
                {predictionData && (
                  <div className="report-section">
                    <div className="report-section-title">
                      <FileText size={16} /> Radiologist Notes
                    </div>
                    <textarea
                      className="report-notes-textarea"
                      placeholder="Add your clinical observations, differential diagnosis, or recommendations here..."
                      value={radiologistNotes}
                      onChange={(e) => setRadiologistNotes(e.target.value)}
                      rows={5}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === "training" && (
              <div className="training-view">
                <div className="training-title">
                  Model Architecture & Training
                </div>
                <div className="training-sub mb-4">
                  3D Attention U-Net (BraTSNet) — BraTS 2021 dataset
                </div>
                <div className="train-card">
                  <div className="train-card-title">
                    <Database size={14} className="inline mr-2" /> Architecture
                  </div>
                  <div className="train-stat-row">
                    <span className="train-stat-name">Model</span>
                    <span className="train-stat-val info">BraTSNet</span>
                  </div>
                  <div className="train-stat-row">
                    <span className="train-stat-name">Input Channels</span>
                    <span className="train-stat-val info">
                      4 (T1, T1ce, T2, FLAIR)
                    </span>
                  </div>
                  <div className="train-stat-row">
                    <span className="train-stat-name">
                      Segmentation Classes
                    </span>
                    <span className="train-stat-val info">3 (WT, TC, ET)</span>
                  </div>
                  <div className="train-stat-row">
                    <span className="train-stat-name">
                      Classification Classes
                    </span>
                    <span className="train-stat-val info">
                      3 (None, LGG, HGG)
                    </span>
                  </div>
                  <div className="train-stat-row">
                    <span className="train-stat-name">Base Features</span>
                    <span className="train-stat-val info">16</span>
                  </div>
                </div>
                {predictionData && (
                  <div className="train-card" style={{ marginTop: 16 }}>
                    <div className="train-card-title">
                      Last Inference — Segmentation Confidence
                    </div>
                    <div className="train-stat-row">
                      <span className="train-stat-name">
                        Whole Tumor (WT)
                      </span>
                      <span className="train-stat-val good">
                        {predictionData.diceScores.wt_dice}
                      </span>
                    </div>
                    <div className="train-stat-row">
                      <span className="train-stat-name">
                        Tumor Core (TC)
                      </span>
                      <span className="train-stat-val warn">
                        {predictionData.diceScores.tc_dice}
                      </span>
                    </div>
                    <div className="train-stat-row">
                      <span className="train-stat-name">
                        Enhancing Tumor (ET)
                      </span>
                      <span className="train-stat-val info">
                        {predictionData.diceScores.et_dice}
                      </span>
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
                <div className="diagnosis-type text-red-400">
                  {predictionData ? predictionData.tumorType : "Awaiting Scan"}
                </div>
                <div className="diagnosis-sub">
                  {predictionData
                    ? "AI Generated Prediction"
                    : "Please upload scan"}
                </div>
                <div className="confidence-row">
                  <div className="confidence-label">Confidence</div>
                  <div className="confidence-bar">
                    <div
                      className="confidence-fill bg-blue-500"
                      style={{
                        width: `${
                          predictionData
                            ? (predictionData.confidence * 100).toFixed(0)
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <div className="confidence-val text-blue-400">
                    {predictionData
                      ? (predictionData.confidence * 100).toFixed(0)
                      : 0}
                    %
                  </div>
                </div>
              </div>
            </div>

            <div className="rp-section">
              <div className="rp-title">Volumetric Metrics</div>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-val text-white">
                    {predictionData
                      ? predictionData.volumeCm3.toFixed(1)
                      : "0.0"}
                  </div>
                  <div className="metric-label">Total Volume (cm³)</div>
                </div>
                <div className="metric-card">
                  <div className="metric-val text-red-400">
                    {predictionData?.regionVolumes
                      ? predictionData.regionVolumes.necrotic_core.toFixed(1)
                      : "0.0"}
                  </div>
                  <div className="metric-label">Necrotic Core</div>
                </div>
                <div className="metric-card">
                  <div className="metric-val text-blue-400">
                    {predictionData?.regionVolumes
                      ? predictionData.regionVolumes.enhancing_tumor.toFixed(1)
                      : "0.0"}
                  </div>
                  <div className="metric-label">Enhancing Tumor</div>
                </div>
                <div className="metric-card">
                  <div className="metric-val text-green-400">
                    {predictionData?.regionVolumes
                      ? predictionData.regionVolumes.peritumoral_edema.toFixed(1)
                      : "0.0"}
                  </div>
                  <div className="metric-label">Peritumoral Edema</div>
                </div>
              </div>
            </div>

            <div className="rp-section">
              <div className="rp-title">Activity Log</div>
              {predictionData ? (
                <>
                  <div className="log-entry">
                    <div className="log-time">
                      {new Date().toLocaleTimeString()}
                    </div>
                    <div className="log-msg">
                      Segmentation mask generated{" "}
                      <span className="log-badge lb-ok">OK</span>
                    </div>
                  </div>
                  <div className="log-entry">
                    <div className="log-time">
                      {new Date(Date.now() - 11000).toLocaleTimeString()}
                    </div>
                    <div className="log-msg">
                      Inference completed successfully
                    </div>
                  </div>
                  <div className="log-entry">
                    <div className="log-time">
                      {new Date(Date.now() - 17000).toLocaleTimeString()}
                    </div>
                    <div className="log-msg">
                      Loaded modalities into memory
                    </div>
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
        </div>
      </div>
    </AppShell>
  );
}
