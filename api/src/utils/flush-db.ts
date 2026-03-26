import { Client } from 'pg';
import { dbConfig } from '../db';


export async function flushDb(exit: boolean = true) {
  let maintenanceDb = new Client({
    ...dbConfig,
    database: 'postgres',
  });

  await maintenanceDb.connect();
  
  const dropConnectionsQuery = `
    select pg_terminate_backend(pid) 
    from pg_stat_activity 
    where datname = '${dbConfig.database}'
  `;

  const dropQuery = `
    drop database if exists "${dbConfig.database}"
  `;

  const createQuery = `
    create database "${dbConfig.database}"
  `;

  await maintenanceDb.query(dropConnectionsQuery);
  await maintenanceDb.query(dropQuery);
  await maintenanceDb.query(createQuery);

  console.log(`Database "${dbConfig.database}" flushed successfully.`);

  await maintenanceDb.end();

  if (!exit) {
    return;
  }

  process.exit(0);
}
