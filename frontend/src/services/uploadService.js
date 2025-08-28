import api from "./api";

// Upload Excel file and create payment batch
export const uploadExcelFile = async (formData) => {
  try {
    const response = await api.post("/upload/excel", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response;
  } catch (error) {
    throw error;
  }
};

// Validate Excel file without saving
export const validateExcelFile = async (formData) => {
  try {
    const response = await api.post("/upload/validate", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response;
  } catch (error) {
    throw error;
  }
};

// Get upload template information
export const getUploadTemplate = async () => {
  try {
    const response = await api.get("/upload/template");
    return response;
  } catch (error) {
    throw error;
  }
};

// Delete uploaded batch
export const deleteUploadedBatch = async (batchId) => {
  try {
    const response = await api.delete(`/upload/batches/${batchId}`);
    return response;
  } catch (error) {
    throw error;
  }
};

// Update batch information
export const updateBatch = async (batchId, data) => {
  try {
    const response = await api.put(`/upload/batches/${batchId}`, data);
    return response;
  } catch (error) {
    throw error;
  }
};
