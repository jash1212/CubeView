import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, px } from "framer-motion";
import {
  Database,
  BarChart3,
  ShieldCheck,
  Search,
  Activity,
  Sparkles,
  CheckCircle,
  Zap,
  Radar,
} from "lucide-react";
import NeuralBackground from "@/components/NeuralBackground";


const features = [
  {
    title: "Connect Databases",
    description: "Easily connect PostgreSQL databases with secure credentials.",
    icon: <Database className="w-8 h-8 text-blue-500" />,
  },
  {
    title: "Monitor Data Quality",
    description: "Track nulls, distinct values, schema changes, and more.",
    icon: <ShieldCheck className="w-8 h-8 text-green-500" />,
  },
  {
    title: "Detect Incidents",
    description: "Catch freshness issues, schema drift, and volume anomalies.",
    icon: <Activity className="w-8 h-8 text-red-500" />,
  },
  {
    title: "Search and Filter Tables",
    description: "Find any table or field with advanced filtering and tagging.",
    icon: <Search className="w-8 h-8 text-purple-500" />,
  },
  {
    title: "Visual Health Trends",
    description: "Track score trends and monitor incidents in real-time.",
    icon: <BarChart3 className="w-8 h-8 text-yellow-500" />,
  },
  {
    title: "AI Table Docs",
    description: "Generate documentation using AI for your datasets.",
    icon: <Sparkles className="w-8 h-8 text-pink-500" />,
  },
];

const whyCubeView = [
  {
    title: "Built for Engineers",
    description: "No fluff. Built with real-time observability and control.",
    icon: <CheckCircle className="w-8 h-8 text-green-400" />,
  },
  {
    title: "Fast & Lightweight",
    description: "Minimal design, lightning-fast insights.",
    icon: <Zap className="w-8 h-8 text-yellow-400" />,
  },
  {
    title: "ML-Powered Insights",
    description: "Leverages historical metrics to catch anomalies early.",
    icon: <Radar className="w-8 h-8 text-blue-400" />,
  },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      <NeuralBackground />

      {/* Navbar */}
      <div className="fixed top-0 left-0 w-full z-30 flex items-center justify-between px-8 py-4 bg-white/10 backdrop-blur-md border-b border-white/10 shadow-md">
        <div className="flex items-center gap-2">
          <img src="/cubeview.png" alt="CubeView Logo" className="h-10 w-10" />
          
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            className="bg-white/20 text-black hover:bg-gray-100 hover:shadow-md transition duration-200"
            onClick={() => navigate("/login")}
          >
            Login
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 p-8 pt-32 max-w-7xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            Welcome to CubeView
          </h1>
          <p className="text-lg text-gray-300">
            A smart data observability platform to monitor, analyze, and document your data.
          </p>
          <Button
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-lg"
            onClick={() => navigate("/login")}
          >
            Get Started
          </Button>
        </motion.div>

        {/* Features */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="w-full"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-lg p-4 hover:scale-105 transition">
                <CardContent className="flex flex-col items-start gap-4">
                  {feature.icon}
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-gray-300">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Why CubeView */}
        <h2 className="text-3xl font-bold mt-24 mb-6 bg-gradient-to-r from-green-300 to-blue-400 text-transparent bg-clip-text text-center">
          Why Choose CubeView?
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {whyCubeView.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, duration: 0.5 }}
            >
              <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-lg p-4 hover:scale-105 transition">
                <CardContent className="flex flex-col items-start gap-4">
                  {item.icon}
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-gray-300">{item.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
