import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"; // or use `useToast` from shadcn
import api from "@/api";

const Settings = () => {
  const [connections, setConnections] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    db_type: "PostgreSQL",
    host: "",
    port: 5432,
    database_name: "",
    username: "",
    password: "",
    check_frequency: "hourly",
  });

  const fetchConnections = async () => {
    try {
      const res = await api.get("/api/get-db/");
      if (res.data) setConnections([res.data]); // Assumes 1 connection per user
    } catch (err) {
      toast.error("Failed to fetch connections");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "port" ? parseInt(value, 10) : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      db_type: "PostgreSQL",
      host: "",
      port: 5432,
      database_name: "",
      username: "",
      password: "",
      check_frequency: "hourly",
    });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editId) {
        await api.put(`/api/update-db/${editId}/`, formData);
        toast.success("Connection updated");
      } else {
        await api.post("/api/connect-db/", formData);
        toast.success("Database connected");
      }

      fetchConnections();
      resetForm();
    } catch (err) {
      const msg = err.response?.data?.error || "Unknown error";
      toast.error(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (conn) => {
    setEditId(conn.id);
    setFormData({ ...conn });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this connection?")) return;
    try {
      await api.delete(`/api/delete-db/${id}/`);
      toast.success("Connection deleted");
      fetchConnections();
    } catch (err) {
      toast.error("Failed to delete connection");
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Database Settings</h2>

      <Button onClick={() => setShowForm((prev) => !prev)}>
        {showForm ? "Cancel" : "Connect New Database"}
      </Button>

      {showForm && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Input name="name" value={formData.name} placeholder="Connection Name" onChange={handleChange} required />
          <Input name="host" value={formData.host} placeholder="Host" onChange={handleChange} required />
          <Input name="port" value={formData.port} type="number" placeholder="Port" onChange={handleChange} required />
          <Input name="database_name" value={formData.database_name} placeholder="Database Name" onChange={handleChange} required />
          <Input name="username" value={formData.username} placeholder="Username" onChange={handleChange} required />
          <Input name="password" value={formData.password} type="password" placeholder="Password" onChange={handleChange} required />

          <select
            name="check_frequency"
            value={formData.check_frequency}
            onChange={handleChange}
            className="border rounded px-3 py-2"
          >
            <option value="minutely">Every Minute</option>
            <option value="hourly">Every Hour</option>
            <option value="daily">Every Day</option>
          </select>

          <div className="col-span-1 sm:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : editId ? "Update Connection" : "Save Connection"}
            </Button>
          </div>
        </form>
      )}

      {connections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {connections.map((conn) => (
            <Card key={conn.id}>
              <CardContent className="p-4 space-y-1">
                <p className="text-sm text-gray-500">Name: <span className="font-semibold">{conn.name}</span></p>
                <p className="text-sm text-gray-500">Host: <span className="font-semibold">{conn.host}</span></p>
                <p className="text-sm text-gray-500">Database: <span className="font-semibold">{conn.database_name}</span></p>
                <p className="text-sm text-gray-500">Type: <span className="font-semibold">{conn.db_type}</span></p>
                <p className="text-sm text-gray-500">Check Frequency: <span className="font-semibold">{conn.check_frequency}</span></p>

                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(conn)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(conn.id)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 mt-4">No database connection found.</p>
      )}
    </div>
  );
};

export default Settings;
