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

const safeWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable – ignore */
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

 const formatTimeForStorage = (timestamp) => {
  return new Date(timestamp)
    .toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    })
    .toUpperCase();
};
};
const formatTimeForStorage = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
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

    document
      .getElementById("work-report")
      ?.scrollIntoView({ behavior: "smooth" });

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
      <div className="container">

        {/* Header */}
        <motion.div
          className="emp-header"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="emp-user">
            <div className="emp-avatar"><UserRound size={28} /></div>
            <div>
              <h2>Welcome, Employee</h2>
              <div className="emp-meta">
                <span><BadgeCheck size={14} /> {session.employeeId}</span>
                <span><CalendarDays size={14} /> {formatDate(today)}</span>
              </div>
            </div>
          </div>

          <div className="emp-header-right">
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

        <div className="row g-4">

          {/* Timer card */}
          <div className="col-lg-5">
            <motion.div
              className="emp-card emp-timer-card"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h5 className="emp-card-title"><Timer size={18} /> Working Timer (9 hrs incl. breaks)</h5>

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
                  <CheckCircle2 size={16} /> 9-hour target completed (+{formatDuration(overtime)} extra)
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
                  {openBreak ? <><Play size={18} /> End Break</> : <><Coffee size={18} /> Take Break</>}
                </button>

                <button
                  type="button"
                  className="emp-btn out"
                  onClick={handleCheckOut}
                  disabled={!checkedIn || checkedOut || !reportSubmitted}
                  title={checkedIn && !checkedOut && !reportSubmitted ? "Submit the daily work report first" : ""}
                >
                  <LogOut size={18} /> Check Out
                </button>
              </div>

              {checkedIn && !checkedOut && !reportSubmitted && (
                <div className="emp-note warn">
                  <Lock size={16} /> Check Out unlocks after you submit today's work report.
                </div>
              )}
              {checkedIn && checkedOut && (
                <div className="emp-note ok">
                  <CheckCircle2 size={16} /> You have checked out for today. See you tomorrow!
                </div>
              )}
            </motion.div>

            {/* Today summary */}
            <motion.div
              className="emp-card mt-4"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h5 className="emp-card-title"><Clock size={18} /> Today's Attendance</h5>
              <ul className="emp-summary">
                <li><span>Status</span><b className={`pill ${statusClass}`}>{status}</b></li>
                <li><span>Check-In</span><b>
{todayRecord?.checkInTime ||
  (typeof todayRecord?.checkIn === "number"
    ? formatTime(todayRecord.checkIn)
    : todayRecord?.checkIn || "--")}
</b></li>
                <li><span>Check-Out</span><b>
{todayRecord?.checkOutTime ||
  (typeof todayRecord?.checkOut === "number"
    ? formatTime(todayRecord.checkOut)
    : todayRecord?.checkOut || "--")}
</b></li>
                <li><span>Expected Out (9 hrs)</span><b>{formatTime(expectedOut)}</b></li>
                <li><span>Work Report</span>
                  <b className={`pill ${reportSubmitted ? "working" : "not-checked-in"}`}>
                    {reportSubmitted ? "Submitted" : "Pending"}
                  </b>
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Report card */}
          <div className="col-lg-7">
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

          {/* History */}
          
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
                    <b className={`pill ${st.toLowerCase().replace(/\s+/g, "-")}`}>
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
