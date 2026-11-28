
const EMPLOYEE_API = "http://192.168.0.100:5000";
const ADMIN_API = "http://192.168.0.100:5001";
const REPORTING_API = "http://192.168.0.100:5002";
const LEAVE_API = "http://192.168.0.100:5003";
const PROJECT_API = "http://192.168.0.100:5004";
const TASK_API = "http://192.168.0.100:5005";
// New Node.js backend

const API_URL = import.meta.env.VITE_API_URL;
const AUTH_API = `${API_URL}/api/auth`;


// Common helper for protected attendance API requests
const attendanceRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem("nivsee_employee_token");

  if (!token) {
    throw new Error("Employee token not found. Please login again.");
  }

  const response = await fetch(
    `${API_URL}/api/attendance${endpoint}`,
    {
      ...options,
      headers: {
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Attendance request failed");
  }

  return data;
};


// Protected API helper for admin attendance
const adminAttendanceRequest = async () => {
    const token = localStorage.getItem("nivsee_admin_token");

    if (!token) {
        throw new Error("Admin token not found. Please login again.");
    }

    const response = await fetch(
        `${API_URL}/api/admin/attendance`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || "Unable to fetch admin attendance"
        );
    }

    return data;
};



export const api = {

// Admin login using Node.js + MySQL + JWT
adminLogin: async (email, password) => {
  const response = await fetch(`${AUTH_API}/admin-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Admin login failed");
  }

  return data;
},


// Employee login using Node.js + MySQL + JWT
employeeLogin: async (identifier, password) => {
    const response = await fetch(`${AUTH_API}/employee-login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            identifier: identifier.trim(),
            password
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Employee login failed");
    }

    return data;
},

// Verify protected employee dashboard access
getEmployeeDashboard: async (token) => {
    const response = await fetch(`${AUTH_API}/employee-dashboard`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Unable to access employee dashboard");
    }

    return data;
},


// Get protected admin dashboard
getAdminDashboard: async (token) => {
  const response = await fetch(`${AUTH_API}/admin-dashboard`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to access admin dashboard");
  }

  return data;
},

// Get the logged-in employee's own profile
getMyEmployeeProfile: async () => {
    const token = localStorage.getItem("nivsee_employee_token");

    if (!token) {
        throw new Error("Employee token not found. Please login again.");
    }

    const response = await fetch(`${AUTH_API}/employee-profile`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Unable to fetch employee profile");
    }

    return data.employee;
},

  // Employee login: email, employee ID or phone
  getEmployees: async (loginValue) => {
    const value = loginValue.trim().toLowerCase();
    const normalizedValue = value.replace(/\D/g, "");

    const response = await fetch(`${EMPLOYEE_API}/employees`);

    if (!response.ok) {
      throw new Error("Unable to fetch employee details");
    }

    const employees = await response.json();

    return employees.filter((employee) => {
      return (
        employee.email?.toLowerCase() === value ||
        employee.id?.toLowerCase() === value ||
        (
          normalizedValue.length > 0 &&
          employee.phone?.replace(/\D/g, "") === normalizedValue
        )
      );
    });
  },

  // Activate or deactivate employee
updateEmployeeStatus: async (employeeId, status) => {
    const token = localStorage.getItem("nivsee_admin_token");

    const response = await fetch(
        `${API_URL}/api/employees/${encodeURIComponent(employeeId)}/status`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Unable to update employee status");
    }

    return data;
},

// Get attendance history for a selected employee (Admin)
getEmployeeAttendance: async (employeeId) => {
    const token = localStorage.getItem("nivsee_admin_token");

    if (!token) {
        throw new Error("Admin token not found. Please login again.");
    }

    const response = await fetch(
        `${API_URL}/api/admin/attendance/employee/${encodeURIComponent(employeeId)}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || "Unable to fetch employee attendance"
        );
    }

    return data.attendance || [];
},

  // Admin login: email
  getAdmins: async (email) => {
  const response = await fetch(
    `${ADMIN_API}/admins?email=${encodeURIComponent(email.trim())}`
  );

  if (!response.ok) {
    throw new Error("Unable to fetch admin details");
  }

  return response.json();
},

 
// Get all employees from Node.js + MySQL
getAllEmployees: async () => {
    const token = localStorage.getItem("nivsee_admin_token");

    const response = await fetch(`${AUTH_API.replace("/api/auth", "/api/employees")}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Unable to fetch employees");
    }

    return data.employees;
},


// Get one employee's complete details
getEmployeeById: async (employeeId) => {
    const token = localStorage.getItem("nivsee_admin_token");

    const response = await fetch(
        `${API_URL}/api/employees/${encodeURIComponent(employeeId)}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const data = await response.json();

    // Display the actual backend error for debugging
    if (!response.ok) {
        console.error("Backend Employee API Error:", data);

        throw new Error(
            data.error ||
            data.message ||
            "Unable to fetch employee details"
        );
    }

    return data.employee;
},

 
// Add employee using Node.js backend and Multer
addEmployee: async (formData) => {

    // Get admin JWT token from localStorage
    const token = localStorage.getItem("nivsee_admin_token");
    // Send employee details and photo to Node.js backend
    const response = await fetch(`${API_URL}/api/employees`, {
        method: "POST",
        // Send admin authentication token
        headers: {
            Authorization: `Bearer ${token}`
        },
        // Send FormData containing text fields and employee photo
        body: formData
    });

    // Read backend response
    const data = await response.json();

    // Handle API errors
    if (!response.ok) {
        throw new Error(data.message || "Unable to add employee");
    }

    // Return successful response
    return data;
},


// Update employee using Node.js + MySQL backend
updateEmployee: async (employeeId, formData) => {

    // Get admin JWT token
    const token = localStorage.getItem("nivsee_admin_token");

    // Send updated employee details to backend
    const response = await fetch(
        `${API_URL}/api/employees/${encodeURIComponent(employeeId)}`,
        {
            method: "PUT",

            // Send admin authentication token
            headers: {
                Authorization: `Bearer ${token}`
            },

            // Send employee details and optional photo
            body: formData
        }
    );

    // Read backend response
    const data = await response.json();

    // Handle errors
    if (!response.ok) {
        throw new Error(data.message || "Unable to update employee");
    }

    return data;
},


// ==========================================
// ATTENDANCE API - NODE.JS + MYSQL
// ==========================================

// Get attendance records for the logged-in employee
getAttendance: async (employeeId) => {
  const data = await attendanceRequest("/my", {
    method: "GET",
  });

  // Backend returns { message, attendance }
  return data.attendance || [];
},

// Get all attendance records for Admin Dashboard
// Keeping the existing JSON Server API for now

// Get all employee attendance and work reports from MySQL
getAllAttendance: async () => {
    const data = await adminAttendanceRequest();

    return data.attendance || [];
},

getEmployeeAttendance: async (employeeId) => {
  const token = localStorage.getItem("nivsee_admin_token");

  if (!token) {
    throw new Error("Admin token not found. Please login again.");
  }

  const response = await fetch(
    `${API_URL}/api/admin/attendance/employee/${encodeURIComponent(employeeId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to fetch employee attendance");
  }

  return data.attendance || [];
},


// Save employee check-in in MySQL
addAttendance: async (attendance) => {
  const data = await attendanceRequest("/check-in", {
    method: "POST",
    body: JSON.stringify({
      date: attendance.date,
    }),
  });

  return data.attendance;
},

// Update check-out, breaks and work report in MySQL
updateAttendance: async (attendanceId, updates) => {
  const id = encodeURIComponent(attendanceId);
  let endpoint = "";
  let method = "PATCH";
  let body;

  // 1. Employee checks out
  if (Object.prototype.hasOwnProperty.call(updates, "checkOut")) {
    endpoint = `/${id}/check-out`;
  }

  // 2. Employee submits work report
  else if (updates.report) {
    endpoint = `/${id}/report`;
    method = "POST";
    body = JSON.stringify(updates.report);
  }

  // 3. Employee starts or ends a break
  else if (updates.breaks) {
    const lastBreak = updates.breaks[updates.breaks.length - 1];

    if (!lastBreak) {
      throw new Error("Break information is missing.");
    }

    if (lastBreak.end == null) {
      // Start break
      endpoint = `/${id}/break/start`;
      method = "POST";
    } else {
      // End break
      endpoint = `/${id}/break/end`;
      method = "PATCH";
    }
  } else {
    throw new Error("Unsupported attendance update.");
  }

  const data = await attendanceRequest(endpoint, {
    method,
    ...(body ? { body } : {}),
  });

  return data.attendance;
},


// Get attendance records for all employees for admindashboard

// Get all employee attendance and work reports from MySQL
getAllAttendance: async () => {
    const data = await adminAttendanceRequest();

    return data.attendance || [];
},


// Get all leave requests for Admin Dashboard
getAllLeaves: async () => {
  const response = await fetch(`${LEAVE_API}/leaves`);

  if (!response.ok) {
    throw new Error("Unable to fetch leave requests");
  }

  return response.json();
},

// Get leave requests for a particular employee
getEmployeeLeaves: async (employeeRecordId) => {
  const response = await fetch(
    `${LEAVE_API}/leaves?employeeRecordId=${encodeURIComponent(employeeRecordId)}`
  );

  if (!response.ok) {
    throw new Error("Unable to fetch employee leave requests");
  }

  return response.json();
},

// Submit employee leave request
addLeave: async (leave) => {
  const response = await fetch(`${LEAVE_API}/leaves`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(leave)
  });

  if (!response.ok) {
    throw new Error("Unable to submit leave request");
  }

  return response.json();
},

// Admin updates leave status
updateLeave: async (leaveId, updates) => {
  const response = await fetch(
    `${LEAVE_API}/leaves/${encodeURIComponent(leaveId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updates)
    }
  );

  if (!response.ok) {
    throw new Error("Unable to update leave request");
  }

  return response.json();
},

  // ==============================
  // PROJECTS API
  // ==============================

  getAllProjects: async () => {
    const response = await fetch(`${PROJECT_API}/projects`);

    if (!response.ok) {
      throw new Error("Unable to fetch projects");
    }

    return response.json();
  },

  addProject: async (project) => {
    const response = await fetch(`${PROJECT_API}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(project),
    });

    if (!response.ok) {
      throw new Error("Unable to add project");
    }

    return response.json();
  },

  updateProject: async (projectId, updates) => {
    const response = await fetch(
      `${PROJECT_API}/projects/${encodeURIComponent(projectId)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      throw new Error("Unable to update project");
    }

    return response.json();
  },

  deleteProject: async (projectId) => {
    const response = await fetch(
      `${PROJECT_API}/projects/${encodeURIComponent(projectId)}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      throw new Error("Unable to delete project");
    }

    return true;
  },

  // ==============================
  // TASKS API
  // ==============================

  getAllTasks: async () => {
    const response = await fetch(`${TASK_API}/tasks`);

    if (!response.ok) {
      throw new Error("Unable to fetch tasks");
    }

    return response.json();
  },

  getEmployeeTasks: async (employeeRecordId) => {
  const response = await fetch(
    `${TASK_API}/tasks?employeeRecordId=${encodeURIComponent(employeeRecordId)}`
  );

  if (!response.ok) {
    throw new Error("Unable to fetch employee tasks");
  }

  return response.json();
},

  addTask: async (task) => {
    const response = await fetch(`${TASK_API}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(task),
    });

    if (!response.ok) {
      throw new Error("Unable to add task");
    }

    return response.json();
  },

  updateTask: async (taskId, updates) => {
  const response = await fetch(
    `${TASK_API}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }
  );

  if (!response.ok) {
    throw new Error("Unable to update task");
  }

  return response.json();
},

  deleteTask: async (taskId) => {
    const response = await fetch(
      `${TASK_API}/tasks/${encodeURIComponent(taskId)}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      throw new Error("Unable to delete task");
    }

    return true;
  },


};
