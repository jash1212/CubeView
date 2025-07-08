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

const PIE_COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#00C49F", "#FFBB28",
];

const INCIDENT_TYPES = [
  "volume",
  "freshness",
  "schema_drift",
  "field_health",
  "custom",
  "job_failure",
];

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
    const found = incidentSummary.find(
      (entry) => normalize(entry.type) === normalize(type)
    );
    return found?.count || 0;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-500";
    return "text-red-600";
  };

  return (
    <div className="p-6 space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">📊 Dashboard Overview</h1>
        <div className="flex gap-3">
          <Button
            onClick={runChecks}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {refreshing ? "Running..." : "Run Checks"}
          </Button>
          <Button
            onClick={runMLCheckAllTables}
            disabled={loadingML}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loadingML ? "Checking..." : "Run ML Anomaly Check"}
          </Button>
        </div>
      </div>

      {/* Data Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {["sources", "tables", "fields", "jobs"].map((key) => (
          <Card key={key} className="shadow-md hover:shadow-lg transition-all">
            <CardContent className="p-5 space-y-2">
              <div className="text-sm text-muted-foreground capitalize">
                {key === "sources"
                  ? "🧩 Data Sources"
                  : key === "tables"
                  ? "📊 Tables"
                  : key === "fields"
                  ? "📄 Fields"
                  : "⚙️ Jobs"}
              </div>
              <div className="text-3xl font-bold text-primary">
                {summary?.data_overview?.[key] ?? <Skeleton className="h-6 w-10" />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Incident Pie + Health + Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        `${payload.type.replace(/_/g, " ")} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {incidentSummary.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.type}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {INCIDENT_TYPES.map((type, index) => (
                <div key={type} className="text-center">
                  <div className="text-xs capitalize mb-1 font-medium">
                    {type.replace(/_/g, " ")}
                  </div>
                  <ResponsiveContainer width="100%" height={100}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: type, value: getCount(type) },
                          {
                            name: "rest",
                            value: Math.max(1, 100 - getCount(type)),
                          },
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

        <div className="space-y-4">
          <Card className="shadow-md">
            <CardContent className="p-6 space-y-2">
              <h2 className="text-md font-semibold">❤️ Data Health Score</h2>
              <div className={`text-4xl font-bold ${getScoreColor(healthScore?.score)}`}>
                {healthScore?.score !== undefined ? (
                  `${healthScore.score}`
                ) : (
                  <Skeleton className="h-8 w-14" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {healthScore?.status ?? "—"}
              </div>
            </CardContent>
          </Card>

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
                          <td className="px-3 py-2 capitalize">{incident.type}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {new Date(incident.time).toLocaleString()}
                          </td>
                          <td
                            className={`px-3 py-2 capitalize font-semibold ${
                              incident.status === "resolved"
                                ? "text-green-600"
                                : incident.status === "failed"
                                ? "text-red-600"
                                : "text-yellow-600"
                            }`}
                          >
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
        </div>
      </div>

      {/* ML Anomaly Section */}
      {mlResults.length > 0 && (
        <div className="mt-10 space-y-4">
          <h2 className="text-lg font-bold text-red-600">🔍 ML Anomaly Detection Results</h2>
          <p className="text-sm text-muted-foreground">
            {mlResults.filter((r) => r.anomaly).length} anomalies out of {mlResults.length} tables.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mlResults.map((res, idx) => (
              <Card
                key={idx}
                className={`p-4 border-l-4 ${
                  res.anomaly === true
                    ? "border-red-500 bg-red-50"
                    : "border-green-500 bg-green-50"
                }`}
              >
                <div className="space-y-1">
                  <h3 className="text-md font-semibold">{res.table_name}</h3>
                  <p className="text-sm">Null %: {res.null_percent}</p>
                  <p className="text-sm">Volume: {res.volume}</p>
                  <p className="text-sm">Schema Drift: {res.schema_change ? "Yes" : "No"}</p>
                  <p
                    className={`font-bold ${
                      res.anomaly ? "text-red-600" : "text-green-700"
                    }`}
                  >
                    {res.anomaly ? "⚠️ Anomaly Detected" : "✅ Healthy"}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <DashboardTrends />
    </div>
  );
}
