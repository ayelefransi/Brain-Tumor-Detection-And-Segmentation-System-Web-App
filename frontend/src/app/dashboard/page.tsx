"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";
import {
  Activity,
  Users,
  BrainCircuit,
  TrendingUp,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";

interface PredictionRow {
  id: string;
  volume_cm3: number;
  confidence: number;
  tumor_type: string;
  created_at: string;
  scan_id: string;
}

interface StatsData {
  totalScans: number;
  totalPatients: number;
  avgConfidence: number;
  latestType: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalScans: 0,
    totalPatients: 0,
    avgConfidence: 0,
    latestType: "—",
  });
  const [realtimeEvents, setRealtimeEvents] = useState<
    { id: string; type: string; time: string; isNew?: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  // Fetch initial data
  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchData() {
      // Fetch predictions
      const { data: preds } = await supabase
        .from("predictions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (preds) {
        setPredictions(preds);

        // Compute stats
        const totalScans = preds.length;
        const avgConf =
          preds.length > 0
            ? preds.reduce((sum, p) => sum + p.confidence, 0) / preds.length
            : 0;
        const latestType = preds.length > 0 ? preds[0].tumor_type : "—";

        // Fetch patient count
        const { count: patientCount } = await supabase
          .from("patients")
          .select("*", { count: "exact", head: true });

        setStats({
          totalScans,
          totalPatients: patientCount || 0,
          avgConfidence: avgConf,
          latestType,
        });

        // Seed realtime events from existing predictions
        setRealtimeEvents(
          preds.slice(0, 5).map((p) => ({
            id: p.id,
            type: p.tumor_type,
            time: new Date(p.created_at).toLocaleTimeString(),
          }))
        );
      }

      setLoading(false);
    }

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, supabase]);

  // Realtime subscription
  useEffect(() => {
    if (authLoading || !user) return;

    const channel = supabase
      .channel("predictions-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "predictions" },
        (payload) => {
          const newPred = payload.new as PredictionRow;

          // Prepend to predictions list
          setPredictions((prev) => [newPred, ...prev].slice(0, 20));

          // Update stats
          setStats((prev) => ({
            ...prev,
            totalScans: prev.totalScans + 1,
            latestType: newPred.tumor_type,
            avgConfidence:
              (prev.avgConfidence * prev.totalScans + newPred.confidence) /
              (prev.totalScans + 1),
          }));

          // Add to realtime feed with animation flag
          setRealtimeEvents((prev) =>
            [
              {
                id: newPred.id,
                type: newPred.tumor_type,
                time: new Date(newPred.created_at).toLocaleTimeString(),
                isNew: true,
              },
              ...prev,
            ].slice(0, 10)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, supabase]);

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="dash-loading">
          <div className="auth-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="dash-page">
        {/* Page Header */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Dashboard</h1>
            <p className="dash-subtitle">
              Welcome back, {user?.user_metadata?.full_name || "Doctor"}
            </p>
          </div>
          <a href="/viewer" className="dash-cta">
            <BrainCircuit size={16} />
            New Scan
            <ArrowRight size={14} />
          </a>
        </div>

        {/* Stats Grid */}
        <div className="dash-stats-grid">
          <div className="dash-stat-card">
            <div className="dash-stat-icon dsi-blue">
              <Activity size={20} />
            </div>
            <div className="dash-stat-info">
              <div className="dash-stat-val">{stats.totalScans}</div>
              <div className="dash-stat-label">Total Scans</div>
            </div>
          </div>

          <div className="dash-stat-card">
            <div className="dash-stat-icon dsi-purple">
              <Users size={20} />
            </div>
            <div className="dash-stat-info">
              <div className="dash-stat-val">{stats.totalPatients}</div>
              <div className="dash-stat-label">Patients</div>
            </div>
          </div>

          <div className="dash-stat-card">
            <div className="dash-stat-icon dsi-green">
              <TrendingUp size={20} />
            </div>
            <div className="dash-stat-info">
              <div className="dash-stat-val">
                {(stats.avgConfidence * 100).toFixed(1)}%
              </div>
              <div className="dash-stat-label">Avg Confidence</div>
            </div>
          </div>

          <div className="dash-stat-card">
            <div className="dash-stat-icon dsi-red">
              <BrainCircuit size={20} />
            </div>
            <div className="dash-stat-info">
              <div className="dash-stat-val dash-stat-val-sm">
                {stats.latestType}
              </div>
              <div className="dash-stat-label">Latest Finding</div>
            </div>
          </div>
        </div>

        {/* Two-column layout: Predictions Table + Realtime Feed */}
        <div className="dash-grid-two">
          {/* Predictions Table */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h2 className="dash-card-title">Recent Predictions</h2>
              <span className="dash-card-badge">{predictions.length}</span>
            </div>

            {predictions.length === 0 ? (
              <div className="dash-empty">
                <BrainCircuit size={32} />
                <p>No predictions yet. Upload a scan to get started.</p>
                <a href="/viewer" className="dash-cta-sm">
                  Go to Viewer
                </a>
              </div>
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Tumor Type</th>
                      <th>Volume</th>
                      <th>Confidence</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <span
                            className={`tag ${
                              p.tumor_type.includes("HGG")
                                ? "tag-hgg"
                                : p.tumor_type.includes("LGG")
                                ? "tag-lgg"
                                : "tag-clear"
                            }`}
                          >
                            {p.tumor_type}
                          </span>
                        </td>
                        <td className="dash-td-mono">
                          {p.volume_cm3.toFixed(2)} cm³
                        </td>
                        <td>
                          <div className="dash-conf-bar">
                            <div
                              className="dash-conf-fill"
                              style={{
                                width: `${(p.confidence * 100).toFixed(0)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="dash-conf-text">
                            {(p.confidence * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="dash-td-mono">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Realtime Activity Feed */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h2 className="dash-card-title">
                <Zap size={14} className="dash-realtime-icon" />
                Live Activity
              </h2>
              <span className="dash-live-dot"></span>
            </div>

            <div className="dash-feed">
              {realtimeEvents.length === 0 ? (
                <div className="dash-empty-sm">
                  <Clock size={20} />
                  <p>Waiting for activity...</p>
                </div>
              ) : (
                realtimeEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className={`dash-feed-item ${evt.isNew ? "dash-feed-new" : ""}`}
                  >
                    <div className="dash-feed-dot"></div>
                    <div className="dash-feed-content">
                      <div className="dash-feed-msg">
                        New prediction: <strong>{evt.type}</strong>
                      </div>
                      <div className="dash-feed-time">{evt.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
