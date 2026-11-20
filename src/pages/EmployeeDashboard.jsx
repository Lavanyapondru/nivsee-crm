import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogIn, LogOut, Timer, Hourglass, Coffee, Play, ClipboardList,
  CheckCircle2, CalendarDays, Clock, UserRound, BadgeCheck, Save,
  AlertTriangle, History, Lock
} from "lucide-react";
import "./EmployeeDashboard.css";

/* ---------- Constants & storage helpers ---------- */
const SESSION_KEY = "nivsee_employee_session";
const WORK_MS = 9 * 60 * 60 * 1000; // 9 hours including breaks

const EMPTY_REPORT = {
  classesConducted: "",
  topicsCovered: "",
  projectsWorked: "",
  tasksCompleted: "",
  pendingTasks: "",
  remarks: "",
};

const REPORT_FIELDS = [
  { name: "classesConducted", label: "Classes Conducted", icon: "bi-easel2", required: true,
    placeholder: "e.g. React batch – 2 sessions, Python batch – 1 session" },
  { name: "topicsCovered", label: "Topics Covered", icon: "bi-journal-bookmark", required: true,
    placeholder: "e.g. Hooks, Routing, API integration" },
  { name: "projectsWorked", label: "Projects Worked On", icon: "bi-kanban", required: true,
    placeholder: "e.g. NIVSEE CRM – employee dashboard" },
  { name: "tasksCompleted", label: "Tasks Completed", icon: "bi-check2-square", required: true,
    placeholder: "List the tasks you finished today" },
  { name: "pendingTasks", label: "Pending Tasks", icon: "bi-hourglass-split", required: true,
    placeholder: "List pending tasks (write 'None' if nothing is pending)" },
  { name: "remarks", label: "Additional Remarks", icon: "bi-chat-left-text", required: false,
    placeholder: "Anything else you would like to mention (optional)" },
];

const safeRead = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

// Local calendar date as YYYY-MM-DD (not UTC)
const dateKey = (ts = Date.now()) => {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const pad = (n) => String(n).padStart(2, "0");
// Smooth RED to GREEN timer color
const getTimerColor = (percentage) => {
  const red = { r: 239, g: 68, b: 68 };
  const green = { r: 34, g: 197, b: 94 };

  const p = Math.max(0, Math.min(100, percentage)) / 100;

  const r = Math.round(red.r + (green.r - red.r) * p);
  const g = Math.round(red.g + (green.g - red.g) * p);
  const b = Math.round(red.b + (green.b - red.b) * p);

  return `rgb(${r}, ${g}, ${b})`;
};

const formatDuration = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
};

const formatTime = (timestamp) => {
  if (!timestamp) return "--";

  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

const formatTimeForStorage = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).toUpperCase();
};

const formatDate = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });

const breakMs = (record, now) =>
  (record?.breaks || []).reduce((sum, b) => sum + ((b.end ?? now) - b.start), 0);

/* ---------- Component ---------- */
export default function EmployeeDashboard() {
  const navigate = useNavigate();

const session = useMemo(() => safeRead(SESSION_KEY, null), []);

const employeeId = session?.employeeId;

const [records, setRecords] = useState([]);
const [attendanceLoading, setAttendanceLoading] = useState(true);

const [now, setNow] = useState(Date.now());

const [today, setToday] = useState(dateKey());
const [report, setReport] = useState(EMPTY_REPORT);
const [errors, setErrors] = useState({});
const [toast, setToast] = useState(null);
const [activeModule, setActiveModule] = useState("Dashboard");
const [employeeProfile, setEmployeeProfile] = useState(null);
const [profileLoading, setProfileLoading] = useState(true);

const menuItems = [
  { name: "Dashboard", icon: "bi-grid" },
  { name: "Attendance", icon: "bi-clock-history" },
  { name: "My Profile", icon: "bi-person" },
  { name: "Work Updates", icon: "bi-clipboard-check" },
  { name: "Tasks & Projects", icon: "bi-kanban" },
  { name: "Leave Management", icon: "bi-calendar-check" },
  { name: "Change Password", icon: "bi-key" },
  { name: "Logout", icon: "bi-box-arrow-right" }
];

  // Route protection
  useEffect(() => {
    if (!session || session.role !== "employee") {
      navigate("/login/employee", { replace: true });
    }
  }, [session, navigate]);

  // Tick every second; the time is always derived from stored timestamps,
  // so refreshing never loses or skews the timer.
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setToday(dateKey());
    }, 1000);
    return () => clearInterval(id);
  }, []);

 // Load attendance records from reporting.json
useEffect(() => {
  if (!employeeId) {
    setAttendanceLoading(false);
    return;
  }

  const loadAttendance = async () => {
    try {
      setAttendanceLoading(true);

      const data = await api.getAttendance(employeeId);

      setRecords(data);
    } catch (error) {
      console.error("Attendance loading error:", error);
      showToast("warn", "Unable to load attendance records.");
    } finally {
      setAttendanceLoading(false);
    }
  };

  loadAttendance();
}, [employeeId]);

// Load the complete employee profile from the employee JSON Server.
useEffect(() => {
  if (!employeeId) {
    setProfileLoading(false);
    return;
  }

  const loadEmployeeProfile = async () => {
    try {
      setProfileLoading(true);
      const employees = await api.getAllEmployees();
      const employeeList = Array.isArray(employees) ? employees : [];
      const currentEmployee = employeeList.find(
        (employee) => String(employee.id) === String(employeeId)
      );

      setEmployeeProfile(currentEmployee || null);
    } catch (error) {
      console.error("Employee profile loading error:", error);
      setEmployeeProfile(null);
      showToast("warn", "Unable to load employee profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  loadEmployeeProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [employeeId]);

  // const employeeId = session?.employeeId;
  const todayRecord = records.find(
    (r) => r.date === today && r.employeeId === employeeId
  );

  // Load saved report into the form whenever today's record changes
useEffect(() => {
  if (todayRecord?.report) {
    const savedReport = Object.fromEntries(
      Object.entries(todayRecord.report).filter(
        ([key]) => key in EMPTY_REPORT
      )
    );

    setReport({ ...EMPTY_REPORT, ...savedReport });
  } else {
    setReport(EMPTY_REPORT);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [todayRecord?.date, todayRecord?.report]);

  // Update today's attendance record in reporting.json
const updateToday = async (updates) => {
  const currentRecord = records.find(
    (r) => r.date === today && r.employeeId === employeeId
  );

  if (!currentRecord) {
    throw new Error("Today's attendance record was not found.");
  }

  const updatedRecord = await api.updateAttendance(
    currentRecord.id,
    updates
  );

  setRecords((previous) =>
    previous.map((r) =>
      r.id === updatedRecord.id ? updatedRecord : r
    )
  );

  return updatedRecord;
};

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3200);
  };

  /* ---------- Derived state ---------- */
const checkInTimestamp = Number(todayRecord?.checkIn);
const checkOutTimestamp = Number(todayRecord?.checkOut);

const hasValidCheckIn =
  Number.isFinite(checkInTimestamp) && checkInTimestamp > 0;

const checkedIn = !!todayRecord;
const checkedOut = !!todayRecord?.checkOut;

const openBreak = todayRecord?.breaks?.find((b) => !b.end);
const reportSubmitted = !!todayRecord?.reportSubmitted;

const status = !checkedIn
  ? "Not Checked In"
  : checkedOut
  ? "Checked Out"
  : openBreak
  ? "On Break"
  : "Working";

const endPoint =
  checkedOut && Number.isFinite(checkOutTimestamp)
    ? checkOutTimestamp
    : now;

const elapsed =
  checkedIn && hasValidCheckIn
    ? Math.max(0, endPoint - checkInTimestamp)
    : 0;

const remaining = Math.max(0, WORK_MS - elapsed);

const overtime = Math.max(0, elapsed - WORK_MS);

const progress = Math.min(
  100,
  Math.max(0, (elapsed / WORK_MS) * 100)
);

const timerColor = getTimerColor(progress);

const totalBreak = checkedIn
  ? breakMs(todayRecord, endPoint)
  : 0;

const expectedOut = hasValidCheckIn
  ? checkInTimestamp + WORK_MS
  : null;


  /* ---------- Actions ---------- */
const handleCheckIn = async () => {
  try {
    const latest = await api.getAttendance(employeeId);

    // Prevent multiple check-ins on the same day
    if (latest.some((r) => r.date === dateKey())) {
      setRecords(latest);
      showToast("warn", "You have already checked in today.");
      return;
    }

    const ts = Date.now();

    const newRecord = await api.addAttendance({
  employeeId,
  employeeCode: session.employeeCode || "",
  employeeName: session.name || "",
  date: dateKey(ts),

  checkIn: ts,
  checkInTime: formatTimeForStorage(ts),

  checkOut: null,
  checkOutTime: null,

  breaks: [],
  report: null,
  reportSubmitted: false
});
    setRecords((previous) => [...previous, newRecord]);

    showToast(
      "ok",
      `Checked in at ${formatTime(ts)}. Your 9-hour timer has started.`
    );

  } catch (error) {
    console.error("Check-in error:", error);
    showToast("warn", "Unable to save check-in. Please try again.");
  }
};

const handleBreak = async () => {
  if (!checkedIn || checkedOut) return;

  const ts = Date.now();

  try {
    if (openBreak) {
      const updatedBreaks = todayRecord.breaks.map((b) =>
        b.end ? b : { ...b, end: ts }
      );

      await updateToday({
        breaks: updatedBreaks
      });

      showToast("ok", "Welcome back! Break ended.");

    } else {
      const updatedBreaks = [
        ...(todayRecord.breaks || []),
        { start: ts, end: null }
      ];

      await updateToday({
        breaks: updatedBreaks
      });

      showToast("ok", "Break started. The 9-hour timer keeps running.");
    }

  } catch (error) {
    console.error("Break update error:", error);
    showToast("warn", "Unable to update break details.");
  }
};

  const validateReport = () => {
    const e = {};
    REPORT_FIELDS.forEach((f) => {
      if (f.required && !report[f.name].trim()) e[f.name] = `${f.label} is required.`;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };


const handleSubmitReport = async (ev) => {
  ev.preventDefault();

  if (!checkedIn || checkedOut) return;

  if (!validateReport()) {
    showToast("warn", "Please fill in all required report fields.");
    return;
  }

  const cleaned = Object.fromEntries(
    Object.entries(report).map(([k, v]) => [k, v.trim()])
  );

  const submittedAt = Date.now();

  try {
    await updateToday({
      report: {
        ...cleaned,
        submittedAt: submittedAt,
        submittedTime: formatTimeForStorage(submittedAt)
      },
      reportSubmitted: true
    });

    showToast(
      "ok",
      "Daily work report saved. You can now check out."
    );

  } catch (error) {
    console.error("Report update error:", error);
    showToast("warn", "Unable to save your work report.");
  }
};


const handleCheckOut = async () => {
  if (!checkedIn || checkedOut) return;

  if (!todayRecord?.reportSubmitted) {
    showToast(
      "warn",
      "Submit today's work report before checking out."
    );

    setActiveModule("Work Updates");
    return;
  }

  const ts = Date.now();

  try {
    const updatedBreaks = (todayRecord.breaks || []).map((b) =>
      b.end ? b : { ...b, end: ts }
    );
await updateToday({
  checkOut: ts,
  checkOutTime: formatTimeForStorage(ts),
  breaks: updatedBreaks
});

    showToast(
      "ok",
      `Checked out at ${formatTime(ts)}. Great work today!`
    );

  } catch (error) {
    console.error("Check-out error:", error);
    showToast("warn", "Unable to save check-out. Please try again.");
  }
};
const handleLogout = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("nivsee_employee_id");

  navigate("/login/employee");
};

  const onField = (e) => {
    setReport((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((p) => ({ ...p, [e.target.name]: undefined }));
  };

  if (!session || session.role !== "employee") return null;

  const history = records
    .filter((r) => r.employeeId === employeeId)
    .sort((a, b) => b.checkIn - a.checkIn);

  const statusClass = status.toLowerCase().replace(/\s+/g, "-");
  const statusIcon = {
    "Not Checked In": <Clock size={16} />,
    Working: <Play size={16} />,
    "On Break": <Coffee size={16} />,
    "Checked Out": <CheckCircle2 size={16} />,
  }[status];

  const ringR = 92;
  const ringC = 2 * Math.PI * ringR;

  return (
    <section className="emp-dashboard">
      <div className="emp-layout">
        <aside className="emp-sidebar">
          <div className="emp-brand">
            <div className="emp-brand-mark">N</div>
            <div>
              <h4>NIVSEE CRM</h4>
              <span>EMPLOYEE PORTAL</span>
            </div>
          </div>

          <nav className="emp-navigation" aria-label="Employee dashboard navigation">
            {menuItems.map((item) => (
              <button
                type="button"
                key={item.name}
                className={`emp-menu-btn ${activeModule === item.name ? "active" : ""}`}
                onClick={() => item.name === "Logout" ? handleLogout() : setActiveModule(item.name)}
              >
                <i className={`bi ${item.icon}`} />
                <span>{item.name}</span>
                {activeModule === item.name && item.name !== "Logout" && (
                  <i className="bi bi-chevron-right emp-menu-arrow" />
                )}
              </button>
            ))}
          </nav>

          <div className="emp-sidebar-footer">
            <span className="emp-sidebar-dot" />
            Employee Workspace
          </div>
        </aside>

        <main className="emp-main">
          <motion.div
            className="emp-topbar"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div>
              <span className="emp-eyebrow">EMPLOYEE PORTAL</span>
              <h1>{activeModule}</h1>
              <p>{formatDate(today)}</p>
            </div>
            <div className="emp-topbar-right">
              <span className={`emp-status ${statusClass}`}>
                <span className="emp-dot" />
                {statusIcon}
                {status}
              </span>
              <button type="button" className="emp-logout" onClick={handleLogout}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </motion.div>

          {activeModule === "Dashboard" && (
            <motion.div
              className="emp-module-content"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="emp-welcome-card">
                <div>
                  <span className="emp-eyebrow">YOUR WORKSPACE</span>
                  <h2>Welcome, {employeeProfile?.name || session.name || "Employee"}!</h2>
                  <p>Here's your attendance and work summary for today.</p>
                </div>
                <div className="emp-welcome-icon"><UserRound size={34} /></div>
              </div>

              <div className="row g-4 mt-1">
                <div className="col-md-6 col-xl-4">
                  <div className="emp-overview-card">
                    <span className="emp-overview-icon"><Clock size={20} /></span>
                    <small>Today's Status</small>
                    <strong>{status}</strong>
                    <button type="button" onClick={() => setActiveModule("Attendance")}>
                      View attendance <i className="bi bi-arrow-right" />
                    </button>
                  </div>
                </div>
                <div className="col-md-6 col-xl-4">
                  <div className="emp-overview-card">
                    <span className="emp-overview-icon"><Timer size={20} /></span>
                    <small>Working Time</small>
                    <strong>{formatDuration(elapsed)}</strong>
                    <span className="emp-overview-caption">of 09:00:00 target</span>
                    <button type="button" onClick={() => setActiveModule("Attendance")}>
                      Open timer <i className="bi bi-arrow-right" />
                    </button>
                  </div>
                </div>
                <div className="col-md-6 col-xl-4">
                  <div className="emp-overview-card">
                    <span className="emp-overview-icon"><ClipboardList size={20} /></span>
                    <small>Daily Work Report</small>
                    <strong>{reportSubmitted ? "Submitted" : "Pending"}</strong>
                    <span className="emp-overview-caption">Today's work update</span>
                    <button type="button" onClick={() => setActiveModule("Work Updates")}>
                      {reportSubmitted ? "View report" : "Add work update"} <i className="bi bi-arrow-right" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="emp-card emp-quick-card mt-4">
                <h5 className="emp-card-title"><BadgeCheck size={19} /> Quick Actions</h5>
                <div className="emp-quick-actions">
                  <button type="button" onClick={() => setActiveModule("Attendance")}>
                    <Timer size={18} /> Attendance
                  </button>
                  <button type="button" onClick={() => setActiveModule("Work Updates")}>
                    <ClipboardList size={18} /> Work Updates
                  </button>
                  <button type="button" onClick={() => setActiveModule("My Profile")}>
                    <UserRound size={18} /> My Profile
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeModule === "Attendance" && (
            <motion.div
              className="emp-module-content"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              {attendanceLoading && (
                <div className="emp-loading">Loading attendance records...</div>
              )}
             
<div className="row g-4">

  {/* Timer Card - First Column */}
  <div className="col-lg-6">
    <motion.div
      className="emp-card emp-timer-card h-100"
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <h5 className="emp-card-title">
        <Timer size={18} /> Working Timer (9 hrs incl. breaks)
      </h5>

      <div className="emp-ring">
        <svg viewBox="0 0 220 220">
          {/* Background Circle */}
          <circle
            cx="110"
            cy="110"
            r={ringR}
            className="ring-bg"
          />

          {/* Dynamic RED to GREEN Progress Circle */}
          <circle
            cx="110"
            cy="110"
            r={ringR}
            className="ring-fg"
            style={{ stroke: timerColor }}
            strokeDasharray={ringC}
            strokeDashoffset={ringC * (1 - progress / 100)}
            transform="rotate(-90 110 110)"
          />
        </svg>

        <div className="emp-ring-text">
          <small>Elapsed</small>
          <strong>{formatDuration(elapsed)}</strong>
          <span>{Math.floor(progress)}% of 9 hrs</span>
        </div>
      </div>

      <div className="emp-time-grid">
        <div className="emp-time-box">
          <Hourglass size={18} />
          <small>Remaining</small>
          <strong>{formatDuration(remaining)}</strong>
        </div>

        <div className="emp-time-box">
          <Coffee size={18} />
          <small>Break Time</small>
          <strong>{formatDuration(totalBreak)}</strong>
        </div>
      </div>

      {overtime > 0 && (
        <div className="emp-note ok">
          <CheckCircle2 size={16} />
          9-hour target completed (+{formatDuration(overtime)} extra)
        </div>
      )}

      {/* Actions */}
      <div className="emp-actions">
        <button
          type="button"
          className="emp-btn in"
          onClick={handleCheckIn}
          disabled={checkedIn || attendanceLoading}
        >
          <LogIn size={18} /> Check In
        </button>

        <button
          type="button"
          className="emp-btn brk"
          onClick={handleBreak}
          disabled={!checkedIn || checkedOut}
        >
          {openBreak ? (
            <>
              <Play size={18} /> End Break
            </>
          ) : (
            <>
              <Coffee size={18} /> Take Break
            </>
          )}
        </button>

        <button
          type="button"
          className="emp-btn out"
          onClick={handleCheckOut}
          disabled={!checkedIn || checkedOut || !reportSubmitted}
          title={
            checkedIn && !checkedOut && !reportSubmitted
              ? "Submit the daily work report first"
              : ""
          }
        >
          <LogOut size={18} /> Check Out
        </button>
      </div>

      {checkedIn && !checkedOut && !reportSubmitted && (
        <div className="emp-note warn">
          <Lock size={16} />
          Check Out unlocks after you submit today's work report.
        </div>
      )}

      {checkedIn && checkedOut && (
        <div className="emp-note ok">
          <CheckCircle2 size={16} />
          You have checked out for today. See you tomorrow!
        </div>
      )}
    </motion.div>
  </div>

  {/* Today's Attendance - Second Column */}
  <div className="col-lg-6">
    <motion.div
      className="emp-card h-70"
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <h5 className="emp-card-title">
        <Clock size={18} /> Today's Attendance
      </h5>

      <ul className="emp-summary">
        <li>
          <span>Status</span>
          <b className={`pill ${statusClass}`}>{status}</b>
        </li>

        <li>
          <span>Check-In</span>
          <b>
            {todayRecord?.checkInTime ||
              (typeof todayRecord?.checkIn === "number"
                ? formatTime(todayRecord.checkIn)
                : todayRecord?.checkIn || "--")}
          </b>
        </li>

        <li>
          <span>Check-Out</span>
          <b>
            {todayRecord?.checkOutTime ||
              (typeof todayRecord?.checkOut === "number"
                ? formatTime(todayRecord.checkOut)
                : todayRecord?.checkOut || "--")}
          </b>
        </li>

        <li>
          <span>Expected Out (9 hrs)</span>
          <b>{formatTime(expectedOut)}</b>
        </li>

        <li>
          <span>Work Report</span>
          <b
            className={`pill ${
              reportSubmitted ? "working" : "not-checked-in"
            }`}
          >
            {reportSubmitted ? "Submitted" : "Pending"}
          </b>
        </li>
      </ul>
    </motion.div>
  </div>

  {/* Attendance History - Full Width */}
  <div className="col-12">
    <motion.div
      className="emp-card"
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
    >
      <h5 className="emp-card-title">
        <History size={18} /> Attendance History
      </h5>

      {history.length === 0 ? (
        <div className="emp-empty small">
          <p>No attendance records yet.</p>
        </div>
      ) : (
        <div className="emp-table-wrap">
          <table className="emp-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Worked</th>
                <th>Status</th>
                <th>Report</th>
              </tr>
            </thead>

            <tbody>
              {history.map((r) => {
                const isToday = r.date === today;

                const st = r.checkOut
                  ? "Checked Out"
                  : isToday
                  ? status
                  : "Missed Check-Out";

                const worked =
                  (r.checkOut || (isToday ? now : r.checkIn)) -
                  r.checkIn;

                return (
                  <tr key={r.date}>
                    <td data-label="Date">
                      {formatDate(r.date)}
                    </td>

                    <td data-label="Check-In">
                      {r.checkInTime ||
                        (typeof r.checkIn === "number"
                          ? formatTime(r.checkIn)
                          : r.checkIn || "--")}
                    </td>

                    <td data-label="Check-Out">
                      {r.checkOutTime ||
                        (typeof r.checkOut === "number"
                          ? formatTime(r.checkOut)
                          : r.checkOut || "--")}
                    </td>

                    <td data-label="Worked">
                      {typeof worked === "number" &&
                      Number.isFinite(worked)
                        ? formatDuration(worked)
                        : "--"}
                    </td>

                    <td data-label="Status">
                      <b
                        className={`pill ${st
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {st}
                      </b>
                    </td>

                    <td data-label="Report">
                      {r.reportSubmitted ? "Submitted" : "Pending"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  </div>

</div>

            </motion.div>
          )}

          {activeModule === "Work Updates" && (
            <motion.div
              className="emp-module-content"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
          {/* Report card */}
          <div className="col-12">
            <motion.div
              id="work-report"
              className="emp-card"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <h5 className="emp-card-title"><ClipboardList size={18} /> Today's Work Updates</h5>

              {!checkedIn ? (
                <div className="emp-empty">
                  <LogIn size={38} />
                  <p>Check in to start your day. The daily work report will be available once you are checked in.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitReport} noValidate>
                  <div className="row g-3">
                    {REPORT_FIELDS.map((f) => (
                      <div className="col-12" key={f.name}>
                        <label className="emp-label" htmlFor={f.name}>
                          <i className={`bi ${f.icon}`}></i> {f.label}
                          {f.required && <span className="req">*</span>}
                        </label>
                        <textarea
                          id={f.name}
                          name={f.name}
                          rows={2}
                          value={report[f.name]}
                          onChange={onField}
                          placeholder={f.placeholder}
                          disabled={checkedOut}
                          className={errors[f.name] ? "invalid" : ""}
                        />
                        <AnimatePresence>
                          {errors[f.name] && (
                            <motion.small
                              className="emp-error"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                            >
                              <AlertTriangle size={13} /> {errors[f.name]}
                            </motion.small>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>

                  {!checkedOut && (
                    <button type="submit" className="emp-btn save mt-4">
                      <Save size={18} /> {reportSubmitted ? "Update Report" : "Submit Report"}
                    </button>
                  )}
                  {checkedOut && (
                    <div className="emp-note ok mt-3">
                      <Lock size={16} /> Report locked after check-out.
                    </div>
                  )}
                </form>
              )}
            </motion.div>
          </div>
            </motion.div>
          )}

          {activeModule === "My Profile" && (
            <motion.div
              className="emp-module-content"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="emp-card">
                <h5 className="emp-card-title"><UserRound size={20} /> Employee Details</h5>
                {profileLoading ? (
                  <div className="emp-loading">Loading your profile...</div>
                ) : employeeProfile ? (
                  <div className="emp-profile-grid">
                    <div className="emp-profile-item">
                      <span>Full Name</span>
                      <strong>{employeeProfile.name || session.name || "--"}</strong>
                    </div>
                    <div className="emp-profile-item">
                      <span>Employee ID</span>
                      <strong>{employeeProfile.employeeDetails?.employeeId || session.employeeCode || employeeProfile.id || "--"}</strong>
                    </div>
                    <div className="emp-profile-item">
                      <span>Email Address</span>
                      <strong>{employeeProfile.email || session.email || "--"}</strong>
                    </div>
                    <div className="emp-profile-item">
                      <span>Phone Number</span>
                      <strong>{employeeProfile.phone || employeeProfile.employeeDetails?.phone || "--"}</strong>
                    </div>
                    <div className="emp-profile-item">
                      <span>Department</span>
                      <strong>{employeeProfile.department || "--"}</strong>
                    </div>
                    <div className="emp-profile-item">
                      <span>Designation</span>
                      <strong>{employeeProfile.designation || "--"}</strong>
                    </div>
                    <div className="emp-profile-item">
                      <span>Date of Birth</span>
                      <strong>{employeeProfile.employeeDetails?.dateOfBirth || "--"}</strong>
                    </div>
                    <div className="emp-profile-item">
                      <span>Blood Group</span>
                      <strong>{employeeProfile.employeeDetails?.bloodGroup || "--"}</strong>
                    </div>
                    <div className="emp-profile-item">
                      <span>Emergency Contact</span>
                      <strong>{employeeProfile.employeeDetails?.emergencyContact || "--"}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="emp-empty">
                    <UserRound size={34} />
                    <p>Employee profile could not be found. Please contact your administrator.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeModule === "Tasks & Projects" && (
            <div className="emp-card emp-placeholder">
              <span className="emp-placeholder-icon"><ClipboardList size={30} /></span>
              <h3>Tasks &amp; Projects</h3>
              <p>Your assigned tasks and project details will appear here once this module is connected to the CRM task data.</p>
              <span className="emp-coming-soon">Module setup pending</span>
            </div>
          )}

          {activeModule === "Leave Management" && (
            <div className="emp-card emp-placeholder">
              <span className="emp-placeholder-icon"><CalendarDays size={30} /></span>
              <h3>Leave Management</h3>
              <p>Leave balances, applications and approval status will appear here when the leave management API is added.</p>
              <span className="emp-coming-soon">Module setup pending</span>
            </div>
          )}

          {activeModule === "Change Password" && (
            <div className="emp-card emp-placeholder">
              <span className="emp-placeholder-icon"><Lock size={30} /></span>
              <h3>Change Password</h3>
              <p>Password updates are not connected yet. This section is a placeholder so the menu is ready for the password API and validation.</p>
              <span className="emp-coming-soon">Module setup pending</span>
            </div>
          )}
        </main>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`emp-toast ${toast.type}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
          >
            {toast.type === "ok" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
