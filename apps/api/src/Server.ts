import express, { Express } from 'express';
import http, { Server as HttpServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Environment } from './config/Environment.js';
import apiRouter from './routes/index.js';
import { ErrorHandler } from './middlewares/ErrorHandler.js';
import { SocketGateway } from './socket/SocketGateway.js';

export class Server {
  public readonly app: Express;
  public readonly httpServer: HttpServer;
  private readonly port: number;

  constructor(port: number = Environment.PORT) {
    this.port = port;
    this.app = express();
    this.httpServer = http.createServer(this.app);

    this.configureMiddlewares();
    this.configureRoutes();
    this.configureErrorHandling();
    SocketGateway.initialize(this.httpServer);
  }

  private configureMiddlewares(): void {
    this.app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || Environment.ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.onrender.com') || origin.endsWith('.oomfy.online')) {
            callback(null, true);
          } else {
            callback(null, true);
          }
        },
        credentials: true,
      })
    );
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(cookieParser());
  }

  private configureRoutes(): void {
    this.app.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    this.app.use('/api', apiRouter);
  }

  private configureErrorHandling(): void {
    this.app.use(ErrorHandler.handle);
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        console.log(`🟩 Servidor Oomfy API escuchando en el puerto: ${this.port}`);
        resolve();
      });
    });
  }
}

