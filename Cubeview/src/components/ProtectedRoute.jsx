import { Navigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import api from "../api";
import { REFRESH_TOKEN, ACCESS_TOKEN } from "../constants";

function ProtectedRoute({ children }) {
  const [isAuthorised, setIsAuthorised] = useState(null);
  const location = useLocation();

  useEffect(() => {
    auth().catch(() => setIsAuthorised(false));
  }, []);

  const refreshToken = async () => {
    const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN);
    try {
      const res = await api.post("/api/token/refresh/", {
        refresh: refreshTokenValue,
      });
      if (res.status === 200) {
        localStorage.setItem(ACCESS_TOKEN, res.data.access);
        setIsAuthorised(true);
      } else {
        setIsAuthorised(false);
      }
    } catch (error) {
      console.log("Refresh token error:", error);
      setIsAuthorised(false);
    }
  };

  const auth = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (!token) {
      setIsAuthorised(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const tokenExpiration = decoded.exp;
      const now = Date.now() / 1000;

      if (tokenExpiration < now) {
        await refreshToken();
      } else {
        setIsAuthorised(true);
      }
    } catch (error) {
      console.log("JWT decode error:", error);
      setIsAuthorised(false);
    }
  };

  if (isAuthorised === null) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return isAuthorised ? children : <Navigate to="/login" state={{ from: location }} replace />;
}

export default ProtectedRoute;
