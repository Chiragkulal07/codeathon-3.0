import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import inviteRoutes from './routes/inviteRoutes.js';
import linkRoutes from './routes/linkRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use('/api', linkRoutes);
app.use('/api', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api', trackingRoutes);
app.use('/api', fileRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/invites', inviteRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;