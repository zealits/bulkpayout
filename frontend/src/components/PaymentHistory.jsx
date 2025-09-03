import React, { useState, useEffect } from "react";
import { getPaymentBatches, getPaymentStats, syncWithPayPal, getPaymentBatch } from "../services/paymentService";
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
  Chip,
  Grid,
  Card,
  CardContent,
  CardHeader,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stack,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  Sync as SyncIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";

function PaymentHistory() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [paymentBatches, setPaymentBatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetails, setBatchDetails] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadPaymentHistory();
    loadStats();
  }, [page, rowsPerPage, statusFilter, dateFilter]);

  const loadPaymentHistory = async () => {
    setLoading(true);
    try {
      const response = await getPaymentBatches(page + 1, rowsPerPage);
      if (response.success) {
        setPaymentBatches(response.data);
      }
    } catch (error) {
      console.error("Error loading payment history:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getPaymentStats(null, dateFilter === "all" ? null : dateFilter);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckIcon color="success" />;
      case "pending":
        return <PendingIcon color="warning" />;
      case "failed":
        return <ErrorIcon color="error" />;
      default:
        return <ScheduleIcon color="info" />;
    }
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredData = paymentBatches.filter((batch) => {
    const matchesSearch =
      batch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.batchId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || batch.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getTotalAmount = () => {
    return stats?.batchStats?.totalAmount || 0;
  };

  const getStatusCounts = () => {
    const counts = { completed: 0, pending: 0, failed: 0 };
    filteredData.forEach((batch) => {
      if (batch.status === "completed") counts.completed++;
      else if (batch.status === "processing" || batch.status === "uploaded") counts.pending++;
      else counts.failed++;
    });
    return counts;
  };

  const handleExportData = () => {
    // Implement CSV export functionality
    console.log("Exporting payment history data...");
  };

  const handleRefresh = () => {
    loadPaymentHistory();
    loadStats();
  };

  const handleSyncWithPayPal = async (batchId) => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const response = await syncWithPayPal(batchId);
      if (response.success) {
        setSyncMessage({
          type: "success",
          text: `Successfully synced with PayPal. Status: ${response.data.batch.paypalBatchStatus || "Updated"}`,
        });
        // Refresh the data to show updated statuses
        loadPaymentHistory();
      } else {
        setSyncMessage({
          type: "error",
          text: "Failed to sync with PayPal. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error syncing with PayPal:", error);
      setSyncMessage({
        type: "error",
        text: `Error syncing with PayPal: ${error.message}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleViewDetails = async (batch) => {
    setSelectedBatch(batch);
    setDetailsOpen(true);
    try {
      const response = await getPaymentBatch(batch.batchId);
      if (response.success) {
        setBatchDetails(response.data);
      }
    } catch (error) {
      console.error("Error loading batch details:", error);
    }
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedBatch(null);
    setBatchDetails(null);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Payment History
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        View and track all processed payments and their current status
      </Typography>

      {/* Sync Message Alert */}
      {syncMessage && (
        <Alert severity={syncMessage.type} sx={{ mb: 3 }} onClose={() => setSyncMessage(null)}>
          {syncMessage.text}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardHeader title="Total Payments" avatar={<PaymentIcon color="primary" />} />
            <CardContent>
              <Typography variant="h4" color="primary">
                {filteredData.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                total payments
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardHeader title="Total Amount" avatar={<ReceiptIcon color="success" />} />
            <CardContent>
              <Typography variant="h4" color="success.main">
                ${getTotalAmount().toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                total processed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardHeader title="Completed" avatar={<CheckIcon color="success" />} />
            <CardContent>
              <Typography variant="h4" color="success.main">
                {getStatusCounts().completed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                successful payments
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardHeader title="Pending/Failed" avatar={<PendingIcon color="warning" />} />
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {getStatusCounts().pending + getStatusCounts().failed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                requires attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Date Range</InputLabel>
              <Select value={dateFilter} label="Date Range" onChange={(e) => setDateFilter(e.target.value)}>
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="Export Data">
                <IconButton onClick={handleExportData} color="primary">
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh">
                <IconButton onClick={handleRefresh} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Payment History Table */}
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Batch Name</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Batch ID</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>PayPal Status</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Total Amount</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Payments</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Upload Date</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((batch) => (
                <TableRow key={batch.batchId} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {getStatusIcon(batch.status)}
                      <Chip label={batch.status} color={getStatusColor(batch.status)} size="small" variant="outlined" />
                    </Box>
                  </TableCell>
                  <TableCell>{batch.name}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {batch.batchId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {batch.paypalBatchStatus ? (
                      <Chip
                        label={batch.paypalBatchStatus}
                        size="small"
                        color={
                          batch.paypalBatchStatus === "SUCCESS"
                            ? "success"
                            : batch.paypalBatchStatus === "PENDING"
                            ? "warning"
                            : "default"
                        }
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not synced
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      ${batch.totalAmount.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{batch.totalPayments} payments</Typography>
                  </TableCell>
                  <TableCell>{formatDate(batch.uploadedAt)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {batch.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Sync with PayPal">
                        <IconButton
                          size="small"
                          onClick={() => handleSyncWithPayPal(batch.batchId)}
                          disabled={syncing || !batch.paypalPayoutBatchId}
                          color="primary"
                        >
                          {syncing ? <CircularProgress size={16} /> : <SyncIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewDetails(batch)} color="info">
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {filteredData.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center", mt: 3 }}>
          <ReceiptIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No payments found
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Try adjusting your search criteria or filters
          </Typography>
        </Paper>
      )}

      {/* Batch Details Dialog */}
      <Dialog open={detailsOpen} onClose={handleCloseDetails} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Batch Details: {selectedBatch?.name}</Typography>
        </DialogTitle>
        <DialogContent>
          {batchDetails ? (
            <Box>
              {/* Batch Info */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Batch Information
                    </Typography>
                    <Typography>
                      <strong>Batch ID:</strong> {batchDetails.batch.batchId}
                    </Typography>
                    <Typography>
                      <strong>Status:</strong> {batchDetails.batch.status}
                    </Typography>
                    <Typography>
                      <strong>PayPal Batch ID:</strong> {batchDetails.batch.paypalPayoutBatchId || "N/A"}
                    </Typography>
                    <Typography>
                      <strong>PayPal Status:</strong> {batchDetails.batch.paypalBatchStatus || "Not synced"}
                    </Typography>
                    <Typography>
                      <strong>Total Amount:</strong> ${batchDetails.batch.totalAmount?.toFixed(2)}
                    </Typography>
                    <Typography>
                      <strong>Total Payments:</strong> {batchDetails.batch.totalPayments}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Payment Status Breakdown
                    </Typography>
                    <Typography>
                      <strong>Completed:</strong> {batchDetails.batch.completedPayments || 0}
                    </Typography>
                    <Typography>
                      <strong>Processing:</strong> {batchDetails.batch.processingPayments || 0}
                    </Typography>
                    <Typography>
                      <strong>Failed:</strong> {batchDetails.batch.failedPayments || 0}
                    </Typography>
                    <Typography>
                      <strong>Pending:</strong> {batchDetails.batch.pendingPayments || 0}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Individual Payments */}
              <Typography variant="h6" gutterBottom>
                Individual Payments
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Recipient</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>PayPal Status</TableCell>
                      <TableCell>Transaction ID</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batchDetails.payments?.map((payment, index) => (
                      <TableRow key={payment._id || index}>
                        <TableCell>{payment.recipientName}</TableCell>
                        <TableCell>{payment.recipientEmail}</TableCell>
                        <TableCell>${payment.amount?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            label={payment.status}
                            size="small"
                            color={getStatusColor(payment.status)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {payment.paypalTransactionStatus ? (
                            <Chip
                              label={payment.paypalTransactionStatus}
                              size="small"
                              color={
                                payment.paypalTransactionStatus === "SUCCESS"
                                  ? "success"
                                  : payment.paypalTransactionStatus === "PENDING"
                                  ? "warning"
                                  : "error"
                              }
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              N/A
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {payment.transactionId || "N/A"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Sync Button in Dialog */}
              <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
                <Button
                  variant="contained"
                  startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon />}
                  onClick={() => handleSyncWithPayPal(selectedBatch?.batchId)}
                  disabled={syncing || !selectedBatch?.paypalPayoutBatchId}
                  color="primary"
                >
                  {syncing ? "Syncing..." : "Sync with PayPal"}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PaymentHistory;
