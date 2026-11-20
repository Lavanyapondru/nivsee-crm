import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../services/api";

function Login() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get role from the current URL
  const pathRole = location.pathname.split("/")[2] || "";

  const [role, setRole] = useState(pathRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [message, setMessage] = useState("");

  // Synchronize role whenever the URL changes
  useEffect(() => {
    setRole(pathRole);
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setRemember(false);
    setMessage("");
  }, [pathRole]);

  // Select Employee or Admin
  const chooseRole = (selectedRole) => {
    navigate(`/login/${selectedRole}`);
  };

  // Back to Homepage
  const handleBackHome = () => {
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setRemember(false);
    setMessage("");
    navigate("/");
  };

  // Login form validation
  

const handleLogin = async (e) => {
  e.preventDefault();

  if (!email.trim() || !password.trim()) {
    setMessage("Please enter your login details and password.");
    return;
  }

  try {
    const isEmployee = role === "employee";

    const users = isEmployee
      ? await api.getEmployees(email)
      : await api.getAdmins(email.trim().toLowerCase());

    // Step 1: Validate login details and password
    const user = users.find(
      (item) => item.password === password
    );

    if (!user) {
      console.log(user)
      setMessage("Invalid login details or password.");
      return;
    }

    // Step 2: Check employee access permission
    if (isEmployee && user.status !== "active") {
      setMessage(
        "Your account is currently inactive. Please contact your administrator to get login access."
      );
      return;
    }

    // Step 3: Check admin account status
    if (!isEmployee && user.status !== "active") {
      setMessage("Your admin account is inactive.");
      return;
    }
    
    // Store Employee's unique JSON Server ID
    if (isEmployee) {
    localStorage.setItem("nivsee_employee_id", user.id);
    }

    // Step 4: Create login session
    const session = {
      role: user.role,
      email: user.email,
      employeeId: user.id,
      name: user.name,
      loggedInAt: Date.now()
    };

    localStorage.setItem(
      isEmployee
        ? "nivsee_employee_session"
        : "nivsee_admin_session",
      JSON.stringify(session)
    );

    // Step 5: Navigate to dashboard
    navigate(
      isEmployee
        ? "/employee/dashboard"
        : "/admin/dashboard"
    );

  } catch (error) {
    console.error("Login error:", error);

    setMessage(
      "Unable to connect to the server. Please try again."
    );
  }
};



  return (
    <section className="login-page section-padding">
      <div className="container">

        {/* Role Selection */}
        {!role ? (
          <div className="row justify-content-center g-4 mt-5">

            {/* Employee Login */}
            <div className="col-md-5">
              <button
                type="button"
                className="role-card w-100"
                onClick={() => chooseRole("employee")}
              >
                <div className="role-icon">
                  <i className="bi bi-people-fill"></i>
                </div>

                <h3>Employee Login</h3>

                <p>
                  Access your profile, tasks, attendance
                  and employee workspace.
                </p>

                <span>
                  Continue as Employee
                  <i className="bi bi-arrow-right ms-2"></i>
                </span>
              </button>
            </div>

            {/* Admin Login */}
            <div className="col-md-5">
              <button
                type="button"
                className="role-card w-100"
                onClick={() => chooseRole("admin")}
              >
                <div className="role-icon">
                  <i className="bi bi-shield-lock-fill"></i>
                </div>

                <h3>Admin Login</h3>

                <p>
                  Manage employees, projects, attendance,
                  reports and company operations.
                </p>

                <span>
                  Continue as Admin
                  <i className="bi bi-arrow-right ms-2"></i>
                </span>
              </button>
            </div>

          </div>
        ) : (

          /* Login Form */
          <div className="row justify-content-center">
            <div className="col-md-7 col-lg-5">

              <div className="auth-card">

                {/* Back to Home */}
                <button
                  type="button"
                  className="back-link"
                  onClick={handleBackHome}
                >
                  <i className="bi bi-arrow-left"></i>
                  Back to Home
                </button>

                {/* Login Heading */}
                <div className="text-center mb-5">

                  <div className="role-icon mx-auto">
                    <i
                      className={
                        role === "admin"
                          ? "bi bi-shield-lock-fill"
                          : "bi bi-people-fill"
                      }
                    ></i>
                  </div>

                  <h2>
                    {role === "admin"
                      ? "Admin Login"
                      : "Employee Login"}
                  </h2>

                  <p>Sign in to your workspace</p>

                </div>

                {/* Form */}
                <form onSubmit={handleLogin}>

                  {/* Email / Employee ID */}
                  <label className="form-label">
                    Email  / Phone Number
                  </label>

                  <div className="auth-input">
                    <i className="bi bi-envelope"></i>

                    <input
                      type="text"
                      placeholder="Enter email or phone number"   
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Password */}
                  <label className="form-label mt-3">
                    Password
                  </label>

                  <div className="auth-input">
                    <i className="bi bi-lock"></i>

                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />

                    {/* Show / Hide Password */}
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowPassword((previous) => !previous)
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      <i
                        className={
                          showPassword
                            ? "bi bi-eye-slash"
                            : "bi bi-eye"
                        }
                      ></i>
                    </button>

                  </div>

                  {/* Remember Me and Forgot Password */}
                  <div className="d-flex justify-content-between align-items-center my-4">

                    <label className="remember-label">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) =>
                          setRemember(e.target.checked)
                        }
                      />
                      Remember me
                    </label>

                    <button
                      type="button"
                      className="forgot-btn"
                      onClick={() =>
                        setMessage(
                          "Please contact your administrator for password recovery."
                        )
                      }
                    >
                      Forgot Password?
                    </button>

                  </div>

                  {/* Message */}
                  {message && (
                    <div className="alert alert-info small">
                      {message}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn primary-btn w-100"
                  >
                    Sign In
                    <i className="bi bi-arrow-right ms-2"></i>
                  </button>

                </form>

                <p className="auth-footer">
                  Secure access for authorized users only.
                </p>

              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
}

export default Login;
