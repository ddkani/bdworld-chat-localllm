import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  LinearProgress,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { modelService } from '../services/api';
import { ModelInfo } from '../types';

const ModelManagement: React.FC = () => {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadTaskId, setDownloadTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadModelInfo = async () => {
    try {
      setLoading(true);
      const info = await modelService.getInfo();
      setModelInfo(info);
      setError(null);
    } catch (err) {
      setError('모델 정보를 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModelInfo();
  }, []);

  useEffect(() => {
    if (downloadTaskId && downloading) {
      const interval = setInterval(async () => {
        try {
          const progress = await modelService.getDownloadProgress(downloadTaskId);
          setDownloadProgress(progress.progress);
          
          if (progress.status === 'completed') {
            setDownloading(false);
            setDownloadTaskId(null);
            setDownloadProgress(0);
            loadModelInfo();
          } else if (progress.status === 'failed') {
            setDownloading(false);
            setDownloadTaskId(null);
            setDownloadProgress(0);
            setError('모델 다운로드에 실패했습니다.');
          }
        } catch (err) {
          console.error('Progress check failed:', err);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [downloadTaskId, downloading]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError(null);
      const { task_id } = await modelService.download();
      setDownloadTaskId(task_id);
    } catch (err) {
      setError('모델 다운로드를 시작하는데 실패했습니다.');
      setDownloading(false);
      console.error(err);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '알 수 없음';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        모델 관리
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  모델 정보
                </Typography>
                {modelInfo && (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      모델 경로: {modelInfo.model_path}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={2}>
                      {modelInfo.exists ? (
                        <>
                          <CheckIcon color="success" sx={{ mr: 1 }} />
                          <Typography color="success.main">
                            모델이 설치되어 있습니다
                          </Typography>
                        </>
                      ) : (
                        <>
                          <ErrorIcon color="error" sx={{ mr: 1 }} />
                          <Typography color="error.main">
                            모델이 설치되어 있지 않습니다
                          </Typography>
                        </>
                      )}
                    </Box>
                    {modelInfo.exists && modelInfo.size && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        파일 크기: {formatFileSize(modelInfo.size)}
                      </Typography>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  모델 다운로드
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Mistral 7B Instruct v0.2 (Q4_K_M quantized)
                </Typography>
                
                {downloading ? (
                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={downloadProgress}
                      sx={{ mb: 2 }}
                    />
                    <Typography variant="body2" align="center">
                      다운로드 중... {downloadProgress}%
                    </Typography>
                  </Box>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownload}
                    disabled={modelInfo?.exists || loading}
                    fullWidth
                  >
                    모델 다운로드
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          모델 사양
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              모델명
            </Typography>
            <Typography variant="body1" gutterBottom>
              Mistral 7B Instruct v0.2
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              양자화
            </Typography>
            <Typography variant="body1" gutterBottom>
              Q4_K_M (4-bit quantization)
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              컨텍스트 길이
            </Typography>
            <Typography variant="body1" gutterBottom>
              4,096 토큰
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              권장 메모리
            </Typography>
            <Typography variant="body1" gutterBottom>
              8GB RAM 이상
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ModelManagement;