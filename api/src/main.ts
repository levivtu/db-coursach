import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { connectDB } from './db';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  await connectDB();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
