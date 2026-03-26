import { Client, ClientConfig, Pool, PoolConfig } from 'pg';

export const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
  database: process.env.DB_NAME || 'book-shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 100,
} as ClientConfig | PoolConfig;

export let maintenanceDb = new Client({
  ...dbConfig,
  database: 'postgres',
});

export let db = new Client(dbConfig);
export let pool = new Pool(dbConfig);

export async function connectDB(): Promise<void> {
  try {
    db = new Client(dbConfig);
    await db.connect();
    console.log('Connected to the database successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await db.end();
    console.log('Disconnected from the database');
  } catch (error) {
    console.error('Database disconnection error:', error);
    throw error;
  }
}

export async function executeQueryWithLogging(
  queryText: string,
  params: unknown[] = [],
  isRollbackable: boolean = false,
): Promise<any> {
  pool = new Pool(dbConfig);
  const connection = await pool.connect();

  try {
    if (isRollbackable) {
      await connection.query('begin');
    }

    const result = await connection.query(queryText, params);

    await connection.query(
      'insert into query_logs (is_successful, query_text) values ($1, $2)',
      [true, queryText],
    );

    if (isRollbackable) {
      await connection.query('commit');
    }

    console.log('Query executed and logged successfully');

    return result;
  } catch (error) {
    if (isRollbackable) {
      await connection.query('rollback');
    }

    try {
      await connection.query(
        'insert into query_logs (is_successful, query_text) values ($1, $2)',
        [false, queryText],
      );
    } catch (logError) {
      console.error('Failed to log query error:', logError);
    }

    console.error('Query execution error:', error);
    throw error;
  } finally {
    connection.release();
    pool.end();
  }
}
