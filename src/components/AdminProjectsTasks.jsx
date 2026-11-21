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

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    loadModuleData();
  }, []);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) =>
      [
        project.projectName,
        project.projectAdmin,
        project.status,
        project.technologies,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [projects, search]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tasks;
    return tasks.filter((task) =>
      [
        task.taskName,
        task.projectName,
        task.employeeName,
        task.employeeId,
        task.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [tasks, search]);

  const resetProjectForm = () => {
    setProjectForm(emptyProject);
    setEditingProjectId(null);
    setShowProjectForm(false);
  };

  const resetTaskForm = () => {
    setTaskForm(emptyTask);
    setEditingTaskId(null);
    setShowTaskForm(false);
  };

  const handleProjectChange = (event) => {
    const { name, value } = event.target;
    setProjectForm((current) => ({ ...current, [name]: value }));
  };

  const handleTaskChange = (event) => {
    const { name, value } = event.target;
    setTaskForm((current) => ({ ...current, [name]: value }));
  };

  const handleProjectSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (
      projectForm.startDate &&
      projectForm.endDate &&
      projectForm.endDate < projectForm.startDate
    ) {
      setError("Project end date cannot be earlier than its start date.");
      return;
    }

    const projectPayload = {
      ...projectForm,
      projectName: projectForm.projectName.trim(),
      description: projectForm.description.trim(),
      technologies: projectForm.technologies
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      projectAdmin: adminName,
      updatedAt: new Date().toISOString(),
    };

    try {
      setSavingProject(true);
      if (editingProjectId) {
        await api.updateProject(editingProjectId, projectPayload);
        setMessage("Project updated successfully.");
      } else {
        await api.addProject({
          id: `P${Date.now()}`,
          ...projectPayload,
          createdBy: adminSession?.id || adminSession?.email || adminName,
          createdAt: new Date().toISOString(),
        });
        setMessage("Project created successfully.");
      }
      resetProjectForm();
      await loadModuleData();
    } catch (saveError) {
      console.error("Unable to save project:", saveError);
      setError("Unable to save project. Please check the Projects API.");
    } finally {
      setSavingProject(false);
    }
  };

  const startProjectEdit = (project) => {
    setProjectForm({
      projectName: project.projectName || "",
      description: project.description || "",
      technologies: Array.isArray(project.technologies)
        ? project.technologies.join(", ")
        : project.technologies || "",
      duration: project.duration || "",
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      status: project.status || "Planning",
    });
    setEditingProjectId(project.id);
    setShowProjectForm(true);
    setActiveTab("projects");
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteProject = async (project) => {
    const linkedTasks = tasks.filter(
      (task) => String(task.projectId) === String(project.id)
    );

    const confirmed = window.confirm(
      linkedTasks.length
        ? `This project has ${linkedTasks.length} task(s). Delete those tasks and the project?`
        : `Delete project "${project.projectName}"?`
    );
    if (!confirmed) return;

    try {
      setError("");
      await Promise.all(linkedTasks.map((task) => api.deleteTask(task.id)));
      await api.deleteProject(project.id);
      setMessage("Project and its linked tasks deleted successfully.");
      await loadModuleData();
    } catch (deleteError) {
      console.error("Unable to delete project:", deleteError);
      setError("Unable to delete project. Please try again.");
    }
  };

  const handleTaskSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const project = projects.find(
      (item) => String(item.id) === String(taskForm.projectId)
    );
    const employee = selectedEmployee;

    if (!project || !employee) {
      setError("Please select both a project and an active employee.");
      return;
    }

    const taskPayload = {
      projectId: project.id,
      projectName: project.projectName,
      employeeRecordId: employee.id,
      employeeId: getEmployeeCode(employee),
      employeeName: employee.name || "",
      taskName: taskForm.taskName.trim(),
      description: taskForm.description.trim(),
      deadline: taskForm.deadline,
      status: taskForm.status,
      assignedBy: adminName,
      updatedAt: new Date().toISOString(),
    };

    try {
      setSavingTask(true);
      if (editingTaskId) {
        await api.updateTask(editingTaskId, taskPayload);
        setMessage("Task updated successfully.");
      } else {
        await api.addTask({
          id: `T${Date.now()}`,
          ...taskPayload,
          assignedAt: new Date().toISOString(),
        });
        setMessage("Task assigned successfully.");
      }
      resetTaskForm();
      await loadModuleData();
    } catch (saveError) {
      console.error("Unable to save task:", saveError);
      setError("Unable to save task. Please check the Tasks API.");
    } finally {
      setSavingTask(false);
    }
  };

  const startTaskEdit = (task) => {
    setTaskForm({
      projectId: String(task.projectId || ""),
      employeeRecordId: String(task.employeeRecordId || ""),
      taskName: task.taskName || "",
      description: task.description || "",
      deadline: task.deadline || "",
      status: task.status || "Pending",
    });
    setEditingTaskId(task.id);
    setShowTaskForm(true);
    setActiveTab("tasks");
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTaskStatusChange = async (task, status) => {
    try {
      setError("");
      await api.updateTask(task.id, {
        status,
        updatedAt: new Date().toISOString(),
      });
      setMessage(`Task status changed to ${status}.`);
      await loadModuleData();
    } catch (updateError) {
      console.error("Unable to update task status:", updateError);
      setError("Unable to update task status.");
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.taskName}"?`)) return;
    try {
      setError("");
      await api.deleteTask(task.id);
      setMessage("Task deleted successfully.");
      await loadModuleData();
    } catch (deleteError) {
      console.error("Unable to delete task:", deleteError);
      setError("Unable to delete task.");
    }
  };

  return (
    <section className="admin-projects-module">
      <div className="admin-projects-heading d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h5 className="fw-bold mb-1">Project &amp; Task Management</h5>
          <p className="admin-muted mb-0">
            Create projects, assign work and track employee task progress.
          </p>
        </div>
        <button
          type="button"
          className="btn admin-project-refresh"
          onClick={loadModuleData}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise me-2" />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {message && (
        <div className="alert admin-project-alert-success" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="alert admin-project-alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="admin-project-stat">
            <span>Total Projects</span>
            <strong>{projects.length}</strong>
            <i className="bi bi-kanban" />
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="admin-project-stat">
            <span>Total Tasks</span>
            <strong>{tasks.length}</strong>
            <i className="bi bi-list-check" />
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="admin-project-stat">
            <span>Pending Tasks</span>
            <strong>{tasks.filter((task) => task.status === "Pending").length}</strong>
            <i className="bi bi-hourglass-split" />
          </div>
        </div>
        <div className="col-sm-6 col-xl-3">
          <div className="admin-project-stat">
            <span>Completed Tasks</span>
            <strong>{tasks.filter((task) => task.status === "Completed").length}</strong>
            <i className="bi bi-check2-circle" />
          </div>
        </div>
      </div>

      <div className="admin-project-panel">
        <div className="admin-project-toolbar d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="admin-project-tabs" role="tablist" aria-label="Project management sections">
            <button
              type="button"
              className={activeTab === "projects" ? "active" : ""}
              onClick={() => {
                setActiveTab("projects");
                setMessage("");
                setError("");
              }}
            >
              <i className="bi bi-kanban me-2" />Projects
            </button>
            <button
              type="button"
              className={activeTab === "tasks" ? "active" : ""}
              onClick={() => {
                setActiveTab("tasks");
                setMessage("");
                setError("");
              }}
            >
              <i className="bi bi-list-check me-2" />Tasks
            </button>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <input
              type="search"
              className="form-control admin-project-search"
              placeholder={activeTab === "projects" ? "Search projects..." : "Search tasks or employees..."}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {activeTab === "projects" ? (
              <button
                type="button"
                className="btn admin-project-primary"
                onClick={() => {
                  resetProjectForm();
                  setShowProjectForm(true);
                  setMessage("");
                  setError("");
                }}
              >
                <i className="bi bi-plus-lg me-2" />Add Project
              </button>
            ) : (
              <button
                type="button"
                className="btn admin-project-primary"
                onClick={() => {
                  resetTaskForm();
                  setShowTaskForm(true);
                  setMessage("");
                  setError("");
                }}
                disabled={!projects.length || !employees.length}
              >
                <i className="bi bi-plus-lg me-2" />Assign Task
              </button>
            )}
          </div>
        </div>

        {activeTab === "projects" && showProjectForm && (
          <form className="admin-project-form" onSubmit={handleProjectSubmit}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="mb-1">{editingProjectId ? "Edit Project" : "Create New Project"}</h6>
                <p className="admin-muted small mb-0">Project details will be saved in projects.json.</p>
              </div>
              <button type="button" className="admin-project-close" onClick={resetProjectForm} aria-label="Close project form">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Project Name *</label>
                <input className="form-control" name="projectName" value={projectForm.projectName} onChange={handleProjectChange} placeholder="e.g. CRM Development" required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Duration</label>
                <input className="form-control" name="duration" value={projectForm.duration} onChange={handleProjectChange} placeholder="e.g. 2 Months" />
              </div>
              <div className="col-12">
                <label className="form-label">Project Description</label>
                <textarea className="form-control" name="description" rows="3" value={projectForm.description} onChange={handleProjectChange} placeholder="Describe the project..." />
              </div>
              <div className="col-md-6">
                <label className="form-label">Technologies</label>
                <input className="form-control" name="technologies" value={projectForm.technologies} onChange={handleProjectChange} placeholder="React, Node.js, MySQL (comma separated)" />
              </div>
              <div className="col-md-6">
                <label className="form-label">Project Status</label>
                <select className="form-select" name="status" value={projectForm.status} onChange={handleProjectChange}>
                  <option>Planning</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>On Hold</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-control" name="startDate" value={projectForm.startDate} onChange={handleProjectChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">End Date</label>
                <input type="date" className="form-control" name="endDate" min={projectForm.startDate || undefined} value={projectForm.endDate} onChange={handleProjectChange} />
              </div>
              <div className="col-12">
                <label className="form-label">Project Admin</label>
                <input className="form-control" value={adminName} readOnly />
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-4">
              <button type="submit" className="btn admin-project-primary" disabled={savingProject}>
                {savingProject ? "Saving..." : editingProjectId ? "Update Project" : "Save Project"}
              </button>
              <button type="button" className="btn admin-project-secondary" onClick={resetProjectForm}>Cancel</button>
            </div>
          </form>
        )}

        {activeTab === "tasks" && showTaskForm && (
          <form className="admin-project-form" onSubmit={handleTaskSubmit}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="mb-1">{editingTaskId ? "Edit Task" : "Assign New Task"}</h6>
                <p className="admin-muted small mb-0">Task details will be saved in tasks.json.</p>
              </div>
              <button type="button" className="admin-project-close" onClick={resetTaskForm} aria-label="Close task form">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Select Project *</label>
                <select className="form-select" name="projectId" value={taskForm.projectId} onChange={handleTaskChange} required>
                  <option value="">Choose a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.projectName}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Assign Employee *</label>
                <select className="form-select" name="employeeRecordId" value={taskForm.employeeRecordId} onChange={handleTaskChange} required>
                  <option value="">Choose an active employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} — {getEmployeeCode(employee)}
                    </option>
                  ))}
                </select>
              </div>
              {selectedEmployee && (
                <div className="col-12">
                  <div className="admin-project-employee-preview">
                    <i className="bi bi-person-badge" />
                    <div>
                      <strong>{selectedEmployee.name}</strong>
                      <span>Employee ID: {getEmployeeCode(selectedEmployee)} · Record ID: {selectedEmployee.id}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="col-md-6">
                <label className="form-label">Task Name *</label>
                <input className="form-control" name="taskName" value={taskForm.taskName} onChange={handleTaskChange} placeholder="e.g. Create Login Page" required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Deadline *</label>
                <input type="date" className="form-control" name="deadline" min={new Date().toISOString().slice(0, 10)} value={taskForm.deadline} onChange={handleTaskChange} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Task Status</label>
                <select className="form-select" name="status" value={taskForm.status} onChange={handleTaskChange}>
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>On Hold</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Task Description</label>
                <textarea className="form-control" name="description" rows="3" value={taskForm.description} onChange={handleTaskChange} placeholder="Explain what the employee needs to complete..." />
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-4">
              <button type="submit" className="btn admin-project-primary" disabled={savingTask}>
                {savingTask ? "Saving..." : editingTaskId ? "Update Task" : "Assign Task"}
              </button>
              <button type="button" className="btn admin-project-secondary" onClick={resetTaskForm}>Cancel</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="admin-project-empty"><span className="spinner-border spinner-border-sm me-2" />Loading project data...</div>
        ) : activeTab === "projects" ? (
          <div className="admin-project-list">
            {filteredProjects.length === 0 ? (
              <div className="admin-project-empty">
                <i className="bi bi-kanban" />
                <strong>No projects found</strong>
                <span>Create your first project using Add Project.</span>
              </div>
            ) : (
              <div className="row g-3">
                {filteredProjects.map((project) => {
                  const projectTasks = tasks.filter((task) => String(task.projectId) === String(project.id));
                  const completed = projectTasks.filter((task) => task.status === "Completed").length;
                  const progress = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;
                  return (
                    <div className="col-12 col-xl-6" key={project.id}>
                      <article className="admin-project-card">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div>
                            <span className="admin-project-id">{project.id}</span>
                            <h6>{project.projectName}</h6>
                          </div>
                          <span className={`admin-project-status ${String(project.status || "Planning").toLowerCase().replace(/\s+/g, "-")}`}>{project.status || "Planning"}</span>
                        </div>
                        <p className="admin-muted small mb-3">{project.description || "No project description added."}</p>
                        <div className="admin-project-meta">
                          <span><i className="bi bi-person me-1" />{project.projectAdmin || "Administrator"}</span>
                          <span><i className="bi bi-calendar3 me-1" />{project.duration || "Duration not set"}</span>
                          <span><i className="bi bi-list-task me-1" />{projectTasks.length} tasks</span>
                        </div>
                        {Array.isArray(project.technologies) && project.technologies.length > 0 && (
                          <div className="admin-project-tags">
                            {project.technologies.map((technology) => <span key={technology}>{technology}</span>)}
                          </div>
                        )}
                        <div className="admin-project-progress">
                          <div className="d-flex justify-content-between small mb-2">
                            <span>Task completion</span><strong>{progress}%</strong>
                          </div>
                          <div className="progress"><div className="progress-bar" role="progressbar" style={{ width: `${progress}%` }} aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" /></div>
                        </div>
                        <div className="d-flex flex-wrap gap-2 mt-3">
                          <button type="button" className="btn admin-project-action" onClick={() => {
                            setTaskForm({ ...emptyTask, projectId: String(project.id) });
                            setEditingTaskId(null);
                            setShowTaskForm(true);
                            setActiveTab("tasks");
                          }}><i className="bi bi-plus-lg me-1" />Assign Task</button>
                          <button type="button" className="btn admin-project-action" onClick={() => startProjectEdit(project)}><i className="bi bi-pencil me-1" />Edit</button>
                          <button type="button" className="btn admin-project-delete" onClick={() => handleDeleteProject(project)}><i className="bi bi-trash me-1" />Delete</button>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="table-responsive admin-project-table-wrap">
            {filteredTasks.length === 0 ? (
              <div className="admin-project-empty">
                <i className="bi bi-list-check" />
                <strong>No tasks found</strong>
                <span>Assign a task to an employee to see it here.</span>
              </div>
            ) : (
              <table className="table admin-project-table align-middle">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Employee</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <strong>{task.taskName}</strong>
                        <small>{task.id}</small>
                      </td>
                      <td>{task.projectName || projects.find((project) => String(project.id) === String(task.projectId))?.projectName || "Project unavailable"}</td>
                      <td>
                        <strong>{task.employeeName || "Employee"}</strong>
                        <small>{task.employeeId || task.employeeRecordId}</small>
                      </td>
                      <td>{task.deadline || "--"}</td>
                      <td>
                        <select
                          className={`form-select form-select-sm admin-task-status-select ${String(task.status || "Pending").toLowerCase().replace(/\s+/g, "-")}`}
                          value={task.status || "Pending"}
                          onChange={(event) => handleTaskStatusChange(task, event.target.value)}
                          aria-label={`Update status for ${task.taskName}`}
                        >
                          <option>Pending</option>
                          <option>In Progress</option>
                          <option>Completed</option>
                          <option>On Hold</option>
                        </select>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button type="button" className="btn admin-project-icon-btn" onClick={() => startTaskEdit(task)} aria-label="Edit task"><i className="bi bi-pencil" /></button>
                          <button type="button" className="btn admin-project-icon-btn danger" onClick={() => handleDeleteTask(task)} aria-label="Delete task"><i className="bi bi-trash" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminProjectsTasks;
