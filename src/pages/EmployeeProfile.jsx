
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MaterialReactTable } from "material-react-table";
import { api } from "../services/api";
import "./EmployeeProfile.css";

const tabs = [
    { name: "Attendance", icon: "bi-calendar-check" },
    { name: "Tasks", icon: "bi-check2-square" },
    { name: "Leaves", icon: "bi-calendar2-minus" },
    { name: "Projects", icon: "bi-kanban" },
    { name: "Documents", icon: "bi-folder2-open" }
];

const API_URL = (
    import.meta.env.VITE_API_URL || "http://192.168.0.100:5000"
).replace(/\/$/, "");

// Convert database date into YYYY-MM-DD for date inputs
const getInputDate = (value) => {
    if (!value) return "";

    if (typeof value === "string") {
        const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

// ============================================
// ATTENDANCE HELPER FUNCTIONS
// ============================================

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

// Format timestamp into readable time
const formatAttendanceTime = (timestamp) => {
    if (!timestamp) return "--";

    return new Date(Number(timestamp)).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

// Calculate total working hours after subtracting breaks
const calculateWorkingHours = (record) => {
    if (!record.checkIn) return "--";

    const startTime = Number(record.checkIn);

    // If employee has checked out, use checkout time.
    // Otherwise, calculate up to the current time.
    const endTime = record.checkOut
        ? Number(record.checkOut)
        : Date.now();

    let totalBreakTime = 0;

    (record.breaks || []).forEach((breakItem) => {
        if (!breakItem.start) return;

        const breakStart = Number(breakItem.start);

        // An unfinished break is calculated up to now.
        const breakEnd = breakItem.end
            ? Number(breakItem.end)
            : Date.now();

        totalBreakTime += Math.max(0, breakEnd - breakStart);
    });

    const workingMilliseconds = Math.max(
        0,
        endTime - startTime - totalBreakTime
    );

    const totalMinutes = Math.floor(
        workingMilliseconds / (1000 * 60)
    );

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
};


function EmployeeProfile() {
    const { id } = useParams();

    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [saveMessage, setSaveMessage] = useState("");
    const [photoError, setPhotoError] = useState(false);

    const [activeTab, setActiveTab] = useState("Attendance");

    // Edit mode
    const [isEditMode, setIsEditMode] = useState(false);

    // Selected replacement photo
    const [newPhoto, setNewPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState("");
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceError, setAttendanceError] = useState("");

    // Editable employee form
    const [form, setForm] = useState({
        employeeId: "",
        name: "",
        email: "",
        phone: "",
        department: "",
        designation: "",
        dateOfBirth: "",
        bloodGroup: "",
        emergencyContact: "",
        address: "",
        joiningDate: "",
        panNumber: "",
        aadhaarNumber: ""
    });


    // Separate today's and previous attendance
    const todayDate = getTodayDate();

    const todayAttendance = attendanceRecords.filter(
        (record) => record.date === todayDate
    );

    const previousAttendance = attendanceRecords.filter(
        (record) => record.date < todayDate
    );

    // Today's attendance MRT columns
    const todayAttendanceColumns = [
        {
            accessorFn: (row) => formatAttendanceTime(row.checkIn),
            id: "checkIn",
            header: "Check In Time",
        },
        {
            accessorFn: (row) => formatAttendanceTime(row.checkOut),
            id: "checkOut",
            header: "Check Out Time",
        },
        {
            accessorFn: (row) => calculateWorkingHours(row),
            id: "workingHours",
            header: "Total Working Hours",
        },
        {
            accessorKey: "status",
            header: "Status",
            Cell: ({ cell }) => {
                const status = cell.getValue();
                return status ? (
                    <span className={`attendance-status ${status}`}>
                        {status.replace("_", " ").toUpperCase()}
                    </span>
                ) : "--";
            },
        },
    ];

    // Previous attendance history MRT columns
    const historyAttendanceColumns = [
        {
            accessorKey: "date",
            header: "Date",
        },
        {
            accessorFn: (row) => formatAttendanceTime(row.checkIn),
            id: "checkIn",
            header: "Check In Time",
        },
        {
            accessorFn: (row) => formatAttendanceTime(row.checkOut),
            id: "checkOut",
            header: "Check Out Time",
        },
        {
            accessorFn: (row) => calculateWorkingHours(row),
            id: "workingHours",
            header: "Total Working Hours",
        },
        {
            accessorKey: "status",
            header: "Status",
            Cell: ({ cell }) => {
                const status = cell.getValue();
                return status ? (
                    <span className={`attendance-status ${status}`}>
                        {status.replace("_", " ").toUpperCase()}
                    </span>
                ) : "--";
            },
        },
    ];

    // Load employee profile
    const loadEmployee = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await api.getEmployeeById(id);

            const employeeData = data.employee || data;

            setEmployee(employeeData);
            setPhotoError(false);

        } catch (err) {
            console.error("Employee Profile Error:", err);
            setError(err.message || "Unable to load employee profile.");
        } finally {
            setLoading(false);
        }
    };
    // Fetch attendance whenever the Attendance tab is opened
    useEffect(() => {
        if (activeTab !== "Attendance" || !id) return;

        let isCurrent = true;

        const fetchAttendance = async () => {
            try {
                setAttendanceLoading(true);
                setAttendanceError("");

                const records = await api.getEmployeeAttendance(id);

                if (isCurrent) {
                    setAttendanceRecords(records);
                }
            } catch (err) {
                console.error("Employee Attendance Error:", err);
                if (isCurrent) {
                    setAttendanceError(
                        err.message || "Unable to load attendance records"
                    );
                }
            } finally {
                if (isCurrent) {
                    setAttendanceLoading(false);
                }
            }
        };

        fetchAttendance();

        return () => {
            isCurrent = false;
        };
    }, [activeTab, id]);

    useEffect(() => {
        loadEmployee();
    }, [id]);

    // Populate form using existing employee details
    const openEditMode = () => {
        if (!employee) return;

        setForm({
            employeeId: employee.employeeCode || employee.employeeId || "",
            name: employee.name || "",
            email: employee.email || "",
            phone: employee.phone || "",
            department: employee.department || "",
            designation: employee.designation || "",
            dateOfBirth: getInputDate(employee.dateOfBirth),
            bloodGroup: employee.bloodGroup || "",
            emergencyContact: employee.emergencyContact || "",
            address: employee.address || "",
            joiningDate: getInputDate(employee.joiningDate),
            panNumber: employee.panNumber || "",
            aadhaarNumber: employee.aadhaarNumber || ""
        });

        setNewPhoto(null);
        setPhotoPreview("");
        setSaveMessage("");
        setIsEditMode(true);
    };

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    // Handle replacement photo
    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];

        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/jpg",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            setSaveMessage("Please select a valid image file.");
            e.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setSaveMessage("Photo size must be less than 5 MB.");
            e.target.value = "";
            return;
        }

        setSaveMessage("");
        setNewPhoto(file);

        setPhotoPreview(URL.createObjectURL(file));
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setIsEditMode(false);
        setNewPhoto(null);
        setPhotoPreview("");
        setSaveMessage("");
    };

    // Save employee changes
    const handleSaveChanges = async (e) => {
        e.preventDefault();

        setSaveMessage("");

        try {
            setSaving(true);

            if (
                !form.name.trim() ||
                !form.email.trim() ||
                !form.phone.trim() ||
                !form.employeeId.trim() ||
                !form.department.trim() ||
                !form.designation.trim()
            ) {
                setSaveMessage("Please fill all required fields.");
                return;
            }

            // Create multipart FormData
            const formData = new FormData();

            formData.append("name", form.name.trim());
            formData.append("email", form.email.trim().toLowerCase());
            formData.append("phone", form.phone.trim());

            formData.append("employeeId", form.employeeId.trim());
            formData.append("department", form.department.trim());
            formData.append("designation", form.designation.trim());

            formData.append("dateOfBirth", form.dateOfBirth);
            formData.append("bloodGroup", form.bloodGroup);
            formData.append("emergencyContact", form.emergencyContact.trim());

            formData.append("address", form.address.trim());
            formData.append("joiningDate", form.joiningDate);

            formData.append("panNumber", form.panNumber.trim().toUpperCase());
            formData.append("aadhaarNumber", form.aadhaarNumber.trim());

            // Attach new photo only if selected
            if (newPhoto) {
                formData.append("photo", newPhoto);
            }

            // Use existing Node.js + MySQL update API
            await api.updateEmployee(employee.id, formData);

            // Reload updated profile from backend
            const updatedData = await api.getEmployeeById(id);
            const updatedEmployee = updatedData.employee || updatedData;

            setEmployee(updatedEmployee);

            setIsEditMode(false);
            setNewPhoto(null);
            setPhotoPreview("");
            setPhotoError(false);

            setSaveMessage("Employee profile updated successfully!");

        } catch (err) {
            console.error("Employee Profile Update Error:", err);

            setSaveMessage(
                err.message || "Unable to update employee profile."
            );
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (value) => {
        if (!value) return "Not provided";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const maskValue = (value) => {
        if (!value) return "Not provided";

        const text = String(value);

        return `${"*".repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`;
    };

    if (loading) {
        return (
            <div className="employee-profile-state">
                <div className="spinner-border text-info" />
                <p>Loading employee profile...</p>
            </div>
        );
    }

    if (error || !employee) {
        return (
            <div className="employee-profile-state">
                <i className="bi bi-exclamation-circle fs-2"></i>
                <h5>Unable to load employee</h5>
                <p>{error || "Employee record not found."}</p>

                <Link to="/admin/dashboard" className="btn profile-back-btn">
                    Back to Employees
                </Link>
            </div>
        );
    }

    const photoUrl = employee.photoPath
        ? `${API_URL}${employee.photoPath}`
        : "";

    const employeeCode =
        employee.employeeCode || employee.employeeId || "N/A";

    return (
        <div className="employee-profile-page">

            {/* Page heading */}
            <div className="profile-top-heading">
                <Link to="/admin/dashboard" className="profile-back-btn">
                    <i className="bi bi-arrow-left me-2"></i>
                    Back to Employees
                </Link>

                <h3>
                    {isEditMode ? "Edit Employee Profile" : "Employee Profile"}
                </h3>
            </div>

            {/* Success / error message */}
            {saveMessage && (
                <div className="alert alert-info mt-3" role="alert">
                    {saveMessage}
                </div>
            )}

            {/* EDIT MODE */}
            {isEditMode ? (

                <form onSubmit={handleSaveChanges}>
                    <div className="profile-info-card mt-3">

                        <div className="profile-info-heading mb-4">
                            <div className="profile-info-icon personal">
                                <i className="bi bi-pencil-square"></i>
                            </div>

                            <h5>Edit Employee Information</h5>
                        </div>

                        {/* Photo */}
                        <div className="mb-4">
                            <label className="form-label">
                                Employee Photo
                            </label>

                            <div className="d-flex align-items-center gap-3 flex-wrap">

                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="New employee preview"
                                        className="employee-edit-photo"
                                    />
                                ) : photoUrl && !photoError ? (
                                    <img
                                        src={photoUrl}
                                        alt="Current employee"
                                        className="employee-edit-photo"
                                        onError={() => setPhotoError(true)}
                                    />
                                ) : (
                                    <div className="profile-photo-placeholder">
                                        <i className="bi bi-person-circle"></i>
                                    </div>
                                )}

                                <input
                                    type="file"
                                    className="form-control"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handlePhotoChange}
                                />
                            </div>

                            <small className="text-secondary">
                                Optional. JPG, PNG or WEBP. Maximum 5 MB.
                            </small>
                        </div>

                        <div className="row g-3">

                            <div className="col-md-6">
                                <label className="form-label">Employee Code *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="employeeId"
                                    value={form.employeeId}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Employee Name *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Email *</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Phone *</label>
                                <input
                                    type="tel"
                                    className="form-control"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Department *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="department"
                                    value={form.department}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Designation *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="designation"
                                    value={form.designation}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Date of Birth</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    name="dateOfBirth"
                                    value={form.dateOfBirth}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Blood Group</label>
                                <select
                                    className="form-select"
                                    name="bloodGroup"
                                    value={form.bloodGroup}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Blood Group</option>
                                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(group => (
                                        <option key={group} value={group}>
                                            {group}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Emergency Contact</label>
                                <input
                                    type="tel"
                                    className="form-control"
                                    name="emergencyContact"
                                    value={form.emergencyContact}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Joining Date</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    name="joiningDate"
                                    value={form.joiningDate}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="col-12">
                                <label className="form-label">Address</label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    name="address"
                                    value={form.address}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">PAN Number</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="panNumber"
                                    value={form.panNumber}
                                    onChange={handleChange}
                                    maxLength="10"
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Aadhaar Number</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="aadhaarNumber"
                                    value={form.aadhaarNumber}
                                    onChange={handleChange}
                                    maxLength="12"
                                />
                            </div>

                        </div>

                        {/* Form actions */}
                        <div className="d-flex justify-content-end gap-2 mt-4">

                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleCancelEdit}
                                disabled={saving}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check-circle me-2"></i>
                                        Save Changes
                                    </>
                                )}
                            </button>

                        </div>
                    </div>
                </form>

            ) : (

                /* VIEW MODE */
                <>
                    <div className="row g-3">

                        {/* Left employee card */}
                        <div className="col-xl-3 col-lg-4">
                            <div className="profile-person-card">

                                <div className="profile-photo-wrapper">
                                    {photoUrl && !photoError ? (
                                        <img
                                            className="profile-photo"
                                            src={photoUrl}
                                            alt={`${employee.name} profile`}
                                            onError={() => setPhotoError(true)}
                                        />
                                    ) : (
                                        <div className="profile-photo-placeholder">
                                            <i className="bi bi-person-circle"></i>
                                        </div>
                                    )}

                                    <span
                                        className={`profile-active-badge ${
                                            employee.status === "inactive" ? "inactive" : ""
                                        }`}
                                    >
                                        {employee.status || "Active"}
                                    </span>
                                </div>

                                <h4>{employee.name}</h4>
                                <p className="profile-code">{employeeCode}</p>

                                <p className="profile-designation">
                                    {employee.designation || "Designation not provided"}
                                </p>

                                <span className="profile-department-badge">
                                    {employee.department || "Department not provided"}
                                </span>

                                <div className="profile-contact-list">
                                    <p>
                                        <i className="bi bi-envelope"></i>
                                        <span>{employee.email || "Not provided"}</span>
                                    </p>
                                    <p>
                                        <i className="bi bi-telephone"></i>
                                        <span>{employee.phone || "Not provided"}</span>
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="btn profile-edit-btn"
                                    onClick={openEditMode}
                                >
                                    <i className="bi bi-pencil-square me-2"></i>
                                    Edit Profile
                                </button>

                            </div>
                        </div>

                        {/* Right information cards */}
                        <div className="col-xl-9 col-lg-8">
                            <div className="row g-3">

                                <div className="col-md-6">
                                    <InfoCard
                                        title="Personal Details"
                                        icon="bi-person-fill"
                                        iconClass="personal"
                                        items={[
                                            ["Employee ID", employeeCode],
                                            ["Date of Birth", formatDate(employee.dateOfBirth)],
                                            ["Blood Group", employee.bloodGroup],
                                            ["Emergency Contact", employee.emergencyContact]
                                        ]}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoCard
                                        title="Contact Details"
                                        icon="bi-telephone-fill"
                                        iconClass="contact"
                                        items={[
                                            ["Email", employee.email],
                                            ["Phone", employee.phone],
                                            ["Address", employee.address]
                                        ]}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoCard
                                        title="Work Details"
                                        icon="bi-briefcase-fill"
                                        iconClass="work"
                                        items={[
                                            ["Department", employee.department],
                                            ["Designation", employee.designation],
                                            ["Joining Date", formatDate(employee.joiningDate)],
                                            ["Status", employee.status || "Active"]
                                        ]}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <InfoCard
                                        title="Identity Details"
                                        icon="bi-shield-lock-fill"
                                        iconClass="identity"
                                        items={[
                                            ["PAN Number", maskValue(employee.panNumber)],
                                            ["Aadhaar Number", maskValue(employee.aadhaarNumber)]
                                        ]}
                                    />
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Existing employee modules */}
                    <section className="profile-modules-card">

                        <div className="profile-tabs">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.name}
                                    type="button"
                                    className={`profile-tab ${
                                        activeTab === tab.name ? "active" : ""
                                    }`}
                                    onClick={() => setActiveTab(tab.name)}
                                >
                                    <i className={`bi ${tab.icon}`}></i>
                                    {tab.name}
                                </button>
                            ))}
                        </div>

                     <div className="profile-tab-content" key={activeTab}>
{activeTab === "Attendance" ? (

    <div className="employee-attendance-section">

        {/* =================================
            TODAY'S ATTENDANCE
        ================================== */}

        <div className="attendance-table-container">

            <div className="attendance-section-heading">
                <div>
                    <h5>Today's Attendance</h5>
                    {/* <p>Employee attendance details for today</p> */}
                </div>

                {/* <span className="attendance-record-count">
                    {todayAttendance.length} Record(s)
                </span> */}
            </div>

            {attendanceLoading ? (
                <p className="attendance-message">
                    Loading today's attendance...
                </p>
            ) : (
                <MaterialReactTable
                    columns={todayAttendanceColumns}
                    data={todayAttendance}

                    enableColumnActions={false}
                    enableColumnFilters={false}
                    enableDensityToggle={false}
                    enableFullScreenToggle={false}
                    enableHiding={false}
                    enableGlobalFilter={false}
                    enablePagination={false}
                    enableSorting={false}

                    renderEmptyRowsFallback={() => (
                        <div className="attendance-empty">
                            No attendance recorded today.
                        </div>
                    )}

                 muiTablePaperProps
                    muiTableHeadCellProps={{
                        sx: {
                            backgroundColor: "#16465d",
                            color: "#48d9ee",
                            fontWeight: 600,
                            fontSize: "13px",
                            borderBottom: "1px solid #24536a",
                        },
                    }}

                    muiTableBodyCellProps={{
                        sx: {
                            backgroundColor: "#0d3043",
                            color: "#ffffff",
                            fontSize: "13px",
                            borderBottom: "1px solid #24536a",
                        },
                    }}

                    muiTableBodyRowProps={{
                        sx: {
                            "&:hover td": {
                                backgroundColor: "#16465d",
                            },
                        },
                    }}
                />
            )}

        </div>


        {/* =================================
            PREVIOUS ATTENDANCE HISTORY
        ================================== */}

        <div className="attendance-table-container">

            <div className="attendance-section-heading">
                <div>
                    <h5>Previous Attendance History</h5>
                    {/* <p>Complete attendance records of this employee</p> */}
                </div>

                {/* <span className="attendance-record-count">
                    {previousAttendance.length} Record(s)
                </span> */}
            </div>

            {attendanceLoading ? (
                <p className="attendance-message">
                    Loading attendance history...
                </p>
            ) : (
                <MaterialReactTable
                    columns={historyAttendanceColumns}
                    data={previousAttendance}

                    enableColumnActions={false}
                    enableColumnFilters={true}
                    enableDensityToggle={false}
                    enableFullScreenToggle={false}
                    enableHiding={false}
                    enableGlobalFilter={true}
                    enablePagination={true}
                    enableSorting={true}

                    initialState={{
                        pagination: {
                            pageIndex: 0,
                            pageSize: 5,
                        },
                    }}

                    renderEmptyRowsFallback={() => (
                        <div className="attendance-empty">
                            No previous attendance history.
                        </div>
                    )}

                  muiTablePaperProps
                    muiTableHeadCellProps={{
                        sx: {
                            backgroundColor: "#16465d",
                            color: "#48d9ee",
                            fontWeight: 600,
                            fontSize: "13px",
                            borderBottom: "1px solid #24536a",
                        },
                    }}

                    muiTableBodyCellProps={{
                        sx: {
                            backgroundColor: "#0d3043",
                            color: "#ffffff",
                            fontSize: "13px",
                            borderBottom: "1px solid #24536a",
                        },
                    }}

                    muiTableBodyRowProps={{
                        sx: {
                            "&:hover td": {
                                backgroundColor: "#16465d",
                            },
                        },
                    }}
                />
            )}

        </div>

        {/* Error message */}
        {attendanceError && (
            <p className="text-danger mt-3">
                {attendanceError}
            </p>
        )}

    </div>

) : (

    // Other profile tabs keep their existing Coming Soon content
    <>
        <div className="profile-coming-icon">
            <i className={`bi ${
                tabs.find((tab) => tab.name === activeTab)?.icon
            }`}></i>
        </div>

        <h5>{activeTab}</h5>

        <p>
            {activeTab} information for this employee will be updated soon.
        </p>

        <span>Coming Soon</span>
    </>

)}
</div>
                    </section>
                </>
            )}

        </div>
    );
}

// Reusable information card
function InfoCard({ title, icon, iconClass, items }) {
    return (
        <div className="profile-info-card">
            <div className="profile-info-heading">
                <div className={`profile-info-icon ${iconClass}`}>
                    <i className={`bi ${icon}`}></i>
                </div>

                <h5>{title}</h5>
            </div>

            <div className="profile-info-list">
                {items.map(([label, value]) => (
                    <div className="profile-info-row" key={label}>
                        <span>{label}</span>
                        <strong>{value || "Not provided"}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default EmployeeProfile;
