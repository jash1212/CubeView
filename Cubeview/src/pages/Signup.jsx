import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function Signup() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 👈 Step tracker

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    db_type: "postgres",
    host: "",
    port: 5432,
    database: "",
    db_user: "",
    db_password: "",
    check_frequency: "hour",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const nextStep = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8000/api/register/", formData);
      
      navigate("/login");
    } catch (err) {
      setError(err.response?.data || "Signup failed");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Sign Up</h2>

      {step === 1 && (
        <form onSubmit={nextStep} className="space-y-4">
          <Input name="username" placeholder="Username" onChange={handleChange} required />
          <Input name="email" type="email" placeholder="Email" onChange={handleChange} required />
          <Input name="password" type="password" placeholder="Password" onChange={handleChange} required />
          <Button type="submit" className="w-full">Next</Button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <select name="db_type" onChange={handleChange} className="w-full border rounded p-2">
            <option value="postgres">PostgreSQL</option>
            <option value="mysql">MySQL</option>
          </select>
          <Input name="host" placeholder="Database Host" onChange={handleChange} required />
          <Input name="port" type="number" placeholder="Port" onChange={handleChange} required />
          <Input name="database" placeholder="Database Name" onChange={handleChange} required />
          <Input name="db_user" placeholder="DB Username" onChange={handleChange} required />
          <Input name="db_password" type="password" placeholder="DB Password" onChange={handleChange} required />

          <select name="check_frequency" onChange={handleChange} className="w-full border rounded p-2">
            <option value="minute">Every Minute</option>
            <option value="hour">Every Hour</option>
            <option value="day">Every Day</option>
          </select>

          {error && <p className="text-red-600">{JSON.stringify(error)}</p>}

          <div className="flex justify-between">
            <Button type="button" onClick={() => setStep(1)} variant="outline">Back</Button>
            <Button type="submit">Register</Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default Signup;
