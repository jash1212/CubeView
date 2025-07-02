// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#00C49F", "#FFBB28"];

const Dashboard = () => {
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [healthScore, setHealthScore] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [incidentSummary, setIncidentSummary] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchHealthScore();
    fetchIncidents();
    fetchIncidentSummary();
    fetchConnectionInfo();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/api/dashboard-data/");
      setSummary(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHealthScore = async () => {
    try {
      const res = await api.get("/api/health-score/");
      setHealthScore(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch health score", err);
    }
  };

  const fetchIncidents = async () => {
    try {
      const res = await api.get("/api/recent-incidents/");
      setIncidents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("❌ Failed to fetch incidents", err);
      setIncidents([]);
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
      console.error("❌ Failed to fetch incident summary", err);
    }
  };

  const fetchConnectionInfo = async () => {
    try {
      const res = await api.get("/api/get-db/");
      setConnectionInfo(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch database info", err);
    }
  };

  const runChecks = async () => {
    setRefreshing(true);
    try {
      await api.post("/api/run-quality-checks/");
      await fetchDashboard();
      await fetchHealthScore();
      await fetchIncidents();
    } catch (err) {
      console.error("❌ Failed to run checks", err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Welcome to CubeView</h1>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectionInfo && (
            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="text-sm text-gray-500">📡 Connected Database</p>
                <p className="text-sm text-gray-500">Name: <span className="font-semibold">{connectionInfo.name}</span></p>
                <p className="text-sm text-gray-500">Host: <span className="font-semibold">{connectionInfo.host}</span></p>
                <p className="text-sm text-gray-500">DB Name: <span className="font-semibold">{connectionInfo.database_name}</span></p>
                <p className="text-sm text-gray-500">Type: <span className="font-semibold">{connectionInfo.db_type}</span></p>
                <p className="text-sm text-gray-500">Check Frequency: <span className="font-semibold">{connectionInfo.check_frequency}</span></p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Connected Tables</p>
              <p className="text-xl font-bold">{summary?.connected_tables ?? 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Last Quality Check</p>
              <p className="text-xl font-bold">
                {summary?.data_quality?.last_check ?? "Never"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Avg Pass %</p>
              <p className="text-xl font-bold">
                {summary?.data_quality?.avg_pass != null
                  ? `${summary.data_quality.avg_pass.toFixed(2)}%`
                  : "No data"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Recent Tags</p>
              <p className="text-md text-gray-700">
                {summary?.recent_tags?.length > 0
                  ? summary.recent_tags.join(", ")
                  : "No tags"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Health Score</p>
                <p className="text-xl font-bold">
                  {healthScore?.score !== undefined ? `${healthScore.score}%` : "—"}
                </p>
              </div>
              <Button onClick={runChecks} disabled={refreshing}>
                {refreshing ? "Running..." : "Run Checks"}
              </Button>
            </CardContent>
          </Card>

          <div className="mt-8 col-span-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Incidents</h2>
            {!Array.isArray(incidents) || incidents.length === 0 ? (
              <p className="text-sm text-gray-500">No incidents found in the past week.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {incidents.map((incident, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Table</p>
                          <p className="font-medium">{incident.table}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Type</p>
                          <p className="font-medium">{incident.type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Time</p>
                          <p className="font-medium">
                            {new Date(incident.time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 col-span-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Incident Type Summary</h2>
            {incidentSummary.length === 0 ? (
              <p className="text-sm text-gray-500">No incidents categorized yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incidentSummary}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    labelLine={false}
                  >
                    {incidentSummary.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
