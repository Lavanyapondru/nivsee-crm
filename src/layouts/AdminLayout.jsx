import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    // Manage the active sidebar module
    const [activeModule, setActiveModule] = useState("Dashboard");

    const menuItems = [
        { name: "Dashboard", icon: "bi-grid" },
        { name: "Employees", icon: "bi-people" },
        { name: "Attendance", icon: "bi-clock-history" },
        { name: "Projects", icon: "bi-kanban" },
        { name: "Tasks", icon: "bi-list-check" },
        { name: "Leaves", icon: "bi-calendar-check" },
        { name: "Reports", icon: "bi-bar-chart" }
    ];

    // Handle sidebar navigation
    const handleMenuClick = (moduleName) => {
        setActiveModule(moduleName);

        // Dashboard modules are currently managed inside AdminDashboard
        if (location.pathname !== "/admin/dashboard") {
            navigate("/admin/dashboard");
        }
    };

    // Admin logout
    const handleLogout = () => {
        localStorage.removeItem("nivsee_admin_token");
        localStorage.removeItem("nivsee_admin_session");

        navigate("/login/admin", { replace: true });
    };

    return (
        <div className="container-fluid admin-dashboard">
            <div className="row min-vh-100">

                {/* Admin Sidebar */}
                <aside className="col-md-3 col-lg-2 admin-sidebar">

                    <h4 className="mb-4">
                        <i className="bi bi-grid-1x2-fill me-2"></i>
                        NIVSEE CRM
                    </h4>

                    {menuItems.map((item) => (
                        <button
                            key={item.name}
                            type="button"
                            onClick={() => handleMenuClick(item.name)}
                            className={`btn w-100 text-start mb-2 admin-menu-btn ${
                                activeModule === item.name ? "active" : ""
                            }`}
                        >
                            <i className={`bi ${item.icon} me-2`}></i>
                            {item.name}
                        </button>
                    ))}

                    <hr className="admin-divider" />

                    <button
                        type="button"
                        className="btn btn-outline-light w-100"
                        onClick={handleLogout}
                    >
                        <i className="bi bi-box-arrow-right me-2"></i>
                        Logout
                    </button>

                </aside>

                {/* Right-side content */}
                <main className="col-md-9 col-lg-10 admin-main">

                    <Outlet
                        context={{
                            activeModule,
                            setActiveModule
                        }}
                    />

                </main>

            </div>
        </div>
    );
}

export default AdminLayout;