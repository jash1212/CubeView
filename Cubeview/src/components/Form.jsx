import { useState } from "react";
import api from "../api";
import { useNavigate, useLocation } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingIndicator from "./LoadingIndicator";
import { toast } from "sonner";
import { motion } from "framer-motion";
import NeuralBackground from "./NeuralBackground";

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
    <div className="relative min-h-screen flex items-center justify-center bg-white overflow-hidden">
      <NeuralBackground />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="z-10 w-full max-w-md"
      >
        <Card className="backdrop-blur-md bg-white/60 border border-gray-300 rounded-xl shadow-xl p-6">
          <CardHeader>
            <CardTitle className="text-3xl text-center text-gray-800 font-bold tracking-wide">
              {name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-white border border-gray-300 text-gray-800 placeholder-gray-500"
              />
              {method !== "login" && (
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white border border-gray-300 text-gray-800 placeholder-gray-500"
                />
              )}
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white border border-gray-300 text-gray-800 placeholder-gray-500"
              />
              {loading && <LoadingIndicator />}
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600"
                >
                  {name}
                </Button>
              </motion.div>
              {method === "login" && (
                <p className="text-sm text-center mt-4 text-gray-600">
                  New here?{" "}
                  <a href="/signup" className="text-blue-600 hover:underline">
                    Create an account
                  </a>
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default Form;
