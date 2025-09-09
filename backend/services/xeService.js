const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

class XeService {
  constructor() {
    this.apiUrl =
      process.env.XE_ENVIRONMENT === "production" ? "https://pay-api.xe.com" : "https://pay-api-sandbox.xe.com";
    this.accessKey = process.env.XE_ACCESS_KEY;
    this.accessSecret = process.env.XE_ACCESS_SECRET;

    console.log("🔄 XE API configuration:", {
      environment: process.env.XE_ENVIRONMENT || "sandbox",
      apiUrl: this.apiUrl,
      hasAccessKey: process.env.XE_ACCESS_KEY,
      hasAccessSecret: process.env.XE_ACCESS_SECRET,
    });

    // Token management
    this.accessToken = null;
    this.tokenExpiresAt = null;

    console.log("🔄 XE API configuration:", {
      environment: process.env.XE_ENVIRONMENT || "sandbox",
      apiUrl: this.apiUrl,
      hasAccessKey: !!this.accessKey,
      hasAccessSecret: !!this.accessSecret,
    });

    if (!this.accessKey || !this.accessSecret) {
      console.warn("⚠️ XE API credentials not configured. XE functionality will be disabled.");
    }

    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 second timeout
    });

    // Add request interceptor for logging and token management
    this.client.interceptors.request.use(
      async (config) => {
        console.log(`🔄 XE API Request: ${config.method?.toUpperCase()} ${config.url}`);

        // Add authorization header if we have a valid token (except for auth endpoint)
        if (!config.url.includes("/auth/token")) {
          if (this.accessToken && this.isTokenValid()) {
            config.headers.Authorization = `Bearer ${this.accessToken}`;
            console.log("✅ Authorization header set");
          } else {
            console.log("❌ No valid token available for request");
          }
        }

        return config;
      },
      (error) => {
        console.error("❌ XE API Request Error:", error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ XE API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error(`❌ XE API Error: ${error.response?.status} ${error.response?.statusText}`);
        if (error.response?.data) {
          console.error("Error details:", error.response.data);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if XE service is configured and available
   */
  isConfigured() {
    return !!(this.accessKey && this.accessSecret);
  }

  /**
   * Check if current access token is valid
   */
  isTokenValid() {
    if (!this.accessToken || !this.tokenExpiresAt) {
      return false;
    }

    // Check if token expires in the next 5 minutes (add buffer)
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const expiryTime = new Date(this.tokenExpiresAt).getTime();
    const currentTime = now.getTime();
    const timeUntilExpiry = expiryTime - currentTime;

    return timeUntilExpiry > bufferTime;
  }

  /**
   * Authenticate with XE API and get access token
   */
  async authenticate() {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "XE API credentials not configured",
          data: null,
        };
      }

      console.log("🔐 Authenticating with XE API...");

      const response = await this.client.post("/v2/auth/token", {
        accessKey: this.accessKey,
        accessSecret: this.accessSecret,
      });

      // console.log("🔍 XE Auth Response:", JSON.stringify(response.data, null, 2));

      this.accessToken = response.data.accessToken; // Note: XE uses 'accessToken' not 'access_token'
      this.tokenExpiresAt = response.data.expiresAt;

      console.log("✅ XE Authentication successful", {
        hasToken: !!this.accessToken,
        tokenLength: this.accessToken ? this.accessToken.length : 0,
        expiresAt: this.tokenExpiresAt,
      });

      return {
        success: true,
        data: {
          accessToken: this.accessToken,
          expiresAt: this.tokenExpiresAt,
          idToken: response.data.idToken,
          refreshToken: response.data.refreshToken,
        },
        error: null,
      };
    } catch (error) {
      console.error("Error authenticating with XE API:", error);
      this.accessToken = null;
      this.tokenExpiresAt = null;

      return {
        success: false,
        error: error.response?.data?.message || error.message,
        data: null,
        details: error.response?.data,
      };
    }
  }

  /**
   * Ensure we have a valid access token
   */
  async ensureAuthenticated() {
    if (!this.isTokenValid()) {
      const authResult = await this.authenticate();
      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.error}`);
      }
    }
  }

  /**
   * Get XE accounts
   */
  async getAccounts() {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "XE API not configured",
          data: null,
        };
      }

      await this.ensureAuthenticated();

      const response = await this.client.get("/v2/accounts");

      console.log(`✅ Found ${response.data?.length || 0} XE accounts`);

      return {
        success: true,
        data: response.data || [],
        error: null,
      };
    } catch (error) {
      console.error("Error fetching XE accounts:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        data: null,
        details: error.response?.data,
      };
    }
  }

  /**
   * Get payment fields for a specific country and currency
   */
  async getPaymentFields(countryCode, currencyCode) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "XE API not configured",
          data: null,
        };
      }

      if (!countryCode || !currencyCode) {
        return {
          success: false,
          error: "Country code and currency code are required",
          data: null,
        };
      }

      await this.ensureAuthenticated();

      const response = await this.client.get(`/v2/paymentFields/country/${countryCode}/currency/${currencyCode}`);

      console.log(
        `✅ Retrieved payment fields for ${countryCode}/${currencyCode}:`,
        response.data?.length || 0,
        "fields"
      );

      return {
        success: true,
        data: response.data || [],
        error: null,
      };
    } catch (error) {
      console.error(`Error fetching payment fields for ${countryCode}/${currencyCode}:`, error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        data: null,
        details: error.response?.data,
      };
    }
  }

  /**
   * Create a recipient
   */
  async createRecipient(recipientData) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "XE API not configured",
          data: null,
        };
      }

      await this.ensureAuthenticated();

      // Validate required fields
      if (!recipientData.email || !recipientData.name) {
        return {
          success: false,
          error: "Email and name are required for recipient creation",
          data: null,
        };
      }

      const response = await this.client.post("/v2/recipients", recipientData);

      console.log("✅ XE recipient created successfully:", {
        recipientId: response.data?.id,
        email: recipientData.email,
      });

      return {
        success: true,
        data: response.data,
        error: null,
      };
    } catch (error) {
      console.error("Error creating XE recipient:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        data: null,
        details: error.response?.data,
      };
    }
  }

  /**
   * Create a payment
   */
  async createPayment(paymentData) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "XE API not configured",
          data: null,
        };
      }

      await this.ensureAuthenticated();

      // Validate required fields
      if (!paymentData.recipientId || !paymentData.amount || !paymentData.accountNumber) {
        return {
          success: false,
          error: "Recipient ID, amount, and account number are required for payment creation",
          data: null,
        };
      }

      const response = await this.client.post("/v2/payments", paymentData);

      console.log("✅ XE payment created successfully:", {
        paymentId: response.data?.id,
        amount: paymentData.amount,
        recipientId: paymentData.recipientId,
      });

      return {
        success: true,
        data: response.data,
        error: null,
      };
    } catch (error) {
      console.error("Error creating XE payment:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        data: null,
        details: error.response?.data,
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "XE API not configured",
          data: null,
        };
      }

      await this.ensureAuthenticated();

      const response = await this.client.get(`/v2/payments/${paymentId}`);

      return {
        success: true,
        data: response.data,
        error: null,
      };
    } catch (error) {
      console.error(`Error fetching payment status for ${paymentId}:`, error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        data: null,
        details: error.response?.data,
      };
    }
  }

  /**
   * Test XE API connection
   */
  async testConnection() {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "XE API credentials not configured",
          data: null,
        };
      }

      // Try to authenticate and get accounts as a simple test
      const authResult = await this.authenticate();
      if (!authResult.success) {
        return {
          success: false,
          error: "Failed to authenticate with XE API",
          details: authResult.error,
        };
      }

      const accountsResult = await this.getAccounts();
      if (accountsResult.success) {
        return {
          success: true,
          message: "XE API connection successful",
          data: {
            environment: process.env.XE_ENVIRONMENT || "sandbox",
            apiUrl: this.apiUrl,
            accounts: accountsResult.data?.length || 0,
            authenticated: true,
          },
        };
      } else {
        return {
          success: false,
          error: "Failed to fetch accounts from XE API",
          details: accountsResult.error,
        };
      }
    } catch (error) {
      console.error("Error testing XE connection:", error);
      return {
        success: false,
        error: error.message,
        details: error.response?.data,
      };
    }
  }

  /**
   * Get supported countries and currencies
   */
  async getSupportedCountriesAndCurrencies() {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "XE API not configured",
          data: null,
        };
      }

      await this.ensureAuthenticated();

      // This is a placeholder - the actual endpoint may vary
      // You might need to adjust this based on XE's actual API
      const response = await this.client.get("/v2/countries");

      return {
        success: true,
        data: response.data || [],
        error: null,
      };
    } catch (error) {
      console.error("Error fetching supported countries and currencies:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        data: null,
        details: error.response?.data,
      };
    }
  }
}

// Create singleton instance
const xeService = new XeService();

module.exports = xeService;
