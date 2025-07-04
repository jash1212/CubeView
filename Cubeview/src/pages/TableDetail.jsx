import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/api";
import { Card, CardContent } from "@/components/ui/card";

const TableDetail = () => {
  const { tableId } = useParams();
  const [table, setTable] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await api.get(`/api/table/${tableId}/`);
      setTable(res.data);
    };

    const fetchMetrics = async () => {
      const res = await api.get(`/api/metrics/${tableId}/`);
      setMetrics(res.data);
    };

    fetchData();
    fetchMetrics();
  }, [tableId]);

  if (!table) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{table.name}</h1>
      <p className="text-gray-500">{table.description}</p>

      {/* Field Metrics */}
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
            <p className="text-sm text-gray-500">Loading metrics...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TableDetail;
