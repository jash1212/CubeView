import { useEffect, useState } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import api from "@/api";

import {
  Home,
  Table,
  AlertTriangle,
  CheckCircle,
  Tags,
  Settings,
  Database,
  LineChart,
  FileText,
  LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { cn } from "../lib/utils";

const navItems = [
  { icon: <Home size={20} />, label: "Dashboard", path: "/dashboard" },
  { icon: <Table size={20} />, label: "Table Explorer", path: "/table-explorer" },
  { icon: <AlertTriangle size={20} />, label: "Incidents", path: "/incidents" },
  { icon: <CheckCircle size={20} />, label: "Quality Checks", path: "/quality-checks" },
  { icon: <Tags size={20} />, label: "Tags", path: "/tags" },
  { icon: <LineChart size={20} />, label: "Lineage", path: "/lineage" },
  { icon: <Database size={20} />, label: "Sources", path: "/sources" },
  { icon: <FileText size={20} />, label: "Reports", path: "/reports" },
  { icon: <Settings size={20} />, label: "Settings", path: "/settings" },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("User");

  // Auto-collect metadata on mount
  useEffect(() => {
    api.post("/api/collect-metadata/")
      .then(() => console.log("✅ Metadata synced"))
      .catch((err) => console.error("❌ Metadata sync failed", err));
  }, []);

  // Parse user info from token
  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUsername(payload.username || payload.email || "User");
      } catch (err) {
        console.warn("⚠️ Invalid token:", err);
      }
    }
  }, []);

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-white to-blue-50">
      {/* Sidebar */}
      <TooltipProvider>
        <aside className="h-full w-20 bg-white/70 backdrop-blur border-r border-blue-200 flex flex-col items-center py-6 space-y-4 shadow-lg">
          {navItems.map((item, idx) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(item.path)}
                    aria-label={item.label}
                    className={cn(
                      "w-12 h-12 flex items-center justify-center rounded-xl hover:scale-105 hover:shadow-md transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-tr from-blue-500 to-indigo-500 text-white shadow-xl"
                        : "text-gray-600 hover:bg-blue-100"
                    )}
                  >
                    {item.icon}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <span className="text-sm">{item.label}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </aside>
      </TooltipProvider>

      {/* Main content */}
      <div className="flex flex-col flex-1">
        {/* Navbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b bg-white/80 backdrop-blur shadow-sm">
          <span className="text-sm text-gray-700">
            Welcome, <span className="font-semibold text-indigo-600">{username}</span>
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="flex items-center gap-2 hover:bg-red-100 text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </header>

        {/* Outlet page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-white via-blue-50 to-white transition-all duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
