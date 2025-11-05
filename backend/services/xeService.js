const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

class XeService {
  constructor(environment) {
    // Environment is now required - no fallback to env vars
    if (!environment || !["production", "sandbox"].includes(environment)) {
      throw new Error("Environment parameter is required and must be 'production' or 'sandbox'");
    }
    this.currentEnvironment = environment;
    this.configureForEnvironment(this.currentEnvironment);
  }

  /**
   * Configure service for specific environment
   * @param {string} environment - 'production' or 'sandbox'
   */
  configureForEnvironment(environment = "sandbox") {
    this.currentEnvironment = environment;
    
    // Set API URL based on environment
    this.apiUrl =
      environment === "production" ? "https://pay-api.xe.com" : "https://pay-api-sandbox.xe.com";

    // Load credentials based on environment
    if (environment === "production") {
      this.accessKey = process.env.XE_PRODUCTION_ACCESS_KEY || process.env.XE_ACCESS_KEY;
      this.accessSecret = process.env.XE_PRODUCTION_ACCESS_SECRET || process.env.XE_ACCESS_SECRET;
      this.accountNumber = process.env.XE_PRODUCTION_ACCOUNT_NUMBER || process.env.XE_ACCOUNT_NUMBER;
      this.bankAccountId = process.env.XE_PRODUCTION_BANK_ACCOUNT_ID || process.env.XE_BANK_ACCOUNT_ID;
    } else {
      this.accessKey = process.env.XE_SANDBOX_ACCESS_KEY || process.env.XE_ACCESS_KEY;
      this.accessSecret = process.env.XE_SANDBOX_ACCESS_SECRET || process.env.XE_ACCESS_SECRET;
      this.accountNumber = process.env.XE_SANDBOX_ACCOUNT_NUMBER || process.env.XE_ACCOUNT_NUMBER;
      this.bankAccountId = process.env.XE_SANDBOX_BANK_ACCOUNT_ID || process.env.XE_BANK_ACCOUNT_ID;
    }

    console.log(`🔄 XE API configuration (${environment}):`, {
      environment: this.currentEnvironment,
      apiUrl: this.apiUrl,
      hasAccessKey: !!this.accessKey,
      hasAccessSecret: !!this.accessSecret,
      hasAccountNumber: !!this.accountNumber,
    });

    // Reset token when switching environments
    this.accessToken = null;
    this.tokenExpiresAt = null;

    if (!this.accessKey || !this.accessSecret) {
      console.warn(`⚠️ XE API credentials not configured for ${environment}. XE functionality will be disabled.`);
    }

    // Recreate axios instance with new base URL
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
        // console.log(`🔄 XE API Request: ${config.method?.toUpperCase()} ${config.url}`);

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
        // console.error("❌ XE API Request Error:", error);
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
   * @param {Object} recipientData - Recipient data following XE API format
   * @param {string} accountNumber - Account number for query parameter
   */
  async createRecipient(recipientData, accountNumber = null) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "XE API not configured",
          data: null,
        };
      }

      await this.ensureAuthenticated();

      // Default to env account number if not provided
      if (!accountNumber && this.accountNumber) {
        accountNumber = this.accountNumber;
      }

      // Build URL with accountNumber query param if provided
      let url = "/v2/recipients";
      if (accountNumber) {
        url += `?accountNumber=${encodeURIComponent(accountNumber)}`;
      }

      const response = await this.client.post(url, recipientData);

      console.log("✅ XE recipient created successfully:", {
        recipientId: response.data?.recipientId?.xeRecipientId,
        clientReference: recipientData.clientReference,
      });

      return {
        success: true,
        data: response.data,
        error: null,
        statusCode: response.status,
      };
    } catch (error) {
      // console.error("Error creating XE recipient:", error);

      const statusCode = error.response?.status || 500;
      const errorData = error.response?.data || {};

      return {
        success: false,
        error: errorData.shortErrorMsg || errorData.longErrorMsg || error.message,
        data: null,
        details: errorData,
        statusCode: statusCode,
      };
    }
  }

  /**
   * Delete a recipient in XE by xeRecipientId
   */
  async deleteRecipient(xeRecipientId) {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: "XE API not configured", data: null };
      }

      if (!xeRecipientId) {
        return { success: false, error: "xeRecipientId is required", data: null };
      }

      await this.ensureAuthenticated();

      const response = await this.client.delete(`/v2/recipients/${encodeURIComponent(xeRecipientId)}`);

      return { success: true, data: response.data || null, error: null, statusCode: response.status };
    } catch (error) {
      const statusCode = error.response?.status || 500;
      const errorData = error.response?.data || {};
      return {
        success: false,
        error: errorData.shortErrorMsg || errorData.longErrorMsg || error.message,
        data: null,
        details: errorData,
        statusCode,
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

      // Default to env account number if not provided on payload
      if (!paymentData.accountNumber && this.accountNumber) {
        paymentData.accountNumber = this.accountNumber;
      }

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

  /**
   * Create a contract for payment
   * @param {Object} contractData - Contract data with payments array
   * @param {string} accountNumber - Account number for query parameter
   */
  async createContract(contractData, accountNumber = null) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "XE API not configured",
          data: null,
        };
      }

      await this.ensureAuthenticated();

      // Default to env account number if not provided
      if (!accountNumber && this.accountNumber) {
        accountNumber = this.accountNumber;
      }

      if (!accountNumber) {
        return {
          success: false,
          error: "Account number is required",
          data: null,
        };
      }

      // Build URL with accountNumber query param
      const url = `/v2/payments?accountNumber=${encodeURIComponent(accountNumber)}`;

      const response = await this.client.post(url, contractData);

      console.log("✅ XE contract created successfully:", {
        response: response.data,
        //   contractNumber: response.data?.identifier?.contractNumber,
        //   clientTransferNumber: response.data?.identifier?.clientTransferNumber,
      });

      return {
        success: true,
        data: response.data,
        error: null,
        statusCode: response.status,
      };
    } catch (error) {
      console.error("Error creating XE contract:", error);

      const statusCode = error.response?.status || 500;
      const errorData = error.response?.data || {};

      return {
        success: false,
        error: errorData.shortErrorMsg || errorData.longErrorMsg || error.message,
        data: null,
        details: errorData,
        statusCode: statusCode,
      };
    }
  }

  /**
   * Approve a contract
   * @param {string} contractNumber - Contract number to approve
   */
  async approveContract(contractNumber) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "XE API not configured",
          data: null,
        };
      }

      await this.ensureAuthenticated();

      if (!contractNumber) {
        return {
          success: false,
          error: "Contract number is required",
          data: null,
        };
      }

      // Build URL - approve endpoint uses /v2/contracts/ not /v2/payments/
      const url = `/v2/contracts/${encodeURIComponent(contractNumber)}/approve`;

      const response = await this.client.post(url);

      console.log("✅ XE contract approved successfully:", {
        contractNumber: contractNumber,
      });

      return {
        success: true,
        data: response.data,
        error: null,
        statusCode: response.status,
      };
    } catch (error) {
      console.error("Error approving XE contract:", error);

      const statusCode = error.response?.status || 500;
      const errorData = error.response?.data || {};

      return {
        success: false,
        error: errorData.shortErrorMsg || errorData.longErrorMsg || error.message,
        data: null,
        details: errorData,
        statusCode: statusCode,
      };
    }
  }

  /**
   * Cancel/Delete a contract
   * @param {string} contractNumber - Contract number to cancel
   */
  async cancelContract(contractNumber) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "XE API not configured",
          data: null,
        };
      }

      await this.ensureAuthenticated();

      if (!contractNumber) {
        return {
          success: false,
          error: "Contract number is required",
          data: null,
        };
      }

      // Build URL for contract cancellation
      const url = `/v2/contracts/${encodeURIComponent(contractNumber)}`;

      const response = await this.client.delete(url);

      console.log("✅ XE contract cancelled successfully:", {
        contractNumber: contractNumber,
      });

      return {
        success: true,
        data: response.data,
        error: null,
        statusCode: response.status,
      };
    } catch (error) {
      console.error("Error cancelling XE contract:", error);

      const statusCode = error.response?.status || 500;
      const errorData = error.response?.data || {};

      return {
        success: false,
        error: errorData.shortErrorMsg || errorData.longErrorMsg || error.message,
        data: null,
        details: errorData,
        statusCode: statusCode,
      };
    }
  }

  /**
   * Get contract status
   * @param {string} contractNumber - Contract number
   * @param {string} accountNumber - Account number for query parameter
   */
  async getContractStatus(contractNumber, accountNumber = null) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "XE API not configured",
          data: null,
        };
      }

      await this.ensureAuthenticated();

      // Default to env account number if not provided
      if (!accountNumber && this.accountNumber) {
        accountNumber = this.accountNumber;
      }

      if (!accountNumber || !contractNumber) {
        return {
          success: false,
          error: "Account number and contract number are required",
          data: null,
        };
      }

      // Build URL with accountNumber query param
      const url = `/v2/payments/${encodeURIComponent(contractNumber)}?accountNumber=${encodeURIComponent(
        accountNumber
      )}`;

      const response = await this.client.get(url);

      return {
        success: true,
        data: response.data,
        error: null,
        statusCode: response.status,
      };
    } catch (error) {
      console.error(`Error fetching contract status for ${contractNumber}:`, error);

      const statusCode = error.response?.status || 500;
      const errorData = error.response?.data || {};

      return {
        success: false,
        error: errorData.shortErrorMsg || errorData.longErrorMsg || error.message,
        data: null,
        details: errorData,
        statusCode: statusCode,
      };
    }
  }

  /**
   * Get contract details from XE API
   * @param {string} contractNumber - Contract number
   */
  async getContractDetails(contractNumber) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: "XE API not configured",
          data: null,
        };
      }

      await this.ensureAuthenticated();

      if (!contractNumber) {
        return {
          success: false,
          error: "Contract number is required",
          data: null,
        };
      }

      const url = `/v2/contracts/${encodeURIComponent(contractNumber)}`;

      const response = await this.client.get(url);

      console.log("✅ XE contract details fetched successfully:", {
        contractNumber: contractNumber,
      });

      return {
        success: true,
        data: response.data,
        error: null,
        statusCode: response.status,
      };
    } catch (error) {
      console.error(`Error fetching contract details for ${contractNumber}:`, error);

      const statusCode = error.response?.status || 500;
      const errorData = error.response?.data || {};

      return {
        success: false,
        error: errorData.shortErrorMsg || errorData.longErrorMsg || error.message,
        data: null,
        details: errorData,
        statusCode: statusCode,
      };
    }
  }
}

// Create a factory function to get service instance for specific environment
function getXeService(environment) {
  // Environment is now required
  if (!environment || !["production", "sandbox"].includes(environment)) {
    throw new Error("Environment parameter is required and must be 'production' or 'sandbox'");
  }
  
  // Create new instance with environment
  return new XeService(environment);
}

// Note: No default singleton instance - environment must be provided

// Export factory function and class
module.exports = { getXeService, XeService };
