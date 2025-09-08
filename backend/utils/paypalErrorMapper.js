// PayPal Error Mapping Utility
// Maps PayPal API error codes to user-friendly messages with actionable suggestions

const paypalErrorMap = {
  // Insufficient Funds
  INSUFFICIENT_FUNDS: {
    title: "Insufficient Account Balance",
    message: "Your PayPal account doesn't have enough funds to complete this payout.",
    suggestion:
      "Please add funds to your PayPal account and try again. You can add funds from your linked bank account or transfer money from another source.",
    severity: "error",
    retryable: true,
    action: "Add funds to your PayPal account",
  },

  // Authorization Issues
  NOT_AUTHORIZED: {
    title: "Authorization Required",
    message: "Your PayPal account doesn't have the necessary permissions for this operation.",
    suggestion: "Please contact PayPal support to verify your account permissions for bulk payouts.",
    severity: "error",
    retryable: false,
    action: "Contact PayPal support",
  },

  PERMISSION_DENIED: {
    title: "Permission Denied",
    message: "Your PayPal account doesn't have permission to perform bulk payouts.",
    suggestion: "Ensure your PayPal business account is verified and has payout permissions enabled.",
    severity: "error",
    retryable: false,
    action: "Verify PayPal business account",
  },

  // Authentication Issues
  AUTHENTICATION_FAILURE: {
    title: "Authentication Failed",
    message: "There was an issue authenticating with PayPal. Please check your API credentials.",
    suggestion: "Verify that your PayPal Client ID and Secret are correct and haven't expired.",
    severity: "error",
    retryable: true,
    action: "Check PayPal API credentials",
  },

  ACCESS_TOKEN_EXPIRED: {
    title: "Access Token Expired",
    message: "The PayPal access token has expired.",
    suggestion: "Please try again. If the issue persists, contact support.",
    severity: "warning",
    retryable: true,
    action: "Retry the operation",
  },

  // Rate Limiting
  RATE_LIMIT_REACHED: {
    title: "Rate Limit Exceeded",
    message: "Too many requests have been made to PayPal in a short time.",
    suggestion: "Please wait a few minutes before trying again.",
    severity: "warning",
    retryable: true,
    action: "Wait and retry",
  },

  // Validation Errors
  INVALID_REQUEST: {
    title: "Invalid Request",
    message: "The payment request contains invalid data.",
    suggestion: "Please check that all recipient emails are valid and amounts are properly formatted.",
    severity: "error",
    retryable: true,
    action: "Review payment data",
  },

  VALIDATION_ERROR: {
    title: "Validation Error",
    message: "Some payment details failed PayPal's validation checks.",
    suggestion: "Verify that all email addresses are valid and amounts are within PayPal's limits.",
    severity: "error",
    retryable: true,
    action: "Correct validation errors",
  },

  // Recipient Issues
  RECEIVER_UNREGISTERED: {
    title: "Recipient Not Registered",
    message: "One or more recipients don't have PayPal accounts.",
    suggestion: "Recipients will receive an email invitation to create a PayPal account to claim their payment.",
    severity: "warning",
    retryable: false,
    action: "Recipients must create PayPal accounts",
  },

  RECEIVER_UNABLE_TO_RECEIVE: {
    title: "Recipient Cannot Receive Payment",
    message: "The recipient's PayPal account cannot receive payments.",
    suggestion: "The recipient needs to verify their PayPal account or check their account limitations.",
    severity: "error",
    retryable: false,
    action: "Recipient must resolve account issues",
  },

  // Amount Issues
  AMOUNT_LIMIT_EXCEEDED: {
    title: "Amount Limit Exceeded",
    message: "The payment amount exceeds PayPal's limits.",
    suggestion: "Split large payments into smaller amounts or contact PayPal to increase your limits.",
    severity: "error",
    retryable: true,
    action: "Reduce payment amounts",
  },

  MINIMUM_AMOUNT_REQUIRED: {
    title: "Amount Too Small",
    message: "The payment amount is below PayPal's minimum threshold.",
    suggestion: "Increase the payment amount to meet PayPal's minimum requirements.",
    severity: "error",
    retryable: true,
    action: "Increase payment amount",
  },

  // Currency Issues
  CURRENCY_NOT_SUPPORTED: {
    title: "Currency Not Supported",
    message: "The specified currency is not supported for payouts.",
    suggestion: "Use a supported currency like USD, EUR, or GBP.",
    severity: "error",
    retryable: true,
    action: "Change to supported currency",
  },

  // Account Issues
  ACCOUNT_LOCKED: {
    title: "Account Locked",
    message: "Your PayPal account is temporarily locked.",
    suggestion: "Contact PayPal support to resolve account limitations.",
    severity: "error",
    retryable: false,
    action: "Contact PayPal support",
  },

  ACCOUNT_RESTRICTED: {
    title: "Account Restricted",
    message: "Your PayPal account has restrictions that prevent payouts.",
    suggestion: "Review your account status in PayPal and resolve any limitations.",
    severity: "error",
    retryable: false,
    action: "Resolve account restrictions",
  },

  // Service Issues
  SERVICE_UNAVAILABLE: {
    title: "PayPal Service Unavailable",
    message: "PayPal's payout service is temporarily unavailable.",
    suggestion: "Please try again in a few minutes. If the issue persists, check PayPal's status page.",
    severity: "warning",
    retryable: true,
    action: "Try again later",
  },

  INTERNAL_ERROR: {
    title: "PayPal Internal Error",
    message: "PayPal encountered an internal error processing your request.",
    suggestion: "Please try again. If the issue persists, contact PayPal support.",
    severity: "error",
    retryable: true,
    action: "Retry or contact support",
  },

  // Batch Issues
  BATCH_ALREADY_PROCESSED: {
    title: "Batch Already Processed",
    message: "This payment batch has already been processed.",
    suggestion: "Check your payment history to see the status of existing payments.",
    severity: "warning",
    retryable: false,
    action: "Check payment history",
  },

  // Default fallback
  UNKNOWN_ERROR: {
    title: "Payment Processing Error",
    message: "An unexpected error occurred while processing payments.",
    suggestion: "Please try again. If the issue persists, contact support for assistance.",
    severity: "error",
    retryable: true,
    action: "Retry or contact support",
  },
};

/**
 * Maps PayPal error details to user-friendly error information
 * @param {Object} paypalError - The error object from PayPal API
 * @returns {Object} User-friendly error information
 */
function mapPayPalError(paypalError) {
  if (!paypalError) {
    return paypalErrorMap.UNKNOWN_ERROR;
  }

  // Extract error name/code from different possible structures
  let errorCode = null;

  if (paypalError.name) {
    errorCode = paypalError.name;
  } else if (paypalError.error_code) {
    errorCode = paypalError.error_code;
  } else if (paypalError.code) {
    errorCode = paypalError.code;
  } else if (typeof paypalError === "string") {
    // Try to extract error code from string
    const match = paypalError.match(/([A-Z_]+)/);
    if (match) {
      errorCode = match[1];
    }
  }

  // Get the mapped error or fallback to unknown
  const mappedError = paypalErrorMap[errorCode] || paypalErrorMap.UNKNOWN_ERROR;

  // Include original PayPal details for debugging
  return {
    ...mappedError,
    originalError: {
      code: errorCode,
      message: paypalError.message || paypalError,
      details: paypalError,
    },
  };
}

/**
 * Formats error for API response
 * @param {Object} paypalError - The error object from PayPal API
 * @returns {Object} Formatted error response
 */
function formatPayPalErrorResponse(paypalError) {
  const mappedError = mapPayPalError(paypalError);

  return {
    error: mappedError.title,
    message: mappedError.message,
    suggestion: mappedError.suggestion,
    action: mappedError.action,
    severity: mappedError.severity,
    retryable: mappedError.retryable,
    details: {
      code: mappedError.originalError.code,
      paypal_message: mappedError.originalError.message,
    },
  };
}

/**
 * Creates a user-friendly error message from PayPal error
 * @param {Object} paypalError - The error object from PayPal API
 * @returns {string} User-friendly error message
 */
function createUserFriendlyMessage(paypalError) {
  const mappedError = mapPayPalError(paypalError);
  return `${mappedError.title}: ${mappedError.message} ${mappedError.suggestion}`;
}

module.exports = {
  paypalErrorMap,
  mapPayPalError,
  formatPayPalErrorResponse,
  createUserFriendlyMessage,
};
