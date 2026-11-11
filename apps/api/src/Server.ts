import http from 'http';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { CSP_DIRECTIVES } from '@oomfy/shared';
import { Environment } from './config/Environment.js';
import { corsOriginHandler } from './config/CorsPolicy.js';
import { SecurityHeaders } from './middlewares/SecurityHeaders.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/ErrorHandler.js';
import { SocketGateway } from './socket/SocketGateway.js';

export class Server {
  public app: Express;
  public httpServer: http.Server;
  private port: number;

  constructor(port?: number) {
    this.port = port || Environment.PORT;
    this.app = express();
    this.app.set('trust proxy', 1);
    this.app.disable('x-powered-by');
    this.httpServer = http.createServer(this.app);

    this.configureMiddlewares();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddlewares(): void {
    this.app.use(
      helmet({
        hsts: { maxAge: 31536000, includeSubDomains: true },
        frameguard: { action: 'sameorigin' },
        contentSecurityPolicy: { directives: CSP_DIRECTIVES },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        xXssProtection: false,
      })
    );
    this.app.use(SecurityHeaders.apply);
    this.app.use(cors({ origin: corsOriginHandler, credentials: true }));
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    this.app.use(cookieParser());
  }

  private configureRoutes(): void {
    this.app.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    this.app.use('/', apiRouter);
    this.app.use('/api', apiRouter);
  }

  private configureErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    Environment.assertProductionSecrets();
    SocketGateway.initialize(this.httpServer);
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        console.log(`🚀 Servidor Oomfy corriendo en el puerto ${this.port} (${Environment.NODE_ENV})`);
        resolve();
      });
    });
  }
}
