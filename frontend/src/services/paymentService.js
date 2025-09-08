import api from "./api";

// Get all payment batches
export const getPaymentBatches = async (page = 1, limit = 10) => {
  try {
    const response = await api.get(`/payments/batches?page=${page}&limit=${limit}`);
    return response;
  } catch (error) {
    throw error;
  }
};

// Get single payment batch
export const getPaymentBatch = async (batchId) => {
  try {
    const response = await api.get(`/payments/batches/${batchId}`);
    return response;
  } catch (error) {
    throw error;
  }
};

// Get payments by batch
export const getPaymentsByBatch = async (batchId, page = 1, limit = 10, status = null) => {
  try {
    let url = `/payments/batches/${batchId}/payments?page=${page}&limit=${limit}`;
    if (status) {
      url += `&status=${status}`;
    }
    const response = await api.get(url);
    return response;
  } catch (error) {
    throw error;
  }
};

// Process payment batch
export const processPaymentBatch = async (batchId, senderBatchHeader = {}) => {
  try {
    const response = await api.post(`/payments/batches/${batchId}/process`, {
      senderBatchHeader,
    });
    return response;
  } catch (error) {
    throw error;
  }
};

// Get payment statistics
export const getPaymentStats = async (batchId = null, period = null) => {
  try {
    let url = "/payments/stats";
    const params = new URLSearchParams();

    if (batchId) params.append("batchId", batchId);
    if (period) params.append("period", period);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await api.get(url);
    return response;
  } catch (error) {
    throw error;
  }
};

// Update payment status
export const updatePaymentStatus = async (paymentId, status, errorMessage = null) => {
  try {
    const response = await api.put(`/payments/${paymentId}/status`, {
      status,
      errorMessage,
    });
    return response;
  } catch (error) {
    throw error;
  }
};

// Sync with PayPal status
export const syncWithPayPal = async (batchId) => {
  try {
    const response = await api.post(`/payments/batches/${batchId}/sync`);
    return response;
  } catch (error) {
    throw error;
  }
};

// Update batch payment method
export const updateBatchPaymentMethod = async (batchId, paymentMethod, config = {}) => {
  try {
    const response = await api.put(`/payments/batches/${batchId}/payment-method`, {
      paymentMethod,
      config,
    });
    return response;
  } catch (error) {
    throw error;
  }
};

// Get PayPal account balance
export const getAccountBalance = async () => {
  try {
    const response = await api.get("/payments/account/balance");
    return response;
  } catch (error) {
    throw error;
  }
};
