import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import FancyLoader from "@/components/FancyLoader"; // adjust path as needed


const Incidents = () => {
  const [availableTables, setAvailableTables] = useState([]);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [filters, setFilters] = useState({ status: "", table: "", type: "" });
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, resolved: 0, ongoing: 0 });

  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const fetchOptions = async () => {
      try {
        const res = await api.get("/api/incidents/filters/");
        if (!active) return;
        setAvailableTables(res.data.tables || []);
        setAvailableTypes(res.data.types || []);
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    };
    fetchOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchIncidents();
    }, 200);
    return () => clearTimeout(timeout);
  }, [filters]);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.table) params.append("table", filters.table);
      if (filters.type) params.append("type", filters.type);

      const res = await api.get(`/api/incidents/?${params.toString()}`);
      const results = res.data?.results || [];

      setIncidents(results);
      const resolved = results.filter((i) => i.status === "resolved").length;
      const ongoing = results.filter((i) => i.status === "ongoing").length;
      setSummary({ total: results.length, resolved, ongoing });
    } catch (err) {
      console.error("Failed to fetch incidents", err);
      setIncidents([]);
      setSummary({ total: 0, resolved: 0, ongoing: 0 });
    } finally {
      setLoading(false);
    }
  };

  const resolveIncident = async (id) => {
    try {
      await api.patch(`/api/incidents/${id}/resolve/`);
      fetchIncidents();
    } catch (err) {
      console.error("Failed to resolve incident", err);
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-transparent bg-clip-text">
        🧠 Incident Management
      </h1>

      <div className="flex gap-6 text-xm text-gray-800">
        <span>Total: <strong>{summary.total}</strong></span>
        <span>Resolved: <strong>{summary.resolved}</strong></span>
        <span>Ongoing: <strong>{summary.ongoing}</strong></span>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select
          value={filters.table || "all"}
          onValueChange={(value) =>
            setFilters({ ...filters, table: value === "all" ? "" : value })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by table" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            {availableTables.map((table) => (
              <SelectItem key={table} value={table}>
                {table}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.type || "all"}
          onValueChange={(value) =>
            setFilters({ ...filters, type: value === "all" ? "" : value })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {availableTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || "all"}
          onValueChange={(value) =>
            setFilters({ ...filters, status: value === "all" ? "" : value })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(filters.table || filters.type || filters.status) && (
        <div className="text-xs text-gray-500 italic">
          Showing filtered results.
        </div>
      )}

      {loading ? (
  <FancyLoader message="Fetching incidents..." />
) : incidents.length === 0 ? (

        <div className="text-center text-sm text-gray-500 mt-8">
          No incidents found.
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 gap-4"
        >
          {incidents
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map((incident, idx) => (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
              >
                <Card className="border border-gray-200 shadow-md hover:shadow-lg transition rounded-xl">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div
                        className="cursor-pointer"
                        onClick={() => navigate(`/incidents/${incident.id}`)}
                      >
                        <h2 className="text-lg font-bold text-blue-500 hover:underline">
                          {incident.title}
                        </h2>
                        <p className="text-sm text-gray-600">{incident.description}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          incident.status === "resolved"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {incident.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-sm text-gray-500 space-y-1">
                      <p>
                        Table:{" "}
                        <span className="font-medium">{incident.table_name || "N/A"}</span>
                      </p>
                      <p>Created: {new Date(incident.created_at).toLocaleString()}</p>
                      {incident.resolved_at && (
                        <p>
                          Resolved: {new Date(incident.resolved_at).toLocaleString()}
                        </p>
                      )}
                      {incident.type && (
                        <p>
                          Type:{" "}
                          <span className="text-indigo-600 font-medium">{incident.type}</span>
                        </p>
                      )}
                      {incident.severity && (
                        <p>
                           Severity:{" "}
                          <span
                            className={cn(
                              "font-semibold capitalize",
                              incident.severity === "high" && "text-red-600",
                              incident.severity === "medium" && "text-yellow-600",
                              incident.severity === "low" && "text-green-600"
                            )}
                          >
                            {incident.severity}
                          </span>
                        </p>
                      )}
                    </div>

                    {incident.status === "ongoing" && (
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveIncident(incident.id)}
                        >
                          Mark as Resolved
                        </Button>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
        </motion.div>
      )}
    </motion.div>
  );
};

export default Incidents;
