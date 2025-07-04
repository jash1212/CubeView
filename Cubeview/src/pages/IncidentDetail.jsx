// src/pages/IncidentDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const IncidentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncident = async () => {
      try {
        const res = await api.get(`/api/incidents/?id=${id}`);
        setIncident(res.data?.[0]); // assuming it returns a list
      } catch (err) {
        console.error("Failed to fetch incident", err);
      } finally {
        setLoading(false);
      }
    };
    fetchIncident();
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

  if (loading) return <p>Loading...</p>;
  if (!incident) return <p>Incident not found</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Incident Details</h1>

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{incident.title}</h2>
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${
                incident.status === "resolved"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {incident.status.toUpperCase()}
            </span>
          </div>

          <p className="text-sm text-gray-600">{incident.description}</p>
          <p className="text-sm text-gray-500">
            📌 Table: {incident.table_name || "N/A"}
          </p>
          <p className="text-sm text-gray-500">
            🕒 Created: {new Date(incident.created_at).toLocaleString()}
          </p>
          {incident.resolved_at && (
            <p className="text-sm text-gray-500">
              ✅ Resolved: {new Date(incident.resolved_at).toLocaleString()}
            </p>
          )}

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
