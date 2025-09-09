import React, { useState, useEffect } from "react";
import { BanknotesIcon, GlobeAltIcon, InformationCircleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Alert from "./ui/Alert";
import Loading from "./ui/Loading";
import { getPaymentFields } from "../services/xeService";

function BankDetailsForm({ recipientEmail, recipientName, amount, onSubmit, onError }) {
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [paymentFields, setPaymentFields] = useState([]);
  const [bankDetails, setBankDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: Country/Currency, 2: Bank Details, 3: Confirmation

  // Common countries and currencies for quick selection
  const commonCountries = [
    { code: "US", name: "United States", currency: "USD" },
    { code: "GB", name: "United Kingdom", currency: "GBP" },
    { code: "CA", name: "Canada", currency: "CAD" },
    { code: "AU", name: "Australia", currency: "AUD" },
    { code: "DE", name: "Germany", currency: "EUR" },
    { code: "FR", name: "France", currency: "EUR" },
    { code: "JP", name: "Japan", currency: "JPY" },
    { code: "IN", name: "India", currency: "INR" },
    { code: "BR", name: "Brazil", currency: "BRL" },
    { code: "MX", name: "Mexico", currency: "MXN" },
  ];

  const handleCountrySelect = (country) => {
    setSelectedCountry(country.code);
    setSelectedCurrency(country.currency);
  };

  const loadPaymentFields = async () => {
    if (!selectedCountry || !selectedCurrency) {
      return;
    }

    setLoading(true);
    try {
      const response = await getPaymentFields(selectedCountry, selectedCurrency);
      if (response.success) {
        setPaymentFields(response.data.fields || []);
        // Initialize bank details object
        const initialDetails = {};
        response.data.fields.forEach((field) => {
          initialDetails[field.fieldName] = "";
        });
        setBankDetails(initialDetails);
        setStep(2);
      } else {
        if (onError) {
          onError({
            message: "Failed to load bank requirements",
            suggestion: "Please try a different country/currency combination.",
            action: "Try different selection",
            severity: "error",
          });
        }
      }
    } catch (error) {
      console.error("Error loading payment fields:", error);
      if (onError) {
        onError({
          message: "Failed to load banking requirements",
          suggestion: "Please check your connection and try again.",
          action: "Retry",
          severity: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBankDetailChange = (fieldName, value) => {
    setBankDetails((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const validateBankDetails = () => {
    const errors = [];

    paymentFields.forEach((field) => {
      const value = bankDetails[field.fieldName] || "";

      if (field.required && !value.trim()) {
        errors.push(`${field.label} is required`);
        return;
      }

      if (value.trim()) {
        if (field.minimumLength && value.length < field.minimumLength) {
          errors.push(`${field.label} must be at least ${field.minimumLength} characters`);
        }

        if (field.maximumLength && value.length > field.maximumLength) {
          errors.push(`${field.label} must not exceed ${field.maximumLength} characters`);
        }

        if (field.pattern) {
          const regex = new RegExp(field.pattern);
          if (!regex.test(value)) {
            errors.push(`${field.label} format is invalid`);
          }
        }
      }
    });

    return errors;
  };

  const handleSubmit = async () => {
    const validationErrors = validateBankDetails();
    if (validationErrors.length > 0) {
      if (onError) {
        onError({
          message: "Please fix the following errors:",
          suggestion: validationErrors.join(", "),
          action: "Fix errors",
          severity: "warning",
        });
      }
      return;
    }

    setSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit({
          recipientEmail,
          recipientName,
          amount,
          country: selectedCountry,
          currency: selectedCurrency,
          bankDetails,
        });
      }
      setStep(3);
    } catch (error) {
      console.error("Error submitting bank details:", error);
      if (onError) {
        onError({
          message: "Failed to submit bank details",
          suggestion: "Please try again or contact support.",
          action: "Retry",
          severity: "error",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderCountrySelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <GlobeAltIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Bank Transfer Details</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Hello {recipientName}, please select your country and currency to provide your banking details
        </p>
      </div>

      <Alert variant="info">
        <InformationCircleIcon className="w-5 h-5" />
        <div>
          <p className="font-medium">You're receiving: ${amount}</p>
          <p className="text-sm mt-1">Please select your country and preferred currency to continue</p>
        </div>
      </Alert>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Your Country & Currency</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {commonCountries.map((country) => (
            <Card
              key={country.code}
              className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-green-300 dark:hover:border-green-600"
              onClick={() => handleCountrySelect(country)}
            >
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{country.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{country.currency}</p>
                </div>
                <div className="text-2xl">
                  {country.code === "US" && "🇺🇸"}
                  {country.code === "GB" && "🇬🇧"}
                  {country.code === "CA" && "🇨🇦"}
                  {country.code === "AU" && "🇦🇺"}
                  {country.code === "DE" && "🇩🇪"}
                  {country.code === "FR" && "🇫🇷"}
                  {country.code === "JP" && "🇯🇵"}
                  {country.code === "IN" && "🇮🇳"}
                  {country.code === "BR" && "🇧🇷"}
                  {country.code === "MX" && "🇲🇽"}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Or enter manually:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country Code</label>
            <Input
              type="text"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value.toUpperCase())}
              placeholder="e.g., US, GB, CA"
              maxLength={2}
              className="uppercase"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency Code</label>
            <Input
              type="text"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value.toUpperCase())}
              placeholder="e.g., USD, GBP, EUR"
              maxLength={3}
              className="uppercase"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button
            variant="primary"
            onClick={loadPaymentFields}
            loading={loading}
            disabled={!selectedCountry || !selectedCurrency || loading}
            className="w-full"
          >
            {loading ? "Loading Requirements..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderBankDetailsForm = () => (
    <div className="space-y-6">
      <div className="text-center">
        <BanknotesIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Banking Information</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please provide your banking details for {selectedCountry}/{selectedCurrency}
        </p>
      </div>

      <Alert variant="info">
        <InformationCircleIcon className="w-5 h-5" />
        <div>
          <p className="font-medium">Payment Details:</p>
          <ul className="text-sm mt-1 space-y-1">
            <li>• Recipient: {recipientName}</li>
            <li>
              • Amount: ${amount} {selectedCurrency}
            </li>
            <li>• Country: {selectedCountry}</li>
          </ul>
        </div>
      </Alert>

      <div className="space-y-4">
        {paymentFields.map((field) => (
          <div key={field.fieldName}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Input
              type="text"
              value={bankDetails[field.fieldName] || ""}
              onChange={(e) => handleBankDetailChange(field.fieldName, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              minLength={field.minimumLength}
              maxLength={field.maximumLength}
              pattern={field.pattern || undefined}
              required={field.required}
              className="w-full"
            />
            {field.minimumLength && field.maximumLength && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {field.minimumLength}-{field.maximumLength} characters
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex space-x-4">
        <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
          Back
        </Button>
        <Button variant="primary" onClick={handleSubmit} loading={submitting} disabled={submitting} className="flex-1">
          {submitting ? "Submitting..." : "Submit Details"}
        </Button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-6 text-center">
      <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto" />
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Thank You!</h2>
      <div className="space-y-4">
        <Alert variant="success">
          <CheckCircleIcon className="w-5 h-5" />
          <div>
            <p className="font-medium">Banking details submitted successfully!</p>
            <p className="text-sm mt-1">Your payment will be processed within 2-3 business days.</p>
          </div>
        </Alert>
        <div className="text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Summary:</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Recipient: {recipientName}</li>
            <li>• Email: {recipientEmail}</li>
            <li>
              • Amount: ${amount} {selectedCurrency}
            </li>
            <li>• Country: {selectedCountry}</li>
            <li>• Bank details provided and verified</li>
          </ul>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading message="Loading banking requirements..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="p-8">
        {step === 1 && renderCountrySelection()}
        {step === 2 && renderBankDetailsForm()}
        {step === 3 && renderConfirmation()}
      </Card>
    </div>
  );
}

export default BankDetailsForm;
