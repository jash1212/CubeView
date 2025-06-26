import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ConnectDatabase from "./pages/ConnectDatabase";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import TablesList from "./pages/TablesList";
import Settings from "./pages/Settings";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="settings" element={<Settings />} />
        <Route path="dashboard" element={<Dashboard />} /> {/* ✅ FIXED */}
        <Route path="tables" element={<TablesList />} />
        <Route path="connect-database" element={<ConnectDatabase />} />
      </Route>
    </Routes>
  );
}

export default App;
