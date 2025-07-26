import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/api";
import { motion, AnimatePresence } from "framer-motion";

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
      if (res.data) setConnections([res.data]); // 1 connection/user
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
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl font-bold text-gray-800"
      >
        Database Settings
      </motion.h2>

      <Button
        onClick={() => setShowForm((prev) => !prev)}
        className="rounded-2xl px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-500 text-white shadow-md hover:scale-105 transition-transform"
      >
        {showForm ? "Cancel" : " Connect New Database"}
      </Button>

      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-6 rounded-2xl shadow-md mt-4 backdrop-blur"
          >
            <Input name="name" value={formData.name} placeholder="Connection Name" onChange={handleChange} required />
            <Input name="host" value={formData.host} placeholder="Host" onChange={handleChange} required />
            <Input name="port" type="number" value={formData.port} placeholder="Port" onChange={handleChange} required />
            <Input name="database_name" value={formData.database_name} placeholder="Database Name" onChange={handleChange} required />
            <Input name="username" value={formData.username} placeholder="Username" onChange={handleChange} required />
            <Input name="password" type="password" value={formData.password} placeholder="Password" onChange={handleChange} required />

            

            <div className="col-span-1 sm:col-span-2">
              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
                disabled={loading}
              >
                {loading ? "Saving..." : editId ? "Update Connection" : "Save Connection"}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {connections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {connections.map((conn) => (
            <motion.div
              key={conn.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="rounded-xl bg-white shadow-md hover:shadow-lg transition">
                <CardContent className="p-4 space-y-1">
                  <p className="text-md text-gray-600"><strong>{conn.name}</strong></p>
                  <p className="text-sm text-gray-500">Host: {conn.host}</p>
                  <p className="text-sm text-gray-500">Database: {conn.database_name}</p>
                  <p className="text-sm text-gray-500">Type: {conn.db_type}</p>
                  

                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(conn)} className="rounded-2xl px-5 py-2  text-black shadow-gray-200 shadow-md hover:scale-105 transition-transform">
                      Edit
                    </Button>
                    <Button  size="sm" onClick={() => handleDelete(conn.id)} className="rounded-2xl px-5 py-2 bg-gradient-to-r from-red-500 to-red-500 text-white shadow-md hover:scale-105 transition-transform">
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-500 mt-4"
        >
          No database connection found.
        </motion.p>
      )}
    </div>
  );
};

export default Settings;
