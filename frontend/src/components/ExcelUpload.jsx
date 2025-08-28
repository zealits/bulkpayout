import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { uploadExcelFile, validateExcelFile } from "../services/uploadService";
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Card,
  CardContent,
  CardHeader,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";

function ExcelUpload({ onDataUpload }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [uploadResult, setUploadResult] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      setError(null);
      setValidationErrors([]);
      setParsedData(null);
      setUploadResult(null);
      validateFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    multiple: false,
  });

  const validateFile = async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await validateExcelFile(formData);

      if (response.success) {
        const { validationReport, preview } = response.data;

        if (validationReport.isValid) {
          setParsedData(preview);
          setValidationErrors([]);
          onDataUpload(preview);
        } else {
          setValidationErrors(validationReport.errors);
          setError("Please fix the validation errors before proceeding");
        }
      }
    } catch (err) {
      setError("Error validating file: " + err.message);
      setValidationErrors(err.errors || []);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayments = async () => {
    if (!file || !parsedData || validationErrors.length > 0) {
      setError("Please upload a valid file before processing payments");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("batchName", `Batch ${new Date().toLocaleDateString()}`);
      formData.append("description", `Uploaded from ${file.name}`);

      const response = await uploadExcelFile(formData);

      if (response.success) {
        setUploadResult(response.data);
        setError(null);
        // Notify parent component about successful upload
        if (onDataUpload) {
          onDataUpload(response.data);
        }
      }
    } catch (err) {
      setError("Error uploading file: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Upload Excel File
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="body1" color="text.secondary">
          Upload an Excel file (.xlsx, .xls) or CSV file with payment details. Required columns: email, amount, name
        </Typography>
        <Button variant="outlined" size="small" href="/sample-template.csv" download startIcon={<DownloadIcon />}>
          Download Template
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            {...getRootProps()}
            sx={{
              p: 4,
              textAlign: "center",
              cursor: "pointer",
              border: "2px dashed",
              borderColor: isDragActive ? "primary.main" : "grey.300",
              backgroundColor: isDragActive ? "action.hover" : "background.paper",
              "&:hover": {
                borderColor: "primary.main",
                backgroundColor: "action.hover",
              },
            }}
          >
            <input {...getInputProps()} />
            <UploadIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? "Drop the file here" : "Drag & drop file here"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to select file
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Supports .xlsx, .xls, .csv files
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          {file && (
            <Card>
              <CardHeader title="File Details" avatar={<FileIcon color="primary" />} />
              <CardContent>
                <Typography variant="body2" gutterBottom>
                  <strong>Name:</strong> {file.name}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Size:</strong> {getFileSize(file.size)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Type:</strong> {file.type || "Unknown"}
                </Typography>
                {parsedData && (
                  <Typography variant="body2" gutterBottom>
                    <strong>Rows:</strong> {parsedData.length}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Validation Errors ({validationErrors.length})
          </Typography>
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            {validationErrors.map((error, index) => (
              <li key={index}>
                Row {error.row}: {error.errors.join(", ")}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {uploadResult && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            File Uploaded Successfully!
          </Typography>
          <Typography variant="body2">
            Batch ID: {uploadResult.batch.batchId}
            <br />
            Total Payments: {uploadResult.batch.totalPayments}
            <br />
            Total Amount: ${uploadResult.batch.totalAmount.toFixed(2)}
          </Typography>
        </Alert>
      )}

      {parsedData && validationErrors.length === 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">Data Preview ({parsedData.length} rows)</Typography>
            <Button variant="contained" color="primary" onClick={handleProcessPayments} startIcon={<CheckIcon />}>
              Process Payments
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {Object.keys(parsedData[0] || {}).map((header) => (
                    <TableCell key={header} sx={{ fontWeight: "bold" }}>
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {parsedData.slice(0, 10).map((row, index) => (
                  <TableRow key={index}>
                    {Object.values(row).map((value, cellIndex) => (
                      <TableCell key={cellIndex}>{typeof value === "number" ? value.toFixed(2) : value}</TableCell>
                    ))}
                  </TableRow>
                ))}
                {parsedData.length > 10 && (
                  <TableRow>
                    <TableCell colSpan={Object.keys(parsedData[0] || {}).length} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Showing first 10 rows of {parsedData.length} total rows
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}

export default ExcelUpload;
