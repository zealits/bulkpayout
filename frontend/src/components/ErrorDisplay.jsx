import React from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from "@mui/material";
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  ContactSupport as ContactIcon,
  AccountBalance as AccountIcon,
  Check as CheckIcon,
} from "@mui/icons-material";

function ErrorDisplay({ error, onRetry, onClose, title }) {
  if (!error) return null;

  // Extract error information
  const errorMessage = error.message || error.error || "An error occurred";
  const errorDetails = error.details || {};
  const suggestion = errorDetails.suggestion || error.suggestion || "";
  const action = errorDetails.action || error.action || "";
  const severity = errorDetails.severity || error.severity || "error";
  const retryable = errorDetails.retryable !== undefined ? errorDetails.retryable : error.retryable;
  const paypalCode = errorDetails.details?.code || errorDetails.code || "";
  const paypalMessage = errorDetails.details?.paypal_message || errorDetails.paypal_message || "";

  // Get appropriate icon and color based on severity
  const getSeverityConfig = (severity) => {
    switch (severity) {
      case "warning":
        return {
          severity: "warning",
          icon: <WarningIcon />,
          color: "warning.main",
        };
      case "info":
        return {
          severity: "info",
          icon: <InfoIcon />,
          color: "info.main",
        };
      case "error":
      default:
        return {
          severity: "error",
          icon: <ErrorIcon />,
          color: "error.main",
        };
    }
  };

  const severityConfig = getSeverityConfig(severity);

  // Get action-specific suggestions
  const getActionGuidance = (action) => {
    const guidelines = {
      "Add funds to your PayPal account": {
        icon: <AccountIcon />,
        steps: [
          "Log in to your PayPal account",
          "Go to 'Wallet' or 'Balance'",
          "Click 'Add money' or 'Transfer from bank'",
          "Add sufficient funds for your payouts",
          "Wait for the transfer to complete (usually 1-3 business days)",
        ],
      },
      "Contact PayPal support": {
        icon: <ContactIcon />,
        steps: [
          "Log in to your PayPal account",
          "Go to 'Help & Contact'",
          "Select 'Contact Us'",
          "Choose 'Business' if you have a business account",
          "Explain the payout limitation issue",
        ],
      },
      "Verify PayPal business account": {
        icon: <CheckIcon />,
        steps: [
          "Log in to your PayPal business account",
          "Complete business verification process",
          "Provide required business documents",
          "Wait for PayPal to review and approve",
          "Enable payout permissions in account settings",
        ],
      },
      "Check PayPal API credentials": {
        icon: <ErrorIcon />,
        steps: [
          "Verify your Client ID and Secret are correct",
          "Check if credentials haven't expired",
          "Ensure you're using the right environment (sandbox/live)",
          "Regenerate credentials if necessary",
          "Update your application settings",
        ],
      },
    };

    return guidelines[action] || null;
  };

  const actionGuidance = getActionGuidance(action);

  return (
    <Alert
      severity={severityConfig.severity}
      onClose={onClose}
      sx={{ mb: 2 }}
      action={
        <Box sx={{ display: "flex", gap: 1 }}>
          {retryable && onRetry && (
            <Button size="small" startIcon={<RefreshIcon />} onClick={onRetry} color="inherit" variant="outlined">
              Retry
            </Button>
          )}
        </Box>
      }
    >
      <AlertTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {severityConfig.icon}
        {title || "Payment Processing Issue"}
        {paypalCode && <Chip label={`PayPal: ${paypalCode}`} size="small" variant="outlined" sx={{ ml: 1 }} />}
      </AlertTitle>

      <Typography variant="body1" sx={{ mb: 2 }}>
        {errorMessage}
      </Typography>

      {suggestion && (
        <Typography variant="body2" sx={{ mb: 2, fontStyle: "italic" }}>
          💡 {suggestion}
        </Typography>
      )}

      {action && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
            Recommended Action:
          </Typography>
          <Chip label={action} color={severity === "error" ? "error" : "primary"} variant="outlined" sx={{ mb: 1 }} />
        </Box>
      )}

      {actionGuidance && (
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {actionGuidance.icon}
              <Typography variant="subtitle2">Step-by-step Guide</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              {actionGuidance.steps.map((step, index) => (
                <ListItem key={index}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: "bold" }}>
                      {index + 1}
                    </Typography>
                  </ListItemIcon>
                  <ListItemText primary={step} primaryTypographyProps={{ variant: "body2" }} />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Technical Details (for debugging) */}
      {(paypalMessage || errorDetails.originalError) && (
        <Accordion sx={{ mt: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="caption" color="text.secondary">
              Technical Details
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ bgcolor: "grey.50", p: 2, borderRadius: 1 }}>
              {paypalMessage && (
                <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                  <strong>PayPal Message:</strong> {paypalMessage}
                </Typography>
              )}
              {errorDetails.originalError && (
                <Typography variant="caption" sx={{ display: "block" }}>
                  <strong>System Error:</strong> {errorDetails.originalError}
                </Typography>
              )}
              {errorDetails.details?.debug_id && (
                <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                  <strong>Debug ID:</strong> {errorDetails.details.debug_id}
                </Typography>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Alert>
  );
}

export default ErrorDisplay;
