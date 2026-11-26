
const EMPLOYEE_API = "http://192.168.0.100:5000";
const ADMIN_API = "http://192.168.0.100:5001";
const REPORTING_API = "http://192.168.0.100:5002";
const LEAVE_API = "http://192.168.0.100:5003";
const PROJECT_API = "http://192.168.0.100:5004";
const TASK_API = "http://192.168.0.100:5005";
// New Node.js backend

const API_URL = import.meta.env.VITE_API_URL;
const AUTH_API = `${API_URL}/api/auth`;

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

  // Get all employees
  getAllEmployees: async () => {
    const response = await fetch(`${EMPLOYEE_API}/employees`);

    if (!response.ok) {
      throw new Error("Unable to fetch employees");
    }

    return response.json();
  },

  // Add employee
  addEmployee: async (employee) => {
    const response = await fetch(`${EMPLOYEE_API}/employees`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(employee)
    });

    if (!response.ok) {
      throw new Error("Unable to add employee");
    }

    return response.json();
  },

  // Update employee status
updateEmployee: async (employeeId, updates) => {
  const response = await fetch(
    `${EMPLOYEE_API}/employees/${encodeURIComponent(employeeId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }
  );

  if (!response.ok) {
    throw new Error("Unable to update employee");
  }

  return response.json();
},

// Get attendance records for an employee
getAttendance: async (employeeId) => {
  const response = await fetch(
    `${REPORTING_API}/attendance?employeeId=${encodeURIComponent(employeeId)}`
  );

  if (!response.ok) {
    throw new Error("Unable to fetch attendance records");
  }

  return response.json();
},

// Get attendance records for all employees for admindashboard
getAllAttendance: async () => {
  const response = await fetch(
    `${REPORTING_API}/attendance`
  );

  if (!response.ok) {
    throw new Error("Unable to fetch all attendance records");
  }

  return response.json();
},


// Save employee check-in
addAttendance: async (attendance) => {
  const response = await fetch(`${REPORTING_API}/attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(attendance)
  });

  if (!response.ok) {
    throw new Error("Unable to save attendance");
  }

  return response.json();
},

// Update check-out, breaks and work report
updateAttendance: async (attendanceId, updates) => {
  const response = await fetch(
    `${REPORTING_API}/attendance/${encodeURIComponent(attendanceId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updates)
    }
  );

  if (!response.ok) {
    throw new Error("Unable to update attendance");
  }

  return response.json();
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
