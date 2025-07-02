// src/pages/Datasets.jsx
import React, { useEffect, useState } from "react";
import api from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";


const Datasets = () => {
  const [tables, setTables] = useState([]);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await api.get("/api/user-tables/");
      console.log("✅ Tables:", res.data);
      setTables(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch tables", err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Connected Tables</h1>
      {tables.length === 0 ? (
        <p className="text-gray-500">No tables found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
            <Link to={`/table/${table.id}`}>

            <Card key={table.id}>
              <CardContent className="p-4 space-y-2">
                <p className="text-lg font-bold">{table.name}</p>
                <p className="text-sm text-gray-500">Source: {table.source}</p>
                <p className="text-sm text-gray-500">
                  Description: {table.description || "No description"}
                </p>
                <p className="text-sm text-gray-500">
                  Tags: {table.tags.length > 0 ? table.tags.join(", ") : "None"}
                </p>
              </CardContent>
            </Card>
            </Link>

          ))}
        </div>
      )}
    </div>
  );
};

export default Datasets;
