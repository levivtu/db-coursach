import { Controller, Get, Post, Delete, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ReserveCopyingService } from './reserve-copying.service';

@Controller('reserve-copying')
export class ReserveCopyingController {
  constructor(private readonly reserveCopyingService: ReserveCopyingService) {}

  @Get('list')
  async getReserveCopies() {
    return this.reserveCopyingService.getReserveCopies();
  }

  @Post('create-dump')
  async createManualDump() {
    return this.reserveCopyingService.createReserveCopy();
  }

  @Post('restore/:filename')
  @HttpCode(HttpStatus.OK)
  async restoreFromDump(@Param('filename') filename: string) {
    return this.reserveCopyingService.loadReserveCopy(filename);
  }

  @Delete(':filename')
  async deleteReserveCopy(@Param('filename') filename: string) {
    return this.reserveCopyingService.deleteReserveCopy(filename);
  }
}