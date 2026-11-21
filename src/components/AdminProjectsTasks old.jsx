import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import "./AdminProjectsTasks.css";

const emptyProject = {
  projectName: "",
  description: "",
  technologies: "",
  duration: "",
  startDate: "",
  endDate: "",
  status: "Planning",
};

const emptyTask = {
  projectId: "",
  employeeRecordId: "",
  taskName: "",
  description: "",
  deadline: "",
  status: "Pending",
};

const readAdminSession = () => {
  try {
    return JSON.parse(localStorage.getItem("nivsee_admin_session") || "null");
  } catch {
    return null;
  }
};

const getEmployeeCode = (employee) =>
  employee?.employeeDetails?.employeeId ||
  employee?.employeeId ||
  employee?.id ||
  "";

const getAdminName = (session) =>
  session?.name ||
  session?.adminName ||
  session?.fullName ||
  session?.email ||
  "Administrator";

function AdminProjectsTasks({ initialTab = "projects" }) {
  const [adminSession] = useState(readAdminSession);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [projectForm, setProjectForm] = useState(emptyProject);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [savingProject, setSavingProject] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const adminName = getAdminName(adminSession);
  const selectedEmployee = employees.find(
    (employee) => String(employee.id) === String(taskForm.employeeRecordId)
  );

  const loadModuleData = async () => {
    try {
      setLoading(true);
      setError("");
      const [projectData, taskData, employeeData] = await Promise.all([
        api.getAllProjects(),
        api.getAllTasks(),
        api.getAllEmployees(),
      ]);
      setProjects(Array.isArray(projectData) ? projectData : []);
      setTasks(Array.isArray(taskData) ? taskData : []);
      setEmployees(
        Array.isArray(employeeData)
          ? employeeData.filter((employee) => employee.status !== "inactive")
          : []
      );
    } catch (loadError) {
      console.error("Unable to load projects and tasks:", loadError);
      setError(
        "Unable to load Projects and Tasks. Check that JSON Servers on ports 5000, 5004 and 5005 are running."
      );
    } finally {
      setLoading(false);
    }
  };
}
export default AdminProjectsTasks;
