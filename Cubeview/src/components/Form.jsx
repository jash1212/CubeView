import { useState } from "react";
import api from "../api";
import { useNavigate, useLocation } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingIndicator from "./LoadingIndicator";
import { toast } from "sonner";

function Form({ route, method }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const name = method === "login" ? "Login" : "Register";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload =
        method === "login"
          ? { username, password }
          : { username, email, password };

      const res = await api.post(route, payload);

      if (method === "login") {
        localStorage.setItem(ACCESS_TOKEN, res.data.access);
        localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
        toast.success("Logged in successfully");
        navigate(location.state?.from?.pathname || "/dashboard");
      } else {
        toast.success("Registered successfully. Please login.");
        navigate("/login");
      }

    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        "Something went wrong";

      toast.error(`${name} failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {method !== "login" && (
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {loading && <LoadingIndicator />}
            <Button type="submit" className="w-full">
              {name}
            </Button>
            {method === "login" && (
              <p className="text-sm text-center mt-4">
                New here?{" "}
                <a href="/signup" className="text-blue-600 hover:underline">
                  Create an account
                </a>
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Form;
