import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const [activeModule, setActiveModule] = useState("Dashboard");
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

const [form, setForm] = useState({
  employeeId: "",
  name: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  password: "",
  employeeid: "",
  dateOfBirth: "",
  bloodGroup: "",
  emergencyContact: ""
});

  // Check admin session
  useEffect(() => {
    const session = JSON.parse(
      localStorage.getItem("nivsee_admin_session") || "null"
    );

    if (!session || session.role !== "admin") {
      navigate("/login/admin");
      return;
    }

    loadEmployees();
  }, [navigate]);

  // Fetch employees from JSON Server
  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await api.getAllEmployees();
      setEmployees(data);
    } catch (error) {
      console.error(error);
      setMessage("Unable to load employee records.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // Add employee to JSON Server
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      setSaving(true);

      const employee = {
  id: `NVS${Date.now().toString().slice(-6)}`,
  name: form.name.trim(),
  email: form.email.trim().toLowerCase(),
  phone: form.phone.trim(),
  department: form.department.trim(),
  designation: form.designation.trim(),
  password: form.password,
  role: "employee",
  status: "active",

  employeeDetails: {
    employeeId: form.employeeId.trim().toUpperCase(),
    dateOfBirth: form.dateOfBirth,
    bloodGroup: form.bloodGroup,
    emergencyContact: form.emergencyContact.trim()
  }
};

      await api.addEmployee(employee);

      setForm({
        name: "",
        email: "",
        phone: "",
        department: "",
        designation: "",
        password: ""
      });

      setShowForm(false);
      setMessage("Employee added successfully!");

      await loadEmployees();
    } catch (error) {
      console.error(error);
      setMessage("Unable to add employee. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("nivsee_admin_session");
    navigate("/login/admin");
  };

  const menuItems = [
    { name: "Dashboard", icon: "bi-grid" },
    { name: "Employees", icon: "bi-people" },
    { name: "Attendance", icon: "bi-clock-history" },
    { name: "Projects", icon: "bi-kanban" },
    { name: "Tasks", icon: "bi-list-check" },
    { name: "Leaves", icon: "bi-calendar-check" },
    { name: "Reports", icon: "bi-bar-chart" }
  ];

  const handleToggleEmployeeStatus = async (employee) => {
  const newStatus =
    employee.status === "active" ? "inactive" : "active";

  try {
    setMessage("");

    await api.updateEmployee(employee.id, {
      status: newStatus,
    });

    setMessage(
      `${employee.name} ${
        newStatus === "active"
          ? "activated"
          : "deactivated"
      } successfully!`
    );

    await loadEmployees();

  } catch (error) {
    console.error(error);
    setMessage("Unable to update employee status.");
  }
};

  return (
    <div className="container-fluid admin-dashboard">
      <div className="row min-vh-100">

        {/* Sidebar */}
        <aside className="col-md-3 col-lg-2 admin-sidebar">

          <h4 className="mb-4">
            <i className="bi bi-grid-1x2-fill me-2"></i>
            NIVSEE CRM
          </h4>

          {/* <p className="text-secondary small">MAIN MENU</p> */}

          {menuItems.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                setActiveModule(item.name);
                setMessage("");
              }}
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

        {/* Main Content */}
        <main className="col-md-9 col-lg-10 admin-main">

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 className="fw-bold mb-1">{activeModule}</h3>
              <p className="admin-muted mb-0">
                Welcome to Nivsee CRM Admin Panel
              </p>
            </div>

            <span className="admin-role-badge">
             <i className="bi bi-shield-check me-2"></i>
              Administrator
            </span>
          </div>

          {/* Dashboard Module */}
          {activeModule === "Dashboard" && (
            <div className="row g-3">
              <div className="col-md-4">
                <div className="admin-card p-4">
                  <i className="bi bi-people fs-2 text-primary"></i>
                  <h3 className="mt-3">{employees.length}</h3>
                  <p className="text-light mb-0">Total Employees</p>
                </div>
              </div>

              <div className="col-md-4">
                <div className="admin-card p-4">
                  <i className="bi bi-person-check fs-2 text-success"></i>
                  <h3 className="mt-3">
                    {employees.filter(
                      (employee) => employee.status === "active"
                    ).length}
                  </h3>
                  <p className="text-light mb-0">Active Employees</p>
                </div>
              </div>
            </div>
          )}

          {/* Employee Module */}
          {activeModule === "Employees" && (
            <>
              <div className="admin-card p-4">

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h5 className="fw-bold mb-1">
                      Employee Management
                    </h5>
                    <p className="text-muted mb-0">
                      Add and manage company employees.
                    </p>
                  </div>

                  <button
                    className="btn admin-primary-btn"
                    onClick={() => {
                      setShowForm(!showForm);
                      setMessage("");
                    }}
                  >
                    <i className="bi bi-plus-lg me-2"></i>
                    Add Employee
                  </button>
                </div>

                {/* Add Employee Form */}
                {showForm && (
                  <form
                    onSubmit={handleAddEmployee}
                    className="admin-form p-3 mb-4"
                  >
                    <h6 className="fw-bold mb-3 text-light">
                      New Employee Details
                    </h6>

                    <div className="row g-3">

                      <div className="col-md-6">
                        <label className="form-label">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          className="form-control"
                          value={form.name}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          className="form-control"
                          value={form.email}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          className="form-control"
                          value={form.phone}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Department
                        </label>
                        <input
                          type="text"
                          name="department"
                          className="form-control"
                          value={form.department}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Designation
                        </label>
                        <input
                          type="text"
                          name="designation"
                          className="form-control"
                          value={form.designation}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          Initial Password
                        </label>
                        <input
                          type="password"
                          name="password"
                          className="form-control"
                          value={form.password}
                          onChange={handleChange}
                          required
                        />
                      </div>
                       <div className="col-12 mt-5">
                      <h6 className="fw-bold text-light mb-2">
                       Additional Employee Details
                     <span className="text-light ms-2 small">(Optional)</span>
                      </h6>

                      <p className="text-info small mb-0">
                          These details can be provided now or updated later.
                        </p>

                      {/* <hr className="border-secondary" /> */}
                      </div>
                    {/* Employee ID */}
                   <div className="col-md-6">
                    <label className="form-label">Employee ID <span className="text-light small">(Optional)</span></label>
                    <input
                      type="text"
                      name="employeeId"
                      className="form-control"
                      placeholder="NVS001"
                      value={form.employeeId}
                      onChange={handleChange}
                      required
                        />
                     </div>

{/* Date of Birth */}
<div className="col-md-6">
  <label className="form-label">Date of Birth <span className="text-light small">(Optional)</span></label>
  <input
    type="date"
    name="dateOfBirth"
    className="form-control"
    value={form.dateOfBirth}
    onChange={handleChange}
    required
  />
</div>

{/* Blood Group */}
<div className="col-md-6">
  <label className="form-label">Blood Group <span className="text-light small">(Optional)</span></label>
  <select
    name="bloodGroup"
    className="form-select"
    value={form.bloodGroup}
    onChange={handleChange}
    required
  >
    <option value="">Select Blood Group</option>
    <option value="A+">A+</option>
    <option value="A-">A-</option>
    <option value="B+">B+</option>
    <option value="B-">B-</option>
    <option value="O+">O+</option>
    <option value="O-">O-</option>
    <option value="AB+">AB+</option>
    <option value="AB-">AB-</option>
  </select>
</div>

{/* Emergency Contact */}
<div className="col-md-6">
  <label className="form-label">Emergency Contact Number <span className="text-light small">(Optional)</span></label>
  <input
    type="tel"
    name="emergencyContact"
    className="form-control"
    value={form.emergencyContact}
    onChange={handleChange}
    placeholder="Enter emergency contact"
    required
  />
</div>

                    </div>

                    <div className="d-flex gap-2 mt-4">
                      <button
                        type="submit"
                        className="btn admin-primary-btn"
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save Employee"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-light"
                        onClick={() => setShowForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {message && (
                  <div className="alert alert-info">
                    {message}
                  </div>
                )}

                {/* Employee List */}
                <h6 className="fw-bold mb-3">Employee Records</h6>

                {loading ? (
                  <p>Loading employees...</p>
                ) : employees.length === 0 ? (
                  <p className="text-muted">
                    No employees found. Click Add Employee to create your first record.
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table admin-table align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Employee ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Department</th>
                          <th>Designation</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {employees.map((employee) => (
                          <tr key={employee.id}>
                            <td>{employee.id}</td>
                            <td>{employee.name}</td>
                            <td>{employee.email}</td>
                            <td>{employee.phone}</td>
                            <td>{employee.department}</td>
                            <td>{employee.designation}</td>
                            <td>
                             <span
                                  className={
                                 employee.status === "active"
                                  ? "admin-status-active"
                              : "admin-status-inactive"
                                }
>
                            {employee.status}
                             </span>
                            </td>
                            <td>
                          <button
                           type="button"
                           className={`btn btn-sm ${
                           employee.status === "active"
                           ? "btn-danger"
                           : "btn-success"
                           }`}
                           onClick={() => handleToggleEmployeeStatus(employee)}
                          >
                      {employee.status === "active"
                      ? "Deactivate"
                      : "Activate"}
                         </button>
                         </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            </>
          )}

          {/* Other modules - to be developed */}
          {!["Dashboard", "Employees"].includes(activeModule) && (
            <div className="card border-0 shadow-sm p-5 text-center">
              <i className="bi bi-tools fs-1 text-primary"></i>
              <h5 className="mt-3">{activeModule} Module</h5>
              <p className="text-muted mb-0">
                This module will be connected to JSON Server next.
              </p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
