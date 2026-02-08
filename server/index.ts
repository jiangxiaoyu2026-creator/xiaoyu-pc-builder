import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import smsRoutes from './routes/sms';
import paymentRoutes from './routes/payment';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// API 路由
app.use('/api/sms', smsRoutes);
app.use('/api/payment', paymentRoutes);

// 健康检查
app.get('/api/health', (_req: express.Request, res: express.Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 SMS API available at http://localhost:${PORT}/api/sms`);
    console.log(`💳 Payment API available at http://localhost:${PORT}/api/payment`);
});

