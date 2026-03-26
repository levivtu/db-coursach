import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { executeQueryWithLogging } from 'src/db';
import { ReserveCopyingService } from '../reserve-copying/reserve-copying.service';

@Injectable()
export class RemoteSqlService {
  constructor(private readonly reserveCopyingService: ReserveCopyingService) {}

  async runRemoteSql(req: Request) {
    const query = req.body.query;

    const result = await executeQueryWithLogging(query, [], true);

    return {
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map(field => field.name),
      command: result.command
    };
  }

  async runRemoteSqlWithBackup(req: Request) {
    await this.reserveCopyingService.createReserveCopy();
    
    const query = req.body.query;

    const result = await executeQueryWithLogging(query, [], true);

    return {
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map(field => field.name),
      command: result.command
    };
  }
}
