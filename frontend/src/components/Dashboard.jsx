import React, { useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Payment as PaymentIcon,
  Upload as UploadIcon,
  History as HistoryIcon,
  AccountBalance as AccountIcon,
  Menu as MenuIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import ExcelUpload from "./ExcelUpload";
import PaymentPreview from "./PaymentPreview";
import PaymentHistory from "./PaymentHistory";

const drawerWidth = 240;

const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, component: "dashboard" },
  { text: "Upload Excel", icon: <UploadIcon />, component: "upload" },
  { text: "Payment Preview", icon: <PaymentIcon />, component: "preview" },
  { text: "Payment History", icon: <HistoryIcon />, component: "history" },
  { text: "Account", icon: <AccountIcon />, component: "account" },
];

function Dashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState("dashboard");
  const [uploadedData, setUploadedData] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (component) => {
    setSelectedComponent(component);
    setMobileOpen(false);
  };

  const renderComponent = () => {
    switch (selectedComponent) {
      case "upload":
        return <ExcelUpload onDataUpload={setUploadedData} />;
      case "preview":
        return <PaymentPreview data={uploadedData} />;
      case "history":
        return <PaymentHistory />;
      case "account":
        return <AccountInfo />;
      default:
        return <DashboardHome uploadedData={uploadedData} />;
    }
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: "bold" }}>
          BulkPayout
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={selectedComponent === item.component}
              onClick={() => handleMenuClick(item.component)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {menuItems.find((item) => item.component === selectedComponent)?.text || "Dashboard"}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Container maxWidth="xl">{renderComponent()}</Container>
      </Box>
    </Box>
  );
}

// Dashboard Home Component
function DashboardHome({ uploadedData }) {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome to BulkPayout Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage your bulk payments efficiently with PayPal integration
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Total Payments" subheader="This month" avatar={<PaymentIcon color="primary" />} />
            <CardContent>
              <Typography variant="h4" color="primary">
                {uploadedData ? uploadedData.length : 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                payments ready to process
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Total Amount" subheader="This month" avatar={<AccountIcon color="success" />} />
            <CardContent>
              <Typography variant="h4" color="success.main">
                $
                {uploadedData
                  ? uploadedData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2)
                  : "0.00"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                total payout amount
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Status" subheader="Current" avatar={<DashboardIcon color="info" />} />
            <CardContent>
              <Typography variant="h4" color="info.main">
                {uploadedData ? "Ready" : "No Data"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {uploadedData ? "Ready to process payments" : "Upload Excel file to start"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {!uploadedData && (
        <Paper sx={{ p: 3, mt: 3, textAlign: "center" }}>
          <UploadIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Get Started
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Upload an Excel file with payment details to begin processing bulk payouts
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

// Account Info Component
function AccountInfo() {
  const [accountData, setAccountData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const fetchAccountBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      const { getAccountBalance } = await import("../services/paymentService");
      const response = await getAccountBalance();
      setAccountData(response.data);
    } catch (err) {
      setError(err.message || "Failed to fetch account balance");
      console.error("Error fetching account balance:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAccountBalance();
  }, []);

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(parseFloat(amount || 0));
  };

  const getBalanceIcon = (balanceType) => {
    switch (balanceType) {
      case "available":
        return <AccountIcon sx={{ color: "success.main" }} />;
      case "withheld":
        return <AccountIcon sx={{ color: "warning.main" }} />;
      case "total":
      default:
        return <AccountIcon sx={{ color: "primary.main" }} />;
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Account Information
        </Typography>
        <IconButton onClick={fetchAccountBalance} disabled={loading} color="primary">
          {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
        </IconButton>
      </Box>

      {/* PayPal Integration Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CheckCircleIcon sx={{ color: "success.main" }} />
          PayPal Integration
        </Typography>
        <Typography variant="body1" paragraph>
          Your PayPal account is connected and ready for bulk payments.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          API Status:{" "}
          {accountData?.api_status === "connected_limited_permissions"
            ? "Connected (Limited Permissions)"
            : "Connected"}
        </Typography>
        {accountData?.last_updated && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Last Updated: {new Date(accountData.last_updated).toLocaleString()}
          </Typography>
        )}
      </Paper>

      {/* Account Balance Information */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Account Balance & Funds
        </Typography>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Button size="small" onClick={fetchAccountBalance} sx={{ ml: 2 }}>
              Retry
            </Button>
          </Alert>
        )}

        {accountData && !loading && (
          <Box>
            {/* Permission Required Notice */}
            {accountData.permission_required && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Additional Permissions Required</strong>
                </Typography>
                <Typography variant="body2" paragraph>
                  {accountData.message}
                </Typography>
                {accountData.help_text && (
                  <Typography variant="body2" color="text.secondary">
                    {accountData.help_text}
                  </Typography>
                )}
              </Alert>
            )}

            {/* Fallback Notice */}
            {accountData.fallback && !accountData.permission_required && (
              <Alert severity="info" sx={{ mb: 3 }}>
                {accountData.message}
              </Alert>
            )}

            {accountData.balances && accountData.balances.length > 0 ? (
              <Grid container spacing={3}>
                {accountData.balances.map((balance, index) => (
                  <Grid item xs={12} key={index}>
                    <Card variant="outlined">
                      <CardHeader
                        title={`${balance.currency} Account`}
                        subheader={balance.primary ? "Primary Currency" : "Secondary Currency"}
                        avatar={<AccountIcon color="primary" />}
                      />
                      <CardContent>
                        <Grid container spacing={3}>
                          {balance.total_balance && (
                            <Grid item xs={12} md={4}>
                              <Box sx={{ textAlign: "center" }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Total Balance
                                </Typography>
                                <Typography variant="h5" color="primary">
                                  {formatCurrency(balance.total_balance.value, balance.total_balance.currency_code)}
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                          {balance.available_balance && (
                            <Grid item xs={12} md={4}>
                              <Box sx={{ textAlign: "center" }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Available Funds
                                </Typography>
                                <Typography variant="h5" color="success.main">
                                  {formatCurrency(
                                    balance.available_balance.value,
                                    balance.available_balance.currency_code
                                  )}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                  Ready for immediate use
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                          {balance.withheld_balance && (
                            <Grid item xs={12} md={4}>
                              <Box sx={{ textAlign: "center" }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Withheld Funds
                                </Typography>
                                <Typography variant="h5" color="warning.main">
                                  {formatCurrency(
                                    balance.withheld_balance.value,
                                    balance.withheld_balance.currency_code
                                  )}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                  Temporarily held
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : accountData.permission_required ? (
              <Card variant="outlined" sx={{ textAlign: "center", py: 4 }}>
                <CardContent>
                  <AccountIcon sx={{ fontSize: 48, color: "warning.main", mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Balance Information Unavailable
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Balance information is not available due to PayPal API limitations or account type restrictions.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Payout functionality remains fully operational.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Alert severity="warning">
                Balance information is currently unavailable. Please check your PayPal account permissions or try again
                later.
              </Alert>
            )}

            {/* Recent Activity */}
            {accountData.recent_transactions && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Recent transaction data available - check PayPal dashboard for detailed history.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default Dashboard;
