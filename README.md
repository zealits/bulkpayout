# BulkPayout - PayPal Bulk Payment Application

A full-stack application for processing bulk payments through PayPal API with Excel file upload capabilities.

## 🏗️ Project Structure

```
BulkPayout/
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API service layer
│   │   └── ...
│   └── package.json
├── backend/                # Node.js + Express backend
│   ├── controllers/        # Route controllers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── utils/             # Utility functions
│   ├── config/            # Configuration files
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v20.17.0 or higher)
- MongoDB (local or cloud)
- PayPal Developer Account

### Backend Setup

1. **Navigate to backend directory:**

   ```bash
   cd backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create environment file:**

   ```bash
   # Copy the template and rename it to .env
   cp env-template.txt .env
   ```

4. **Configure environment variables in `.env`:**

   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/bulkpayout

   # PayPal Configuration
   PAYPAL_CLIENT_ID=your_paypal_client_id_here
   PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
   PAYPAL_MODE=sandbox
   # Change to 'live' for production

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=30d

   # CORS Configuration
   FRONTEND_URL=http://localhost:5173

   # File Upload Configuration
   MAX_FILE_SIZE=10485760
   # 10MB in bytes
   ```

5. **Start the backend server:**

   ```bash
   # Development mode with auto-reload
   npm run dev

   # Or production mode
   npm start
   ```

   The backend will be available at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**

   ```bash
   cd frontend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create environment file:**

   ```bash
   # Copy the template and rename it to .env
   cp env-template.txt .env
   ```

4. **Configure environment variables in `.env`:**

   ```env
   # Backend API URL
   VITE_API_URL=http://localhost:5000/api

   # Environment
   VITE_NODE_ENV=development
   ```

5. **Start the frontend development server:**

   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

## 🔑 PayPal Configuration

### Getting PayPal Credentials

1. **Go to PayPal Developer Dashboard:**

   - Visit [https://developer.paypal.com](https://developer.paypal.com)
   - Sign in with your PayPal account

2. **Create a new application:**

   - Click "Create App"
   - Choose "Default Application"
   - Select "Sandbox" for testing or "Live" for production
   - Enable "Payouts" feature

3. **Get your credentials:**
   - Copy the Client ID and Client Secret
   - Add them to your backend `.env` file

### Sandbox Testing

- Use PayPal sandbox for testing
- Create test accounts in the PayPal Developer Dashboard
- Use sandbox credentials in your `.env` file

## 📄 Excel File Format

The application expects Excel files (.xlsx, .xls) or CSV files with the following columns:

| Column Name | Required | Description                  |
| ----------- | -------- | ---------------------------- |
| name        | Yes      | Recipient's full name        |
| email       | Yes      | PayPal email address         |
| amount      | Yes      | Payment amount (decimal)     |
| notes       | No       | Payment description          |
| currency    | No       | Currency code (default: USD) |

### Sample Excel File Content:

```
name,email,amount,notes,currency
John Radulescu,john@example.com,150.00,Freelance work payment,USD
Jane Smith,jane@example.com,75.00,Consultation fee,USD
Bob Johnson,bob@example.com,200.00,Project milestone payment,USD
```

## 🎯 Features

### Frontend Features

- **Modern Dashboard:** Clean, responsive Material-UI design
- **Excel Upload:** Drag & drop file upload with validation
- **Data Preview:** Review and edit payment data before processing
- **Payment Processing:** Process bulk payments through PayPal
- **Payment History:** Track all payment batches and their status
- **Real-time Updates:** Live status updates during payment processing

### Backend Features

- **PayPal Integration:** Complete PayPal Payouts API integration
- **File Processing:** Excel/CSV parsing and validation
- **Database Management:** MongoDB for storing payment records
- **Error Handling:** Comprehensive error handling and logging
- **RESTful API:** Clean API design with proper status codes

## 🔗 API Endpoints

### Upload Endpoints

- `POST /api/upload/excel` - Upload and process Excel file
- `POST /api/upload/validate` - Validate Excel file without saving
- `GET /api/upload/template` - Get upload template information

### Payment Endpoints

- `GET /api/payments/batches` - Get all payment batches
- `GET /api/payments/batches/:batchId` - Get specific batch details
- `POST /api/payments/batches/:batchId/process` - Process payment batch
- `GET /api/payments/stats` - Get payment statistics

## 🛠️ Development

### Running in Development Mode

1. **Start MongoDB** (if running locally)
2. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```
3. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

### Building for Production

1. **Build Frontend:**

   ```bash
   cd frontend
   npm run build
   ```

2. **Start Backend in Production:**
   ```bash
   cd backend
   NODE_ENV=production npm start
   ```

## 📋 Environment Variables

### Backend Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode (development/production)
- `MONGODB_URI` - MongoDB connection string
- `PAYPAL_CLIENT_ID` - PayPal application client ID
- `PAYPAL_CLIENT_SECRET` - PayPal application client secret
- `PAYPAL_MODE` - PayPal environment (sandbox/live)
- `JWT_SECRET` - Secret key for JWT tokens
- `FRONTEND_URL` - Frontend URL for CORS

### Frontend Environment Variables

- `VITE_API_URL` - Backend API base URL
- `VITE_NODE_ENV` - Environment mode

## ⚠️ Security Notes

1. **Never commit `.env` files** to version control
2. **Use strong JWT secrets** in production
3. **Enable HTTPS** in production
4. **Validate all user inputs** on both frontend and backend
5. **Use PayPal sandbox** for testing, live for production only

## 🐛 Troubleshooting

### Common Issues

1. **PayPal API Errors:**

   - Check your credentials in `.env`
   - Ensure you have Payouts enabled in PayPal app
   - Verify sandbox/live mode settings

2. **Database Connection Issues:**

   - Check MongoDB is running
   - Verify connection string in `.env`

3. **File Upload Issues:**
   - Check file format (xlsx, xls, csv)
   - Ensure required columns are present
   - Check file size (max 10MB)

## 📞 Support

For issues and questions:

1. Check the troubleshooting section above
2. Review PayPal API documentation
3. Check browser console for frontend errors
4. Check server logs for backend errors

## 🎉 Success!

If everything is set up correctly, you should be able to:

1. Upload Excel files with payment data
2. Preview and validate the data
3. Process bulk payments through PayPal
4. Track payment status and history

Happy bulk paying! 💰
