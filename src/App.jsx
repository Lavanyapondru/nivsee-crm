
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
// import Footer from "./components/Footer";
// import Home from "./pages/Home";
import Login from "./pages/Login";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <>
      <Navbar />

      <Routes>
        {/* <Route path="#" element={<Home />} /> */}
        <Route path="/" element={<Login />} />
        <Route path="/login/employee" element={<Login />} />
        <Route path="/login/admin" element={<Login />} />
        <Route
         path="/employee/dashboard"
         element={<EmployeeDashboard />}
         />

         <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />
      </Routes>

      {/* <Footer /> */}
    </>
  );
}

export default App;
