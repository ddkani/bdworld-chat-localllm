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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  CheckCircle as ActiveIcon,
} from '@mui/icons-material';
import { promptService } from '../services/api';
import { PromptTemplate } from '../types';

const PromptTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    system_prompt: '',
    examples: [] as Array<{ input: string; output: string }>,
    is_active: true,
  });

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await promptService.list();
      setTemplates(data);
      setError(null);
    } catch (err) {
      setError('템플릿 목록을 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleOpenDialog = (template?: PromptTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        system_prompt: template.system_prompt,
        examples: template.examples || [],
        is_active: template.is_active,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        system_prompt: '',
        examples: [],
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        await promptService.update(editingTemplate.id, formData);
      } else {
        await promptService.create(formData);
      }
      handleCloseDialog();
      loadTemplates();
    } catch (err) {
      setError('템플릿 저장에 실패했습니다.');
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('정말로 이 템플릿을 삭제하시겠습니까?')) {
      try {
        await promptService.delete(id);
        loadTemplates();
      } catch (err) {
        setError('템플릿 삭제에 실패했습니다.');
        console.error(err);
      }
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await promptService.activate(id);
      loadTemplates();
    } catch (err) {
      setError('템플릿 활성화에 실패했습니다.');
      console.error(err);
    }
  };

  const handleAddExample = () => {
    setFormData({
      ...formData,
      examples: [...formData.examples, { input: '', output: '' }],
    });
  };

  const handleExampleChange = (index: number, field: 'input' | 'output', value: string) => {
    const newExamples = [...formData.examples];
    newExamples[index][field] = value;
    setFormData({ ...formData, examples: newExamples });
  };

  const handleRemoveExample = (index: number) => {
    const newExamples = formData.examples.filter((_, i) => i !== index);
    setFormData({ ...formData, examples: newExamples });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        프롬프트 템플릿
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          새 템플릿 추가
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>이름</TableCell>
              <TableCell>시스템 프롬프트</TableCell>
              <TableCell>예제 수</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>수정일</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  등록된 템플릿이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>{template.name}</TableCell>
                  <TableCell>
                    {template.system_prompt.length > 50
                      ? template.system_prompt.substring(0, 50) + '...'
                      : template.system_prompt}
                  </TableCell>
                  <TableCell>{template.examples?.length || 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={template.is_active ? '활성' : '비활성'}
                      color={template.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(template.updated_at).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell align="center">
                    {!template.is_active && (
                      <IconButton
                        color="primary"
                        onClick={() => handleActivate(template.id)}
                        title="활성화"
                      >
                        <ActiveIcon />
                      </IconButton>
                    )}
                    <IconButton
                      onClick={() => handleOpenDialog(template)}
                      title="수정"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(template.id)}
                      title="삭제"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Template Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingTemplate ? '템플릿 수정' : '새 템플릿 추가'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="템플릿 이름"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="시스템 프롬프트"
            fullWidth
            multiline
            rows={4}
            value={formData.system_prompt}
            onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              예제 (Few-shot learning)
            </Typography>
            <Button size="small" onClick={handleAddExample}>
              예제 추가
            </Button>
          </Box>

          {formData.examples.map((example, index) => (
            <Paper key={index} sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2">예제 {index + 1}</Typography>
                <IconButton
                  size="small"
                  onClick={() => handleRemoveExample(index)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
              <TextField
                fullWidth
                label="입력"
                value={example.input}
                onChange={(e) => handleExampleChange(index, 'input', e.target.value)}
                sx={{ mb: 1 }}
              />
              <TextField
                fullWidth
                label="출력"
                value={example.output}
                onChange={(e) => handleExampleChange(index, 'output', e.target.value)}
              />
            </Paper>
          ))}

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography>활성 상태</Typography>
            <Switch
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button onClick={handleSave} variant="contained">
            {editingTemplate ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PromptTemplates;