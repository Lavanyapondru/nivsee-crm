import { useEffect, useState } from "react";
import { MaterialReactTable } from "material-react-table";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import AdminLeave from "../components/AdminLeave";
import AdminProjectsTasks from "../components/AdminProjectsTasks";
import "./AdminDashboard.css";


// Convert a date to YYYY-MM-DD using the browser's local date.
const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Match attendance records to employee records.+
// Older records may store either the JSON Server ID or the company employee ID.
const attendanceBelongsToEmployee = (record, employee) => {
  const possibleIds = [
    employee?.id,
    employee?.employeeId,
    employee?.employeeDetails?.employeeId
  ].filter(Boolean).map(String);

  return possibleIds.includes(String(record?.employeeId));
};

const formatAttendanceTime = (value, fallbackTime) => {
  const timeValue = fallbackTime || value;

  if (timeValue === null || timeValue === undefined || timeValue === "") {
    return "--";
  }

  if (typeof timeValue === "number" || /^\d{10,}$/.test(String(timeValue))) {
    const date = new Date(Number(timeValue));
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  return String(timeValue);
};

// Supports numeric timestamps and older records that saved time as text.
const getTimeInMinutes = (value) => {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number" || /^\d{10,}$/.test(String(value))) {
    return Math.floor(Number(value) / 60000);
  }

  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toLowerCase();

  if (period === "pm" && hours !== 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

const getWorkedDuration = (record, isToday = false) => {
  const start = getTimeInMinutes(record.checkIn);
  const endValue = record.checkOut ?? (isToday ? Date.now() : null);
  const end = getTimeInMinutes(endValue);

  if (start === null || end === null || end < start) return "--";

  let totalMinutes = end - start;

  // Deduct completed breaks when their values are numeric timestamps.
  (record.breaks || []).forEach((item) => {
    if (typeof item.start === "number" && typeof item.end === "number") {
      totalMinutes -= Math.max(0, Math.floor((item.end - item.start) / 60000));
    }
  });

  totalMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
};

const getAttendanceStatus = (record) => {
  if (!record || !record.checkIn) {
    return "Not Checked In";
  }

  if (record.checkOut) {
    return "Completed";
  }

  const workedMinutes = getWorkedDuration(record, true);
  const requiredMinutes = 9 * 60;

  if (workedMinutes >= requiredMinutes) {
    return "Unknown";
  }

  return "Working";
};
const getHistoryStatus = (record) => {
  if (!record || !record.checkIn) {
    return "Not Checked In";
  }

  if (record.checkOut) {
    return "Completed";
  }

  // For an open historical record, measure elapsed time from check-in until now.
  // Numeric timestamps are used by the current attendance flow.
  if (typeof record.checkIn === "number" || /^\d{10,}$/.test(String(record.checkIn))) {
    const start = Number(record.checkIn);
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - start) / 60000));
    const completedBreakMinutes = (record.breaks || []).reduce((total, item) => {
      if (typeof item.start === "number" && typeof item.end === "number") {
        return total + Math.max(0, Math.floor((item.end - item.start) / 60000));
      }
      return total;
    }, 0);

    return elapsedMinutes - completedBreakMinutes >= 9 * 60
      ? "Unknown"
      : "Working";
  }

  // Legacy text-time records cannot reliably establish elapsed time across dates.
  return "Working";
};



function AdminDashboard() {
  const navigate = useNavigate();

  const [activeModule, setActiveModule] = useState("Dashboard");
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Attendance module data and filters
  const [allAttendance, setAllAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [historyDate, setHistoryDate] = useState("");

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

  // Fetch all employees and all attendance records for the admin view.
  const loadAttendanceData = async () => {
    try {
      setAttendanceLoading(true);
      setAttendanceError("");

      const [employeeData, attendanceData] = await Promise.all([
        api.getAllEmployees(),
        api.getAllAttendance()
      ]);

      setEmployees(employeeData);
      setAllAttendance(attendanceData);
    } catch (error) {
      console.error("Unable to load attendance data:", error);
      setAttendanceError("Unable to load attendance records. Please check that the employee and attendance JSON Servers are running.");
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Load attendance only when the admin opens the Attendance module.
  useEffect(() => {
    if (activeModule === "Attendance") {
      loadAttendanceData();
    }
  }, [activeModule]);

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
  // Remove JWT authentication token
  localStorage.removeItem("nivsee_admin_token");

  // Remove admin session
  localStorage.removeItem("nivsee_admin_session");

  // Navigate to admin login
  navigate("/login/admin", { replace: true });
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
                  <MaterialReactTable
                    columns={[
                      { accessorKey: "id", header: "Employee ID" },
                      { accessorKey: "name", header: "Name" },
                      { accessorKey: "email", header: "Email" },
                      { accessorKey: "phone", header: "Phone" },
                      { accessorKey: "department", header: "Department" },
                      { accessorKey: "designation", header: "Designation" },
                      {
                        accessorKey: "status",
                        header: "Status",
                        Cell: ({ cell }) => {
                          const status = cell.getValue();
                          return (
                           <span
        className={`admin-attendance-status ${status
          .toLowerCase()
          .replace(/\s+/g, "-")}`}
      >
        {status}
      </span>
                          );
                        }
                      },
                      {
                        id: "action",
                        header: "Action",
                        enableSorting: false,
                        enableColumnFilter: false,
                        Cell: ({ row }) => {
                          const employee = row.original;
                          return (
                            <button
                              type="button"
                              className={`btn btn-sm ${employee.status === "active" ? "btn-danger" : "btn-success"}`}
                              onClick={() => handleToggleEmployeeStatus(employee)}
                            >
                              {employee.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                          );
                        }
                      }
                    ]}
                    data={employees}
                    enableSorting
                    enableColumnFilters
                    enablePagination
                    enableGlobalFilter
                    initialState={{ pagination: { pageSize: 5, pageIndex: 0 } }}
                    muiTablePaperProps={{
                      className: "admin-mrt-paper",
                      sx: {
                        backgroundColor: "var(--navy-light)",
                        color: "var(--white)",
                        border: "1px solid rgba(89, 242, 254, 0.15)",
                        borderRadius: "12px",
                        boxShadow: "none",
                        overflow: "hidden"
                      }
                    }}
                    muiTopToolbarProps={{
                      sx: {
                        backgroundColor: "var(--navy-light)",
                        color: "var(--white)",
                        "& .MuiIconButton-root, & .MuiSvgIcon-root": { color: "var(--cyan)" },
                        "& .MuiInputBase-root": { color: "var(--white)" },
                        "& .MuiFormLabel-root": { color: "var(--muted)" }
                      }
                    }}
                    muiBottomToolbarProps={{
                      sx: {
                        backgroundColor: "var(--navy-light)",
                        color: "var(--white)",
                        "& .MuiIconButton-root, & .MuiSvgIcon-root": { color: "var(--cyan)" },
                        "& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { color: "var(--white)" },
                        "& .MuiSelect-icon": { color: "var(--cyan)" }
                      }
                    }}
                    muiTableHeadCellProps={{
                      sx: {
                        backgroundColor: "var(--navy)",
                        color: "var(--cyan)",
                        borderBottom: "1px solid var(--teal)",
                        fontWeight: 700,
                        whiteSpace: "nowrap"
                      }
                    }}
                    muiTableBodyCellProps={{
                      sx: {
                        backgroundColor: "var(--navy-light)",
                        color: "var(--white)",
                        borderBottom: "1px solid rgba(165, 186, 200, 0.15)",
                        whiteSpace: "nowrap"
                      }
                    }}
                    muiTableBodyRowProps={{
                      sx: {
                        "&:hover td": {
                          backgroundColor: "var(--teal)",
                          color: "var(--white)"
                        }
                      }
                    }}
                    muiSearchTextFieldProps={{
                      sx: {
                        "& .MuiInputBase-root": { color: "var(--white)" },
                        "& .MuiInputLabel-root": { color: "var(--muted)" }
                      }
                    }}
                  />
                )}

              </div>
            </>
          )}

          {/* Admin Attendance Module */}
          {activeModule === "Attendance" && (() => {
            const today = getLocalDateKey();
            const todayRecords = allAttendance.filter(
              (record) => record.date === today
            );

            // One row per employee. If there is a record for today, attach it.
            const todayRows = employees.map((employee) => {
              const employeeRecord = todayRecords.find((record) =>
                attendanceBelongsToEmployee(record, employee)
              );
              return { employee, record: employeeRecord || null };
            }).filter(({ employee, record }) => {
              const search = attendanceSearch.trim().toLowerCase();
              if (!search) return true;

              return [
                employee.name,
                employee.id,
                employee.employeeDetails?.employeeId,
                employee.department
              ].some((value) => String(value || "").toLowerCase().includes(search))
              || String(record?.employeeName || "").toLowerCase().includes(search);
            });

            // Only dates before today are shown in the previous-history table.
            const previousRecords = allAttendance
              .filter((record) => record.date && record.date < today)
              .filter((record) => !historyDate || record.date === historyDate)
              .filter((record) => {
                const search = attendanceSearch.trim().toLowerCase();
                if (!search) return true;

                const matchedEmployee = employees.find((employee) =>
                  attendanceBelongsToEmployee(record, employee)
                );
                return [
                  record.employeeName,
                  record.employeeId,
                  matchedEmployee?.name,
                  matchedEmployee?.department,
                  matchedEmployee?.employeeDetails?.employeeId
                ].some((value) => String(value || "").toLowerCase().includes(search));
              })
              .sort((a, b) => `${b.date}-${b.checkIn}`.localeCompare(`${a.date}-${a.checkIn}`));

            const checkedInCount = todayRecords.length;
            const workingCount = todayRecords.filter((record) => !record.checkOut).length;
            const completedCount = todayRecords.filter((record) => Boolean(record.checkOut)).length;

            return (
              <div className="admin-attendance-module">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                  <div>
                    <h5 className="fw-bold mb-1">Attendance Management</h5>
                    <p className="admin-muted mb-0">
                      View today's check-in/check-out details and previous attendance records.
                    </p>
                  </div>
                 
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-sm-6 col-xl-3">
                    <div className="admin-card admin-attendance-stat p-3">
                      <span className="admin-muted small">Total Employees</span>
                      <h3 className="mb-0 mt-2">{employees.length}</h3>
                    </div>
                  </div>
                  <div className="col-sm-6 col-xl-3">
                    <div className="admin-card admin-attendance-stat p-3">
                      <span className="admin-muted small">Checked In Today</span>
                      <h3 className="mb-0 mt-2">{checkedInCount}</h3>
                    </div>
                  </div>
                  <div className="col-sm-6 col-xl-3">
                    <div className="admin-card admin-attendance-stat p-3">
                      <span className="admin-muted small">Currently Working</span>
                      <h3 className="mb-0 mt-2">{workingCount}</h3>
                    </div>
                  </div>
                  <div className="col-sm-6 col-xl-3">
                    <div className="admin-card admin-attendance-stat p-3">
                      <span className="admin-muted small">Checked Out Today</span>
                      <h3 className="mb-0 mt-2">{completedCount}</h3>
                    </div>
                  </div>
                </div>

                <div className="admin-card p-3 p-md-4 mb-4">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                    <div>
                      <h5 className="fw-bold mb-1">Today's Employee Attendance</h5>
                      <p className="admin-muted small mb-0">
                        {new Date(`${today}T00:00:00`).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "long", year: "numeric"
                        })}
                      </p>
                    </div>
                    
                    {/* <span className="admin-attendance-count">
                      {todayRows.length} employees
                    </span> */}
                     <button
                    type="button"
                    className="btn admin-outline-btn"
                    onClick={loadAttendanceData}
                    disabled={attendanceLoading}
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    {attendanceLoading ? "Refreshing..." : "Refresh"}
                  </button>
                    
                  </div>

                  <div className="mb-3">
                    <input
                      type="search"
                      className="form-control admin-attendance-search"
                      placeholder="Search by employee name, ID or department..."
                      value={attendanceSearch}
                      onChange={(event) => setAttendanceSearch(event.target.value)}
                    />
                  </div>

                  {attendanceLoading ? (
                    <p className="admin-muted mb-0">Loading attendance records...</p>
                  ) : attendanceError ? (
                    <div className="alert alert-danger mb-0">{attendanceError}</div>
                  ) : (
                    <MaterialReactTable
                      columns={[
                        { accessorKey: "employeeId", header: "Employee ID" },
                        { accessorKey: "employeeName", header: "Employee Name" },
                        { accessorKey: "department", header: "Department" },
                        { accessorKey: "checkIn", header: "Check-in" },
                        { accessorKey: "checkOut", header: "Check-out" },
                        { accessorKey: "workingHours", header: "Working Hours" },
                        {
  accessorKey: "status",
  header: "Status",
  Cell: ({ cell }) => {
    const status = cell.getValue();

    return (
      <span
        className={`admin-attendance-status ${
          status === "Working"
            ? "is-working"
            : status === "Completed"
              ? "is-completed"
              : status === "Unknown"
                ? "unknown"
                : "is-absent"
        }`}
      >
        {status}
      </span>
    );
  },
}
                      ]}
                      data={todayRows.map(({ employee, record }) => ({
                        id: employee.id,
                        employeeId: employee.employeeDetails?.employeeId || employee.employeeId || employee.id,
                        employeeName: employee.name || record?.employeeName || "--",
                        department: employee.department || "--",
                        checkIn: record ? formatAttendanceTime(record.checkIn, record.checkInTime) : "--",
                        checkOut: record ? formatAttendanceTime(record.checkOut, record.checkOutTime) : "--",
                        workingHours: record ? getWorkedDuration(record, true) : "--",
                        status: getAttendanceStatus(record)
                      }))}
                      getRowId={(row) => String(row.id)}
                      enableSorting
                      enableColumnFilters
                      enablePagination
                      enableGlobalFilter={false}
                      initialState={{ pagination: { pageSize: 5, pageIndex: 0 } }}
                      muiTablePaperProps={{
                        className: "admin-mrt-paper",
                        sx: {
                          backgroundColor: "var(--navy-light)",
                          color: "var(--white)",
                          border: "1px solid rgba(89, 242, 254, 0.15)",
                          borderRadius: "12px",
                          boxShadow: "none",
                          overflow: "hidden"
                        }
                      }}
                      muiTopToolbarProps={{
                        sx: {
                          backgroundColor: "var(--navy-light)",
                          color: "var(--white)",
                          "& .MuiIconButton-root, & .MuiSvgIcon-root": { color: "var(--cyan)" },
                          "& .MuiInputBase-root": { color: "var(--white)" },
                          "& .MuiFormLabel-root": { color: "var(--muted)" }
                        }
                      }}
                      muiBottomToolbarProps={{
                        sx: {
                          backgroundColor: "var(--navy-light)",
                          color: "var(--white)",
                          "& .MuiIconButton-root, & .MuiSvgIcon-root": { color: "var(--cyan)" },
                          "& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { color: "var(--white)" },
                          "& .MuiSelect-icon": { color: "var(--cyan)" }
                        }
                      }}
                      muiTableHeadCellProps={{
                        sx: {
                          backgroundColor: "var(--navy)",
                          color: "var(--cyan)",
                          borderBottom: "1px solid var(--teal)",
                          fontWeight: 700,
                          fontSize: "12px",
                          whiteSpace: "nowrap"
                        }
                      }}
                      muiTableBodyCellProps={{
                        sx: {
                          backgroundColor: "var(--navy-light)",
                          color: "var(--white)",
                          borderBottom: "1px solid rgba(165, 186, 200, 0.15)",
                          fontSize: "13px",
                          whiteSpace: "nowrap"
                        }
                      }}
                      muiTableBodyRowProps={{
                        sx: {
                          "&:hover td": {
                            backgroundColor: "var(--teal)",
                            color: "var(--white)"
                          }
                        }
                      }}
                    />
                  )}
                </div>

                <div className="admin-card p-3 p-md-4">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                    <div>
                      <h5 className="fw-bold mb-1">Previous Attendance History</h5>
                      <p className="admin-muted small mb-0">
                        Attendance records saved before today.
                      </p>
                    </div>
                    <div className="admin-history-filter">
                      <label className="form-label small mb-1" htmlFor="attendance-history-date">
                        Filter by date
                      </label>
                      <input
                        id="attendance-history-date"
                        type="date"
                        className="form-control"
                        value={historyDate}
                        max={today}
                        onChange={(event) => setHistoryDate(event.target.value)}
                      />
                    </div>
                  </div>

                  {attendanceLoading ? (
                    <p className="admin-muted mb-0">Loading previous history...</p>
                  ) : attendanceError ? (
                    <p className="admin-muted mb-0">History is unavailable until attendance data loads.</p>
                  ) : (
                    <MaterialReactTable
                      columns={[
                        { accessorKey: "dateLabel", header: "Date" },
                        { accessorKey: "employeeId", header: "Employee ID" },
                        { accessorKey: "employeeName", header: "Employee Name" },
                        { accessorKey: "checkIn", header: "Check-in" },
{
  accessorKey: "checkOut",
  header: "Check-out",
  Cell: ({ row }) => {
    const record = row.original;

    return record.checkOut
      ? formatAttendanceTime(record.checkOut)
      : record.checkIn
        ? "Unknown"
        : "--";
  },
},                        { accessorKey: "workingHours", header: "Working Hours" },
                        {
                          accessorKey: "status",
                          header: "Status",
                          Cell: ({ cell }) => {
                            const status = cell.getValue();
                            return (
                              <span className={`admin-attendance-status ${
                                status === "Working" ? "is-working" :
                                status === "Completed" ? "is-completed" :
                                status === "Unknown" ? "unknown" : "is-absent"
                              }`}>
                                {status}
                              </span>
                            );
                          }
                        }
                      ]}
                      data={previousRecords.map((record) => {
                        const employee = employees.find((item) =>
                          attendanceBelongsToEmployee(record, item)
                        );
                        return {
                          id: record.id,
                          dateLabel: record.date
                            ? new Date(`${record.date}T00:00:00`).toLocaleDateString("en-IN")
                            : "--",
                          employeeId:
                            employee?.employeeDetails?.employeeId ||
                            employee?.employeeId ||
                            record.employeeCode ||
                            record.employeeId ||
                            "--",
                          employeeName: employee?.name || record.employeeName || "--",
                          checkIn: formatAttendanceTime(record.checkIn, record.checkInTime),
                          checkOut: formatAttendanceTime(record.checkOut, record.checkOutTime),
                          workingHours: getWorkedDuration(record, false),
                          status: getHistoryStatus(record)
                        };
                      })}
                      getRowId={(row) => String(row.id)}
                      enableSorting
                      enableColumnFilters
                      enablePagination
                      enableGlobalFilter={false}
                      initialState={{ pagination: { pageSize: 5, pageIndex: 0 } }}
                      muiTablePaperProps={{
                        className: "admin-mrt-paper",
                        sx: {
                          backgroundColor: "var(--navy-light)",
                          color: "var(--white)",
                          border: "1px solid rgba(89, 242, 254, 0.15)",
                          borderRadius: "12px",
                          boxShadow: "none",
                          overflow: "hidden"
                        }
                      }}
                      muiTopToolbarProps={{
                        sx: {
                          backgroundColor: "var(--navy-light)",
                          color: "var(--white)",
                          "& .MuiIconButton-root, & .MuiSvgIcon-root": { color: "var(--cyan)" },
                          "& .MuiInputBase-root": { color: "var(--white)" },
                          "& .MuiFormLabel-root": { color: "var(--muted)" }
                        }
                      }}
                      muiBottomToolbarProps={{
                        sx: {
                          backgroundColor: "var(--navy-light)",
                          color: "var(--white)",
                          "& .MuiIconButton-root, & .MuiSvgIcon-root": { color: "var(--cyan)" },
                          "& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { color: "var(--white)" },
                          "& .MuiSelect-icon": { color: "var(--cyan)" }
                        }
                      }}
                      muiTableHeadCellProps={{
                        sx: {
                          backgroundColor: "var(--navy)",
                          color: "var(--cyan)",
                          borderBottom: "1px solid var(--teal)",
                          fontWeight: 700,
                          fontSize: "12px",
                          whiteSpace: "nowrap"
                        }
                      }}
                      muiTableBodyCellProps={{
                        sx: {
                          backgroundColor: "var(--navy-light)",
                          color: "var(--white)",
                          borderBottom: "1px solid rgba(165, 186, 200, 0.15)",
                          fontSize: "13px",
                          whiteSpace: "nowrap"
                        }
                      }}
                      muiTableBodyRowProps={{
                        sx: {
                          "&:hover td": {
                            backgroundColor: "var(--teal)",
                            color: "var(--white)"
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })()}

          {/* Other modules - to be developed */}
        
{/* Admin Leave Module */}
{activeModule === "Leaves" && <AdminLeave />}

{/* Projects & Tasks Module */}
{["Projects", "Tasks"].includes(activeModule) && (
  <AdminProjectsTasks
    key={activeModule}
    initialTab={activeModule === "Tasks" ? "tasks" : "projects"}
  />
)}

{/* Other modules - to be developed */}
{![
  "Dashboard",
  "Employees",
  "Attendance",
  "Leaves",
  "Projects",
  "Tasks"
].includes(activeModule) && (
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
