import React, { useState, useEffect } from "react";
import {
  CreditCardIcon,
  GiftIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Alert from "./ui/Alert";
import Badge from "./ui/Badge";
import { getGiftogramCampaigns, testGiftogramConnection } from "../services/giftogramService";
import { testXeConnection, getXeAccounts } from "../services/xeService";
import { updateBatchPaymentMethod } from "../services/paymentService";

function PaymentMethodSelector({ batch, onMethodChange, onError, mode = "full", allowedMethod = null }) {
  const [selectedMethod, setSelectedMethod] = useState(
    allowedMethod || batch?.paymentMethod || "paypal"
  );
  const [giftogramConfig, setGiftogramConfig] = useState({
    campaignId: batch?.giftogramCampaignId || "",
    message: batch?.giftogramMessage || "Thank you for your hard work! Enjoy your gift card!",
    subject: batch?.giftogramSubject || "You have received a gift card!",
  });
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [giftogramStatus, setGiftogramStatus] = useState(null);
  const [xeConfig, setXeConfig] = useState({
    accountNumber: batch?.xeAccountNumber || "",
  });
  const [xeAccounts, setXeAccounts] = useState([]);
  const [xeStatus, setXeStatus] = useState(null);

  // Payment method configurations
  const paymentMethods = [
    {
      id: "paypal",
      name: "PayPal",
      description: "Send payments directly to PayPal accounts",
      icon: CreditCardIcon,
      color: "blue",
      available: true,
      features: ["Instant transfers", "Wide global reach", "Email-based payments"],
    },
    {
      id: "giftogram",
      name: "Gift Cards",
      description: "Send gift cards through Giftogram",
      icon: GiftIcon,
      color: "purple",
      available: true,
      features: ["Various retailers", "Customizable messages", "Easy redemption"],
    },
    {
      id: "xe_bank_transfer",
      name: "XE Bank Transfer",
      description: "International bank transfers via XE",
      icon: BanknotesIcon,
      color: "green",
      available: true,
      features: ["Global coverage", "Competitive rates", "Secure transfers"],
    },
  ];

  // Load Giftogram campaigns when Giftogram is selected
  useEffect(() => {
    if (selectedMethod === "giftogram") {
      loadGiftogramData();
    }
  }, [selectedMethod]);

  // Load XE accounts when XE is selected
  useEffect(() => {
    if (selectedMethod === "xe_bank_transfer") {
      loadXeData();
    }
  }, [selectedMethod]);

  const loadGiftogramData = async () => {
    setLoading(true);
    try {
      // Test connection first
      const connectionTest = await testGiftogramConnection();
      if (connectionTest.success) {
        setGiftogramStatus("connected");

        // Load campaigns
        const campaignsResponse = await getGiftogramCampaigns();
        if (campaignsResponse.success) {
          setCampaigns(campaignsResponse.data || []);
          // Set default campaign if none selected
          if (!giftogramConfig.campaignId && campaignsResponse.data?.length > 0) {
            setGiftogramConfig((prev) => ({
              ...prev,
              campaignId: campaignsResponse.data[0].id,
            }));
          }
        }
      } else {
        setGiftogramStatus("error");
        if (onError) {
          onError({
            message: "Giftogram API connection failed",
            suggestion: "Please check your Giftogram configuration in the environment settings.",
            action: "Check configuration",
            severity: "warning",
          });
        }
      }
    } catch (error) {
      console.error("Error loading Giftogram data:", error);
      setGiftogramStatus("error");
      if (onError) {
        onError({
          message: "Failed to load Giftogram configuration",
          suggestion: "Please check your internet connection and try again.",
          action: "Retry",
          severity: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadXeData = async () => {
    setLoading(true);
    try {
      // Test connection first
      const connectionTest = await testXeConnection();
      if (connectionTest.success) {
        setXeStatus("connected");

        // Load accounts
        const accountsResponse = await getXeAccounts();
        if (accountsResponse.success) {
          setXeAccounts(accountsResponse.data || []);
          // Set default account if none selected
          if (!xeConfig.accountNumber && accountsResponse.data?.length > 0) {
            setXeConfig((prev) => ({
              ...prev,
              accountNumber: accountsResponse.data[0].accountNumber,
            }));
          }
        }
      } else {
        setXeStatus("error");
        if (onError) {
          onError({
            message: "XE API connection failed",
            suggestion: "Please check your XE configuration in the environment settings.",
            action: "Check configuration",
            severity: "warning",
          });
        }
      }
    } catch (error) {
      console.error("Error loading XE data:", error);
      setXeStatus("error");
      if (onError) {
        onError({
          message: "Failed to load XE configuration",
          suggestion: "Please check your internet connection and try again.",
          action: "Retry",
          severity: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMethodSelect = (methodId) => {
    if (mode === "config-only") return; // selection disabled in config-only mode
    if (!paymentMethods.find((m) => m.id === methodId)?.available) return;
    setSelectedMethod(methodId);
  };

  const handleSaveConfiguration = async () => {
    if (!batch?.batchId) {
      if (onError) {
        onError({
          message: "No batch selected",
          suggestion: "Please upload payment data first.",
          action: "Upload data",
          severity: "warning",
        });
      }
      return;
    }

    setSaving(true);
    try {
      let config = {};
      if (selectedMethod === "giftogram") {
        config = giftogramConfig;
      } else if (selectedMethod === "xe_bank_transfer") {
        config = xeConfig;
      }

      const response = await updateBatchPaymentMethod(batch.batchId, selectedMethod, config);

      if (response.success) {
        if (onMethodChange) {
          onMethodChange({
            paymentMethod: selectedMethod,
            config,
            batch: response.data.batch,
          });
        }
      }
    } catch (error) {
      console.error("Error updating payment method:", error);
      if (onError) {
        onError(error);
      }
    } finally {
      setSaving(false);
    }
  };

  const getMethodIcon = (method) => {
    const IconComponent = method.icon;
    return <IconComponent className="w-6 h-6" />;
  };

  const getStatusIcon = (methodId) => {
    if (methodId === selectedMethod) {
      return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
    }
    if (!paymentMethods.find((m) => m.id === methodId)?.available) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2"></h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose how you want to send payments to your recipients
        </p>
      </div>

      {/* Payment Method Cards */}
      {mode !== "config-only" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paymentMethods.map((method) => (
            <Card
              key={method.id}
              className={`cursor-pointer transition-all duration-200 ${
                selectedMethod === method.id
                  ? `ring-2 ring-${method.color}-500 bg-${method.color}-50 dark:bg-${method.color}-900/20`
                  : method.available
                  ? "hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600"
                  : "opacity-60 cursor-not-allowed"
              }`}
              onClick={() => handleMethodSelect(method.id)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-${method.color}-100 dark:bg-${method.color}-900/30`}>
                    {getMethodIcon(method)}
                  </div>
                  <div className="flex items-center space-x-2">
                    {!method.available && (
                      <Badge variant="warning" size="sm">
                        Coming Soon
                      </Badge>
                    )}
                    {getStatusIcon(method.id)}
                  </div>
                </div>

                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{method.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{method.description}</p>

                <ul className="space-y-1">
                  {method.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Giftogram Configuration */}
      {selectedMethod === "giftogram" && (!allowedMethod || allowedMethod === "giftogram") && (
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <GiftIcon className="w-5 h-5 text-purple-600 mr-2" />
            <h4 className="font-semibold text-gray-900 dark:text-white">Gift Card Configuration</h4>
            {giftogramStatus === "connected" && (
              <Badge variant="success" size="sm" className="ml-2">Connected</Badge>
            )}
            {giftogramStatus === "error" && (
              <Badge variant="danger" size="sm" className="ml-2">Connection Error</Badge>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading campaigns...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Form */}
              <div className="lg:col-span-2 space-y-4">
                {/* Campaign Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gift Card Campaign</label>
                  <select
                    value={giftogramConfig.campaignId}
                    onChange={(e) => setGiftogramConfig((prev) => ({ ...prev, campaignId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a campaign...</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name} {campaign.description && `- ${campaign.description}`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Choose which Giftogram campaign your cards will be sent from.</p>
                  {campaigns.length === 0 && giftogramStatus === "connected" && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No campaigns available. Please check your Giftogram account.</p>
                  )}
                </div>

                {/* Subject */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Subject <span className="text-red-500">*</span></label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{giftogramConfig.subject.length}/120</span>
                  </div>
                  <Input
                    type="text"
                    value={giftogramConfig.subject}
                    onChange={(e) => setGiftogramConfig((prev) => ({ ...prev, subject: e.target.value.slice(0,120) }))}
                    placeholder="You have received a gift card!"
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This will be the email subject line for recipients</p>
                </div>

                {/* Custom Message */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Message</label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{giftogramConfig.message.length} chars</span>
                  </div>
                  <textarea
                    value={giftogramConfig.message}
                    onChange={(e) => setGiftogramConfig((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="Enter a custom message for your gift card recipients..."
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This message will be included with each gift card</p>
                </div>

                {giftogramStatus === "connected" && (
                  <Alert variant="info">
                    <InformationCircleIcon className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Giftogram Requirements:</p>
                      <ul className="mt-1 text-sm space-y-1">
                        <li>• Gift card amounts will be rounded to the nearest $5 increment</li>
                        <li>• Email subject line is required for all recipients</li>
                        <li>• Choose a campaign from your Giftogram account</li>
                      </ul>
                    </div>
                  </Alert>
                )}

                {giftogramStatus === "error" && (
                  <Alert variant="warning">
                    <InformationCircleIcon className="w-5 h-5" />
                    Giftogram configuration issues detected. Please check your API settings.
                  </Alert>
                )}
              </div>

              {/* Right: Live preview */}
              <div className="lg:col-span-1">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Email preview</p>
                  <div className="rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Subject</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{giftogramConfig.subject || "You have received a gift card!"}</p>
                    </div>
                    <div className="h-px bg-gray-200 dark:bg-gray-700" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Message</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{giftogramConfig.message}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* PayPal Information */}
      {selectedMethod === "paypal" && mode !== "config-only" && (
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <CreditCardIcon className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="font-semibold text-gray-900 dark:text-white">PayPal Configuration</h4>
            <Badge variant="success" size="sm" className="ml-2">
              Ready
            </Badge>
          </div>
          <Alert variant="info">
            <InformationCircleIcon className="w-5 h-5" />
            PayPal is ready to process payments. Recipients will receive payments directly to their PayPal accounts.
          </Alert>
        </Card>
      )}

      {/* XE Bank Transfer Configuration */}
      {selectedMethod === "xe_bank_transfer" && mode !== "config-only" && (
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <BanknotesIcon className="w-5 h-5 text-green-600 mr-2" />
            <h4 className="font-semibold text-gray-900 dark:text-white">XE Bank Transfer Configuration</h4>
            {xeStatus === "connected" && (
              <Badge variant="success" size="sm" className="ml-2">
                Connected
              </Badge>
            )}
            {xeStatus === "error" && (
              <Badge variant="danger" size="sm" className="ml-2">
                Connection Error
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading XE accounts...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">XE Account</label>
                <select
                  value={xeConfig.accountNumber}
                  onChange={(e) => setXeConfig((prev) => ({ ...prev, accountNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select an account...</option>
                  {xeAccounts.map((account) => (
                    <option key={account.accountNumber} value={account.accountNumber}>
                      {account.accountName} ({account.accountNumber})
                    </option>
                  ))}
                </select>
                {xeAccounts.length === 0 && xeStatus === "connected" && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    No accounts available. Please check your XE account.
                  </p>
                )}
              </div>

              {xeStatus === "connected" && (
                <Alert variant="info">
                  <InformationCircleIcon className="w-5 h-5" />
                  <div>
                    <p className="font-medium">XE Bank Transfer Process:</p>
                    <ul className="mt-1 text-sm space-y-1">
                      <li>• Recipients will receive emails to provide their bank details</li>
                      <li>• Bank details will be collected based on their country and currency</li>
                      <li>• Payments will be processed once all details are collected</li>
                      <li>• International transfers with competitive exchange rates</li>
                    </ul>
                  </div>
                </Alert>
              )}

              {xeStatus === "error" && (
                <Alert variant="warning">
                  <InformationCircleIcon className="w-5 h-5" />
                  XE configuration issues detected. Please check your API settings.
                </Alert>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Save Configuration */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleSaveConfiguration}
          loading={saving}
          disabled={
            saving ||
            !selectedMethod ||
            (selectedMethod === "giftogram" && (!giftogramConfig.campaignId || giftogramStatus === "error")) ||
            (selectedMethod === "xe_bank_transfer" && (!xeConfig.accountNumber || xeStatus === "error"))
          }
        >
          {saving ? "Saving Configuration..." : "Save Payment Method"}
        </Button>
      </div>
    </div>
  );
}

export default PaymentMethodSelector;
