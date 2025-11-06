import api from "./api";
import axios from "axios";

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

// Parse uploaded XE workbook (multi-sheet)
export const parseXeWorkbook = async (formData) => {
  try {
    // const baseURL = import.meta.env.VITE_API_URL || "https://payments.studieshq.com/api";
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // Note: Don't set Content-Type manually when using FormData - axios will set it with boundary
    const axiosResponse = await axios.post(`${baseURL}/xe/parse-template`, formData, {
      headers,
    });
    return axiosResponse.data;
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

// Generate XE Excel template
export const generateXeTemplate = async ({ countryCode, currencyCode, numberOfRecipients }) => {
  try {
    // Use axios directly to bypass the interceptor for blob responses
    // const baseURL = import.meta.env.VITE_API_URL || "https://payments.studieshq.com/api";
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(
      `${baseURL}/xe/generate-template`,
      { countryCode, currencyCode, numberOfRecipients },
      {
        responseType: "blob", // Important: specify blob response type
        headers,
      }
    );

    // Check if response is actually an error JSON (application/json but sent as blob)
    const contentType = response.headers["content-type"] || "";
    if (contentType.includes("application/json")) {
      // It's an error response
      const text = await response.data.text();
      const json = JSON.parse(text);
      return {
        success: false,
        message: json.message || json.error || "Failed to generate template",
      };
    }

    return { success: true, data: response.data };
  } catch (error) {
    // Try to extract error message from blob response if it's JSON
    if (error.response?.data instanceof Blob) {
      try {
        const contentType = error.response.headers["content-type"] || "";
        if (contentType.includes("application/json")) {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          return {
            success: false,
            message: json.message || json.error || "Failed to generate template",
          };
        }
      } catch {
        // If parsing fails, use default message
      }
    }
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Failed to generate template",
    };
  }
};

// Generate multi-sheet XE Excel template
export const generateXeTemplateBulk = async (selections) => {
  try {
    // const baseURL = import.meta.env.VITE_API_URL || "https://payments.studieshq.com/api";
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await axios.post(
      `${baseURL}/xe/generate-template-bulk`,
      { selections },
      {
        responseType: "blob",
        headers,
      }
    );
    const contentType = response.headers["content-type"] || "";
    if (contentType.includes("application/json")) {
      const text = await response.data.text();
      const json = JSON.parse(text);
      return { success: false, message: json.message || json.error || "Failed to generate templates" };
    }
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        return { success: false, message: json.message || json.error || "Failed to generate templates" };
      } catch {}
    }
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Failed to generate templates",
    };
  }
};

// Create XE recipients from parsed workbook data (with SSE support)
export const createXeRecipients = async (sheetRows, batchId = null, useSSE = false, onProgress = null) => {
  try {
    if (useSSE && onProgress) {
      // Use Server-Sent Events for progress updates
      const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const token = localStorage.getItem("token");

      return new Promise((resolve, reject) => {
        // For POST with SSE, we need to use fetch with POST and stream
        const controller = new AbortController();
        fetch(`${baseURL}/xe/create-recipients`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ sheetRows, batchId, useSSE: true }),
          signal: controller.signal,
        })
          .then(async (response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const chunks = buffer.split("\n\n");
              buffer = chunks.pop() || "";

              for (const chunk of chunks) {
                if (chunk.trim() === "") continue;

                let event = "message";
                let data = null;

                const lines = chunk.split("\n");
                for (const line of lines) {
                  if (line.startsWith("event: ")) {
                    event = line.substring(7).trim();
                  } else if (line.startsWith("data: ")) {
                    try {
                      data = JSON.parse(line.substring(6));
                    } catch (e) {
                      console.error("Failed to parse SSE data:", e);
                    }
                  }
                }

                if (data !== null) {
                  if (event === "progress" && onProgress) {
                    onProgress(data);
                  } else if (event === "complete") {
                    resolve({ data });
                    controller.abort();
                    return;
                  } else if (event === "error") {
                    reject(new Error(data.message || "Error occurred"));
                    controller.abort();
                    return;
                  }
                }
              }
            }
          })
          .catch((error) => {
            if (error.name !== "AbortError") {
              reject(error);
            }
          });
      });
    } else {
      // Normal request without SSE
      const response = await api.post("/xe/create-recipients", { sheetRows, batchId, useSSE: false });
      return response;
    }
  } catch (error) {
    throw error;
  }
};

// Generate Excel file with error rows highlighted
export const generateErrorHighlightedExcel = async (sheetRows, results) => {
  try {
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(
      `${baseURL}/xe/generate-error-excel`,
      { sheetRows, results },
      {
        responseType: "blob",
        headers,
      }
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `XE_Recipients_With_Errors_${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    throw error;
  }
};

// List XE recipients
export const getXeRecipients = async ({ page = 1, limit = 20, status, search } = {}) => {
  try {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    const query = params.toString();
    const response = await api.get(`/xe/recipients${query ? `?${query}` : ""}`);
    return response;
  } catch (error) {
    throw error;
  }
};

// Delete XE recipient by xeRecipientId (calls backend which deletes in XE and DB)
export const deleteXeRecipient = async (xeRecipientId) => {
  try {
    const response = await api.delete(`/xe/recipients/${encodeURIComponent(xeRecipientId)}`);
    return response;
  } catch (error) {
    throw error;
  }
};

// Create XE contract
export const createXeContract = async (contractData) => {
  try {
    const response = await api.post("/xe/contracts", contractData);
    return response;
  } catch (error) {
    throw error;
  }
};

// Approve XE contract
export const approveXeContract = async (contractNumber) => {
  try {
    const response = await api.post(`/xe/contracts/${encodeURIComponent(contractNumber)}/approve`);
    return response;
  } catch (error) {
    throw error;
  }
};

// Cancel/Delete XE contract
export const cancelXeContract = async (contractNumber) => {
  try {
    const response = await api.delete(`/xe/contracts/${encodeURIComponent(contractNumber)}`);
    // Handle 204 status code (successful deletion with no content)
    // The backend will return a proper response even for 204
    return response;
  } catch (error) {
    // Extract status code and error message for better error handling
    const statusCode = error.status || error.response?.status;
    const errorMessage = error.message || error.response?.data?.message || "Failed to cancel contract";

    // Create a structured error object with status code
    const enhancedError = {
      ...error,
      status: statusCode,
      message: errorMessage,
      statusCode: statusCode,
    };

    throw enhancedError;
  }
};

// Get XE contract by contract number
export const getXeContract = async (contractNumber) => {
  try {
    const response = await api.get(`/xe/contracts/${encodeURIComponent(contractNumber)}`);
    return response;
  } catch (error) {
    throw error;
  }
};

// Get XE contract details from XE API
export const getXeContractDetails = async (contractNumber) => {
  try {
    const response = await api.get(`/xe/contracts/${encodeURIComponent(contractNumber)}/details`);
    return response;
  } catch (error) {
    throw error;
  }
};

// Get XE contracts for a recipient
export const getXeContractsByRecipient = async (xeRecipientId, { page = 1, limit = 20 } = {}) => {
  try {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    const query = params.toString();
    const response = await api.get(
      `/xe/recipients/${encodeURIComponent(xeRecipientId)}/contracts${query ? `?${query}` : ""}`
    );
    return response;
  } catch (error) {
    throw error;
  }
};

// Get all XE contracts
export const getAllXeContracts = async ({ page = 1, limit = 20, search } = {}) => {
  try {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search) params.set("search", search);
    const query = params.toString();
    const response = await api.get(`/xe/contracts${query ? `?${query}` : ""}`);
    return response;
  } catch (error) {
    throw error;
  }
};

export default {
  testXeConnection,
  getXeAccounts,
  getPaymentFields,
  parseXeWorkbook,
  createXeRecipient,
  createXePayment,
  getXePaymentStatus,
  processXeBatch,
  getSupportedCountriesAndCurrencies,
  generateXeTemplate,
  generateXeTemplateBulk,
  createXeRecipients,
  getXeRecipients,
  deleteXeRecipient,
  createXeContract,
  approveXeContract,
  cancelXeContract,
  getXeContract,
  getXeContractDetails,
  getXeContractsByRecipient,
  getAllXeContracts,
};
