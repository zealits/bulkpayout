const axios = require("axios");

// PayPal configuration
function getPayPalConfig() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const mode = process.env.PAYPAL_MODE || "sandbox";

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not found in environment variables");
  }

  const baseUrl = mode === "live" ? "https://api.paypal.com" : "https://api.sandbox.paypal.com";

  return {
    clientId,
    clientSecret,
    baseUrl,
  };
}

// Get PayPal access token
async function getAccessToken() {
  const config = getPayPalConfig();

  try {
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

    const response = await axios.post(`${config.baseUrl}/v1/oauth2/token`, "grant_type=client_credentials", {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response.data.access_token;
  } catch (error) {
    console.error("Error getting PayPal access token:", error.response?.data || error.message);
    throw new Error("Failed to get PayPal access token");
  }
}

// Payout request builder
function buildPayoutRequest(batchId, payments, senderBatchHeader = {}) {
  const defaultHeader = {
    sender_batch_id: batchId,
    email_subject: "You have a payout!",
    email_message: "You have received a payout! Thanks for using our service!",
  };

  const items = payments.map((payment, index) => ({
    recipient_type: "EMAIL",
    amount: {
      value: payment.amount.toFixed(2),
      currency: payment.currency || "USD",
    },
    receiver: payment.recipientEmail,
    note: payment.notes || "Thank you for your service",
    sender_item_id: payment._id.toString() || `item_${index}`,
    recipient_wallet: "PAYPAL",
  }));

  return {
    sender_batch_header: { ...defaultHeader, ...senderBatchHeader },
    items: items,
  };
}

// Create payout
async function createPayout(batchId, payments, senderBatchHeader = {}) {
  try {
    console.log(`Creating PayPal payout for batch ${batchId} with ${payments.length} payments`);

    const config = getPayPalConfig();
    const accessToken = await getAccessToken();

    const payoutData = buildPayoutRequest(batchId, payments, senderBatchHeader);

    console.log("PayPal payout request data:", JSON.stringify(payoutData, null, 2));

    const response = await axios.post(`${config.baseUrl}/v1/payments/payouts`, payoutData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("PayPal payout response status:", response.status);
    console.log("PayPal payout response headers:", JSON.stringify(response.headers, null, 2));
    console.log("PayPal payout response data:", JSON.stringify(response.data, null, 2));

    return {
      success: true,
      data: response.data,
      statusCode: response.status,
    };
  } catch (error) {
    console.error("PayPal payout error:", error.response?.data || error.message);
    console.error("PayPal payout error status:", error.response?.status);
    console.error("PayPal payout error headers:", error.response?.headers);

    if (error.response?.data) {
      console.error("PayPal payout detailed error:", JSON.stringify(error.response.data, null, 2));
    }

    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data || null,
    };
  }
}

// Get payout batch details
async function getPayoutBatch(payoutBatchId) {
  try {
    console.log(`Getting PayPal payout batch details for: ${payoutBatchId}`);

    const config = getPayPalConfig();
    const accessToken = await getAccessToken();

    const response = await axios.get(`${config.baseUrl}/v1/payments/payouts/${payoutBatchId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("PayPal get batch response status:", response.status);
    console.log("PayPal get batch response data:", JSON.stringify(response.data, null, 2));

    return {
      success: true,
      data: response.data,
      statusCode: response.status,
    };
  } catch (error) {
    console.error("PayPal get payout batch error:", error.response?.data || error.message);
    console.error("PayPal get batch error status:", error.response?.status);

    if (error.response?.data) {
      console.error("PayPal get batch detailed error:", JSON.stringify(error.response.data, null, 2));
    }

    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data || null,
    };
  }
}

// Get payout item details
async function getPayoutItem(payoutItemId) {
  try {
    const config = getPayPalConfig();
    const accessToken = await getAccessToken();

    const response = await axios.get(`${config.baseUrl}/v1/payments/payouts-item/${payoutItemId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return {
      success: true,
      data: response.data,
      statusCode: response.status,
    };
  } catch (error) {
    console.error("PayPal get payout item error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data || null,
    };
  }
}

// Validate PayPal configuration
function validateConfig() {
  const required = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing PayPal configuration: ${missing.join(", ")}`);
  }

  console.log(`✅ PayPal configured for ${process.env.PAYPAL_MODE || "sandbox"} mode`);
  return true;
}

module.exports = {
  getPayPalConfig,
  getAccessToken,
  createPayout,
  getPayoutBatch,
  getPayoutItem,
  buildPayoutRequest,
  validateConfig,
};
