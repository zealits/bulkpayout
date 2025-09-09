# XE Bank Transfer Integration Guide

This guide covers the XE API integration for international bank transfers in the BulkPayout system.

## Overview

The XE integration allows you to process international bank transfers through XE's payment API. Recipients receive emails asking them to provide their banking details, which are collected based on their country and currency requirements.

## Features Implemented

### Backend Components

1. **XE Service** (`backend/services/xeService.js`)

   - Authentication with XE API using access key and secret
   - Token management with automatic renewal
   - Account retrieval
   - Payment field requirements by country/currency
   - Recipient and payment creation
   - Payment status checking

2. **XE Controller** (`backend/controllers/xeController.js`)

   - RESTful API endpoints for XE operations
   - Batch processing for bulk payments
   - Error handling and validation
   - Connection testing

3. **XE Routes** (`backend/routes/xeRoutes.js`)
   - `/api/xe/test` - Test API connection
   - `/api/xe/accounts` - Get XE accounts
   - `/api/xe/payment-fields/:countryCode/:currencyCode` - Get required fields
   - `/api/xe/recipients` - Create recipients
   - `/api/xe/payments` - Create payments
   - `/api/xe/payments/:paymentId/status` - Get payment status
   - `/api/xe/batches/:batchId/process` - Process payment batch

### Frontend Components

1. **XE Service** (`frontend/src/services/xeService.js`)

   - Frontend API client for XE operations
   - Error handling and response processing

2. **Payment Method Selector** (Updated)

   - XE Bank Transfer option added
   - Account selection interface
   - Configuration validation

3. **Bank Details Form** (`frontend/src/components/BankDetailsForm.jsx`)

   - Country and currency selection
   - Dynamic form generation based on payment fields
   - Validation and submission
   - Multi-step process with confirmation

4. **XE Demo Page** (`frontend/src/components/XeBankTransferDemo.jsx`)
   - Interactive demonstration of XE functionality
   - Connection testing
   - Account listing
   - Payment field preview
   - Bank details form demo

### Database Updates

1. **Payment Model** - Added XE-specific fields:

   - `xeRecipientId` - XE recipient identifier
   - `xePaymentId` - XE payment identifier
   - `xeAccountNumber` - Selected XE account
   - `xeStatus` - XE payment status
   - `xeBankDetails` - Stored banking information
   - `xeCountryCode` - Recipient country
   - `xeCurrencyCode` - Payment currency

2. **PaymentBatch Model** - Added XE configuration:
   - `xeAccountNumber` - XE account for batch
   - `xeConfigData` - Batch configuration data

## Setup Instructions

### 1. Environment Configuration

Add the following environment variables to your `.env` file:

```env
# XE API Configuration
XE_ACCESS_KEY=your_xe_access_key_here
XE_ACCESS_SECRET=your_xe_access_secret_here
XE_ENVIRONMENT=sandbox
# Change to 'production' for live environment
```

### 2. XE API Credentials

1. Sign up for XE API access at [XE Developer Portal](https://www.xe.com/business/money-transfer-api/)
2. Obtain your access key and access secret
3. Set the environment to 'sandbox' for testing or 'production' for live use

### 3. Testing the Integration

1. **Start the application**:

   ```bash
   # Backend
   cd backend
   npm run dev

   # Frontend
   cd frontend
   npm run dev
   ```

2. **Access the demo**:
   - Navigate to the XE demo page in your application
   - Test API connection
   - Retrieve accounts
   - Test payment field requirements
   - Try the bank details form

## API Endpoints

### Authentication

The XE service automatically handles authentication using the configured access key and secret. Tokens are managed internally with automatic renewal.

### Key API Flows

1. **Get Payment Requirements**:

   ```javascript
   GET / api / xe / payment - fields / US / USD;
   ```

   Returns required banking fields for US Dollar transfers.

2. **Create Recipient**:

   ```javascript
   POST /api/xe/recipients
   {
     "email": "recipient@example.com",
     "name": "John Doe",
     "bankDetails": { ... },
     "country": "US",
     "currency": "USD"
   }
   ```

3. **Create Payment**:
   ```javascript
   POST /api/xe/payments
   {
     "recipientId": "xe_recipient_id",
     "amount": 100.00,
     "accountNumber": "XEMT000011111"
   }
   ```

## Usage Flow

### For Administrators

1. **Upload Payment Batch**: Upload CSV file with recipient details
2. **Select Payment Method**: Choose "XE Bank Transfer"
3. **Configure XE Settings**: Select XE account
4. **Send Email Notifications**: Recipients receive emails with form links

### For Recipients

1. **Receive Email**: Get notification about pending transfer
2. **Select Country/Currency**: Choose banking location and currency
3. **Provide Bank Details**: Fill required banking information
4. **Submit Information**: Complete the process

### For Processing

1. **Collect Bank Details**: Wait for recipients to provide information
2. **Create XE Recipients**: Process collected banking details
3. **Initiate Transfers**: Create payments through XE API
4. **Monitor Status**: Track payment progress and completion

## Error Handling

The integration includes comprehensive error handling for:

- API connection failures
- Invalid credentials
- Missing payment fields
- Validation errors
- Network timeouts
- XE API errors

## Security Considerations

- API credentials are stored securely in environment variables
- Banking details are encrypted in transit
- Sensitive data is not logged
- Recipient links include validation tokens
- Country/currency combinations are validated

## Limitations and Notes

1. **Sandbox Mode**: Use sandbox credentials for testing
2. **Payment Fields**: Different countries require different banking information
3. **Currency Support**: Check XE's supported currency list
4. **Processing Time**: International transfers may take 2-3 business days
5. **Fees**: XE charges may apply based on your agreement

## Support and Troubleshooting

### Common Issues

1. **Connection Errors**: Verify API credentials and network connectivity
2. **Invalid Fields**: Check country/currency combination support
3. **Authentication Failures**: Ensure credentials are correctly configured
4. **Payment Delays**: International transfers have standard processing times

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` to see detailed API interactions.

### Testing Checklist

- [ ] XE API credentials configured
- [ ] Connection test passes
- [ ] Accounts retrieved successfully
- [ ] Payment fields load for test countries
- [ ] Bank details form works correctly
- [ ] Database models updated
- [ ] Payment method selection includes XE option

## Next Steps

To complete the integration:

1. **Email Templates**: Create email templates for recipient notifications
2. **Link Generation**: Implement secure links for bank details collection
3. **Webhook Handling**: Set up webhooks for payment status updates
4. **Reporting**: Add XE-specific reporting and analytics
5. **Production Testing**: Test with live XE API credentials

## API Reference

For complete XE API documentation, visit the [XE API Documentation](https://www.xe.com/business/money-transfer-api/documentation/).

---

**Note**: This integration provides a foundation for XE bank transfers. Additional customization may be needed based on specific business requirements and XE API updates.
