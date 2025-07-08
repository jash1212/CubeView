import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";

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
        if (active) {
          setIncident(res.data);
        }
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
      alert("Marked as resolved");
      navigate("/incidents");
    } catch (err) {
      console.error("Failed to resolve", err);
    }
  };

  if (loading) return <p className="text-gray-500">Loading incident details...</p>;
  if (!incident) return <p className="text-red-500">Incident not found.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Incident Details</h1>

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{incident.title || "Untitled Incident"}</h2>
            <span
              className={cn(
                "text-xs px-2 py-1 rounded font-medium",
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
            <p>📌 Table: <span className="font-medium">{incident.table_name || "N/A"}</span></p>
            <p>🕒 Created: {new Date(incident.created_at).toLocaleString()}</p>
            {incident.resolved_at && (
              <p>✅ Resolved: {new Date(incident.resolved_at).toLocaleString()}</p>
            )}
            {incident.type && (
              <p>🔍 Type: <span className="text-indigo-600">{incident.type}</span></p>
            )}
            {incident.severity && (
              <p>🔥 Severity:{" "}
                <span
                  className={cn(
                    "font-semibold",
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
            <Button size="sm" variant="outline" onClick={resolveIncident}>
              Mark as Resolved
            </Button>
          )}
        </CardContent>
      </Card>

      <Button variant="ghost" onClick={() => navigate(-1)}>
        ← Back to Incidents
      </Button>
    </div>
  );
};

export default IncidentDetail;
