import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  LinearProgress,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Upload as UploadIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { finetuningService } from '../services/api';
import { TrainingJob } from '../types';

const FineTuning: React.FC = () => {
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadedDataset, setUploadedDataset] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    base_model: 'mistral-7b-instruct-v0.2',
    dataset_path: '',
    config: {
      epochs: 3,
      batch_size: 4,
      learning_rate: 0.0001,
      gradient_accumulation_steps: 4,
    },
  });

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await finetuningService.listJobs();
      setJobs(data);
      setError(null);
    } catch (err) {
      setError('학습 작업 목록을 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 5000); // 5초마다 상태 업데이트
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await finetuningService.uploadDataset(file);
      setUploadedDataset(result.path);
      setFormData({ ...formData, dataset_path: result.path });
      setError(null);
    } catch (err) {
      setError('데이터셋 업로드에 실패했습니다.');
      console.error(err);
    }
  };

  const handleCreateJob = async () => {
    try {
      await finetuningService.createJob(formData);
      setDialogOpen(false);
      loadJobs();
      // Reset form
      setFormData({
        name: '',
        base_model: 'mistral-7b-instruct-v0.2',
        dataset_path: '',
        config: {
          epochs: 3,
          batch_size: 4,
          learning_rate: 0.0001,
          gradient_accumulation_steps: 4,
        },
      });
      setUploadedDataset(null);
    } catch (err) {
      setError('학습 작업 생성에 실패했습니다.');
      console.error(err);
    }
  };

  const handleCancelJob = async (id: number) => {
    if (window.confirm('정말로 이 학습을 취소하시겠습니까?')) {
      try {
        await finetuningService.cancelJob(id);
        loadJobs();
      } catch (err) {
        setError('학습 취소에 실패했습니다.');
        console.error(err);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'primary';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기중';
      case 'running':
        return '진행중';
      case 'completed':
        return '완료';
      case 'failed':
        return '실패';
      default:
        return status;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Fine-tuning
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          새 학습 작업
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadJobs}
        >
          새로고침
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>작업명</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>기본 모델</TableCell>
              <TableCell>데이터셋</TableCell>
              <TableCell>설정</TableCell>
              <TableCell>생성일</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  진행중인 학습 작업이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(job.status)}
                      color={getStatusColor(job.status) as any}
                      size="small"
                    />
                    {job.status === 'running' && (
                      <LinearProgress sx={{ mt: 1 }} />
                    )}
                  </TableCell>
                  <TableCell>{job.base_model}</TableCell>
                  <TableCell>
                    {job.dataset_path.split('/').pop()}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      Epochs: {job.config.epochs}, Batch: {job.config.batch_size}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(job.created_at).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell align="center">
                    {job.status === 'running' && (
                      <IconButton
                        color="error"
                        onClick={() => handleCancelJob(job.id)}
                        title="취소"
                      >
                        <CancelIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Job Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>새 Fine-tuning 작업</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="작업명"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>기본 모델</InputLabel>
            <Select
              value={formData.base_model}
              label="기본 모델"
              onChange={(e) => setFormData({ ...formData, base_model: e.target.value })}
            >
              <MenuItem value="mistral-7b-instruct-v0.2">
                Mistral 7B Instruct v0.2
              </MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              fullWidth
            >
              데이터셋 업로드 (JSONL 형식)
              <input
                type="file"
                hidden
                accept=".jsonl"
                onChange={handleFileUpload}
              />
            </Button>
            {uploadedDataset && (
              <Typography variant="caption" color="success.main" sx={{ mt: 1 }}>
                업로드 완료: {uploadedDataset.split('/').pop()}
              </Typography>
            )}
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            학습 설정
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                type="number"
                label="Epochs"
                fullWidth
                value={formData.config.epochs}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, epochs: parseInt(e.target.value) || 3 },
                  })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                type="number"
                label="Batch Size"
                fullWidth
                value={formData.config.batch_size}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, batch_size: parseInt(e.target.value) || 4 },
                  })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                type="number"
                label="Learning Rate"
                fullWidth
                value={formData.config.learning_rate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, learning_rate: parseFloat(e.target.value) || 0.0001 },
                  })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                type="number"
                label="Gradient Steps"
                fullWidth
                value={formData.config.gradient_accumulation_steps}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      gradient_accumulation_steps: parseInt(e.target.value) || 4,
                    },
                  })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>취소</Button>
          <Button
            onClick={handleCreateJob}
            variant="contained"
            disabled={!formData.name || !uploadedDataset}
          >
            학습 시작
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FineTuning;