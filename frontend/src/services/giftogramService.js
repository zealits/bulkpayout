import api from "./api";

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
  syncGiftogramBatch,
  testGiftogramConnection,
};
