// src/components/Navbar.jsx
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="p-4 bg-gray-800 text-white flex space-x-4">
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/connect-database">Connect DB</Link>
      <Link to="/login">Logout</Link>
    </nav>
  );
}
