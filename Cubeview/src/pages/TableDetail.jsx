import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const TableDetail = () => {
  const { tableId } = useParams();
  const [table, setTable] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tableRes, metricsRes] = await Promise.all([
          api.get(`/api/table/${tableId}/`),
          api.get(`/api/metrics/${tableId}/`)
        ]);

        setTable(tableRes.data);
        setMetrics(metricsRes.data);
      } catch (err) {
        toast.error("Failed to load table or metrics");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tableId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!table) return <p className="text-sm text-red-500">Table not found.</p>;

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">{table.name}</h1>
      <p className="text-gray-500">{table.description || "No description available"}</p>

      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-2">📊 Field Metrics</h2>
          {metrics ? (
            <div className="space-y-2">
              {Object.entries(metrics).map(([col, data]) => (
                <div key={col} className="flex justify-between border-b py-1">
                  <span className="font-medium">{col}</span>
                  <span className="text-sm text-gray-600">
                    Nulls: {data.null_percentage}% | Distinct: {data.distinct_percentage}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No metrics available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TableDetail;
