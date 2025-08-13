import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, px } from "framer-motion";
import {
  Database,
  FileText,
  ShieldCheck,
  Table,
  Share2,
  BarChart3,
  Activity,
  BrainCircuit,
  CheckCircle,
  Zap,
  Lock,
  Radar
} from "lucide-react";
import NeuralBackground from "@/components/NeuralBackground";


const features = [
  {
    title: "Database Integration",
    description: "Connect PostgreSQL and other databases securely in minutes.",
    icon: <Database className="w-8 h-8 text-blue-600" />,
  },
  {
    title: "AI-Powered Docs",
    description: "Generate detailed table and column documentation instantly.",
    icon: <FileText className="w-8 h-8 text-indigo-600" />,
  },
  {
    title: "Rule Engine",
    description: "Set and automate data quality rules with SQL or templates.",
    icon: <ShieldCheck className="w-8 h-8 text-green-600" />,
  },
  {
    title: "Table Explorer",
    description: "Search, filter, and inspect your tables with ease.",
    icon: <Table className="w-8 h-8 text-purple-600" />,
  },
  {
    title: "Data Lineage",
    description: "Trace data flow from source to dashboard for full transparency.",
    icon: <Share2 className="w-8 h-8 text-orange-600" />,
  },
  {
    title: "Trends & Graphs",
    description: "Visualize health scores, anomalies, and incident history.",
    icon: <BarChart3 className="w-8 h-8 text-yellow-600" />,
  },
  {
    title: "ML Anomalies",
    description: "Leverage ML to detect unusual patterns before they cause issues.",
    icon: <BrainCircuit className="w-8 h-8 text-pink-600" />,
  },
  {
    title: "Incident Detection",
    description: "Catch schema drift, freshness issues, and volume spikes.",
    icon: <Activity className="w-8 h-8 text-red-600" />,
  },
];

const whyCubeView = [
  {
    title: "Trusted by Engineers",
    description: "Purpose-built for reliability, performance, and transparency.",
    icon: <CheckCircle className="w-8 h-8 text-green-500" />,
  },
  {
    title: "Lightning Fast",
    description: "Lightweight architecture ensures instant insights.",
    icon: <Zap className="w-8 h-8 text-yellow-500" />,
  },
  {
    title: "Enterprise-Grade Security",
    description: "SOC2-ready practices and end-to-end encryption.",
    icon: <Lock className="w-8 h-8 text-blue-500" />,
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
          <img src="/cubeview.png" alt="CubeView Logo" className="h-11 w-11" />
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
            className="bg-blue-500 hover:bg-blue-600 text-white"
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
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-blue-500 text-transparent bg-clip-text">
            Welcome to CubeView
          </h1>
          <p className="text-lg text-zinc-400">
            A smart data observability platform to monitor, analyze, and document your data.
          </p>
          <Button
            className="mt-6 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg shadow-lg"
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
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg p-4 hover:scale-105 transition">
                <CardContent className="flex flex-col items-start gap-4">
                  {feature.icon}
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Why CubeView */}
        <h2 className="text-3xl font-bold mt-24 mb-6 bg-gradient-to-r from-blue-500 to-blue-500 text-transparent bg-clip-text text-center">
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
                  <p className="text-gray-400">{item.description}</p>
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
