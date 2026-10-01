import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { LogOut, Upload } from "lucide-react";

export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="navbar__inner">
        {/* Logo */}
        <Link to="/dashboard" className="navbar__logo">
          Finance<span>Track</span>
        </Link>

        {user ? (
          <div className="navbar__actions">
            {/* Nav links */}
            <nav className="navbar__nav">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `navbar__nav-link${isActive ? " active" : ""}`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/transactions"
                className={({ isActive }) =>
                  `navbar__nav-link${isActive ? " active" : ""}`
                }
              >
                Transactions
              </NavLink>
              <NavLink
                to="/analytics"
                className={({ isActive }) =>
                  `navbar__nav-link${isActive ? " active" : ""}`
                }
              >
                Analytics
              </NavLink>
              <NavLink
                to="/import"
                className={({ isActive }) =>
                  `navbar__nav-link${isActive ? " active" : ""}`
                }
                style={({ isActive }) => ({
                  color: isActive ? "var(--color-fey-white)" : "var(--color-fey-ember)",
                })}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <Upload size={12} />
                  Import
                </span>
              </NavLink>
            </nav>

            {/* User + Logout */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-14)" }}>
              <span className="navbar__user-name">{user.name}</span>
              <button
                id="navbar-logout-btn"
                onClick={handleLogout}
                className="btn btn--logout"
                title="Sign out"
              >
                <LogOut size={13} />
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-10)" }}>
            <Link to="/login" className="navbar__nav-link">
              Sign In
            </Link>
            <Link to="/register" className="btn btn--ghost" style={{ padding: "6px 18px" }}>
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
