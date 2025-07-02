import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ConnectDatabase from "./pages/ConnectDatabase";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import TablesList from "./pages/TablesList";
import Settings from "./pages/Settings";
import Datasets from "@/pages/Datasets";
// import TableDetail from "@/pages/TableDetail";
import TableExplorer from "./pages/TableExplorer";
import Incidents from "./pages/Incidents";



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
        <Route path="/datasets" element={<Datasets />} />
        <Route path="/incidents" element={<Incidents />} />
        {/* <Route path="/table/:tableId" element={<TableDetail />} /> */}
        <Route path="/table-explorer" element={<TableExplorer />} />

        <Route path="settings" element={<Settings />} />
        <Route path="dashboard" element={<Dashboard />} /> {/* ✅ FIXED */}
        <Route path="tables" element={<TablesList />} />
        <Route path="connect-database" element={<ConnectDatabase />} />
      </Route>
    </Routes>
  );
}

export default App;
