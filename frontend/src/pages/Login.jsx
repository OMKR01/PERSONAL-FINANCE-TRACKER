import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await loginUser({ email, password });
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your credentials."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-card__eyebrow">Personal Finance</p>
        <h1 className="auth-card__title">Sign in to your account.</h1>
        <p className="auth-card__subtitle">
          Track and manage your finances with clarity.
        </p>

        {error && <div className="alert--error" style={{ marginTop: "20px" }}>{error}</div>}

        <form id="login-form" onSubmit={handleSubmit} className="auth-card__form">
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={submitting}
            className="btn btn--primary btn--full"
            style={{ padding: "12px 24px", fontSize: "14px" }}
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="auth-card__footer">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="auth-card__link">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
