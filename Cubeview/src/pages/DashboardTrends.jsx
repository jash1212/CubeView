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
import { motion } from "framer-motion";

const TIME_OPTIONS = [
  { label: "Last 24H", value: "1" },
  { label: "Last 7D", value: "7" },
  { label: "Last 14D", value: "14" },
  { label: "Last 30D", value: "30" },
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
      setIncidentData([]);
      setHealthScoreData([]);
    }
  };

  return (
    <motion.div
      className="space-y-10 mt-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header + Time Filter */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-gray-800">
          📊 Trends Overview
        </h2>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[130px] border border-gray-300 text-sm">
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

      {/* Incident Trend Chart */}
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            📉 Incident Trend
          </h3>
          {incidentData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No incident data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={incidentData}>
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" allowDecimals={false} />
                <Tooltip />
                <Legend iconType="circle" />
                {Object.entries(COLORS).map(([key, color]) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="a"
                    fill={color}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Divider */}
      <div className="border-t border-gray-200 my-4" />

      {/* Health Score Trend Chart */}
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            📈 Health Score Trend
          </h3>
          {healthScoreData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No health score data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={healthScoreData}>
                <XAxis dataKey="date" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip />
                <Legend iconType="plainline" />
                <Line
                  type="monotone"
                  dataKey="avg_health_score"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
