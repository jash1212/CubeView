import React, { useEffect, useState } from "react";
import api from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const TIME_OPTIONS = [
  { label: "Last 24h", value: "1" },
  { label: "Last 7d", value: "7" },
  { label: "Last 14d", value: "14" },
  { label: "Last 30d", value: "30" },
];

const COLORS = {
  volume: "#8884d8",
  freshness: "#82ca9d",
  schema_drift: "#ffc658",
  job_failure: "#ff7f7f",
  custom: "#a3d3f3",
  field_health: "#c084fc",
};

export default function DashboardTrends() {
  const [days, setDays] = useState("7");
  const [incidentData, setIncidentData] = useState([]);
  const [healthScoreData, setHealthScoreData] = useState([]);

  useEffect(() => {
    fetchTrends();
  }, [days]);

  const fetchTrends = async () => {
    try {
      const [incidentRes, healthRes] = await Promise.all([
        api.get(`/api/incident-trend/?days=${days}`),
        api.get(`/api/health-score-trend/?days=${days}`),
      ]);
      setIncidentData(incidentRes.data?.trend || []);
      setHealthScoreData(healthRes.data || []);
    } catch (error) {
      console.error("Error fetching trend data:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex justify-end mb-2">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Select Time" />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Incident Trend */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-4">📉 Incident Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={incidentData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(COLORS).map((key) => (
                <Bar key={key} dataKey={key} stackId="a" fill={COLORS[key]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Health Score Trend */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-4">📈 Health Score Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={healthScoreData}>
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="avg_health_score"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
