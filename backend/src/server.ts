import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/authRoutes';
import categoryRoutes from './routes/categoryRoutes';
import complaintRoutes from './routes/complaintRoutes';
import noticeRoutes from './routes/noticeRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { errorHandler } from './middleware/errorHandler';
import { startNotificationWorker } from './services/notificationWorker';
import { startNoticeExpiryScheduler } from './services/noticeExpiryScheduler';

dotenv.config();

export const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(uploadDir)));

app.use('/auth', authRoutes);
app.use('/categories', categoryRoutes);
app.use('/complaints', complaintRoutes);
app.use('/notices', noticeRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/notifications', notificationRoutes);

app.get('/', (_req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'ORQEN Society Operations Gateway API',
    version: '1.0.0',
    portal: 'https://orqenthetracker.vercel.app',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  startNotificationWorker(30000);
  startNoticeExpiryScheduler();

  app.listen(port, () => {
    console.log(`ORQEN Backend listening on port ${port}`);
  });
}
