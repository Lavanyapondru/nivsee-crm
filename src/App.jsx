
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLayout from "./layouts/AdminLayout";
import EmployeeProfile from "./pages/EmployeeProfile";

function App() {
  return (
    <>
      <Navbar />

      <Routes>
        {/* Login pages */}
        <Route path="/" element={<Login />} />
        <Route path="/login/employee" element={<Login />} />
        <Route path="/login/admin" element={<Login />} />

        {/* Employee dashboard */}
        <Route
          path="/employee/dashboard"
          element={<EmployeeDashboard />}
        />

        {/* Shared Admin Layout */}
        <Route element={<AdminLayout />}>
          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />

          {/* Employee Profile inside Admin Layout */}
          <Route
            path="/admin/employees/:id"
            element={<EmployeeProfile />}
          />
        </Route>
      </Routes>
    </>
  );
}

export default App;
