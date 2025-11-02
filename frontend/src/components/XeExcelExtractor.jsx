import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { parseXeWorkbook, createXeRecipients } from "../services/xeService";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Table from "./ui/Table";
import Alert from "./ui/Alert";
import { Spinner } from "./ui/Loading";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

function XeExcelExtractor() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await parseXeWorkbook(formData);
      setResult(response.data);
    } catch (err) {
      setError(err.message || "Failed to parse workbook");
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
    multiple: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload XE Excel</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Upload the generated XE workbook. We'll extract and display recipients from each sheet.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div
          {...getRootProps()}
          className={`p-8 text-center cursor-pointer border-2 border-dashed transition-all duration-200 ${
            isDragActive
              ? "border-primary-400 bg-primary-50 dark:bg-primary-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
          }`}
        >
          <input {...getInputProps()} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {isDragActive ? "Drop the workbook here" : "Drag & drop workbook here"}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-2">or click to select .xlsx file</p>
        </div>
      </Card>

      {loading && (
        <div className="flex items-center">
          <Spinner size="sm" />
          <span className="ml-2">Parsing workbook...</span>
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {result?.sheets?.length > 0 && (
        <div className="space-y-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create XE Recipients</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Create XE recipients from all rows in the uploaded workbook
                </p>
              </div>
              <Button
                variant="primary"
                onClick={async () => {
                  if (!result?.sheets) return;
                  setCreating(true);
                  setError(null);
                  setCreateResult(null);

                  try {
                    const sheetRows = result.sheets.map((sheet) => ({
                      sheetName: sheet.sheetName,
                      rows: sheet.rows,
                      inferredCountry: sheet.inferredCountry,
                      inferredCurrency: sheet.inferredCurrency,
                    }));

                    const response = await createXeRecipients(sheetRows);
                    setCreateResult(response.data);
                  } catch (err) {
                    setError(err.message || "Failed to create recipients");
                  } finally {
                    setCreating(false);
                  }
                }}
                disabled={creating || loading}
                icon={creating ? <Spinner size="sm" /> : <CheckCircleIcon className="w-5 h-5" />}
              >
                {creating ? "Creating Recipients..." : "Create XE Recipients"}
              </Button>
            </div>
          </Card>

          {createResult && (
            <Alert
              variant={createResult.failureCount === 0 ? "success" : "warning"}
              title={`Recipients Created: ${createResult.successCount} successful, ${createResult.failureCount} failed`}
            >
              <div className="mt-2 space-y-1 text-sm">
                <p>Total Processed: {createResult.totalProcessed}</p>
                <p>Successful: {createResult.successCount}</p>
                {createResult.failureCount > 0 && <p>Failed: {createResult.failureCount}</p>}
                {createResult.batchId && (
                  <p>
                    Batch ID: <span className="font-mono text-xs">{createResult.batchId}</span>
                  </p>
                )}
              </div>
            </Alert>
          )}

          {createResult?.failureCount > 0 && (
            <Card className="p-4">
              <Card.Header title="Failure details" subtitle="Row-level XE validation errors" />
              <Card.Content>
                <div className="overflow-x-auto">
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.Head>Sheet</Table.Head>
                        <Table.Head>Row</Table.Head>
                        <Table.Head>Client Reference</Table.Head>
                        <Table.Head>Error Summary</Table.Head>
                        <Table.Head>Field Errors</Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {createResult.results
                        ?.filter((r) => r.status === "failed")
                        .map((r, i) => {
                          const details = r.errorDetails || {};
                          const xeErrors = Array.isArray(details.errors) ? details.errors : [];
                          return (
                            <Table.Row key={i}>
                              <Table.Cell>{r.sheetName || "-"}</Table.Cell>
                              <Table.Cell>{r.rowNumber ?? "-"}</Table.Cell>
                              <Table.Cell className="font-mono text-xs">{r.clientReference}</Table.Cell>
                              <Table.Cell>
                                {details.shortErrorMsg || details.longErrorMsg || r.error || "Validation error"}
                              </Table.Cell>
                              <Table.Cell>
                                {xeErrors.length === 0 ? (
                                  <span className="text-gray-500">No field errors returned</span>
                                ) : (
                                  <ul className="list-disc pl-5 space-y-1">
                                    {xeErrors.map((e, idx) => {
                                      const fieldName = e.fieldName || e.path || "Unknown field";
                                      const messages = [];
                                      if (Array.isArray(e.errors)) messages.push(...e.errors);
                                      if (Array.isArray(e.fieldErrors)) {
                                        e.fieldErrors.forEach((fe) => {
                                          if (fe?.errorMessage) messages.push(fe.errorMessage);
                                        });
                                      }
                                      const text = messages.length ? messages.join("; ") : "Invalid value";
                                      return (
                                        <li key={idx}>
                                          <span className="font-medium">{fieldName}:</span> {text}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                    </Table.Body>
                  </Table>
                </div>
              </Card.Content>
            </Card>
          )}

          {result.sheets.map((sheet, idx) => (
            <Card key={idx} className="p-4">
              <Card.Header title={`Sheet: ${sheet.sheetName} (${sheet.rowCount} rows)`} />
              <Card.Content className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        {sheet.headers.map((h, i) => (
                          <Table.Head key={i}>{h}</Table.Head>
                        ))}
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {sheet.rows.slice(0, 20).map((row, rIdx) => (
                        <Table.Row key={rIdx}>
                          {sheet.headers.map((h, cIdx) => {
                            const key = h
                              .toLowerCase()
                              .replace(/\*/g, "")
                              .replace(/\s*\(.*?\)\s*/g, "")
                              .replace(/[^a-z0-9]+/g, "_")
                              .replace(/^_+|_+$/g, "");
                            const value = row[key] ?? row[key?.replace(/_+$/, "")] ?? "";
                            return <Table.Cell key={cIdx}>{value}</Table.Cell>;
                          })}
                        </Table.Row>
                      ))}
                      {sheet.rows.length > 20 && (
                        <Table.Row>
                          <Table.Cell colSpan={sheet.headers.length} className="text-center py-3 text-sm text-gray-500">
                            Showing first 20 of {sheet.rows.length} rows
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default XeExcelExtractor;
