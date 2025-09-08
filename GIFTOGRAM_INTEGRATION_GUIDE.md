# Giftogram Integration Guide

## Overview

The BulkPayout platform now supports multiple payment methods including **PayPal**, **Giftogram Gift Cards**, and **Bank Transfer** (coming soon). This integration allows users to send bulk gift cards through the Giftogram API alongside the existing PayPal functionality.

## Features Added

### 🎁 **Multi-Payment Method Support**

- **PayPal**: Existing functionality maintained
- **Giftogram**: Full gift card processing with customizable campaigns and messages
- **Bank Transfer**: Framework ready (implementation pending)

### 🔧 **Backend Enhancements**

#### Data Models Updated

- `PaymentBatch` model now includes:
  - `paymentMethod` field (paypal, giftogram, bank_transfer)
  - `giftogramCampaignId` and `giftogramMessage` fields
- `Payment` model now includes:
  - `paymentMethod` field
  - Giftogram-specific transaction fields

#### New Services & Controllers

- **`GiftogramService`**: Complete API integration with Giftogram
  - Bulk gift card creation
  - Campaign management
  - Status synchronization
  - Error handling and retry logic
- **`GiftogramController`**: REST API endpoints for gift card operations

#### New API Endpoints

```
GET  /api/giftogram/campaigns           # Get available campaigns
POST /api/giftogram/batches/:id/process # Process gift card batch
POST /api/giftogram/batches/:id/sync    # Sync status with Giftogram
GET  /api/giftogram/test               # Test API connection
PUT  /api/payments/batches/:id/payment-method # Update batch payment method
```

### 🎨 **Frontend Enhancements**

#### New Components

- **`PaymentMethodSelector`**: Comprehensive payment method selection interface
  - Visual method selection cards
  - Giftogram campaign configuration
  - Real-time API connection testing
  - Payment method validation

#### Updated Components

- **`PaymentPreview`**: Enhanced with payment method selection
  - Payment method indicator and switcher
  - Dynamic processing based on selected method
  - Method-specific UI messaging
  - Integrated configuration modal

#### New Services

- **`giftogramService.js`**: Frontend service for Giftogram API calls

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# Giftogram Configuration
GIFTOGRAM_API_KEY=your_giftogram_api_key_here
GIFTOGRAM_ENVIRONMENT=sandbox
# Change to 'production' for live environment
```

### Giftogram API Setup

1. **Get API Credentials**:

   - Sign up at [Giftogram](https://giftogram.com)
   - Obtain your API key from the dashboard
   - Create campaigns in your Giftogram account (these will be fetched automatically via API)

2. **Configure Environment**:
   - Use `sandbox` for testing (uses https://sandbox-api.giftogram.com)
   - Switch to `production` for live operations (uses https://api.giftogram.com)

## Usage Flow

### 1. Upload Payment Data

- Upload Excel/CSV file with recipient details (unchanged)
- Data is processed and stored in the database

### 2. Select Payment Method

- Navigate to Payment Preview
- Click "Change Method" button
- Select desired payment method:
  - **PayPal**: Use existing PayPal configuration
  - **Giftogram**: Configure campaign and custom message
  - **Bank Transfer**: Coming soon

### 3. Configure Method-Specific Settings

#### For Giftogram:

- **Campaign Selection**: Choose from available gift card campaigns
- **Custom Message**: Personalize the message sent with gift cards
- **Connection Test**: Automatic validation of Giftogram API connection

#### For PayPal:

- Uses existing configuration
- No additional setup required

### 4. Process Payments

- Review payment details in the preview table
- Click "Process All [Gift Cards/Payments]" button
- Monitor progress and status updates

## API Integration Details

### Giftogram Service Features

#### Bulk Processing

- Batch processing with configurable batch sizes
- Automatic retry logic for failed requests
- Rate limiting to respect API constraints

#### Error Handling

- Comprehensive error mapping
- User-friendly error messages
- Detailed logging for troubleshooting

#### Status Management

- Real-time status synchronization
- Automatic status updates from Giftogram
- Status mapping to internal payment states

### Payment Processing Flow

```
1. User selects Giftogram method
2. System validates API connection
3. User configures campaign and message
4. System creates Giftogram orders in batches
5. Status updates are tracked and synchronized
6. Recipients receive gift cards via email
```

## Technical Implementation

### Backend Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  PaymentBatch   │    │ GiftogramService │    │  Giftogram API  │
│     Model       │◄──►│                  │◄──►│                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│    Payment      │    │GiftogramController│
│     Model       │◄──►│                  │
└─────────────────┘    └──────────────────┘
```

### Frontend Architecture

```
┌──────────────────┐    ┌─────────────────────┐
│ PaymentPreview   │◄──►│PaymentMethodSelector│
│   Component      │    │     Component       │
└──────────────────┘    └─────────────────────┘
         │                        │
         ▼                        ▼
┌──────────────────┐    ┌─────────────────────┐
│ paymentService   │    │  giftogramService   │
└──────────────────┘    └─────────────────────┘
```

## Error Handling & Troubleshooting

### Common Issues

1. **Giftogram API Connection Failed**

   - Check API key configuration
   - Verify network connectivity
   - Ensure correct environment setting

2. **No Campaigns Available**

   - Verify Giftogram account has active campaigns
   - Check API permissions
   - Contact Giftogram support

3. **Batch Processing Failures**
   - Check recipient email formats
   - Verify campaign ID validity
   - Review Giftogram account balance

### Debug Mode

Enable detailed logging by setting:

```env
NODE_ENV=development
```

## Security Considerations

- API keys are stored in environment variables
- All API communications use HTTPS
- Input validation on all payment data
- Error messages don't expose sensitive information

## Future Enhancements

### Bank Transfer Integration

- Framework is ready for XE API integration
- Email-based bank detail collection system
- Secure bank information handling

### Additional Features

- Gift card delivery scheduling
- Advanced campaign analytics
- Recipient delivery tracking
- Custom gift card designs

## Support

For issues related to:

- **Giftogram API**: Contact Giftogram support
- **Integration Issues**: Check logs and verify configuration
- **Platform Issues**: Review error messages and retry operations

## Testing

### Test Giftogram Integration

1. Set `GIFTOGRAM_ENVIRONMENT=sandbox` (uses https://sandbox-api.giftogram.com)
2. Use your Giftogram sandbox API credentials
3. Create test campaigns in your Giftogram sandbox account
4. Navigate to Payment Preview and upload test data
5. Select Giftogram method
6. Verify campaigns load correctly and connection shows "Connected"
7. Process a small test batch

### Verify PayPal Integration

1. Ensure existing PayPal functionality works
2. Test payment method switching
3. Verify data consistency across methods

---

## Summary

The BulkPayout platform now supports comprehensive multi-payment method processing with seamless switching between PayPal and Giftogram gift cards. The integration maintains backward compatibility while adding powerful new functionality for gift card distribution.

**Key Benefits:**

- ✅ Unified interface for multiple payment methods
- ✅ Seamless method switching with configuration persistence
- ✅ Robust error handling and status tracking
- ✅ Scalable architecture for future payment methods
- ✅ Complete backward compatibility with existing PayPal functionality

The integration is production-ready and includes comprehensive error handling, logging, and user feedback mechanisms.
