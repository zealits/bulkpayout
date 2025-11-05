import React, { useState } from "react";
import { DocumentArrowDownIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Alert from "./ui/Alert";
import Input from "./ui/Input";
import { LoadingOverlay, Spinner } from "./ui/Loading";
import { generateXeTemplate, generateXeTemplateBulk, getPaymentFields } from "../services/xeService";

// Common country and currency options
const COUNTRIES = [
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "IN", name: "India" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
];

const CURRENCIES = [
  { code: "GBP", name: "British Pound" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "INR", name: "Indian Rupee" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
];

function XeTemplateDownload() {
  const [selections, setSelections] = useState([
    { id: 1, countryCode: "", currencyCode: "", numberOfRecipients: 1, paymentFields: [], loadingFields: false },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const updateSelection = (id, updates) => {
    setSelections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const addSelection = () => {
    setSelections((prev) => [
      ...prev,
      {
        id: prev.length ? Math.max(...prev.map((p) => p.id)) + 1 : 1,
        countryCode: "",
        currencyCode: "",
        numberOfRecipients: 1,
        paymentFields: [],
        loadingFields: false,
      },
    ]);
  };

  const removeSelection = (id) => {
    setSelections((prev) => prev.filter((s) => s.id !== id));
  };

  const fetchPaymentFields = async (id, country, currency) => {
    if (!country || !currency) return;

    updateSelection(id, { loadingFields: true });
    setError(null);

    try {
      const response = await getPaymentFields(country, currency);
      // Our API returns { success, message, data: { countryCode, currencyCode, fields } }
      if (response && response.data && Array.isArray(response.data.fields)) {
        updateSelection(id, { paymentFields: response.data.fields });
      } else if (response && Array.isArray(response.fields)) {
        // Fallback in case server returns fields directly
        updateSelection(id, { paymentFields: response.fields });
      } else if (Array.isArray(response)) {
        updateSelection(id, { paymentFields: response });
      } else {
        updateSelection(id, { paymentFields: [] });
      }
    } catch (err) {
      console.error("Error fetching payment fields:", err);
      // Don't show error for payment fields, just log it
      // Users can still generate template without fields
      updateSelection(id, { paymentFields: [] });
    } finally {
      updateSelection(id, { loadingFields: false });
    }
  };

  const handleGenerateTemplate = async () => {
    const valid = selections.every(
      (s) => s.countryCode && s.currencyCode && s.numberOfRecipients >= 1 && s.numberOfRecipients <= 10000
    );
    if (!valid) {
      setError("Please complete all rows with valid country, currency and recipient count (1-10,000)");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = selections.map(({ countryCode, currencyCode, numberOfRecipients }) => ({
        countryCode,
        currencyCode,
        numberOfRecipients,
      }));
      const response = await generateXeTemplateBulk(payload.length > 1 ? payload : payload);

      if (response.success) {
        // Download the file
        const blob = new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download =
          payload.length > 1
            ? `XE_Templates_${new Date().getTime()}.xlsx`
            : `XE_Template_${payload[0].countryCode}_${payload[0].currencyCode}_${new Date().getTime()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(response.message || "Failed to generate template");
      }
    } catch (err) {
      console.error("Error generating template:", err);
      setError(err.message || "An error occurred while generating the template");
    } finally {
      setLoading(false);
    }
  };

  // Get field label from paymentFields or default label
  const getFieldLabel = (paymentFields, fieldName) => {
    const field = (paymentFields || []).find((f) => f.fieldName === fieldName);
    return field ? field.label : fieldName;
  };

  // Check if field is required
  const isFieldRequired = (paymentFields, fieldName) => {
    const field = (paymentFields || []).find((f) => f.fieldName === fieldName);
    return field ? field.required : false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">XE Template Download</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Generate a dynamic Excel template for XE bank transfers based on country and currency
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {selections.map((row) => (
            <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  value={row.countryCode}
                  onChange={async (e) => {
                    const value = e.target.value;
                    updateSelection(row.id, { countryCode: value });
                    if (value && row.currencyCode) await fetchPaymentFields(row.id, value, row.currencyCode);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  disabled={loading}
                >
                  <option value="">Select Country</option>
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Currency <span className="text-red-500">*</span>
                </label>
                <select
                  value={row.currencyCode}
                  onChange={async (e) => {
                    const value = e.target.value;
                    updateSelection(row.id, { currencyCode: value });
                    if (row.countryCode && value) await fetchPaymentFields(row.id, row.countryCode, value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  disabled={loading}
                >
                  <option value="">Select Currency</option>
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.name} ({currency.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Recipients <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={row.numberOfRecipients}
                  onChange={(e) => updateSelection(row.id, { numberOfRecipients: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={10000}
                  disabled={loading}
                  placeholder="Enter number of recipients"
                />
              </div>

              <div className="md:col-span-1 flex md:justify-end">
                {selections.length > 1 && (
                  <Button variant="outline" onClick={() => removeSelection(row.id)} className="w-full md:w-auto">
                    Remove
                  </Button>
                )}
              </div>

              {row.loadingFields && (
                <div className="md:col-span-12 flex items-center py-2">
                  <Spinner size="sm" />
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Loading payment fields...</span>
                </div>
              )}

              {row.paymentFields && row.paymentFields.length > 0 && (
                <div className="md:col-span-12 mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                    Payment Fields Required for {row.countryCode}/{row.currencyCode}:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {row.paymentFields.map((field) => (
                      <span
                        key={field.fieldName}
                        className={`px-2 py-1 rounded text-xs ${
                          field.required
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {field.label} {field.required && "*"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-between">
            <Button variant="outline" onClick={addSelection}>
              Add Country
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerateTemplate}
              disabled={
                loading || selections.some((s) => !s.countryCode || !s.currencyCode || s.numberOfRecipients < 1)
              }
              icon={loading ? <Spinner size="sm" /> : <DocumentArrowDownIcon className="w-5 h-5" />}
            >
              {loading ? "Generating..." : "Generate Template"}
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="Template Generated Successfully!">
          Your Excel template has been downloaded. Fill in the required fields and upload it to process payments.
        </Alert>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Template Information</h2>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong className="text-gray-900 dark:text-white">Consumer Fields (Always Required):</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Given Names (max 50 characters)</li>
            <li>Family Name (max 20 characters)</li>
            <li>Email Address (max 70 characters)</li>
            <li>Address Line 1 (max 34 characters)</li>
            <li>Address Line 2 (max 34 characters)</li>
            <li>Country (2-character ISO code)</li>
            <li>Locality (max 50 characters)</li>
            <li>
              Region (max 50 characters){" "}
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">⚠️ Important:</span>
              <ul className="list-circle list-inside ml-6 mt-1 space-y-0.5 text-xs">
                <li>
                  <strong>ISO codes required:</strong> US, GB, AU, CN, MX, NZ, CA (e.g., US → CA, not California)
                </li>
                <li>
                  <strong>Full names accepted:</strong> India (e.g., Maharashtra, Karnataka)
                </li>
              </ul>
            </li>
            <li>Postcode (max 20 characters)</li>
          </ul>
          <p className="mt-3">
            <strong className="text-gray-900 dark:text-white">Bank Details:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Account Name (required)</li>
            <li>Country (required)</li>
            <li>Account Type (required)</li>
            <li>Additional fields based on selected country/currency</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

export default XeTemplateDownload;
