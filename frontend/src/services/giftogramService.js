import api from "./api";

// const getBaseUrl = () => import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const getBaseUrl = () => import.meta.env.VITE_API_URL || "https://payments.studieshq.com/api";
const getAuthToken = () => localStorage.getItem("token");
const getEnvironment = () => {
  const env = (localStorage.getItem("bulkpayout_environment") || "sandbox").trim().toLowerCase();
  return ["production", "sandbox"].includes(env) ? env : "sandbox";
};

/**
 * Process Giftogram batch with streaming progress.
 * Calls onProgress({ sent, total, paymentId, email, status, errorMessage }) for each gift card sent.
 * Resolves when done with { successful, failed, hasFailures }; rejects on connection/parse error.
 */
export const processGiftogramBatchStream = async (batchId, giftogramConfig, onProgress) => {
  const url = `${getBaseUrl()}/giftogram/batches/${batchId}/process-stream`;
  const token = getAuthToken();
  const env = getEnvironment();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({
      giftogramConfig,
      environment: env,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || `Request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const chunk of lines) {
      const match = chunk.match(/^data:\s*(.+)$/m);
      if (!match) continue;
      try {
        const data = JSON.parse(match[1].trim());
        if (data.done) {
          return {
            successful: data.successful ?? 0,
            failed: data.failed ?? 0,
            hasFailures: data.hasFailures ?? false,
            error: data.error,
          };
        }
        onProgress?.(data);
      } catch {
        // Skip malformed chunks
      }
    }
  }

  return { successful: 0, failed: 0, hasFailures: true };
};

// Get available Giftogram campaigns
export const getGiftogramCampaigns = async () => {
  try {
    const response = await api.get("/giftogram/campaigns");
    return response;
  } catch (error) {
    throw error;
  }
};

// Process Giftogram batch
export const processGiftogramBatch = async (batchId, giftogramConfig = {}) => {
  try {
    const response = await api.post(`/giftogram/batches/${batchId}/process`, {
      giftogramConfig,
    });
    return response;
  } catch (error) {
    throw error;
  }
};

// Sync Giftogram batch status
export const syncGiftogramBatch = async (batchId) => {
  try {
    const response = await api.post(`/giftogram/batches/${batchId}/sync`);
    return response;
  } catch (error) {
    throw error;
  }
};

// Get Giftogram account funding balance
export const getGiftogramFunding = async () => {
  try {
    const response = await api.get("/giftogram/funding");
    return response;
  } catch (error) {
    throw error;
  }
};

// Test Giftogram API connection
export const testGiftogramConnection = async () => {
  try {
    const response = await api.get("/giftogram/test");
    return response;
  } catch (error) {
    throw error;
  }
};

export default {
  getGiftogramCampaigns,
  processGiftogramBatch,
  processGiftogramBatchStream,
  syncGiftogramBatch,
  getGiftogramFunding,
  testGiftogramConnection,
};
