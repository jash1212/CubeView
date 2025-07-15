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

  return (
    <motion.div
      className="p-6 space-y-10 bg-white min-h-screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-800">🚀 Dashboard Overview</h1>
        <div className="flex gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={runChecks} disabled={refreshing} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
              {refreshing ? "Running..." : "Run Checks"}
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={runMLCheckAllTables} disabled={loadingML} className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg">
              {loadingML ? "Checking..." : "Run ML Anomaly Check"}
            </Button>
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
                <div className="text-sm text-gray-500 capitalize mb-1">
                  {key === "sources" ? "🧩 Data Sources" : key === "tables" ? "📊 Tables" : key === "fields" ? "📄 Fields" : "⚙️ Jobs"}
                </div>
                <div className="text-3xl font-semibold text-gray-800">
                  {summary?.data_overview?.[key] ?? <Skeleton className="h-6 w-10" />}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

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
                <h2 className="text-md font-semibold mb-4">📈 Incident Distribution</h2>
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
                          type: "square",
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
                <h2 className="text-md font-semibold">❤️ Data Health Score</h2>
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
                <div className="text-sm font-semibold mb-3">🕒 Recent Incidents</div>
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
                            <td className={`px-3 py-2 capitalize font-semibold ${
                              incident.status === "resolved"
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

      {/* ML Results */}
      {mlResults.length > 0 && (
        <motion.div
          className="mt-10 space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-lg font-bold text-red-600">🔍 ML Anomaly Detection Results</h2>
          <p className="text-sm text-muted-foreground">
            {mlResults.filter((r) => r.anomaly).length} anomalies out of {mlResults.length} tables.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mlResults.map((res, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
              >
                <Card
                  className={`p-4 border-l-4 ${res.anomaly ? "border-red-500 bg-red-50" : "border-green-500 bg-green-50"}`}
                >
                  <div className="space-y-1">
                    <h3 className="text-md font-semibold">{res.table_name}</h3>
                    <p className="text-sm">Null %: {res.null_percent}</p>
                    <p className="text-sm">Volume: {res.volume}</p>
                    <p className="text-sm">Schema Drift: {res.schema_change ? "Yes" : "No"}</p>
                    <p className={`font-bold ${res.anomaly ? "text-red-600" : "text-green-700"}`}>
                      {res.anomaly ? "⚠️ Anomaly Detected" : "✅ Healthy"}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

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
