import { Controller, Get, Inject, Post, Req } from '@nestjs/common';
import { RemoteSqlService } from './remote-sql.service';
import type { Request } from 'express';

@Controller('remote-sql')
export class RemoteSqlController {
  constructor(private readonly remoteSqlService: RemoteSqlService) {}

  @Post('query')
  runRemoteSql(@Req() req: Request) {
    return this.remoteSqlService.runRemoteSql(req);
  }

  @Post('query-with-backup')
  runRemoteSqlWithBackup(@Req() req: Request) {
    return this.remoteSqlService.runRemoteSqlWithBackup(req);
  }
}
