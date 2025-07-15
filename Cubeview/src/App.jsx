// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ConnectDatabase from "./pages/ConnectDatabase";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import TablesList from "./pages/TablesList";
import Settings from "./pages/Settings";
import Datasets from "@/pages/Datasets";
import TableExplorer from "./pages/TableExplorer";
import Incidents from "./pages/Incidents";
import IncidentDetail from "@/pages/IncidentDetail";
import TableDetail from "@/pages/TableDetail";
import LandingPage from "@/pages/LandingPage"; // ✅ Added landing page route

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="incidents/:id" element={<IncidentDetail />} />
          <Route path="tables/:tableId" element={<TableDetail />} />

          <Route path="datasets" element={<Datasets />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="table-explorer" element={<TableExplorer />} />

          <Route path="settings" element={<Settings />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="tables" element={<TablesList />} />
          <Route path="connect-database" element={<ConnectDatabase />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
