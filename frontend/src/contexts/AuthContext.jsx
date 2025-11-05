import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
        try {
          const response = await api.get("/auth/me");
          if (response.success) {
            setUser(response.data);
          } else {
            localStorage.removeItem("token");
            setToken(null);
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      if (response.success) {
        const { token: newToken, ...userData } = response.data;
        localStorage.setItem("token", newToken);
        setToken(newToken);
        setUser(userData);
        return { success: true, user: userData };
      } else {
        return { success: false, error: response.error || "Login failed" };
      }
    } catch (error) {
      return { success: false, error: error.message || "Login failed" };
    }
  };

  // Register function
  const register = async (name, email, password) => {
    try {
      const response = await api.post("/auth/register", { name, email, password });
      if (response.success) {
        const { token: newToken, ...userData } = response.data;
        localStorage.setItem("token", newToken);
        setToken(newToken);
        setUser(userData);
        return { success: true, user: userData };
      } else {
        return { success: false, error: response.error || "Registration failed" };
      }
    } catch (error) {
      return { success: false, error: error.message || "Registration failed" };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAdmin,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

