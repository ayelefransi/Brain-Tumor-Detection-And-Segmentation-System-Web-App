"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { BrainCircuit, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="auth-page">
      {/* Animated background */}
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1"></div>
        <div className="auth-orb auth-orb-2"></div>
        <div className="auth-orb auth-orb-3"></div>
        <div className="cyber-grid"></div>
      </div>

      <div className="auth-container">
        {/* Left - Branding Panel */}
        <div className="auth-brand">
          <div className="auth-brand-content">
            <div className="auth-brand-icon">
              <BrainCircuit size={48} />
            </div>
            <h1 className="auth-brand-title">
              NeuroScan <span>AI</span>
            </h1>
            <p className="auth-brand-sub">
              Advanced Brain Tumor Detection & Segmentation System powered by
              3D Attention U-Net deep learning architecture.
            </p>
            <div className="auth-brand-stats">
              <div className="auth-stat">
                <div className="auth-stat-val">98.7%</div>
                <div className="auth-stat-label">Accuracy</div>
              </div>
              <div className="auth-stat">
                <div className="auth-stat-val">3D</div>
                <div className="auth-stat-label">Segmentation</div>
              </div>
              <div className="auth-stat">
                <div className="auth-stat-val">&lt;30s</div>
                <div className="auth-stat-label">Inference</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Login Form */}
        <div className="auth-form-panel">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-header">
              <h2 className="auth-form-title">Welcome back</h2>
              <p className="auth-form-sub">
                Sign in to access your diagnostic workspace
              </p>
            </div>

            {error && (
              <div className="auth-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  type="email"
                  className="auth-input"
                  placeholder="doctor@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type="password"
                  className="auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? (
                <span className="auth-spinner"></span>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="auth-footer">
              Don&apos;t have an account?{" "}
              <a href="/signup" className="auth-link">
                Create one
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
