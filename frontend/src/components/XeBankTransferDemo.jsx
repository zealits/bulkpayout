import React, { useState } from "react";
import {
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Alert from "./ui/Alert";
import Badge from "./ui/Badge";
import BankDetailsForm from "./BankDetailsForm";
import { testXeConnection, getXeAccounts, getPaymentFields } from "../services/xeService";

function XeBankTransferDemo() {
  const [activeDemo, setActiveDemo] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [samplePaymentFields, setSamplePaymentFields] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const demoRecipient = {
    email: "demo@example.com",
    name: "Demo Recipient",
    amount: "100.00",
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await testXeConnection();
      if (result.success) {
        setConnectionStatus("connected");
        console.log("XE Connection successful:", result.data);
      } else {
        setConnectionStatus("error");
        setError("Connection failed: " + result.message);
      }
    } catch (err) {
      setConnectionStatus("error");
      setError("Connection test failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getXeAccounts();
      if (result.success) {
        setAccounts(result.data || []);
        console.log("XE Accounts:", result.data);
      } else {
        setError("Failed to get accounts: " + result.message);
      }
    } catch (err) {
      setError("Get accounts failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetPaymentFields = async (countryCode, currencyCode) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPaymentFields(countryCode, currencyCode);
      if (result.success) {
        setSamplePaymentFields(result.data);
        console.log("Payment Fields:", result.data);
      } else {
        setError(`Failed to get payment fields for ${countryCode}/${currencyCode}: ` + result.message);
      }
    } catch (err) {
      setError("Get payment fields failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBankDetailsSubmit = async (bankData) => {
    console.log("Bank details submitted:", bankData);
    // In a real implementation, this would save to database and process the payment
    return Promise.resolve();
  };

  const handleBankDetailsError = (errorData) => {
    setError(errorData.message + " " + errorData.suggestion);
  };

  const renderConnectionDemo = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <BanknotesIcon className="w-5 h-5 mr-2 text-green-600" />
        1. Test XE API Connection
      </h3>

      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          Test the connection to XE's payment API to ensure proper configuration.
        </p>

        <div className="flex items-center space-x-4">
          <Button variant="primary" onClick={handleTestConnection} loading={loading} disabled={loading}>
            Test Connection
          </Button>

          {connectionStatus && (
            <Badge variant={connectionStatus === "connected" ? "success" : "danger"}>
              {connectionStatus === "connected" ? "Connected" : "Connection Failed"}
            </Badge>
          )}
        </div>

        {connectionStatus === "connected" && (
          <Alert variant="success">
            <CheckCircleIcon className="w-5 h-5" />
            Successfully connected to XE API! Ready to process bank transfers.
          </Alert>
        )}
      </div>
    </Card>
  );

  const renderAccountsDemo = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">2. Fetch XE Accounts</h3>

      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">Retrieve available XE accounts for processing payments.</p>

        <Button
          variant="primary"
          onClick={handleGetAccounts}
          loading={loading}
          disabled={loading || connectionStatus !== "connected"}
        >
          Get Accounts
        </Button>

        {accounts.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 dark:text-white">Available Accounts:</h4>
            {accounts.map((account, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="font-medium">{account.accountName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Account: {account.accountNumber}</p>
                {account.parentAccountNumber && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Parent: {account.parentAccountNumber}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );

  const renderPaymentFieldsDemo = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">3. Get Payment Field Requirements</h3>

      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          Fetch the required banking fields for different countries and currencies.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGetPaymentFields("US", "USD")}
            loading={loading}
            disabled={loading}
          >
            US/USD
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGetPaymentFields("GB", "GBP")}
            loading={loading}
            disabled={loading}
          >
            GB/GBP
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGetPaymentFields("CA", "CAD")}
            loading={loading}
            disabled={loading}
          >
            CA/CAD
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGetPaymentFields("AU", "AUD")}
            loading={loading}
            disabled={loading}
          >
            AU/AUD
          </Button>
        </div>

        {samplePaymentFields && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Required Fields for {samplePaymentFields.countryCode}/{samplePaymentFields.currencyCode}:
            </h4>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              {samplePaymentFields.fields?.map((field, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                >
                  <div>
                    <span className="font-medium">{field.label}</span>
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {field.minimumLength &&
                      field.maximumLength &&
                      `${field.minimumLength}-${field.maximumLength} chars`}
                    {field.pattern && " (pattern required)"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  const renderBankDetailsDemo = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">4. Bank Details Collection Form</h3>

      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          Interactive form that recipients use to provide their banking details.
        </p>

        <Button variant="primary" onClick={() => setActiveDemo("bankForm")}>
          Open Bank Details Form Demo
        </Button>
      </div>
    </Card>
  );

  if (activeDemo === "bankForm") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bank Details Form Demo</h2>
          <Button variant="outline" onClick={() => setActiveDemo(null)}>
            Back to Demo
          </Button>
        </div>

        <BankDetailsForm
          recipientEmail={demoRecipient.email}
          recipientName={demoRecipient.name}
          amount={demoRecipient.amount}
          onSubmit={handleBankDetailsSubmit}
          onError={handleBankDetailsError}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">XE Bank Transfer Integration Demo</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          This demo showcases the XE API integration for international bank transfers. Test each component to see how
          the system works.
        </p>
      </div>

      {error && (
        <Alert variant="danger">
          <ExclamationTriangleIcon className="w-5 h-5" />
          {error}
        </Alert>
      )}

      <Alert variant="info">
        <InformationCircleIcon className="w-5 h-5" />
        <div>
          <p className="font-medium">Demo Configuration Required:</p>
          <p className="text-sm mt-1">
            To test this demo, ensure you have XE API credentials configured in your environment variables:
            XE_ACCESS_KEY, XE_ACCESS_SECRET, and XE_ENVIRONMENT.
          </p>
        </div>
      </Alert>

      <div className="grid gap-6">
        {renderConnectionDemo()}
        {renderAccountsDemo()}
        {renderPaymentFieldsDemo()}
        {renderBankDetailsDemo()}
      </div>

      <Card className="p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">🎉 XE Integration Complete!</h3>
        <p className="text-green-700 dark:text-green-300 text-sm">
          The XE bank transfer integration is now ready for use. Recipients can provide their banking details through
          the form, and payments will be processed through XE's secure international transfer network.
        </p>
      </Card>
    </div>
  );
}

export default XeBankTransferDemo;
