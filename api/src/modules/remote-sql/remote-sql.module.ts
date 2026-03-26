import { Module } from '@nestjs/common';
import { RemoteSqlService } from './remote-sql.service';
import { RemoteSqlController } from './remote-sql.controller';
import { ReserveCopyingModule } from '../reserve-copying/reserve-copying.module';

@Module({
  imports: [ReserveCopyingModule],
  providers: [RemoteSqlService],
  controllers: [RemoteSqlController],
  exports: [RemoteSqlService],
})
export class RemoteSqlModule {}
