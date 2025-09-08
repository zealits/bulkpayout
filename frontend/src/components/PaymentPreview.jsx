import React, { useState, useEffect } from "react";
import { processPaymentBatch, getPaymentsByBatch } from "../services/paymentService";
import ErrorDisplay from "./ErrorDisplay";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Payment as PaymentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckIcon,
} from "@mui/icons-material";

function PaymentPreview({ data }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [processedPayments, setProcessedPayments] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [payments, setPayments] = useState([]);
  const [batchInfo, setBatchInfo] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // If data is from upload result, extract batch info
  useEffect(() => {
    if (data) {
      if (data.batch) {
        // Data from upload result
        setBatchInfo(data.batch);
        loadPayments(data.batch.batchId);
      } else if (Array.isArray(data)) {
        // Legacy data array
        setPayments(data);
      }
    }
  }, [data]);

  const loadPayments = async (batchId) => {
    try {
      const response = await getPaymentsByBatch(batchId, 1, 100); // Load all payments
      if (response.success) {
        setPayments(response.data);
      }
    } catch (error) {
      console.error("Error loading payments:", error);
      setError({
        ...error,
        message: error.message || "Failed to load payment data",
        suggestion: "Please try refreshing the page or contact support if the issue persists.",
        action: "Refresh payment data",
      });
    }
  };

  if (!data) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Payment Preview
        </Typography>
        <Alert severity="info">No data available. Please upload an Excel file first.</Alert>
      </Box>
    );
  }

  const displayData = payments.length > 0 ? payments : Array.isArray(data) ? data : [];

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEdit = (row, index) => {
    setEditingRow(index);
    setEditData({ ...row });
  };

  const handleSave = () => {
    if (editingRow !== null) {
      const newData = [...data];
      newData[editingRow] = editData;
      // You would typically update the parent state here
      setEditingRow(null);
      setEditData({});
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditData({});
  };

  const handleDelete = (index) => {
    if (window.confirm("Are you sure you want to delete this payment?")) {
      const newData = data.filter((_, i) => i !== index);
      // You would typically update the parent state here
    }
  };

  const handleProcessPayments = async () => {
    if (!batchInfo) {
      setError({
        message: "No batch information available",
        severity: "warning",
        suggestion: "Please upload a payment file first.",
        action: "Upload payment data",
      });
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await processPaymentBatch(batchInfo.batchId, {
        email_subject: "You have a payout!",
        email_message: "You have received a payout! Thanks for using our service!",
      });

      if (response.success) {
        setProcessedPayments(response.data.paypalResponse?.items || []);
        setSuccessMessage("Payments processed successfully! All recipients will receive their payments.");
        // Reload payments to get updated status
        await loadPayments(batchInfo.batchId);
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      setError(error);
    } finally {
      setProcessing(false);
    }
  };

  const getTotalAmount = () => {
    return displayData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "pending":
        return "warning";
      case "failed":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Payment Preview
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Review and edit payment details before processing with PayPal
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Total Payments" avatar={<PaymentIcon color="primary" />} />
            <CardContent>
              <Typography variant="h4" color="primary">
                {displayData.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                payments to process
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Total Amount" avatar={<PaymentIcon color="success" />} />
            <CardContent>
              <Typography variant="h4" color="success.main">
                ${getTotalAmount().toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                total payout amount
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Status" avatar={<PaymentIcon color="info" />} />
            <CardContent>
              <Typography variant="h4" color="info.main">
                Ready
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ready to process
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={handleProcessPayments}
          onClose={() => setError(null)}
          title="Payment Processing Error"
        />
      )}

      {/* Success Message */}
      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleProcessPayments}
          disabled={processing}
          startIcon={processing ? null : <PaymentIcon />}
        >
          {processing ? "Processing..." : "Process All Payments"}
        </Button>

        <Button variant="outlined" color="secondary" size="large" startIcon={<EditIcon />}>
          Bulk Edit
        </Button>
      </Box>

      {/* Data Table */}
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Name</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Notes</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => {
                const actualIndex = page * rowsPerPage + index;
                const isEditing = editingRow === actualIndex;

                return (
                  <TableRow key={actualIndex} hover>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          size="small"
                          value={editData.recipientName || editData.name || ""}
                          onChange={(e) =>
                            setEditData({ ...editData, recipientName: e.target.value, name: e.target.value })
                          }
                          fullWidth
                        />
                      ) : (
                        row.recipientName || row.name || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          size="small"
                          value={editData.recipientEmail || editData.email || ""}
                          onChange={(e) =>
                            setEditData({ ...editData, recipientEmail: e.target.value, email: e.target.value })
                          }
                          fullWidth
                        />
                      ) : (
                        row.recipientEmail || row.email || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          size="small"
                          type="number"
                          value={editData.amount || ""}
                          onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                          fullWidth
                        />
                      ) : (
                        `$${parseFloat(row.amount || 0).toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          size="small"
                          value={editData.notes || ""}
                          onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                          fullWidth
                        />
                      ) : (
                        row.notes || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button size="small" color="primary" onClick={handleSave} startIcon={<SaveIcon />}>
                            Save
                          </Button>
                          <Button size="small" color="secondary" onClick={handleCancel} startIcon={<CancelIcon />}>
                            Cancel
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            size="small"
                            color="primary"
                            onClick={() => handleEdit(row, actualIndex)}
                            startIcon={<EditIcon />}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleDelete(actualIndex)}
                            startIcon={<DeleteIcon />}
                          >
                            Delete
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={displayData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Processing Results */}
      {processedPayments.length > 0 && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Payments Processed Successfully!
          </Typography>
          <Typography variant="body2">
            {processedPayments.length} payments have been processed with PayPal. Transaction IDs have been generated for
            each payment.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

export default PaymentPreview;
