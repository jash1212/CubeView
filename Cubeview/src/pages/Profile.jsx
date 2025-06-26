// src/pages/Profile.jsx
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { ACCESS_TOKEN } from "../constants";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function Profile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch (error) {
        console.error("Invalid token", error);
      }
    }
  }, []);

  if (!user) {
    return <p className="text-center text-gray-500">User data not found.</p>;
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">👤 Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p><strong>Username:</strong> {user.username}</p>
        {user.email && <p><strong>Email:</strong> {user.email}</p>}
        <p><strong>Token Expires:</strong> {new Date(user.exp * 1000).toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
