import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Settings = () => {
  const [connections, setConnections] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
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
      const res = await axios.get("/api/get-db/");
      if (res.data) {
        setConnections([res.data]); // Supports 1 connection now
      }
    } catch (err) {
      console.error("Failed to fetch connections", err);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      await axios.post("/api/connect-db/", formData);
      setShowForm(false);
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
      fetchConnections();
    } catch (err) {
      const msg = err.response?.data?.error || "Unknown error";
      setErrorMsg(msg);
      alert("Connection failed: " + msg);
    } finally {
      setLoading(false);
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
          <Input name="check_frequency" value={formData.check_frequency} placeholder="Check Frequency" onChange={handleChange} />

          <div className="col-span-1 sm:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Connecting..." : "Save Connection"}
            </Button>
          </div>
        </form>
      )}

      {connections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {connections.map((conn, idx) => (
            <Card key={idx}>
              <CardContent className="p-4 space-y-1">
                <p className="text-sm text-gray-500">Name: <span className="font-semibold">{conn.name}</span></p>
                <p className="text-sm text-gray-500">Host: <span className="font-semibold">{conn.host}</span></p>
                <p className="text-sm text-gray-500">Database: <span className="font-semibold">{conn.database_name}</span></p>
                <p className="text-sm text-gray-500">Type: <span className="font-semibold">{conn.db_type}</span></p>
                <p className="text-sm text-gray-500">Check Frequency: <span className="font-semibold">{conn.check_frequency}</span></p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Settings;
