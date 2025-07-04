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
} from "recharts";
import DashboardTrends from "./DashboardTrends";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#00C49F", "#FFBB28"];

export default function Dashboard() {
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

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/api/dashboard-data/");
      setSummary(res.data);
    } catch (err) {
      console.error("❌ Dashboard data fetch failed", err);
    }
  };

  const fetchHealthScore = async () => {
    try {
      const res = await api.get("/api/health-score/");
      setHealthScore(res.data);
    } catch (err) {
      console.error("❌ Health score fetch failed", err);
    }
  };

  const fetchIncidentSummary = async () => {
    try {
      const res = await api.get("/api/incident-summary/");
      const formatted = Object.entries(res.data).map(([type, count]) => ({
        type,
        count,
      }));
      setIncidentSummary(formatted);
    } catch (err) {
      console.error("❌ Incident summary fetch failed", err);
    }
  };

  const fetchRecentIncidents = async () => {
    try {
      const res = await api.get("/api/recent-incidents/?days=7");
      setRecentIncidents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("❌ Recent incidents fetch failed", err);
      setRecentIncidents([]);
    }
  };

  const runChecks = async () => {
    setRefreshing(true);
    try {
      await api.post("/api/run-quality-checks/");
      await fetchDashboard();
      await fetchHealthScore();
    } catch (err) {
      console.error("❌ Quality check run failed", err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
  <div className="p-6 space-y-6 text-sm">
    <h1 className="text-xl font-semibold">📊 Dashboard</h1>

    {/* Overview Cards */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {["sources", "tables", "fields", "jobs"].map((key, idx) => (
        <Card key={idx}>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              {key === "sources"
                ? "🧩 Sources"
                : key === "tables"
                ? "📊 Tables"
                : key === "fields"
                ? "📄 Fields"
                : "⚙️ Jobs"}
            </div>
            <div className="text-2xl font-bold">
              {summary?.data_overview?.[key] ?? <Skeleton className="h-6 w-10" />}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Health and Incidents */}
    <div className="grid md:grid-cols-2 gap-4">
      {/* Health Score */}
      <Card>
        <CardContent className="p-4 flex justify-between items-center">
          <div>
            <div className="text-sm text-muted-foreground">❤️ Health</div>
            <div className="text-2xl font-semibold">
              {healthScore?.score !== undefined ? `${healthScore.score}%` : <Skeleton className="h-6 w-12" />}
            </div>
            <div className="text-sm text-gray-500">{healthScore?.status ?? "—"}</div>
          </div>
          <Button onClick={runChecks} disabled={refreshing} className="h-8 px-4 text-sm">
            {refreshing ? "Running..." : "Run"}
          </Button>
        </CardContent>
      </Card>

      {/* Incident Pie Chart */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-2">📈 Incidents Summary</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={incidentSummary}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={70}
              >
                {incidentSummary.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>

    {/* Trends */}
    <DashboardTrends />

    {/* Recent Incidents */}
    <Card>
      <CardContent className="p-4">
        <div className="text-sm font-semibold mb-3">🕒 Recent Incidents</div>
        {recentIncidents.length === 0 ? (
          <div className="text-sm text-gray-500">No incidents in the last 7 days.</div>
        ) : (
          <div className="overflow-auto max-h-[150px] border rounded-md">
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
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2">{incident.table}</td>
                    <td className="px-3 py-2 capitalize">{incident.type}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(incident.time).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 capitalize">{incident.status ?? "ongoing"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
);

}
