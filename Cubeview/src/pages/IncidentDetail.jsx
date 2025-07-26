import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import FancyLoader from "@/components/FancyLoader"; // adjust path as needed


const IncidentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchIncident = async () => {
      try {
        const res = await api.get(`/api/incidents/${id}/`);
        if (active) setIncident(res.data);
      } catch (err) {
        console.error("Failed to fetch incident", err);
      } finally {
        setLoading(false);
      }
    };

    fetchIncident();
    return () => {
      active = false;
    };
  }, [id]);

  const resolveIncident = async () => {
    try {
      await api.patch(`/api/incidents/${id}/resolve/`);
      navigate("/incidents");
    } catch (err) {
      console.error("Failed to resolve", err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!incident) {
    return <FancyLoader message="Fetching incidents..." />
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500  to-cyan-500 bg-clip-text text-transparent">
       Incident Details
      </h1>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition">
          <CardContent className="space-y-4 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                {incident.title || "Untitled Incident"}
              </h2>
              <span
                className={cn(
                  "text-xs px-3 py-1 rounded-full font-medium shadow-sm",
                  incident.status === "resolved"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                )}
              >
                {incident.status?.toUpperCase()}
              </span>
            </div>

            {incident.description && (
              <p className="text-sm text-gray-600">{incident.description}</p>
            )}

            <div className="text-sm text-gray-500 space-y-1">
              <p>
                Table:{" "}
                <span className="font-medium text-gray-800">
                  {incident.table_name || "N/A"}
                </span>
              </p>
              <p>Created: {new Date(incident.created_at).toLocaleString()}</p>
              {incident.resolved_at && (
                <p>Resolved: {new Date(incident.resolved_at).toLocaleString()}</p>
              )}
              {incident.type && (
                <p>
                  Type:{" "}
                  <span className="text-indigo-600 font-medium">
                    {incident.type}
                  </span>
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
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button size="sm" onClick={resolveIncident} className="bg-gradient-to-r from-blue-500  to-blue-500">
                  ✅ Mark as Resolved
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          variant="ghost"
          className="text-blue-500 hover:underline"
          onClick={() => navigate(-1)}
        >
          ← Back to Incidents
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default IncidentDetail;
