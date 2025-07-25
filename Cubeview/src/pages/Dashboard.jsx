import React, { useEffect, useState } from "react";
import api from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import DashboardTrends from "./DashboardTrends";
import { motion } from "framer-motion";

const PIE_COLORS = ["#6366f1", "#34d399", "#facc15", "#f97316", "#06b6d4", "#fbbf24"];

const INCIDENT_TYPES = [
  "volume",
  "freshness",
  "schema_drift",
  "field_health",
  "custom",
  "job_failure",
];

const LABELS = {
  volume: "Volume",
  freshness: "Freshness",
  schema_drift: "Schema Drift",
  field_health: "Field Health",
  custom: "Custom",
  job_failure: "Job Failure",
};

export default function Dashboard() {
  const [mlResults, setMlResults] = useState([]);
  const [loadingML, setLoadingML] = useState(false);
  const [summary, setSummary] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [incidentSummary, setIncidentSummary] = useState([]);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showMLDetails, setShowMLDetails] = useState(false);


  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    await Promise.all([
      fetchDashboard(),
      fetchHealthScore(),
      fetchIncidentSummary(),
      fetchRecentIncidents(),
    ]);
  };

  const runChecks = async () => {
    setRefreshing(true);
    try {
      await api.post("/api/run-quality-checks/");
      await fetchAllData();
    } catch (err) {
      console.error("Run checks failed", err);
    } finally {
      setRefreshing(false);
    }
  };

  const runMLCheckAllTables = async () => {
    setLoadingML(true);
    try {
      const response = await api.post("/api/anomaly-check-all/");
      const sorted = [...response.data.results].sort((a, b) => b.anomaly - a.anomaly);
      setMlResults(sorted);
      await fetchIncidentSummary();
    } catch (err) {
      console.error("ML Check Failed", err);
      setMlResults([]);
    } finally {
      setLoadingML(false);
    }
  };

  const normalize = (str) => str.toLowerCase().replace(/ /g, "_");

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/api/dashboard-data/");
      setSummary(res.data);
    } catch (err) {
      console.error("Dashboard fetch error", err);
    }
  };

  const fetchHealthScore = async () => {
    try {
      const res = await api.get("/api/health-score/");
      setHealthScore(res.data);
    } catch (err) {
      console.error("Health fetch error", err);
    }
  };

  const fetchIncidentSummary = async () => {
    try {
      const res = await api.get("/api/incident-summary/");
      const formatted = Object.entries(res.data).map(([type, count]) => ({
        type: normalize(type),
        count,
      }));
      setIncidentSummary(formatted);
    } catch (err) {
      console.error("Summary fetch error", err);
    }
  };

  const fetchRecentIncidents = async () => {
    try {
      const res = await api.get("/api/recent-incidents/?days=7");
      setRecentIncidents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Incidents fetch error", err);
      setRecentIncidents([]);
    }
  };

  const getCount = (type) => {
    const found = incidentSummary.find((entry) => normalize(entry.type) === normalize(type));
    return found?.count || 0;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-500";
    return "text-red-600";
  };

  const handleRunAllChecks = async () => {
  setRefreshing(true);
  setLoadingML(true);
  try {
    await api.post("/api/run-quality-checks/");
    const response = await api.post("/api/anomaly-check-all/");
    const sorted = [...response.data.results].sort((a, b) => b.anomaly - a.anomaly);
    setMlResults(sorted);
    await fetchAllData();
  } catch (err) {
    console.error("Running all checks failed", err);
  } finally {
    setRefreshing(false);
    setLoadingML(false);
  }
};

  return (
    <motion.div
      className="p-6 space-y-10 bg-white min-h-screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-800">Dashboard Overview</h1>
        <div className="flex gap-4">
          {mlResults?.length > 0 && (
  <div className="mt-4 mb-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm flex items-center justify-between shadow-sm">
    <div className="flex items-center space-x-2 text-red-700">
      <span className="text-lg"></span>
      <span>
        <b>{mlResults.filter(r => r.anomaly).length}</b> anomalies detected by ML in{" "}
        <b>{mlResults.length}</b> tables.
      </span>
    </div>
    <button
      onClick={() => setShowMLDetails(prev => !prev)}
      className="text-sm text-red-600 underline hover:text-red-800"
    >
      {showMLDetails ? "Hide details" : "View details"}
    </button>
  </div>
)}

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleRunAllChecks}
                disabled={refreshing || loadingML}
                className="bg-blue-500 hover:bg-blue-400 text-white shadow-lg rounded-3xl"
              >
                {(refreshing || loadingML) ? "Running All Checks..." : "Run All Checks"}
              </Button>
            </motion.div>

          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {["sources", "tables", "fields", "jobs"].map((key, index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card className="rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <CardContent className="p-6">
                <div className="text-sm text-gray-600 font-semibold capitalize mb-1">
                  {key === "sources" ? "Data Sources" : key === "tables" ? "Tables" : key === "fields" ? "Fields" : "Jobs"}
                </div>
                <div className="text-3xl font-semibold text-gray-800">
                  {summary?.data_overview?.[key] ?? <Skeleton className="h-6 w-10" />}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {showMLDetails && (
  <motion.div
    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.6 }}
  >
    {mlResults.filter(r => r.anomaly).map((res, idx) => (
      <Card key={idx} className="p-4 border-l-4 border-red-400 bg-white shadow">
        <h3 className="text-sm font-semibold text-red-700 mb-1 truncate">{res.table_name}</h3>
        <div className="text-xs text-gray-700 space-y-1">
          <div>Null %: {res.null_percent}</div>
          <div>Volume: {res.volume}</div>
          <div>Schema Drift: {res.schema_change ? "Yes" : "No"}</div>
          <div>Confidence: {res.confidence ?? "?"}%</div>
        </div>
      </Card>
    ))}
  </motion.div>
)}


      {/* Incident Pie + Health + Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="shadow-md">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-md font-semibold mb-4">Incident Distribution</h2>
                {incidentSummary.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No incident data available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={incidentSummary}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ payload, percent }) =>
                          `${LABELS[payload.type] || payload.type} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {incidentSummary.map((entry, index) => (
                          <Cell key={`cell-${entry.type}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        payload={incidentSummary.map((entry, index) => ({
                          id: entry.type,
                          value: LABELS[entry.type] || entry.type,
                          type: "circle",
                          color: PIE_COLORS[index % PIE_COLORS.length],
                        }))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {INCIDENT_TYPES.map((type, index) => (
                  <div key={type} className="text-center">
                    <div className="text-xs capitalize mb-1 font-medium">{LABELS[type] || type}</div>
                    <ResponsiveContainer width="100%" height={100}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: type, value: getCount(type) },
                            { name: "rest", value: Math.max(1, 100 - getCount(type)) },
                          ]}
                          dataKey="value"
                          innerRadius={25}
                          outerRadius={40}
                        >
                          <Cell fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          <Cell fill="#f3f4f6" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="text-sm font-semibold">{getCount(type)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="shadow-md">
              <CardContent className="p-6 space-y-2">
                <h2 className="text-md font-semibold">Data Health Score</h2>
                <div className={`text-4xl font-bold ${getScoreColor(healthScore?.score)}`}>
                  {healthScore?.score !== undefined ? `${healthScore.score}` : <Skeleton className="h-8 w-14" />}
                </div>
                <div className="text-sm text-muted-foreground">{healthScore?.status ?? "—"}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="shadow-md">
              <CardContent className="p-4">
                <div className="text-md font-semibold mb-3">Recent Incidents</div>
                {recentIncidents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent incidents.</p>
                ) : (
                  <div className="overflow-x-auto max-h-[260px] border rounded-md">
                    <table className="min-w-full text-sm text-left">
                      <thead className="bg-gray-100 text-gray-600 font-medium">
                        <tr>
                          <th className="px-3 py-2">Table</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Time</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentIncidents.map((incident, idx) => (
                          <tr key={idx} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium">{incident.table}</td>
                            <td className="px-3 py-2 capitalize">{LABELS[incident.type] || incident.type}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{new Date(incident.time).toLocaleString()}</td>
                            <td className={`px-3 py-2 capitalize font-semibold ${incident.status === "resolved"
                              ? "text-green-600"
                              : incident.status === "failed"
                                ? "text-red-600"
                                : "text-yellow-600"
                              }`}>
                              {incident.status ?? "ongoing"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>



      {/* Dashboard Trends */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <DashboardTrends />
      </motion.div>
    </motion.div>
  );
}
