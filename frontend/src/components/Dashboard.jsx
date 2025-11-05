import React, { useState, useEffect } from "react";
import {
  HomeIcon,
  CreditCardIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  BanknotesIcon,
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  BuildingLibraryIcon,
  GiftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useEnvironment } from "../contexts/EnvironmentContext";
import { useNavigate } from "react-router-dom";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Alert from "./ui/Alert";
import { LoadingOverlay, Spinner } from "./ui/Loading";
import ExcelUpload from "./ExcelUpload";
import PaymentPreview from "./PaymentPreview";
import PaymentHistory from "./PaymentHistory";
import ErrorDisplay from "./ErrorDisplay";
import XeTemplateDownload from "./XeTemplateDownload";
import XeExcelExtractor from "./XeExcelExtractor";
import XeRecipients from "./XeRecipients";
import XeContracts from "./XeContracts";
import { getDashboardStats } from "../services/paymentService";

const menuItems = [
  { text: "Dashboard", icon: HomeIcon, component: "dashboard" },
  { text: "Upload Excel", icon: ArrowUpTrayIcon, component: "upload" },
  { text: "Payment Preview", icon: CreditCardIcon, component: "preview" },
  { text: "Payment History", icon: ClockIcon, component: "history" },
  {
    text: "XE Payment",
    icon: BuildingLibraryIcon,
    children: [
      { text: "XE Template Download", icon: DocumentArrowDownIcon, component: "xe-template" },
      { text: "Upload XE Excel", icon: ArrowUpTrayIcon, component: "xe-upload" },
      { text: "XE Recipients", icon: UserGroupIcon, component: "xe-recipients" },
      { text: "XE Contracts", icon: DocumentTextIcon, component: "xe-contracts" },
    ],
  },
  { text: "Account", icon: BanknotesIcon, component: "account" },
];

function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState("dashboard");
  const [uploadedData, setUploadedData] = useState(null);
  const [expandedMenus, setExpandedMenus] = useState({ "XE Payment": true });
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { environment, toggleEnvironment, isProduction, isSandbox } = useEnvironment();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleMenuClick = (component) => {
    setSelectedComponent(component);
    setSidebarOpen(false);
  };

  const toggleMenuExpand = (menuText) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuText]: !prev[menuText],
    }));
  };

  const renderComponent = () => {
    switch (selectedComponent) {
      case "upload":
        return <ExcelUpload onDataUpload={setUploadedData} />;
      case "preview":
        return <PaymentPreview data={uploadedData} />;
      case "history":
        return <PaymentHistory />;
      case "xe-template":
        return <XeTemplateDownload />;
      case "xe-upload":
        return <XeExcelExtractor />;
      case "xe-recipients":
        return <XeRecipients />;
      case "xe-contracts":
        return <XeContracts />;
      case "account":
        return <AccountInfo />;
      default:
        return <DashboardHome uploadedData={uploadedData} />;
    }
  };

  const findCurrentPage = () => {
    for (const item of menuItems) {
      if (item.component === selectedComponent) {
        return item;
      }
      if (item.children) {
        const child = item.children.find((child) => child.component === selectedComponent);
        if (child) return child;
      }
    }
    return null;
  };

  const currentPage = findCurrentPage();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform flex-shrink-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        transition-transform duration-300 ease-in-out lg:translate-x-0
      `}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <img
            src="https://res.cloudinary.com/dzmn9lnk5/image/upload/v1762091880/agile/logos/studieshqwithagilelabs_dt6jbb_c_crop_w_2000_h_700_zfnepb.png"
            alt="StudiesHQ Logo"
            className="h-15"
          />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedMenus[item.text] || false;
              const isActive = hasChildren
                ? item.children.some((child) => child.component === selectedComponent)
                : selectedComponent === item.component;

              return (
                <li key={item.text}>
                  {hasChildren ? (
                    <>
                      <button
                        onClick={() => toggleMenuExpand(item.text)}
                        className={`
                          w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200
                          ${
                            isActive
                              ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200"
                              : "text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                          }
                        `}
                      >
                        <div className="flex items-center">
                          <IconComponent className="w-5 h-5 mr-3" />
                          {item.text}
                        </div>
                        {isExpanded ? (
                          <ChevronDownIcon className="w-4 h-4" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4" />
                        )}
                      </button>
                      {isExpanded && (
                        <ul className="ml-6 mt-1 space-y-1">
                          {item.children.map((child) => {
                            const ChildIconComponent = child.icon;
                            const isChildActive = selectedComponent === child.component;

                            return (
                              <li key={child.text}>
                                <button
                                  onClick={() => handleMenuClick(child.component)}
                                  className={`
                                    w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                                    ${
                                      isChildActive
                                        ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                                    }
                                  `}
                                >
                                  <ChildIconComponent className="w-4 h-4 mr-3" />
                                  {child.text}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => handleMenuClick(item.component)}
                      className={`
                        w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200
                        ${
                          isActive
                            ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                        }
                      `}
                    >
                      <IconComponent className="w-5 h-5 mr-3" />
                      {item.text}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Theme Toggle */}
        <div className="absolute bottom-6 left-4 right-4">
          <Button
            variant="ghost"
            onClick={toggleTheme}
            icon={isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            className="w-full justify-start"
          >
            {isDark ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>
      </div>

      {/* Backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 mr-4"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentPage?.text || "Dashboard"}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              {/* Environment Toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {isSandbox ? "Sandbox" : "Production"}
                </span>
                <button
                  onClick={toggleEnvironment}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    isProduction ? "bg-green-600" : "bg-gray-300"
                  }`}
                  role="switch"
                  aria-checked={isProduction}
                  aria-label="Toggle environment"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isProduction ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                {user?.name || user?.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                icon={<ArrowRightOnRectangleIcon className="w-4 h-4" />}
              >
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="w-full max-w-none">{renderComponent()}</div>
        </main>
      </div>
    </div>
  );
}

// Dashboard Home Component
function DashboardHome({ uploadedData }) {
  const { environment } = useEnvironment();
  const [dashboardStats, setDashboardStats] = useState({
    xe: { contracts: 0, payments: 0, totalAmount: 0 },
    paypal: { payments: 0, totalAmount: 0 },
    giftogram: { giftCards: 0, totalAmount: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        setError(null);
        // Environment is automatically added by API interceptor
        const response = await getDashboardStats();
        if (response.data) {
          setDashboardStats(response.data);
        }
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError(err.message || "Failed to load dashboard statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [environment]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to BulkPayout Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your bulk payments efficiently with multiple payment methods
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to BulkPayout Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your bulk payments efficiently with multiple payment methods
        </p>
      </div>

      {error && (
        <Alert variant="warning" title="Error loading statistics">
          {error}
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* XE Bank Transfer Stats */}
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BuildingLibraryIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">XE Bank Transfers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {dashboardStats.xe.contracts + dashboardStats.xe.payments}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {dashboardStats.xe.contracts} contracts, {dashboardStats.xe.payments} payments
              </p>
              <p className="text-sm font-semibold text-blue-600 mt-1">
                {formatCurrency(dashboardStats.xe.totalAmount)}
              </p>
            </div>
          </div>
        </Card>

        {/* PayPal Stats */}
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CreditCardIcon className="w-8 h-8 text-primary-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">PayPal Payments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardStats.paypal.payments}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">completed payments</p>
              <p className="text-sm font-semibold text-green-600 mt-1">
                {formatCurrency(dashboardStats.paypal.totalAmount)}
              </p>
            </div>
          </div>
        </Card>

        {/* Giftogram Stats */}
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <GiftIcon className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gift Cards Sent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardStats.giftogram.giftCards}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">gift cards delivered</p>
              <p className="text-sm font-semibold text-purple-600 mt-1">
                {formatCurrency(dashboardStats.giftogram.totalAmount)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Summary Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Total Summary</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Combined statistics across all payment methods</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Payments</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {dashboardStats.xe.contracts +
                dashboardStats.xe.payments +
                dashboardStats.paypal.payments +
                dashboardStats.giftogram.giftCards}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Total Amount</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(
                dashboardStats.xe.totalAmount + dashboardStats.paypal.totalAmount + dashboardStats.giftogram.totalAmount
              )}
            </p>
          </div>
        </div>
      </Card>

      {/* Get Started Card - Only show if no data */}
      {dashboardStats.xe.contracts === 0 &&
        dashboardStats.xe.payments === 0 &&
        dashboardStats.paypal.payments === 0 &&
        dashboardStats.giftogram.giftCards === 0 && (
          <Card className="p-8 text-center">
            <ArrowUpTrayIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Get Started</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Upload an Excel file with payment details to begin processing bulk payouts
            </p>
          </Card>
        )}
    </div>
  );
}

// Account Info Component
function AccountInfo() {
  const [accountData, setAccountData] = React.useState(null);
  const [giftogramData, setGiftogramData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [giftogramLoading, setGiftogramLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [giftogramError, setGiftogramError] = React.useState(null);

  const fetchAccountBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      const { getAccountBalance } = await import("../services/paymentService");
      const response = await getAccountBalance();
      console.log(response.data);
      setAccountData(response.data);
    } catch (err) {
      console.error("Error fetching account balance:", err);

      if (err.details) {
        setError(err);
      } else {
        setError({
          message: err.message || "Failed to fetch account balance",
          severity: "error",
          suggestion: "This might be due to PayPal API limitations or temporary connectivity issues.",
          action: "Retry balance check",
          retryable: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchGiftogramBalance = async () => {
    try {
      setGiftogramLoading(true);
      setGiftogramError(null);
      const { getGiftogramFunding } = await import("../services/giftogramService");
      const response = await getGiftogramFunding();
      setGiftogramData(response.data);
    } catch (err) {
      console.error("Error fetching Giftogram balance:", err);

      if (err.details) {
        setGiftogramError(err);
      } else {
        setGiftogramError({
          message: err.message || "Failed to fetch Giftogram balance",
          severity: "error",
          suggestion: "This might be due to Giftogram API limitations or temporary connectivity issues.",
          action: "Retry balance check",
          retryable: true,
        });
      }
    } finally {
      setGiftogramLoading(false);
    }
  };

  const { environment } = useEnvironment();

  React.useEffect(() => {
    fetchAccountBalance();
    fetchGiftogramBalance();
  }, [environment]);

  const refreshAllBalances = async () => {
    await Promise.all([fetchAccountBalance(), fetchGiftogramBalance()]);
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(parseFloat(amount || 0));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Information</h1>
        <Button
          onClick={refreshAllBalances}
          disabled={loading || giftogramLoading}
          icon={loading || giftogramLoading ? <Spinner size="sm" /> : <ArrowPathIcon className="w-4 h-4" />}
          variant="outline"
        >
          Refresh
        </Button>
      </div>

      {/* PayPal Integration Status */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <CheckCircleIcon className="w-6 h-6 text-green-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">PayPal Integration</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Your PayPal account is connected and ready for bulk payments.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          API Status:{" "}
          {accountData?.api_status === "connected_limited_permissions"
            ? "Connected (Limited Permissions)"
            : "Connected"}
        </p>
        {accountData?.last_updated && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Last Updated: {new Date(accountData.last_updated).toLocaleString()}
          </p>
        )}
      </Card>

      {/* Giftogram Integration Status */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <CheckCircleIcon className="w-6 h-6 text-green-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Giftogram Integration</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Your Giftogram account is connected and ready for gift card processing.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">API Status: Connected</p>
        {giftogramData?.data && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Last Updated: {new Date().toLocaleString()}</p>
        )}
      </Card>

      {/* Account Balance Information */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Balance & Funds</h2>

        <LoadingOverlay isLoading={loading}>
          {error && (
            <ErrorDisplay
              error={
                typeof error === "string"
                  ? {
                      message: error,
                      severity: "error",
                      suggestion: "This might be due to PayPal API limitations or temporary connectivity issues.",
                      action: "Retry balance check",
                      retryable: true,
                    }
                  : error
              }
              onRetry={fetchAccountBalance}
              onClose={() => setError(null)}
              title="Account Balance Error"
            />
          )}

          {accountData && !loading && (
            <div className="space-y-6">
              {/* Permission Required Notice */}
              {accountData.permission_required && (
                <Alert variant="warning" title="Additional Permissions Required">
                  <p className="mb-2">{accountData.message}</p>
                  {accountData.help_text && <p className="text-sm">{accountData.help_text}</p>}
                </Alert>
              )}

              {/* Fallback Notice */}
              {accountData.fallback && !accountData.permission_required && (
                <Alert variant="info">{accountData.message}</Alert>
              )}

              {accountData.balances && accountData.balances.length > 0 ? (
                <div className="space-y-4">
                  {accountData.balances.map((balance, index) => (
                    <Card key={index} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {balance.currency} Account
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {balance.primary ? "Primary Currency" : "Secondary Currency"}
                          </p>
                        </div>
                        <BanknotesIcon className="w-8 h-8 text-primary-600" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {balance.total_balance && (
                          <div className="text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Balance</p>
                            <p className="text-xl font-bold text-primary-600">
                              {formatCurrency(balance.total_balance.value, balance.total_balance.currency_code)}
                            </p>
                          </div>
                        )}
                        {balance.available_balance && (
                          <div className="text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Available Funds</p>
                            <p className="text-xl font-bold text-green-600">
                              {formatCurrency(balance.available_balance.value, balance.available_balance.currency_code)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ready for immediate use</p>
                          </div>
                        )}
                        {balance.withheld_balance && (
                          <div className="text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Withheld Funds</p>
                            <p className="text-xl font-bold text-yellow-600">
                              {formatCurrency(balance.withheld_balance.value, balance.withheld_balance.currency_code)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Temporarily held</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : accountData.permission_required ? (
                <Card className="p-8 text-center">
                  <BanknotesIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Balance Information Unavailable
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Balance information is not available due to PayPal API limitations or account type restrictions.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Payout functionality remains fully operational.
                  </p>
                </Card>
              ) : (
                <Alert variant="warning">
                  Balance information is currently unavailable. Please check your PayPal account permissions or try
                  again later.
                </Alert>
              )}

              {/* Recent Activity */}
              {accountData.recent_transactions && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Recent Activity</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Recent transaction data available - check PayPal dashboard for detailed history.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Giftogram Balance Display */}
          {giftogramError && (
            <ErrorDisplay
              error={
                typeof giftogramError === "string"
                  ? {
                      message: giftogramError,
                      severity: "error",
                      suggestion: "This might be due to Giftogram API limitations or temporary connectivity issues.",
                      action: "Retry balance check",
                      retryable: true,
                    }
                  : giftogramError
              }
              onRetry={fetchGiftogramBalance}
              onClose={() => setGiftogramError(null)}
              title="Giftogram Balance Error"
            />
          )}

          {giftogramData && !giftogramLoading && (
            <div className="mt-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Giftogram Account</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Gift Card Credits</p>
                  </div>
                  <BanknotesIcon className="w-8 h-8 text-primary-600" />
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Available Credits</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(giftogramData.data?.credit_available || 0, "USD")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ready for gift card processing</p>
                </div>
              </Card>
            </div>
          )}
        </LoadingOverlay>
      </Card>
    </div>
  );
}

export default Dashboard;
