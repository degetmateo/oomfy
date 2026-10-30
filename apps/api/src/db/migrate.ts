import { PostgresMigrationRunner } from '../infrastructure/database/postgres/PostgresMigrationRunner.js';
import { MongoMigrationRunner } from '../infrastructure/database/mongo/MongoMigrationRunner.js';
import { PostgresPool } from '../infrastructure/database/postgres/PostgresPool.js';
import { MongoDatabase } from '../infrastructure/database/mongo/MongoDatabase.js';

async function migrate() {
  console.log('🚀 Iniciando proceso de migraciones para Oomfy...');
  try {
    await PostgresMigrationRunner.run();
    await MongoMigrationRunner.run();
    console.log('✅ Todas las migraciones fueron ejecutadas correctamente.');
  } catch (error) {
    console.error('❌ Error fatal durante la ejecución de migraciones:', error);
    process.exit(1);
  } finally {
    await PostgresPool.close();
    await MongoDatabase.close();
    process.exit(0);
  }
}

migrate();

