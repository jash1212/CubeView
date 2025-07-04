import React, { useEffect, useState } from "react";
import api from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function TableExplorer() {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [tableDetail, setTableDetail] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingTables, setLoadingTables] = useState(true);
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [docLoading, setDocLoading] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTableId !== null) {
      fetchTableDetail(selectedTableId);
      fetchMetrics(selectedTableId);
    }
  }, [selectedTableId]);

  const fetchTables = async () => {
    try {
      const res = await api.get("/api/tables/");
      setTables(res.data);
      if (res.data.length > 0) {
        setSelectedTableId(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch tables", err);
    } finally {
      setLoadingTables(false);
    }
  };

  const fetchTableDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/api/table/${id}/`);
      setTableDetail(res.data);
    } catch (err) {
      console.error("Failed to fetch table details", err);
      setTableDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const fetchMetrics = async (id) => {
    try {
      const res = await api.get(`/api/metrics/${id}/`);
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch metrics", err);
      setMetrics(null);
    }
  };

  const handleGenerateDocs = async (tableId) => {
    setDocLoading(true);
    try {
      const response = await api.post(`/api/generate-docs/${tableId}/`);
      const { documentation } = response.data;
      setGeneratedDescription(documentation);
    } catch (error) {
      console.error("Error generating docs", error);
      alert("Failed to generate documentation. Check server logs.");
    } finally {
      setDocLoading(false);
    }
  };

  return (
    <div className="flex h-full gap-6 p-4">
      {/* Sidebar: Tables List */}
      <aside className="w-1/4 bg-white border rounded-lg p-4 shadow-sm overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Tables</h2>
        {loadingTables ? (
          <Skeleton className="h-48" />
        ) : tables.length === 0 ? (
          <p className="text-gray-500">No tables found</p>
        ) : (
          <ul className="space-y-2">
            {tables.map((table) => (
              <li
                key={table.id}
                className={cn(
                  "group px-3 py-2 rounded-md hover:bg-blue-50 border cursor-pointer transition-all duration-150",
                  table.id === selectedTableId &&
                  "bg-blue-100 text-blue-800 font-semibold"
                )}
              >
                <div className="flex justify-between items-center">
                  <button
                    className="text-left w-full"
                    onClick={() => setSelectedTableId(table.id)}
                  >
                    {table.name}
                  </button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={docLoading}
                    className="ml-2"
                    onClick={() => handleGenerateDocs(table.id)}
                  >
                    {docLoading ? "..." : "Docs"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Main Detail Panel */}
      <main className="flex-1 bg-white border rounded-lg p-6 shadow-sm overflow-y-auto">
        {loadingDetail || !tableDetail ? (
          <Skeleton className="h-full" />
        ) : (
          <div className="space-y-8">
            {/* Basic Info */}
            <section>
              <h2 className="text-2xl font-bold mb-1">{tableDetail.name}</h2>
              <p className="text-gray-600">
                {tableDetail.description || "No description available"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Source: {tableDetail.source} | Created:{" "}
                {new Date(tableDetail.created_at).toLocaleString()}
              </p>
            </section>

            {/* Tags */}
            <section>
              <h3 className="font-semibold text-lg mb-2">Tags</h3>
              {tableDetail.tags?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tableDetail.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No tags assigned</p>
              )}
            </section>

            {/* Columns */}
            <section>
              <h3 className="font-semibold text-lg mb-2">Columns</h3>
              {tableDetail.columns?.length > 0 ? (
                <ul className="grid grid-cols-2 gap-2 text-sm">
                  {tableDetail.columns.map((col, idx) => (
                    <li key={idx}>
                      <strong>{col.name}</strong>: {col.data_type}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No columns available</p>
              )}
            </section>

            {/* Field-level Metrics */}
            <section>
              <h3 className="font-semibold text-lg mb-2">📊 Field Metrics</h3>
              {metrics ? (
                <div className="space-y-2 text-sm">
                  {Object.entries(metrics).map(([col, data]) => (
                    <div
                      key={col}
                      className="flex justify-between border-b pb-1"
                    >
                      <span className="font-medium">{col}</span>
                      <span className="text-gray-600">
                        Nulls: {data.null_percentage}% | Distinct:{" "}
                        {data.distinct_percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Loading metrics...</p>
              )}
            </section>

            {/* Quality Checks */}
            <section>
              <h3 className="font-semibold text-lg mb-2">Quality Checks</h3>
              {tableDetail.quality_checks?.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {tableDetail.quality_checks.map((check, idx) => (
                    <li key={idx}>
                      {new Date(check.run_time).toLocaleString()} -{" "}
                      <span className="text-green-600">
                        {check.passed_percentage}%
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No checks available</p>
              )}
            </section>

            {/* Incidents */}
            <section>
              <h3 className="font-semibold text-lg mb-2">Incidents</h3>
              {tableDetail.incidents?.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {tableDetail.incidents.map((incident, idx) => (
                    <li key={idx}>
                      {incident.created_at.slice(0, 10)} —{" "}
                      <strong>{incident.title}</strong>{" "}
                      <span className="text-gray-500">({incident.status})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No incidents reported</p>
              )}
            </section>

            {/* Generated Docs */}
            <section>
              <h3 className="font-semibold text-lg mb-2">Generated Docs</h3>
              <div className="p-4 bg-blue-50 text-blue-900 text-sm rounded whitespace-pre-line border">
                {generatedDescription || (
                  <span className="text-gray-400">
                    Click 'Docs' to generate.
                  </span>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
