import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "../api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom"; // ✅ for redirect

export default function ConnectDatabase() {
  const [form, setForm] = useState({
    host: "",
    port: "5432",
    database: "",
    db_user: "",
    db_password: "",
    check_frequency: "hourly",
  });

  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState(null);
  const [connectionDetails, setConnectionDetails] = useState(null);

  const navigate = useNavigate(); // ✅

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Connecting...");

    try {
      await api.post("/connect-db/", form);
      await api.post("/collect-metadata/"); // ✅ collect metadata
      setConnected(true);
      setStatus("Database connected and metadata collected.");
      setConnectionDetails({
        host: form.host,
        port: form.port,
        database: form.database,
        user: form.db_user,
      });
      setTimeout(() => navigate("/dashboard"), 1000); // ✅ optional redirect
    } catch (err) {
      console.error(err);
      setStatus("Connection failed: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    setConnectionDetails(null);
    setForm({
      host: "",
      port: "5432",
      database: "",
      db_user: "",
      db_password: "",
      check_frequency: "hourly",
    });
    setStatus("Disconnected.");
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Database Connection</h1>

      {connected && connectionDetails ? (
        <Card className="border-green-400">
          <CardHeader>
            <CardTitle className="text-green-600">Connected</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p><strong>Host:</strong> {connectionDetails.host}</p>
            <p><strong>Port:</strong> {connectionDetails.port}</p>
            <p><strong>Database:</strong> {connectionDetails.database}</p>
            <p><strong>User:</strong> {connectionDetails.user}</p>
            <Button variant="destructive" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="host" placeholder="Host" onChange={handleChange} />
          <Input name="port" placeholder="Port" onChange={handleChange} />
          <Input name="database" placeholder="Database Name" onChange={handleChange} />
          <Input name="db_user" placeholder="Username" onChange={handleChange} />
          <Input name="db_password" type="password" placeholder="Password" onChange={handleChange} />
          <Button type="submit">Connect</Button>
          {status && <p className="text-sm text-gray-600">{status}</p>}
        </form>
      )}
    </div>
  );
}
