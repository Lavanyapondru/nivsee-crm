
const EMPLOYEE_API = "http://localhost:5000";
const ADMIN_API = "http://localhost:5001";
const REPORTING_API = "http://localhost:5002";
const LEAVE_API = "http://localhost:5003";

export const api = {
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


};
