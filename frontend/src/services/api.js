import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 30000, // 30 seconds timeout for file uploads
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Handle common errors
    const message = error.response?.data?.message || error.message || "An error occurred";

    // Log error for debugging
    console.error("API Error:", {
      status: error.response?.status,
      message,
      url: error.config?.url,
      method: error.config?.method,
    });

    return Promise.reject({
      message,
      status: error.response?.status,
      errors: error.response?.data?.errors,
    });
  }
);

export default api;
