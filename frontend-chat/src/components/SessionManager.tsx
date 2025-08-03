import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Typography,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { sessionService } from '../services/api';
import { ChatSession } from '../types';

interface SessionManagerProps {
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string | null) => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({
  currentSessionId,
  onSessionSelect,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [editingSession, setEditingSession] = useState<ChatSession | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await sessionService.list();
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleCreateSession = async () => {
    if (!newSessionTitle.trim()) return;

    try {
      const newSession = await sessionService.create(newSessionTitle.trim());
      setSessions([newSession, ...sessions]);
      setCreateDialogOpen(false);
      setNewSessionTitle('');
      onSessionSelect(newSession.id.toString());
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleUpdateSession = async () => {
    if (!editingSession || !editTitle.trim()) return;

    try {
      const updated = await sessionService.update(editingSession.id, {
        title: editTitle.trim(),
      });
      setSessions(sessions.map(s => s.id === updated.id ? updated : s));
      setEditDialogOpen(false);
      setEditingSession(null);
      setEditTitle('');
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (window.confirm('이 세션을 삭제하시겠습니까?')) {
      try {
        await sessionService.delete(sessionId);
        setSessions(sessions.filter(s => s.id !== sessionId));
        if (currentSessionId === sessionId.toString()) {
          onSessionSelect(null);
        }
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  const openEditDialog = (session: ChatSession) => {
    setEditingSession(session);
    setEditTitle(session.title);
    setEditDialogOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ height: '100%', overflow: 'auto' }}>
      <Box p={2}>
        <Typography variant="h6" gutterBottom>
          채팅 세션
        </Typography>
        
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{ mb: 2 }}
        >
          새 채팅
        </Button>
        
        <Divider />
        
        <List>
          {sessions.map((session) => (
            <ListItem
              key={session.id}
              disablePadding
            >
              <ListItemButton 
                onClick={() => {
                  console.log('SessionManager: Selecting session:', session.id);
                  onSessionSelect(session.id.toString());
                }}
                selected={currentSessionId === session.id.toString()}
              >
                <ListItemText
                  primary={session.title}
                  secondary={`${session.message_count}개의 메시지`}
                />
              </ListItemButton>
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => openEditDialog(session)}
                  sx={{ mr: 1 }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => handleDeleteSession(session.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
        
        {sessions.length === 0 && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            아직 채팅 세션이 없습니다. 새로 만들어 시작하세요!
          </Typography>
        )}
      </Box>

      {/* Create Session Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>새 채팅 세션 만들기</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="세션 제목"
            fullWidth
            variant="outlined"
            value={newSessionTitle}
            onChange={(e) => setNewSessionTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateSession();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>취소</Button>
          <Button onClick={handleCreateSession} variant="contained">
            만들기
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>세션 제목 수정</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="세션 제목"
            fullWidth
            variant="outlined"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleUpdateSession();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>취소</Button>
          <Button onClick={handleUpdateSession} variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default SessionManager;