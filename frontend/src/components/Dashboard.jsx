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
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Payment as PaymentIcon,
  Upload as UploadIcon,
  History as HistoryIcon,
  AccountBalance as AccountIcon,
  Menu as MenuIcon,
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
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Account Information
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          PayPal Integration
        </Typography>
        <Typography variant="body1" paragraph>
          Your PayPal account is connected and ready for bulk payments.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          API Status: Connected
        </Typography>
      </Paper>
    </Box>
  );
}

export default Dashboard;
