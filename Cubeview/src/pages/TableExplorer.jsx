// src/pages/TableExplorer.jsx
import React, { useEffect, useState } from "react";
import api from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function TableExplorer() {
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [tableDetail, setTableDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingTables, setLoadingTables] = useState(true);

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTableId !== null) {
      fetchTableDetail(selectedTableId);
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

  return (
    <div className="flex h-full space-x-6">
      {/* Sidebar: Table List */}
      <div className="w-1/4 bg-white border rounded p-4 overflow-y-auto">
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
                onClick={() => setSelectedTableId(table.id)}
                className={cn(
                  "cursor-pointer px-3 py-2 rounded text-sm hover:bg-blue-50",
                  table.id === selectedTableId && "bg-blue-100 text-blue-800 font-semibold"
                )}
              >
                {table.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detail Panel */}
      <div className="flex-1 bg-white border rounded p-6 overflow-y-auto">
        {loadingDetail || !tableDetail ? (
          <Skeleton className="h-full" />
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">{tableDetail.name}</h2>
              <p className="text-gray-500 text-sm">{tableDetail.description || "No description"}</p>
              <p className="text-gray-400 text-xs">
                Source: {tableDetail.source} | Created: {new Date(tableDetail.created_at).toLocaleString()}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">Tags</h3>
              {tableDetail.tags && tableDetail.tags.length > 0 ? (
                <p>{tableDetail.tags.join(", ")}</p>
              ) : (
                <p className="text-sm text-gray-400">No tags</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-1">Columns</h3>
              {tableDetail.columns.length > 0 ? (
                <ul className="grid grid-cols-2 gap-2">
                  {tableDetail.columns.map((col, idx) => (
                    <li key={idx} className="text-sm">
                      <strong>{col.name}</strong>: {col.data_type}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No columns found</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-1">Quality Checks</h3>
              {tableDetail.quality_checks?.length > 0 ? (
                <ul className="text-sm space-y-1">
                  {tableDetail.quality_checks.map((check, idx) => (
                    <li key={idx}>
                      {new Date(check.run_time).toLocaleString()} - {check.passed_percentage}%
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No quality checks</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-1">Incidents</h3>
              {tableDetail.incidents?.length > 0 ? (
                <ul className="text-sm space-y-1">
                  {tableDetail.incidents.map((incident, idx) => (
                    <li key={idx}>
                      {incident.created_at.slice(0, 10)} - <strong>{incident.title}</strong> ({incident.status})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No incidents</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
