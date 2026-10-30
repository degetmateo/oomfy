import { Server } from './Server.js';
import { MongoDatabase } from './infrastructure/database/mongo/MongoDatabase.js';
import { MongoMigrationRunner } from './infrastructure/database/mongo/MongoMigrationRunner.js';
import { PostgresPool } from './infrastructure/database/postgres/PostgresPool.js';

async function bootstrap() {
  try {
    console.log('🟨 Conectando a servicios de almacenamiento...');
    await MongoDatabase.connect();
    await MongoMigrationRunner.run();
    await PostgresPool.getInstance().query('SELECT 1');
    console.log('🟩 Conectado a PostgreSQL.');

    const server = new Server();
    await server.start();
  } catch (error) {
    console.error('🟥 Error durante el arranque del servidor:', error);
    process.exit(1);
  }
}

bootstrap();

