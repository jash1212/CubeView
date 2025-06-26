import axios from 'axios';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Request interceptor → add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor → auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if 401 and hasn't retried yet
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN);
        if (!refreshToken) throw new Error("No refresh token");

        const res = await axios.post(`${import.meta.env.VITE_API_URL}/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = res.data.access;
        localStorage.setItem(ACCESS_TOKEN, newAccessToken);

        // retry original request with new access token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Optional: logout or redirect
        console.error("Token refresh failed", refreshError);
        localStorage.removeItem(ACCESS_TOKEN);
        localStorage.removeItem(REFRESH_TOKEN);
        window.location.href = "/login"; // or dispatch logout
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export const fetchIncidents = () => api.get("/incidents/");

