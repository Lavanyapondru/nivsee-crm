import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Send, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Chip } from "@mui/material";
import { MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { api } from "../services/api";
import "./EmployeeLeave.css";

const initialForm = {
  fromDate: "",
  toDate: "",
  reason: ""
};

const formatDate = (value) => {
  if (!value) return "--";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const getStatusColor = (status) => {
  const value = String(status || "Pending").toLowerCase();
  if (value === "approved") return "success";
  if (value === "cancelled" || value === "canceled") return "error";
  return "warning";
};

export default function EmployeeLeave({
  employeeRecordId,
  employeeId,
  employeeName
}) {
  const [form, setForm] = useState(initialForm);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const closeMessage = () => {
  setMessage("");
};

  const loadLeaves = async () => {
    if (!employeeRecordId) {
      setError("Employee session was not found. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await api.getEmployeeLeaves(employeeRecordId);
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Leave loading error:", err);
      setError("Unable to load your leave requests. Please check the leave server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
    // employeeRecordId identifies the logged-in employee.
  }, [employeeRecordId]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.fromDate || !form.toDate || !form.reason.trim()) {
      setError("Please complete all leave application fields.");
      return;
    }

    if (form.toDate < form.fromDate) {
      setError("To Date cannot be earlier than From Date.");
      return;
    }

    if (form.fromDate < new Date().toLocaleDateString("en-CA")) {
      setError("Please select today or a future date.");
      return;
    }

    if (!employeeRecordId || !employeeId || !employeeName) {
      setError("Employee details are incomplete. Please refresh or log in again.");
      return;
    }

    const leaveRequest = {
      employeeRecordId,
      employeeId,
      employeeName,
      fromDate: form.fromDate,
      toDate: form.toDate,
      reason: form.reason.trim(),
      appliedDate: new Date().toLocaleDateString("en-CA"),
      status: "Pending"
    };

    try {
      setSubmitting(true);
      const savedLeave = await api.addLeave(leaveRequest);
      setLeaves((current) => [savedLeave, ...current]);
      setForm(initialForm);
      setMessage("Your leave request has been submitted. Its status is Pending.");
    } catch (err) {
      console.error("Leave submission error:", err);
      setError("Unable to submit your leave request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "appliedDate",
        header: "Applied Date",
        Cell: ({ cell }) => formatDate(cell.getValue()),
      },
      {
        accessorKey: "fromDate",
        header: "From Date",
        Cell: ({ cell }) => formatDate(cell.getValue())
      },
      {
        accessorKey: "toDate",
        header: "To Date",
        Cell: ({ cell }) => formatDate(cell.getValue())
      },
      {
        accessorKey: "reason",
        header: "Reason",
        minSize: 220,
        Cell: ({ cell }) => (
          <span className="leave-mrt-reason">{cell.getValue() || "--"}</span>
        )
      },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ cell }) => {
          const status = cell.getValue() || "Pending";
          return (
            <Chip
              label={status}
              color={getStatusColor(status)}
              size="small"
              variant="filled"
            />
          );
        }
      }
    ],
    []
  );

  const sortedLeaves = useMemo(
    () =>
      [...leaves].sort((a, b) =>
        String(b.appliedDate || "").localeCompare(String(a.appliedDate || ""))
      ),
    [leaves]
  );

 const table = useMaterialReactTable({
  columns,
  data: sortedLeaves,
  getRowId: (row) => String(row.id),

  enableColumnActions: false,
  enableColumnFilters: true,
  enableDensityToggle: false,
  enableFullScreenToggle: false,
  enableHiding: false,
  enableSorting: true,

  initialState: {
    density: "comfortable",
    pagination: { pageIndex: 0, pageSize: 5 },
    sorting: [{ id: "appliedDate", desc: true }]
  },

  muiTablePaperProps: {
    elevation: 0,
    sx: {
      backgroundColor: "#0C3045",
      border: "1px solid #17465e",
      borderRadius: "12px",
      overflow: "hidden"
    }
  },

  muiTableContainerProps: {
    sx: {
      backgroundColor: "#000000"
    }
  },

  muiTableHeadCellProps: {
    sx: {
      backgroundColor: "#092337 !important",
      color: "#59F2FE !important",
      fontWeight: 700,
      borderBottom: "1px solid #17465e"
    }
  },

  muiTableBodyCellProps: {
    sx: {
      backgroundColor: "#000000 !important",
      color: "#ffffff !important",
      fontSize: "0.875rem",
      borderBottom: "1px solid #17465e",

      "&, & *": {
        color: "#ffffff !important"
      }
    }
  },

  muiTableBodyRowProps: {
    sx: {
      backgroundColor: "#000000 !important",

      "&:hover td": {
        backgroundColor: "#092337 !important",
        color: "#ffffff !important"
      }
    }
  },

  muiTopToolbarProps: {
    sx: {
      backgroundColor: "#092337",
      color: "#ffffff"
    }
  },
  
  // Top toolbar - search icon and input
muiSearchTextFieldProps: {
  placeholder: "Search...",
  variant: "outlined",
  size: "small",
  sx: {
    "& .MuiInputBase-root": {
      color: "#ffffff",
      backgroundColor: "#000000",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#59F2FE",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "#59F2FE",
    },
    "& .MuiSvgIcon-root": {
      color: "#59F2FE",
    },
  },
},

// Toolbar icon buttons
muiTopToolbarProps: {
  sx: {
    backgroundColor: "#092337",
    color: "#ffffff",

    "& .MuiIconButton-root": {
      color: "#59F2FE",
    },
    "& .MuiSvgIcon-root": {
      color: "#59F2FE",
    },
  },
},

// Bottom pagination toolbar
muiBottomToolbarProps: {
  sx: {
    backgroundColor: "#092337",
    color: "#ffffff",

    "& .MuiTablePagination-root": {
      color: "#ffffff",
    },
    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
      color: "#ffffff",
    },
    "& .MuiSelect-select": {
      color: "#59F2FE",
    },
    "& .MuiSvgIcon-root": {
      color: "#ffffff",
    },
    "& .MuiIconButton-root": {
      color: "#ffffff",
    },
    "& .MuiIconButton-root.Mui-disabled": {
      color: "#ffffff",
    },
  },
},

  muiBottomToolbarProps: {
    sx: {
      backgroundColor: "#092337",
      color: "#ffffff"
    }
  },

  state: {
    isLoading: loading
  }
});

  return (
    <div className="emp-module-content employee-leave">
      {/* <div className="leave-intro">
        <div>
          <span className="emp-eyebrow">EMPLOYEE SERVICES</span>
          <h2>Leave Application</h2>
          <p>Submit a leave request and track its approval status.</p>
        </div>
        <div className="leave-intro-icon"><CalendarDays size={27} /></div>
      </div> */}

       <div className="emp-card leave-history-card">
        <div className="leave-history-heading">
          <h5 className="emp-card-title"><Clock size={18} /> My Leave Requests</h5>
          <button type="button" className="leave-refresh" onClick={loadLeaves} disabled={loading}>
            <i class="bi bi-arrow-clockwise me-2"></i>Refresh
          </button>
        </div>

        {!loading && leaves.length === 0 ? (
          <div className="emp-empty small">
            <CalendarDays size={32} />
            <p>You haven't submitted any leave requests yet.</p>
          </div>
        ) : (
          <div className="leave-mrt-wrap">
            <MaterialReactTable table={table} />
          </div>
        )}
      </div>

      <div className="emp-card leave-form-card">
        <h5 className="emp-card-title"><Send size={18} /> Apply for Leave</h5>

        <form onSubmit={handleSubmit} className="leave-form">
          <div className="leave-form-grid">
            <div>
              <label className="emp-label" htmlFor="leave-from-date">From Date <span className="req">*</span></label>
              <input
                id="leave-from-date"
                className="leave-input"
                type="date"
                name="fromDate"
                min={new Date().toLocaleDateString("en-CA")}
                value={form.fromDate}
                onChange={onChange}
                required
              />
            </div>

            <div>
              <label className="emp-label" htmlFor="leave-to-date">To Date <span className="req">*</span></label>
              <input
                id="leave-to-date"
                className="leave-input"
                type="date"
                name="toDate"
                min={form.fromDate || new Date().toLocaleDateString("en-CA")}
                value={form.toDate}
                onChange={onChange}
                required
              />
            </div>
          </div>

          <div>
            <label className="emp-label" htmlFor="leave-reason">Reason for Leave <span className="req">*</span></label>
            <textarea
              id="leave-reason"
              className="leave-input leave-reason"
              name="reason"
              rows={4}
              placeholder="Please explain the reason for your leave..."
              value={form.reason}
              onChange={onChange}
              maxLength={500}
              required
            />
          </div>

          {error && <div className="leave-alert error"><AlertCircle size={16} /> {error}</div>}
           {message && (
            <div className="leave-alert success">
          <CheckCircle2 size={18} />
          <span>{message}</span>

            <button
         type="button"
         className="leave-alert-close"
         onClick={closeMessage}
         aria-label="Close alert"
        >
        &times;
          </button>
       </div>
          )}
          <button className="emp-btn save leave-submit" type="submit" disabled={submitting}>
            <Send size={17} /> {submitting ? "Submitting..." : "Submit Leave Request"}
          </button>
        </form>
      </div>

     
    </div>
  );
}
