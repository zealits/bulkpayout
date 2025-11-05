import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  // baseURL: import.meta.env.VITE_API_URL || "https://bulkpayout.aiiventure.com/api",
  timeout: 30000, // 30 seconds timeout for file uploads
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token to requests
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add environment parameter from localStorage (set by EnvironmentContext)
    let environment = localStorage.getItem("bulkpayout_environment") || "sandbox";
    
    // Normalize environment (ensure it's valid)
    environment = String(environment).trim().toLowerCase();
    if (!["production", "sandbox"].includes(environment)) {
      environment = "sandbox"; // Default to sandbox if invalid
    }
    
    // Add environment to query params for GET requests
    if (config.method === "get" || config.method === "GET") {
      config.params = config.params || {};
      config.params.environment = environment;
    }
    // Add environment to body for POST/PUT/DELETE requests
    else if (config.data) {
      // If data is FormData, we can't modify it easily, so we'll handle it in the service
      if (!(config.data instanceof FormData)) {
        config.data.environment = environment;
      }
    }
    
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
    const message = error.response?.data?.error || error.response?.data?.message || error.message || "An error occurred";

    // Handle 401 unauthorized - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // Only redirect if not already on login/register page
      if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/register")) {
        window.location.href = "/login";
      }
    }

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
