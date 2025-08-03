import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
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
  Chip,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { ragService } from '../services/api';
import { RAGDocument } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const RAGManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [searchResults, setSearchResults] = useState<RAGDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocMetadata, setNewDocMetadata] = useState('{}');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTopK, setSearchTopK] = useState(5);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await ragService.listDocuments();
      setDocuments(data);
      setError(null);
    } catch (err) {
      setError('문서 목록을 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleAddDocument = async () => {
    try {
      let metadata = {};
      if (newDocMetadata.trim()) {
        try {
          metadata = JSON.parse(newDocMetadata);
        } catch {
          setError('메타데이터는 유효한 JSON 형식이어야 합니다.');
          return;
        }
      }

      await ragService.addDocument(newDocContent, metadata);
      setAddDialogOpen(false);
      setNewDocContent('');
      setNewDocMetadata('{}');
      loadDocuments();
    } catch (err) {
      setError('문서 추가에 실패했습니다.');
      console.error(err);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    if (window.confirm('정말로 이 문서를 삭제하시겠습니까?')) {
      try {
        await ragService.deleteDocument(id);
        loadDocuments();
      } catch (err) {
        setError('문서 삭제에 실패했습니다.');
        console.error(err);
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const results = await ragService.searchSimilar(searchQuery, searchTopK);
      setSearchResults(results);
      setError(null);
    } catch (err) {
      setError('검색에 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        RAG 문서 관리
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="문서 목록" />
          <Tab label="유사도 검색" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            문서 추가
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>내용</TableCell>
                <TableCell>메타데이터</TableCell>
                <TableCell>생성일</TableCell>
                <TableCell align="center">작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    등록된 문서가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.id}</TableCell>
                    <TableCell>
                      {doc.content.length > 100
                        ? doc.content.substring(0, 100) + '...'
                        : doc.content}
                    </TableCell>
                    <TableCell>
                      {Object.keys(doc.metadata).length > 0 && (
                        <Chip
                          label={`${Object.keys(doc.metadata).length}개 속성`}
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(doc.created_at).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteDocument(doc.id)}
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
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            유사도 검색
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="검색 쿼리"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <TextField
              label="결과 수"
              type="number"
              value={searchTopK}
              onChange={(e) => setSearchTopK(parseInt(e.target.value) || 5)}
              sx={{ width: 120 }}
            />
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
            >
              검색
            </Button>
          </Box>
        </Paper>

        {searchResults.length > 0 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>유사도</TableCell>
                  <TableCell>내용</TableCell>
                  <TableCell>메타데이터</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchResults.map((doc, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Chip
                        label={`${(doc.similarity! * 100).toFixed(1)}%`}
                        color={doc.similarity! > 0.8 ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{doc.content}</TableCell>
                    <TableCell>
                      {Object.keys(doc.metadata).length > 0 && (
                        <pre style={{ fontSize: '0.8em' }}>
                          {JSON.stringify(doc.metadata, null, 2)}
                        </pre>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Add Document Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>새 문서 추가</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="문서 내용"
            fullWidth
            multiline
            rows={6}
            value={newDocContent}
            onChange={(e) => setNewDocContent(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="메타데이터 (JSON)"
            fullWidth
            multiline
            rows={3}
            value={newDocMetadata}
            onChange={(e) => setNewDocMetadata(e.target.value)}
            helperText="선택사항: JSON 형식으로 메타데이터를 입력하세요"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>취소</Button>
          <Button onClick={handleAddDocument} variant="contained">
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RAGManagement;