
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, ShieldCheck, Building2, Mail, LockKeyhole,
  Eye, EyeOff, ArrowRight, Headset, Rocket, ChartNoAxesCombined,
  Handshake
} from "lucide-react";
// import "./LoginPage.css";

const companies = [
  {
    id: "7itech",
    name: "7iTech",
    logo: "/logos/7itech.png"
  },
  {
    id: "nivsee",
    name: "Nivsee Technology",
    logo: "/logos/nivsee.png"
  }
];

export default function LoginPage() {
  const [role, setRole] = useState("employee");
  const [company, setCompany] = useState("7itech");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("Please enter your email and password.");
      return;
    }

    setLoading(true);

    // Connect this function to your backend authentication API.
    setTimeout(() => {
      setLoading(false);
      setMessage(
        "Demo only: Connect your secure backend authentication API."
      );
    }, 1000);
  };

  return (
    <main className="login-page">
      <div className="glow glow-one" />
      <div className="glow glow-two" />

      {/* LEFT BRANDING SECTION */}
      <section className="brand-section">

        <div className="brand-logos">
          <img
            src="/logos/nivsee.png"
            alt="Nivsee Technology"
            className="nivsee-logo"
          />

          <span className="brand-divider" />

          <img
            src="/logos/7itech.png"
            alt="7iTech"
            className="itech-logo"
          />
        </div>

        <motion.div
          className="brand-content"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="welcome-label">
            YOUR BUSINESS. ONE WORKSPACE.
          </span>

          <h1>
            One Platform.
            <br />
            Two Companies.
            <br />
            <span>One Connected Workspace.</span>
          </h1>

          <p className="brand-description">
            Welcome to your unified business management
            portal. Connect, collaborate and achieve more
            with one intelligent workspace.
          </p>

          <div className="features">
            <div className="feature-item">
              <Rocket />
              <span>Work Smarter</span>
            </div>

            <div className="feature-item">
              <ChartNoAxesCombined />
              <span>Grow Together</span>
            </div>

            <div className="feature-item">
              <Handshake />
              <span>Achieve More</span>
            </div>
          </div>
        </motion.div>

        <div className="tech-illustration">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />

          <div className="floating-icon icon-one">
            <Users />
          </div>

          <div className="floating-icon icon-two">
            <ShieldCheck />
          </div>

          <div className="floating-icon icon-three">
            <Building2 />
          </div>

          <div className="dashboard-visual">
            <ChartNoAxesCombined size={85} />
            <span>SMART WORKSPACE</span>
          </div>
        </div>

        <footer className="brand-footer">
          © 2026 7iTech & Nivsee Technology Pvt. Ltd.
          <br />
          All Rights Reserved.
        </footer>
      </section>

      {/* RIGHT LOGIN SECTION */}
      <section className="form-section">

        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >

          <div className="card-heading">
            <span className="small-heading">
              SECURE ACCESS PORTAL
            </span>

            <h2>
              Welcome <span>Back!</span>
            </h2>

            <p>Sign in to access your workspace.</p>
          </div>

          {/* ROLE SELECTION */}
          <div className="role-switch">
            <button
              type="button"
              className={role === "employee" ? "active" : ""}
              onClick={() => {
                setRole("employee");
                setMessage("");
              }}
            >
              <Users size={19} />
              Employee
            </button>

            <button
              type="button"
              className={role === "admin" ? "active" : ""}
              onClick={() => {
                setRole("admin");
                setMessage("");
              }}
            >
              <ShieldCheck size={19} />
              Admin
            </button>
          </div>

          {/* COMPANY SELECTION */}
          <div className="company-heading">
            <Building2 size={18} />
            Select Company
          </div>

          <div className="company-list">
            {companies.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setCompany(item.id)}
                className={`company-option ${
                  company === item.id ? "selected" : ""
                }`}
              >
                <img src={item.logo} alt={item.name} />
                {company === item.id && (
                  <span className="selected-check">✓</span>
                )}
              </button>
            ))}
          </div>

          {/* LOGIN FORM */}
          <AnimatePresence mode="wait">
            <motion.form
              key={role}
              onSubmit={handleLogin}
              className="login-form"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
            >

              <label>
                {role === "employee"
                  ? "Employee ID / Email"
                  : "Admin Email"}
              </label>

              <div className="input-group">
                <Mail size={19} />
                <input
                  type="text"
                  placeholder={
                    role === "employee"
                      ? "Enter Employee ID or Email"
                      : "Enter Admin Email"
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>

              <label>Password</label>

              <div className="input-group">
                <LockKeyhole size={19} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="eye-button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>

              <div className="form-options">
                <label className="remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember Me
                </label>

                <button
                  type="button"
                  className="forgot-link"
                  onClick={() =>
                    setMessage("Please contact your administrator for password recovery.")
                  }
                >
                  Forgot Password?
                </button>
              </div>

              {message && (
                <p className="form-message" role="status">
                  {message}
                </p>
              )}

              <button
                type="submit"
                className="sign-in-button"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
                {!loading && <ArrowRight size={20} />}
              </button>

            </motion.form>
          </AnimatePresence>

          <div className="support-section">
            <span>Need Help?</span>
            <a href="mailto:support@yourcompany.com">
              <Headset size={19} />
              Contact Support
            </a>
          </div>

        </motion.div>
      </section>
    </main>
  );
}
