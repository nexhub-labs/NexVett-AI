import { ActionIcon, Badge, Box, Button, Grid, Group, Paper, Select, Stack, Text, Title, FileInput, ThemeIcon } from "@mantine/core";
import { Zap, FileText, Layers } from "lucide-react";
import { useState } from "react";
import { navigate } from "vike/client/router";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useSession } from "../../contexts/SessionContext";
import { apiClient } from "../../lib/api-client";
import { RequireAuth } from "../../contexts/AuthContext";

gsap.registerPlugin(useGSAP);

import {
  Transaction,
  AccountData,
  AnalysisResult,
  ParseResult,
  MultiFileAnalysisResult
} from "@nexvett-ai/shared";

function AnalyzeContent() {
  const { setParseResult, setAnalysisResult, setAccountsAnalysis, setMultiFileResult } = useSession();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [analysisMode, setAnalysisMode] = useState<'single' | 'unified'>('single');
  const [fileType, setFileType] = useState<"pdf" | "xls" | "xlsx" | "csv">("pdf");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<'parsing' | 'analyzing' | 'complete' | null>(null);
  const [error, setError] = useState("");

  const handleFileSelect = (files: File[] | null) => {
    if (files && files.length > 0) {
      setSelectedFiles(files);
      // Auto-detect mode based on file count
      if (files.length === 1) {
        setAnalysisMode('single');
      } else if (files.length > 1) {
        setAnalysisMode('unified');
      }
      // Set file type from first file
      const extension = files[0].name.split('.').pop()?.toLowerCase();
      if (extension === 'pdf' || extension === 'xls' || extension === 'xlsx' || extension === 'csv') {
        setFileType(extension);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    if (updated.length === 1) {
      setAnalysisMode('single');
    }
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
    setAnalysisMode('single');
  };

  const handleProcessFile = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one file");
      return;
    }

    setIsProcessing(true);
    setProcessingStage('parsing');
    setError("");

    try {
      // Use high-performance unified intelligence pipeline for all uploads
      const formData = new FormData();
      formData.append('mode', 'unified');

      selectedFiles.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });

      const result = await apiClient.post<MultiFileAnalysisResult>("/api/analyze-multi-file", formData);

      if (!result.success) {
        setError(`Analysis failed: ${result.errors?.join(', ') || 'Unknown error'}`);
        setIsProcessing(false);
        return;
      }

      // Store results in session context (Unified view is now default)
      setMultiFileResult(result);

      // Backfill single-file state for components that depend on it
      if (result.unified?.files && result.unified.files.length > 0) {
        const firstFile = result.unified.files[0];
        setParseResult({
          success: true,
          transactions: firstFile.transactions,
          summary: {
            totalTransactions: firstFile.analysis.summary.totalTransactions,
            totalDebit: firstFile.analysis.summary.totalExpenses,
            totalCredit: firstFile.analysis.summary.totalIncome,
            dateRange: { start: null, end: null }
          },
          metadata: {
            bankName: firstFile.metadata.name,
            accountNumber: firstFile.metadata.id
          },
          errors: []
        });
        setAnalysisResult(firstFile.analysis);
      }

      // Show success state before redirecting
      setProcessingStage('complete');
      setTimeout(() => {
        navigate('/results');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
      setProcessingStage(null);
    } finally {
      if (processingStage !== 'complete') {
        setIsProcessing(false);
      }
    }
  };

  return (
    <Box id="analyze">
      <Stack gap={22}>
        <Box data-anim="hero">
          <Badge variant="light" color="violet" radius="xl" mb={12}>
            Secure Analysis
          </Badge>
          <Title order={1} style={{ letterSpacing: "-0.04em", lineHeight: 1.1, fontWeight: 800, fontSize: "clamp(2.5rem, 6vw, 3.5rem)" }}>
            Bank statement <br />
            <Text span c="violet.5" inherit style={{
              background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              intelligence.
            </Text>
          </Title>
          <Text c="dimmed" mt={16} size="lg" style={{ maxWidth: 720, lineHeight: 1.7, fontWeight: 500 }}>
            Upload your statements to extract transactions, compute insights, and audit fees with total privacy.
          </Text>
        </Box>

        <Paper
          data-anim="block"
          radius="20px"
          p={{ base: "xl", sm: 40 }}
          style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.4), 0 0 1px rgba(124, 58, 237, 0.2)",
          }}
        >
          <Stack gap={32}>
            <Box>
              <Title order={2} size="h3" style={{ letterSpacing: "-0.02em", fontWeight: 750 }}>
                Upload Statements
              </Title>
              <Text c="dimmed" mt={6} size="sm">
                Supported formats: PDF, XLS, XLSX, CSV. In-memory processing.
              </Text>
            </Box>

            <Paper
              p="sm"
              radius="md"
              style={{
                background: "rgba(124, 58, 237, 0.05)",
                border: "1px solid rgba(124, 58, 237, 0.1)",
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Zap size={16} color="#8b5cf6" style={{ filter: "drop-shadow(0 0 4px #8b5cf6)" }} />
              <Text size="xs" fw={700} c="violet.3" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                Active Support: GTBank | Opay
              </Text>
              <Box style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)" }} />
              <Text size="xs" c="dimmed" fw={500}>
                More banks arriving weekly
              </Text>
            </Paper>

            <Stack gap="md">
              <FileInput
                label="Select files"
                placeholder="Choose one or more files"
                accept=".pdf,.xls,.xlsx,.csv"
                multiple
                value={selectedFiles}
                onChange={handleFileSelect}
                description="Upload multiple bank statement files (CSV, XLSX, PDF)"
              />

              {selectedFiles.length > 0 && (
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text size="sm" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.1em" }}>Selected Files</Text>
                    <Button size="xs" variant="subtle" color="red" onClick={handleClearAll} radius="xl">Clear All</Button>
                  </Group>
                  <Grid gutter="xs">
                    {selectedFiles.map((file, index) => (
                      <Grid.Col key={index} span={{ base: 12, sm: 6, md: 4 }}>
                        <Paper p="xs" radius="md" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                            <Box style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(124, 58, 237, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <FileText size={18} color="#8b5cf6" />
                            </Box>
                            <Box style={{ flex: 1, minWidth: 0 }}>
                              <Text size="xs" fw={700} truncate>{file.name}</Text>
                              <Text size="xs" c="dimmed">{(file.size / 1024).toFixed(0)} KB</Text>
                            </Box>
                          </Group>
                          <ActionIcon size="sm" variant="subtle" color="red" onClick={() => handleRemoveFile(index)} radius="md">
                            ×
                          </ActionIcon>
                        </Paper>
                      </Grid.Col>
                    ))}
                  </Grid>
                </Stack>
              )}

              {selectedFiles.length > 1 && (
                <Paper
                  p="lg"
                  radius="xl"
                  style={{
                    background: "rgba(124, 58, 237, 0.05)",
                    border: "1px dashed rgba(124, 58, 237, 0.2)",
                    textAlign: "center"
                  }}
                >
                  <ThemeIcon variant="light" color="violet" size="xl" radius="md" mb="sm">
                    <Layers size={24} />
                  </ThemeIcon>
                  <Title order={4} mb={4}>Multi-file Intelligence</Title>
                  <Text size="sm" c="dimmed">
                    We'll analyze all files in parallel. You can selectively view, compare, and merge results in the dashboard.
                  </Text>
                </Paper>
              )}

              <Select
                label="File type"
                description="Auto-detected, but you can override"
                value={fileType}
                onChange={(value) => setFileType(value as "pdf" | "xls" | "xlsx" | "csv")}
                data={[
                  { value: "pdf", label: "PDF" },
                  { value: "xls", label: "Excel (XLS)" },
                  { value: "xlsx", label: "Excel (XLSX)" },
                  { value: "csv", label: "CSV" },
                ]}
              />

              <Group justify="space-between" wrap="wrap" gap="sm">
                <Text size="sm" c="dimmed">
                  Processing happens in memory.
                </Text>
                <Button onClick={handleProcessFile} disabled={isProcessing || selectedFiles.length === 0} loading={isProcessing} radius="xl">
                  {isProcessing ? "Processing..." : "Process file"}
                </Button>
              </Group>
            </Stack>
          </Stack>
        </Paper>

        {error && (
          <Paper
            data-anim="block"
            radius="lg"
            p="md"
            style={{ background: "rgba(255,0,0,0.08)", border: "1px solid rgba(255,0,0,0.4)", boxShadow: "0 8px 24px rgba(255,0,0,0.15)" }}
          >
            <Text fw={600} mb={4}>
              Error
            </Text>
            <Text c="dimmed" style={{ lineHeight: 1.6 }}>
              {error}
            </Text>
          </Paper>
        )}

        {processingStage && (
          <Paper
            data-anim="block"
            radius="lg"
            p="xl"
            style={{
              background: processingStage === 'complete' ? "rgba(34,197,94,0.08)" : "rgba(124,58,237,0.08)",
              border: processingStage === 'complete' ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(124,58,237,0.4)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              textAlign: "center"
            }}
          >
            <Stack gap="md" align="center">
              {processingStage === 'parsing' && (
                <>
                  <Box style={{ fontSize: 48 }}>📄</Box>
                  <Text size="lg" fw={700}>Parsing your statement...</Text>
                  <Text size="sm" c="dimmed">Extracting transactions and metadata</Text>
                </>
              )}
              {processingStage === 'analyzing' && (
                <>
                  <Box style={{ fontSize: 48 }}>🔍</Box>
                  <Text size="lg" fw={700}>Analyzing transactions...</Text>
                  <Text size="sm" c="dimmed">Computing insights, detecting fees, and categorizing spending</Text>
                </>
              )}
              {processingStage === 'complete' && (
                <>
                  <Box style={{ fontSize: 48 }}>✅</Box>
                  <Text size="lg" fw={700} c="green">Analysis Complete!</Text>
                  <Text size="sm" c="dimmed">Redirecting to results...</Text>
                </>
              )}
            </Stack>
          </Paper>
        )}

      </Stack>
    </Box>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <AnalyzeContent />
    </RequireAuth>
  );
}
