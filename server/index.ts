import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import smsRoutes from './routes/sms';
import paymentRoutes from './routes/payment';
import authRoutes from './routes/auth';
import hardwareRoutes from './routes/hardware';
import configRoutes from './routes/config';
import usedRoutes from './routes/used';
import settingsRoutes from './routes/settings';
import recycleRouter from './routes/recycle';

import { connectDB } from './db';

// 加载环境变量
dotenv.config();

// 连接数据库
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// 静态文件服务 (生产环境)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// API 路由
app.use('/api/sms', smsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', hardwareRoutes);
app.use('/api/configs', configRoutes);
app.use('/api/used', usedRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/recycle', recycleRouter);

// 健康检查
app.get('/api/health', (_req: express.Request, res: express.Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 所有非 API 请求返回 index.html (支持客户端路由)
app.get('*', (req: express.Request, res: express.Response) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not Found' });
    res.sendFile(path.join(distPath, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📂 Serving static files from: ${distPath}`);
});

