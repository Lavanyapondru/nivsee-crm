import { useEffect, useState } from "react";
import { MaterialReactTable } from "material-react-table";
import { useNavigate, useOutletContext } from "react-router-dom";
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

// Receive sidebar module from AdminLayout
const { activeModule, setActiveModule } = useOutletContext();
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  // Track whether the form is in edit mode
const [isEditMode, setIsEditMode] = useState(false);

// Store the employee currently being edited
const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Attendance module data and filters
  const [allAttendance, setAllAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [historyDate, setHistoryDate] = useState("");

//updated form fields 
const [form, setForm] = useState({
    employeeId: "",
    name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    password: "",
    dateOfBirth: "",
    bloodGroup: "",
    emergencyContact: "",
    panNumber: "",
    aadhaarNumber: "",
    photo: null
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
    const { name, value } = e.target;

    setForm((previousForm) => ({
        ...previousForm,
        [name]: value
    }));
};

// Fetch complete employee details and open the edit form
const handleEditEmployee = async (employee) => {
    try {
        // Show loading state
        setSaving(true);
        setMessage("");

        // Fetch complete employee details from backend
        const employeeDetails = await api.getEmployeeById(
            employee.id
        );

        // Store selected employee
        setSelectedEmployee(employeeDetails);

        // Enable edit mode
        setIsEditMode(true);

        // Fill form with existing employee information
        setForm({
            employeeId: employeeDetails.employeeCode || "",
            name: employeeDetails.name || "",
            email: employeeDetails.email || "",
            phone: employeeDetails.phone || "",
            department: employeeDetails.department || "",
            designation: employeeDetails.designation || "",
            password: "",

            dateOfBirth: employeeDetails.dateOfBirth
                ? String(employeeDetails.dateOfBirth).slice(0, 10)
                : "",

            bloodGroup: employeeDetails.bloodGroup || "",
            emergencyContact: employeeDetails.emergencyContact || "",

            // Existing identity details from protected API
            panNumber: employeeDetails.panNumber || "",
            aadhaarNumber: employeeDetails.aadhaarNumber || "",

            photo: null
        });

        // Open employee form
        setShowForm(true);

    } catch (error) {
        console.error("Fetch Employee Details Error:", error.message);
        setMessage(error.message || "Unable to load employee details.");
    } finally {
        setSaving(false);
    }
};

 // Handle employee photo selection
const handlePhotoChange = (e) => {
    const selectedPhoto = e.target.files[0];

    // If no file is selected, stop
    if (!selectedPhoto) return;

    // Update photo in React state
    setForm((previousForm) => ({
        ...previousForm,
        photo: selectedPhoto
    }));
};

// Handle both Add Employee and Update Employee
const handleSubmitEmployee = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
        setSaving(true);

        // Photo is required only when adding a new employee
        if (!isEditMode && !form.photo) {
            setMessage("Please select an employee photo.");
            return;
        }

        // Create FormData to send employee details and photo
        const formData = new FormData();

        formData.append("name", form.name.trim());
        formData.append("email", form.email.trim().toLowerCase());
        formData.append("phone", form.phone.trim());
        formData.append("department", form.department.trim());
        formData.append("designation", form.designation.trim());

        formData.append("employeeId", form.employeeId.trim());
        formData.append("dateOfBirth", form.dateOfBirth);
        formData.append("bloodGroup", form.bloodGroup);
        formData.append("emergencyContact", form.emergencyContact.trim());

        formData.append("panNumber", form.panNumber.trim().toUpperCase());
        formData.append("aadhaarNumber", form.aadhaarNumber.trim());

        // Password is required only when adding an employee
        if (!isEditMode) {
            formData.append("password", form.password);
        }

        // Append photo only if a new photo is selected
        if (form.photo) {
            formData.append("photo", form.photo);
        }

        // Decide whether to Add or Update
        if (isEditMode) {
            await api.updateEmployee(selectedEmployee.id, formData);
            setMessage("Employee updated successfully!");
        } else {
            await api.addEmployee(formData);
            setMessage("Employee added successfully!");
        }

        // Reset employee form
        setForm({
            employeeId: "",
            name: "",
            email: "",
            phone: "",
            department: "",
            designation: "",
            password: "",
            dateOfBirth: "",
            bloodGroup: "",
            emergencyContact: "",
            panNumber: "",
            aadhaarNumber: "",
            photo: null
        });

        setIsEditMode(false);
        setSelectedEmployee(null);
        setShowForm(false);

        // Refresh employee records
        await loadEmployees();

    } catch (error) {
        console.error("Employee Save Error:", error);
        setMessage(error.message || "Unable to save employee.");

    } finally {
        setSaving(false);
    }
};


// const handleLogout = () => {
//   // Remove JWT authentication token
//   localStorage.removeItem("nivsee_admin_token");

//   // Remove admin session
//   localStorage.removeItem("nivsee_admin_session");

//   // Navigate to admin login
//   navigate("/login/admin", { replace: true });
// };
//   const menuItems = [
//     { name: "Dashboard", icon: "bi-grid" },
//     { name: "Employees", icon: "bi-people" },
//     { name: "Attendance", icon: "bi-clock-history" },
//     { name: "Projects", icon: "bi-kanban" },
//     { name: "Tasks", icon: "bi-list-check" },
//     { name: "Leaves", icon: "bi-calendar-check" },
//     { name: "Reports", icon: "bi-bar-chart" }
//   ];

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
  <div className="admin-dashboard-content">

  </div>
  );
}

export default AdminDashboard;
