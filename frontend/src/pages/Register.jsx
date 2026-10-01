import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    currency: "USD",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { registerUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await registerUser(formData);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-card__eyebrow">Personal Finance</p>
        <h1 className="auth-card__title">Create an account.</h1>
        <p className="auth-card__subtitle">
          Start organizing your personal finances today.
        </p>

        {error && <div className="alert--error" style={{ marginTop: "20px" }}>{error}</div>}

        <form id="register-form" onSubmit={handleSubmit} className="auth-card__form">
          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              placeholder="John Doe"
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              name="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-currency" className="form-label">
              Currency
            </label>
            <select
              id="reg-currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="form-select"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="INR">INR (₹)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            disabled={submitting}
            className="btn btn--primary btn--full"
            style={{ padding: "12px 24px", fontSize: "14px" }}
          >
            {submitting ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="auth-card__footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-card__link">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
