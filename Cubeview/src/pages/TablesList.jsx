import { useEffect, useState } from "react";
import api from "../api";
import { Card, CardContent } from "@/components/ui/card";

export default function TablesList() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/fetch-tables/")
      .then((res) => setTables(res.data.tables))
      .catch((err) => {
        setError(err.response?.data?.error || "Error fetching tables");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading tables...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Database Tables</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {tables.map((table) => (
          <Card key={table}>
            <CardContent className="p-4 text-sm">{table}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
