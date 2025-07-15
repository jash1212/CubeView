// src/pages/DashboardTrends.jsx

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
      {/* Time Selector + Header */}
      <div className="flex justify-between items-center">
        <motion.h2
          className="text-3xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
        >
          📊 Trends Overview
        </motion.h2>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[150px] border border-gray-300 shadow-sm">
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
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="shadow-md rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              📉 Incident Trend
            </h2>
            {incidentData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No incident data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incidentData}>
                  <XAxis dataKey="date" className="text-sm" />
                  <YAxis className="text-sm" allowDecimals={false} />
                  <Tooltip />
                  <Legend iconType="circle" />
                  {Object.entries(COLORS).map(([key, color]) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="a"
                      fill={color}
                      radius={[6, 6, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Health Score Trend */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card className="shadow-md rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              📈 Health Score Trend
            </h2>
            {healthScoreData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No health score data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={healthScoreData}>
                  <XAxis dataKey="date" className="text-sm" />
                  <YAxis domain={[0, 100]} className="text-sm" />
                  <Tooltip />
                  <Legend iconType="plainline" />
                  <Line
                    type="monotone"
                    dataKey="avg_health_score"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
