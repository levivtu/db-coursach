import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../auth/auth.module';
import { AuthorsModule } from '../authors/authors.module';
import { BooksModule } from '../books/books.module';
import { PublishersModule } from '../publishers/publishers.module';
import { CartsModule } from '../carts/carts.module';
import { GenresModule } from '../genres/genres.module';
import { OrdersModule } from '../orders/orders.module';
import { ReturnsModule } from '../returns/returns.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { RemoteSqlModule } from '../remote-sql/remote-sql.module';
import { ReserveCopyingModule } from '../reserve-copying/reserve-copying.module';

@Module({
  imports: [
    AuthModule,
    AuthorsModule,
    BooksModule,
    PublishersModule,
    CartsModule,
    GenresModule,
    OrdersModule,
    ReturnsModule,
    StatisticsModule,
    RemoteSqlModule,
    ReserveCopyingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
