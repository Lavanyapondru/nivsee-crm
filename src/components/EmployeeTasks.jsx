
import { useEffect, useState } from "react";
import { MaterialReactTable } from "material-react-table";
import { api } from "../services/api";
import "./EmployeeTaks.css";

const getStatusClass = (status) =>
  (status || "Pending").toLowerCase().replace(/\s+/g, "-");

const EmployeeTasks = ({ employeeId }) => {
  const [tasks, setTasks] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingTaskId, setSavingTaskId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!employeeId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const loadTasks = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await api.getEmployeeTasks(employeeId);
        const assignedTasks = Array.isArray(data) ? data : [];

        setTasks(assignedTasks);

        const initialDrafts = {};

        assignedTasks.forEach((task) => {
          initialDrafts[task.id] = {
            status: task.status || "Pending",
            message: task.employeeMessage || "",
          };
        });

        setDrafts(initialDrafts);
      } catch (err) {
        console.error("Unable to load employee tasks:", err);
        setError("Unable to load assigned tasks.");
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [employeeId]);

  const handleDraftChange = (taskId, field, value) => {
    setDrafts((previous) => ({
      ...previous,
      [taskId]: {
        ...previous[taskId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (task) => {
    const draft = drafts[task.id];

    if (!draft?.message?.trim()) {
      setError("Please enter your work update before submitting.");
      return;
    }

    try {
      setSavingTaskId(task.id);
      setError("");
      setSuccessMessage("");

      const submittedAt = new Date().toISOString();

      const updatedTask = await api.updateTask(task.id, {
        status: draft.status,
        employeeMessage: draft.message.trim(),
        employeeSubmittedAt: submittedAt,
        updatedAt: submittedAt,
      });

      setTasks((previous) =>
        previous.map((item) =>
          String(item.id) === String(task.id)
            ? updatedTask
            : item
        )
      );

      setSuccessMessage("Task update submitted successfully.");
    } catch (err) {
      console.error("Task submission error:", err);
      setError("Unable to submit task update. Please try again.");
    } finally {
      setSavingTaskId(null);
    }
  };

  // Material React Table columns
  const columns = [
    {
  accessorKey: "assignedAt",
  header: "Date",
  size: 130,
  Cell: ({ cell }) => {
    const date = cell.getValue();

    return date
      ? new Date(date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Not specified";
  },
},
    
    {
      accessorKey: "taskName",
      header: "Task Details",
      size: 240,
      Cell: ({ row }) => (
        <div className="employee-mrt-task-details">
          <strong>{row.original.taskName}</strong>
          <p>{row.original.description || "No description provided."}</p>
        </div>
      ),
    },
    
    {
      accessorKey: "projectName",
      header: "Project",
      size: 150,
      Cell: ({ cell }) => cell.getValue() || "N/A",
    },
    
    {
      accessorKey: "deadline",
      header: "Deadline",
      size: 120,
      Cell: ({ cell }) => cell.getValue() || "Not specified",
    },
    {
      accessorKey: "status",
      header: "Update Status",
      size: 160,
      Cell: ({ row }) => {
        const task = row.original;
        const currentStatus =
          drafts[task.id]?.status || task.status || "Pending";

        return (
          <select
            className={`employee-task-status status-${getStatusClass(
              currentStatus
            )}`}
            value={currentStatus}
            onChange={(e) =>
              handleDraftChange(
                task.id,
                "status",
                e.target.value
              )
            }
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
          </select>
        );
      },
    },
    {
      id: "employeeMessage",
      header: "Work Update",
      size: 260,
      Cell: ({ row }) => {
        const task = row.original;

        return (
          <textarea
            className="employee-task-message"
            rows="3"
            placeholder="Describe your work progress..."
            value={drafts[task.id]?.message || ""}
            onChange={(e) =>
              handleDraftChange(
                task.id,
                "message",
                e.target.value
              )
            }
          />
        );
      },
    },
    {
      id: "action",
      header: "Action",
      size: 130,
      enableSorting: false,
      enableColumnFilter: false,
      Cell: ({ row }) => {
        const task = row.original;
        const currentStatus =
          drafts[task.id]?.status || task.status || "Pending";

        return (
          <button
            type="button"
            className={`employee-task-submit status-${getStatusClass(
              currentStatus
            )}`}
            disabled={savingTaskId === task.id}
            onClick={() => handleSubmit(task)}
          >
            {savingTaskId === task.id
              ? "Submitting..."
              : "Submit"}
          </button>
        );
      },
    },
  ];

  if (loading) {
    return <div className="emp-card">Loading your tasks...</div>;
  }

  if (error && tasks.length === 0) {
    return <div className="emp-card">{error}</div>;
  }

  return (
    <div className="emp-card employee-tasks-card">
      <h3>My Assigned Tasks</h3>

      {error && <p className="task-error">{error}</p>}

      {successMessage && (
        <div className="task-success-alert">
          <span>{successMessage}</span>

          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="task-alert-close"
            aria-label="Close alert"
          >
            &times;
          </button>
        </div>
      )}

      {tasks.length === 0 ? (
        <p>No tasks have been assigned to you yet.</p>
      ) : (
        <div className="employee-mrt-wrapper">
          <MaterialReactTable
            columns={columns}
            data={tasks}
            getRowId={(row) => String(row.id)}
            enableSorting
            enableColumnFilters
            enableGlobalFilter
            enablePagination
            enableDensityToggle={false}
            enableFullScreenToggle={false}
            initialState={{
              density: "comfortable",
              pagination: {
                pageIndex: 0,
                pageSize: 5,
              },
            }}
          muiTablePaperProps={{
  className: "employee-task-mrt-paper",
  elevation: 0,
  sx: {
    backgroundColor: "var(--navy)",
    color: "var(--white)",
    borderRadius: "12px",
    overflow: "hidden",
  },
}}

muiTableHeadCellProps={{
  sx: {
    backgroundColor: "var(--navy)",
    color: "var(--cyan)",
    borderBottom: "1px solid var(--teal)",
    fontWeight: 700,
    fontSize: "11px",
    textTransform: "uppercase",
  },
}}

muiTableBodyCellProps={{
  sx: {
    backgroundColor: "var(--navy-light)",
    color: "var(--white)",
    borderColor: "rgba(165, 186, 200, 0.15)",
    fontSize: "13px",
    verticalAlign: "middle",
  },
}}

muiTopToolbarProps={{
  sx: {
    backgroundColor: "#000000",
    color: "#ffffff",
  },
}}

muiBottomToolbarProps={{
  sx: {
    backgroundColor: "#000000",
    color: "#ffffff",
  },
}}
          />
        </div>
      )}
    </div>
  );
};

export default EmployeeTasks;
