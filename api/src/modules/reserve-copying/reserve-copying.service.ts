import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { connectDB, dbConfig, disconnectDB } from 'src/db';
import { flushDb } from 'src/utils/flush-db';
import * as fs from 'fs/promises';
import { mkdir } from 'fs/promises';
import os from 'os';

const execAsync = promisify(exec);
const { user, password, database, host, port } = dbConfig;

@Injectable()
export class ReserveCopyingService {
  private readonly reserveCopyDir = './db-reserve-copies';

  constructor() {
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists() {
    try {
      await mkdir(this.reserveCopyDir, { recursive: true });
    } catch (error) {
      console.error('Error ensuring directory exists:', error);
    }
  }

  async createReserveCopy(filename?: string) {
    try {
      await this.ensureDirectoryExists();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dumpFilename = filename || `dump-${timestamp}.sql`;
      const dumpPath = path.join(this.reserveCopyDir, dumpFilename);

      const platform = os.platform();
      let pgDumpCmd: string;
      let execOptions: any = {};
      
      if (platform === 'win32') {
        pgDumpCmd = `pg_dump -h ${host} -p ${port} -U ${user} -d ${database}`;
        execOptions = { env: { ...process.env, PGPASSWORD: password as string } };
      } else {
        pgDumpCmd = `PGPASSWORD='${password as string}' pg_dump -h ${host} -p ${port} -U ${user} -d ${database}`;
      }

      const { stdout } = await execAsync(pgDumpCmd, execOptions);
      await fs.writeFile(dumpPath, stdout);

      return {
        success: true,
        filename: dumpFilename,
        message: 'Database dump created successfully',
      };
    } catch (error) {
      console.error('Error creating reserve copy:', error);
      throw new Error(`Failed to create reserve copy: ${error.message}`);
    }
  }

  async getReserveCopies() {
    try {
      const files = await fs.readdir(this.reserveCopyDir);
      const sqlFiles = files.filter(file => file.endsWith('.sql'));
      
      const fileInfoPromises = sqlFiles.map(async (filename) => {
        const filePath = path.join(this.reserveCopyDir, filename);
        const stats = await fs.stat(filePath);
        
        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtime,
          updatedAt: stats.mtime,
        };
      });
      
      const fileInfos = await Promise.all(fileInfoPromises);
      return fileInfos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting reserve copies:', error);
      return [];
    }
  }

  async loadReserveCopy(filename: string) {
    try {
      await disconnectDB();
      await flushDb(false);

      console.log("flushed");

      const dumpPath = path.join(this.reserveCopyDir, filename);
      
      await fs.access(dumpPath);

      const platform = os.platform();
      let psqlCmd: string;
      let execOptions: any = {};
      
      if (platform === 'win32') {
        psqlCmd = `psql -h ${host} -p ${port} -U ${user} -d ${database} -f "${dumpPath}"`;
        execOptions = { env: { ...process.env, PGPASSWORD: password as string } };
      } else {
        psqlCmd = `PGPASSWORD='${password as string}' psql -h ${host} -p ${port} -U ${user} -d ${database} -f "${dumpPath}"`;
      }

      console.log("before cmd");
      await execAsync(psqlCmd, execOptions);
      console.log("after cmd");

      await connectDB();

      return {
        success: true,
        message: 'Database restored successfully',
      };
    } catch (error) {
      console.error('Error loading reserve copy:', error);
      throw new Error(`Failed to restore from reserve copy: ${error.message}`);
    }
  }

  async deleteReserveCopy(filename: string) {
    try {
      const dumpPath = path.join(this.reserveCopyDir, filename);
      
      await fs.access(dumpPath);
      await fs.unlink(dumpPath);

      return {
        success: true,
        message: 'Reserve copy deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting reserve copy:', error);
      throw new Error(`Failed to delete reserve copy: ${error.message}`);
    }
  }
}