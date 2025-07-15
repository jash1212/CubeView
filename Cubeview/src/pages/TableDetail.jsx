import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
        toast.error("⚠️ Failed to load table or metrics");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tableId]);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!table) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-500">🚫 Table not found.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 p-6 bg-white min-h-screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <h1 className="text-3xl font-bold text-primary">{table.name}</h1>
        <p className="text-gray-600">{table.description || "No description available"}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="shadow-md border border-gray-100">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">📊 Field Metrics</h2>
            {metrics && Object.keys(metrics).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(metrics).map(([col, data], index) => (
                  <motion.div
                    key={col}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex justify-between items-center border-b pb-1"
                  >
                    <span className="font-medium text-sm text-gray-800">{col}</span>
                    <span className="text-sm text-gray-500">
                      Nulls: {data.null_percentage}% | Distinct: {data.distinct_percentage}%
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No metrics available.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default TableDetail;
