"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { BrainCircuit, Mail, Lock, User, ArrowRight, AlertCircle } from "lucide-react";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName);

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
              Join the future of medical imaging. Get instant AI-powered brain
              tumor analysis with state-of-the-art 3D segmentation.
            </p>
            <div className="auth-brand-stats">
              <div className="auth-stat">
                <div className="auth-stat-val">BraTS</div>
                <div className="auth-stat-label">Dataset</div>
              </div>
              <div className="auth-stat">
                <div className="auth-stat-val">U-Net</div>
                <div className="auth-stat-label">Architecture</div>
              </div>
              <div className="auth-stat">
                <div className="auth-stat-val">HIPAA</div>
                <div className="auth-stat-label">Compliant</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Signup Form */}
        <div className="auth-form-panel">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-header">
              <h2 className="auth-form-title">Create Account</h2>
              <p className="auth-form-sub">
                Start analyzing brain scans in minutes
              </p>
            </div>

            {error && (
              <div className="auth-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label">Full Name</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Dr. Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

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
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
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
                  Create Account
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="auth-footer">
              Already have an account?{" "}
              <a href="/login" className="auth-link">
                Sign in
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
