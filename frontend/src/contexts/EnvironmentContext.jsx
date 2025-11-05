import React, { createContext, useContext, useState, useEffect } from "react";

const EnvironmentContext = createContext();

export const useEnvironment = () => {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error("useEnvironment must be used within an EnvironmentProvider");
  }
  return context;
};

export const EnvironmentProvider = ({ children }) => {
  // Load environment from localStorage or default to sandbox
  const [environment, setEnvironment] = useState(() => {
    const saved = localStorage.getItem("bulkpayout_environment");
    return saved === "production" ? "production" : "sandbox";
  });

  // Save to localStorage whenever environment changes
  useEffect(() => {
    localStorage.setItem("bulkpayout_environment", environment);
  }, [environment]);

  const toggleEnvironment = () => {
    setEnvironment((prev) => (prev === "production" ? "sandbox" : "production"));
  };

  const setProduction = () => {
    setEnvironment("production");
  };

  const setSandbox = () => {
    setEnvironment("sandbox");
  };

  const value = {
    environment,
    toggleEnvironment,
    setProduction,
    setSandbox,
    isProduction: environment === "production",
    isSandbox: environment === "sandbox",
  };

  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
};



