import { Module } from '@nestjs/common';
import { ReserveCopyingService } from './reserve-copying.service';
import { ReserveCopyingController } from './reserve-copying.controller';

@Module({
  providers: [ReserveCopyingService],
  exports: [ReserveCopyingService],
  controllers: [ReserveCopyingController],
})
export class ReserveCopyingModule {}
