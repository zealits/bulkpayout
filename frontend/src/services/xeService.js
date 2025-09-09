import api from "./api";

// Test XE API connection
export const testXeConnection = async () => {
  try {
    const response = await api.get("/xe/test");
    return response;
  } catch (error) {
    throw error;
  }
};

// Get XE accounts
export const getXeAccounts = async () => {
  try {
    const response = await api.get("/xe/accounts");
    return response;
  } catch (error) {
    throw error;
  }
};

// Get payment fields for country and currency
export const getPaymentFields = async (countryCode, currencyCode) => {
  try {
    const response = await api.get(`/xe/payment-fields/${countryCode}/${currencyCode}`);
    return response;
  } catch (error) {
    throw error;
  }
};

// Create XE recipient
export const createXeRecipient = async (recipientData) => {
  try {
    const response = await api.post("/xe/recipients", recipientData);
    return response;
  } catch (error) {
    throw error;
  }
};

// Create XE payment
export const createXePayment = async (paymentData) => {
  try {
    const response = await api.post("/xe/payments", paymentData);
    return response;
  } catch (error) {
    throw error;
  }
};

// Get XE payment status
export const getXePaymentStatus = async (paymentId) => {
  try {
    const response = await api.get(`/xe/payments/${paymentId}/status`);
    return response;
  } catch (error) {
    throw error;
  }
};

// Process XE batch
export const processXeBatch = async (batchId, xeConfig = {}) => {
  try {
    const response = await api.post(`/xe/batches/${batchId}/process`, {
      xeConfig,
    });
    return response;
  } catch (error) {
    throw error;
  }
};

// Get supported countries and currencies
export const getSupportedCountriesAndCurrencies = async () => {
  try {
    const response = await api.get("/xe/countries");
    return response;
  } catch (error) {
    throw error;
  }
};

export default {
  testXeConnection,
  getXeAccounts,
  getPaymentFields,
  createXeRecipient,
  createXePayment,
  getXePaymentStatus,
  processXeBatch,
  getSupportedCountriesAndCurrencies,
};
