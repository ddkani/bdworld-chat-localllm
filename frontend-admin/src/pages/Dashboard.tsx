import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'RAG 문서 관리',
      description: 'RAG 시스템에 문서를 추가하고 관리합니다.',
      action: () => navigate('/rag'),
      stats: '0개 문서',
    },
    {
      title: '프롬프트 템플릿',
      description: '시스템 프롬프트와 예제를 관리합니다.',
      action: () => navigate('/prompts'),
      stats: '0개 템플릿',
    },
    {
      title: '모델 관리',
      description: 'LLM 모델을 다운로드하고 관리합니다.',
      action: () => navigate('/models'),
      stats: '모델 없음',
    },
    {
      title: 'Fine-tuning',
      description: '모델을 커스텀 데이터로 학습시킵니다.',
      action: () => navigate('/finetuning'),
      stats: '0개 작업',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        대시보드
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        LLM 시스템 관리 대시보드에 오신 것을 환영합니다.
      </Typography>
      
      <Grid container spacing={3}>
        {cards.map((card, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {card.description}
                </Typography>
                <Typography variant="h5" color="primary">
                  {card.stats}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={card.action}>
                  관리하기
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box mt={4}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            시스템 정보
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                백엔드 URL: http://localhost:8000
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                모델 경로: models/
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;