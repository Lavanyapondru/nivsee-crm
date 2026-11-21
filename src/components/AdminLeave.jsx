
import { useCallback, useEffect, useMemo, useState } from "react";
import { MaterialReactTable } from "material-react-table";
import { api } from "../services/api";
import "./AdminLeave.css";

const formatDate = (value) => {
  if (!value) return "--";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getLeaveDays = (fromDate, toDate) => {
  if (!fromDate || !toDate) return "--";

  const start = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "--";
  }

  const days = Math.round((end - start) / 86400000) + 1;
  return days > 0 ? days : "--";
};

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

function AdminLeave() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const closeMessage = () => {
  setMessage("");
};

  const loadLeaveData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [leaveData, employeeData] = await Promise.all([
        api.getAllLeaves(),
        api.getAllEmployees(),
      ]);

      setLeaves(Array.isArray(leaveData) ? leaveData : []);
      setEmployees(Array.isArray(employeeData) ? employeeData : []);
    } catch (err) {
      console.error("Unable to load leave data:", err);
      setError(
        "Unable to load leave requests. Please check that the Leave and Employee JSON Servers are running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaveData();
  }, [loadLeaveData]);

  // Match leave requests with the employee's JSON Server record ID.
  const leaveRows = useMemo(() => {
    return leaves.map((leave) => {
      const employee = employees.find(
        (item) => String(item.id) === String(leave.employeeRecordId)
      );

      return {
        ...leave,
        employeeName: employee?.name || leave.employeeName || "--",
        companyEmployeeId:
          employee?.employeeDetails?.employeeId ||
          employee?.employeeId ||
          leave.employeeId ||
          "--",
        // department: employee?.department || "--",
        // designation: employee?.designation || "--",
        leaveDays: getLeaveDays(leave.fromDate, leave.toDate),
      };
    });
  }, [leaves, employees]);

  const pendingLeaves = useMemo(() => {
    return leaveRows
      .filter((leave) => leave.status === "Pending")
      .sort((a, b) =>
        String(b.appliedDate || "").localeCompare(
          String(a.appliedDate || "")
        )
      );
  }, [leaveRows]);

  const leaveHistory = useMemo(() => {
    return leaveRows
      .filter(
        (leave) =>
          leave.status === "Approved" || leave.status === "Cancelled"
      )
      .sort((a, b) =>
        String(b.updatedDate || "").localeCompare(
          String(a.updatedDate || "")
        )
      );
  }, [leaveRows]);

  const handleLeaveAction = async (leave, status) => {
    try {
      setUpdatingId(leave.id);
      setError("");
      setMessage("");

      await api.updateLeave(leave.id, {
        status,
        updatedDate: getToday(),
      });

      setLeaves((previous) =>
        previous.map((item) =>
          String(item.id) === String(leave.id)
            ? {
                ...item,
                status,
                updatedDate: getToday(),
              }
            : item
        )
      );

      setMessage(
        `Leave request ${status.toLowerCase()} successfully.`
      );
    } catch (err) {
      console.error("Unable to update leave request:", err);
      setError("Unable to update this leave request. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const commonColumns = [
    {
      accessorKey: "companyEmployeeId",
      header: "Employee ID",
    },
    {
      accessorKey: "employeeName",
      header: "Employee Name",
    },
    // {
    //   accessorKey: "department",
    //   header: "Department",
    // },
    // {
    //   accessorKey: "designation",
    //   header: "Designation",
    // },
    {
      accessorKey: "fromDate",
      header: "From Date",
      Cell: ({ cell }) => formatDate(cell.getValue()),
    },
    {
      accessorKey: "toDate",
      header: "To Date",
      Cell: ({ cell }) => formatDate(cell.getValue()),
    },
    {
      accessorKey: "leaveDays",
      header: "Days",
    },
    {
      accessorKey: "reason",
      header: "Reason",
    },
    {
      accessorKey: "appliedDate",
      header: "Applied Date",
      Cell: ({ cell }) => formatDate(cell.getValue()),
    },
    {
      accessorKey: "status",
      header: "Status",
      Cell: ({ cell }) => {
        const status = cell.getValue();

        return (
          <span className={`admin-leave-status ${status.toLowerCase()}`}>
            {status}
          </span>
        );
      },
    },
  ];

  const tableOptions = {
    enableSorting: true,
    enableColumnFilters: true,
    enablePagination: true,
    enableGlobalFilter: true,
    initialState: {
      pagination: { pageSize: 5, pageIndex: 0 },
    },
    muiTablePaperProps: {
      className: "admin-leave-mrt",
      sx: {
        backgroundColor: "#000000",
        color: "#ffffff",
        border: "1px solid #17465e",
        borderRadius: "12px",
        boxShadow: "none",
        overflow: "hidden",
      },
    },
    muiTopToolbarProps: {
      sx: {
        backgroundColor: "#000000",
        color: "#ffffff",
        "& .MuiIconButton-root, & .MuiSvgIcon-root": {
          color: "#59F2FE",
        },
        "& .MuiInputBase-root": { color: "#ffffff" },
        "& .MuiFormLabel-root": { color: "#a5bac8" },
      },
    },
    muiBottomToolbarProps: {
      sx: {
        backgroundColor: "#000000",
        color: "#ffffff",
        "& .MuiIconButton-root, & .MuiSvgIcon-root": {
          color: "#59F2FE",
        },
        "& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
          { color: "#ffffff" },
        "& .MuiSelect-icon": { color: "#59F2FE" },
      },
    },
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: "#092337",
        color: "#59F2FE",
        borderBottom: "1px solid #17465e",
        fontWeight: 700,
        whiteSpace: "nowrap",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        backgroundColor: "#000000",
        color: "#ffffff",
        borderBottom: "1px solid #17465e",
        fontSize: "13px",
        whiteSpace: "nowrap",
      },
    },
    muiTableBodyRowProps: {
      sx: {
        "&:hover td": {
          backgroundColor: "#092337",
          color: "#ffffff",
        },
      },
    },
  };

  const pendingColumns = [
    ...commonColumns,
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      enableColumnFilter: false,
      Cell: ({ row }) => {
        const leave = row.original;
        const isUpdating = String(updatingId) === String(leave.id);

        return (
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-success"
              disabled={isUpdating}
              onClick={() => handleLeaveAction(leave, "Approved")}
            >
              {isUpdating ? "Updating..." : "Approve"}
            </button>

            <button
              type="button"
              className="btn btn-sm btn-danger"
              disabled={isUpdating}
              onClick={() => handleLeaveAction(leave, "Cancelled")}
            >
              Cancel
            </button>
          </div>
        );
      },
    },
  ];

  const historyColumns = [
    ...commonColumns,
    {
      accessorKey: "updatedDate",
      header: "Updated Date",
      Cell: ({ cell }) => formatDate(cell.getValue()),
    },
  ];

  return (
    <div className="admin-leave-module">
      {/* <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h5 className="fw-bold mb-1">Leave Management</h5>
          <p className="admin-leave-muted mb-0">
            Review employee leave requests and manage their status.
          </p>
        </div>

        
      </div> */}

      {message && (
  <div className="alert alert-success admin-leave-alert">
    <span>{message}</span>

    <button
      type="button"
      className="admin-leave-alert-close"
      onClick={closeMessage}
      aria-label="Close alert"
    >
      &times;
    </button>
  </div>
)}

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-4">
          <div className="admin-leave-stat">
            <span>Pending Requests</span>
            <h3>{pendingLeaves.length}</h3>
          </div>
        </div>

        <div className="col-sm-6 col-lg-4">
          <div className="admin-leave-stat">
            <span>Approved Requests</span>
            <h3>
              {leaveRows.filter((item) => item.status === "Approved").length}
            </h3>
          </div>
        </div>

        <div className="col-sm-6 col-lg-4">
          <div className="admin-leave-stat">
            <span>Cancelled Requests</span>
            <h3>
              {leaveRows.filter((item) => item.status === "Cancelled").length}
            </h3>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="admin-leave-muted">Loading leave requests...</p>
      ) : !error ? (
        <>
          <div className="admin-leave-card mb-4">
            <div className="mb-3">
              <h5 className="fw-bold mb-1">Pending Leave Requests</h5>
              {/* <p className="admin-leave-muted small mb-0">
                Latest requests appear first. Review and take action.
              </p> */}
            </div>

            {pendingLeaves.length === 0 ? (
              <p className="admin-leave-muted mb-0">
                There are no pending leave requests.
              </p>
            ) : (
              <MaterialReactTable
                columns={pendingColumns}
                data={pendingLeaves}
                getRowId={(row) => String(row.id)}
                {...tableOptions}
              />
            )}
          </div>

          <div className="admin-leave-card">
         <div className="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
  <div>
    <h5 className="fw-bold mb-1">Leave History</h5>
    <p className="admin-leave-muted small mb-0">
      Previously approved and cancelled requests.
    </p>
  </div>

  <button
    type="button"
    className="btn admin-leave-refresh"
    onClick={loadLeaveData}
    disabled={loading}
  >
    <i className="bi bi-arrow-clockwise me-2"></i>
    {loading ? "Refreshing..." : "Refresh"}
  </button>
</div>

            {leaveHistory.length === 0 ? (
              <p className="admin-leave-muted mb-0">
                No processed leave requests yet.
              </p>
            ) : (
              <MaterialReactTable
                columns={historyColumns}
                data={leaveHistory}
                getRowId={(row) => String(row.id)}
                {...tableOptions}
              />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default AdminLeave;
