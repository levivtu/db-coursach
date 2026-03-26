import fs from 'fs/promises';
import path from 'path';
import { db, disconnectDB } from '../db';

export async function migrateDb() {
  const migrationsDir = path.join(__dirname, '../migrations');
  const sqlFiles = await fs.readdir(migrationsDir);

  await db.connect();

  console.log({ migrationsDir, sqlFiles });

  for (const sqlFile of sqlFiles) {
    const migrationCode = await fs.readFile(path.join(migrationsDir, sqlFile));
    console.log({ migrationCode: migrationCode.toString() });
    await db.query(migrationCode.toString());
    console.log(`Migration "${sqlFile}" executed successfully.`);
  }

  await disconnectDB();
  process.exit(0);
}
