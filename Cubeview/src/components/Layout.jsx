import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { cn } from "../lib/utils";

const navItems = [
  { icon: <Home size={20} />, label: "Dashboard", path: "/dashboard" },
  { icon: <Table size={20} />, label: "Datasets", path: "/datasets" },
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
  const [username, setUsername] = useState("");

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setUsername(decoded.username || decoded.email || "User");
      } catch {
        setUsername("User");
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <TooltipProvider>
        <aside className="h-full w-16 bg-blue-50 border-r border-blue-200 flex flex-col items-center py-4 space-y-4 shadow-sm">
          {navItems.map((item, idx) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-lg hover:bg-blue-100 transition",
                      isActive && "bg-blue-200 text-blue-800"
                    )}
                  >
                    {item.icon}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <span>{item.label}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </aside>
      </TooltipProvider>

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        {/* Navbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b shadow-sm bg-white">
          <span className="text-sm text-gray-600">
            Welcome, <span className="font-medium">{username}</span>
          </span>
          <Button size="sm" variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
