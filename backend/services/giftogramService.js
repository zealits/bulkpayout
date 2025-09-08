const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

class GiftogramService {
  constructor() {
    this.apiUrl =
      process.env.GIFTOGRAM_ENVIRONMENT === "production"
        ? "https://api.giftogram.com"
        : "https://sandbox-api.giftogram.com";
    this.apiKey = process.env.GIFTOGRAM_API_KEY;

    console.log("🔄 Giftogram API key:", this.apiKey);
    if (!this.apiKey) {
      console.warn("⚠️ Giftogram API key not configured. Giftogram functionality will be disabled.");
    }

    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 second timeout
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🔄 Giftogram API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error("❌ Giftogram API Request Error:", error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Giftogram API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error(`❌ Giftogram API Error: ${error.response?.status} ${error.response?.statusText}`);
        if (error.response?.data) {
          console.error("Error details:", error.response.data);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if Giftogram service is configured and available
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Get available Giftogram campaigns
   */
  async getCampaigns() {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "Giftogram API not configured",
          data: null,
        };
      }

      const response = await this.client.get("/api/v1/campaigns");

      // Handle different response structures - could be single campaign or array
      let campaigns = [];
      if (response.data?.data) {
        // If response.data.data is an array, use it directly
        if (Array.isArray(response.data.data)) {
          campaigns = response.data.data;
        } else {
          // If it's a single campaign object, wrap it in an array
          campaigns = [response.data.data];
        }
      } else if (Array.isArray(response.data)) {
        // If response.data is directly an array
        campaigns = response.data;
      }

      console.log(`✅ Found ${campaigns.length} Giftogram campaigns`);

      return {
        success: true,
        data: campaigns,
        error: null,
      };
    } catch (error) {
      console.error("Error fetching Giftogram campaigns:", error);
      return {
        success: false,
        error: error.message,
        data: null,
        details: error.response?.data,
      };
    }
  }

  /**
   * Create a single gift card order
   */
  async createGiftCardOrder(orderData) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "Giftogram API not configured",
          data: null,
        };
      }

      // Validate required fields
      if (!orderData.recipientEmail || !orderData.amount) {
        return {
          success: false,
          error: "Missing required fields: recipientEmail and amount are required",
          data: null,
        };
      }

      // Generate unique external ID
      const externalId = `GC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Validate campaign ID is provided
      if (!orderData.campaignId) {
        return {
          success: false,
          error: "Campaign ID is required",
          data: null,
        };
      }

      const payload = {
        external_id: externalId,
        campaign_id: orderData.campaignId,
        message: orderData.message || "Thank you for your hard work! Enjoy your gift card!",
        subject: orderData.subject || "You have received a gift card!",
        notes: orderData.notes || "",
        recipients: [
          {
            email: orderData.recipientEmail,
            name: orderData.recipientName || orderData.recipientEmail.split("@")[0],
          },
        ],
        denomination: (Math.round(parseFloat(orderData.amount) / 5) * 5).toString(), // Convert to string, rounded to nearest $5
      };

      console.log(`🎁 Creating Giftogram order for ${orderData.recipientEmail}:`, {
        external_id: payload.external_id,
        campaign_id: payload.campaign_id,
        originalAmount: orderData.amount,
        finalDenomination: payload.denomination,
      });

      const response = await this.client.post("/api/v1/orders", payload);

      console.log(`✅ Giftogram order created successfully:`, {
        external_id: payload.external_id,
        order_id: response.data?.id,
        status: response.data?.status,
      });

      return {
        success: true,
        data: {
          ...response.data,
          external_id: externalId,
        },
        error: null,
      };
    } catch (error) {
      console.error("Error creating Giftogram order:", error);
      return {
        success: false,
        error: error.message,
        data: null,
        details: error.response?.data,
      };
    }
  }

  /**
   * Create multiple gift card orders in bulk
   */
  async createBulkGiftCardOrders(orders, options = {}) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "Giftogram API not configured",
          results: [],
        };
      }

      console.log(`🎁 Creating ${orders.length} gift card orders in bulk`);

      const results = [];
      const batchSize = options.batchSize || 5; // Process in batches to avoid overwhelming the API
      const delay = options.delay || 1000; // 1 second delay between batches

      for (let i = 0; i < orders.length; i += batchSize) {
        const batch = orders.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(orders.length / batchSize)}`);

        const batchPromises = batch.map(async (order) => {
          try {
            const result = await this.createGiftCardOrder(order);
            return {
              ...result,
              email: order.recipientEmail,
              name: order.recipientName,
              amount: order.amount,
            };
          } catch (error) {
            console.error(`Failed to create gift card for ${order.recipientEmail}:`, error);
            return {
              success: false,
              error: error.message,
              email: order.recipientEmail,
              name: order.recipientName,
              amount: order.amount,
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Add delay between batches (except for the last batch)
        if (i + batchSize < orders.length) {
          console.log(`⏳ Waiting ${delay}ms before next batch...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      console.log(`✅ Bulk gift card creation completed: ${successful.length} successful, ${failed.length} failed`);

      return {
        success: true,
        totalProcessed: results.length,
        successful: successful.length,
        failed: failed.length,
        totalAmount: successful.reduce((sum, r) => sum + (r.amount || 0), 0),
        results: results,
        errors: failed.map((f) => ({ email: f.email, error: f.error })),
      };
    } catch (error) {
      console.error("Error in bulk gift card creation:", error);
      return {
        success: false,
        error: error.message,
        results: [],
      };
    }
  }

  /**
   * Get order status from Giftogram
   */
  async getOrderStatus(orderId) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "Giftogram API not configured",
          data: null,
        };
      }

      const response = await this.client.get(`/api/v1/orders/${orderId}`);

      return {
        success: true,
        data: response.data,
        error: null,
      };
    } catch (error) {
      console.error(`Error fetching order status for ${orderId}:`, error);
      return {
        success: false,
        error: error.message,
        data: null,
        details: error.response?.data,
      };
    }
  }

  /**
   * Update multiple gift card statuses
   */
  async updateOrderStatuses(orderIds) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "Giftogram API not configured",
          results: [],
        };
      }

      console.log(`🔄 Updating status for ${orderIds.length} Giftogram orders`);

      const results = [];

      for (const orderId of orderIds) {
        try {
          const result = await this.getOrderStatus(orderId);
          results.push({
            orderId,
            ...result,
          });
        } catch (error) {
          console.error(`Failed to get status for order ${orderId}:`, error);
          results.push({
            orderId,
            success: false,
            error: error.message,
          });
        }
      }

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      console.log(`✅ Status update completed: ${successful.length} successful, ${failed.length} failed`);

      return {
        success: true,
        results: results,
        successful: successful.length,
        failed: failed.length,
      };
    } catch (error) {
      console.error("Error updating order statuses:", error);
      return {
        success: false,
        error: error.message,
        results: [],
      };
    }
  }

  /**
   * Test Giftogram API connection
   */
  async testConnection() {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "Giftogram API key not configured",
          data: null,
        };
      }

      // Try to fetch campaigns as a simple test
      const result = await this.getCampaigns();

      if (result.success) {
        return {
          success: true,
          message: "Giftogram API connection successful",
          data: {
            environment: process.env.GIFTOGRAM_ENVIRONMENT || "sandbox",
            apiUrl: this.apiUrl,
            campaigns: result.data?.length || 0,
          },
        };
      } else {
        return {
          success: false,
          error: "Failed to connect to Giftogram API",
          details: result.error,
        };
      }
    } catch (error) {
      console.error("Error testing Giftogram connection:", error);
      return {
        success: false,
        error: error.message,
        details: error.response?.data,
      };
    }
  }
}

// Create singleton instance
const giftogramService = new GiftogramService();

module.exports = giftogramService;
