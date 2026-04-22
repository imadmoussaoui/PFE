import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB, disconnectDB } from './db';
import authRoutes from './routes/auth';
import annonceRoutes from './routes/annonces';
import reviewRoutes from './routes/reviews';

// Load environment variables
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || '15mb';

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Logger
app.use(express.json({ limit: requestBodyLimit })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: requestBodyLimit })); // Parse URL-encoded bodies

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/annonces', annonceRoutes);
app.use('/api/reviews', reviewRoutes);

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.send('Server is running!');
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if ((err as Error & { type?: string }).type === 'entity.too.large') {
    return res.status(413).json({
      message: 'Les images sont trop volumineuses. Reduisez leur taille ou leur nombre, puis reessayez.',
    });
  }

  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });

    const gracefulShutdown = async () => {
      console.log('Shutdown signal received: closing HTTP server');
      server.close(async () => {
        await disconnectDB();
        console.log('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
