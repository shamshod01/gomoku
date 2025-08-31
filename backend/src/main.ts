import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DatabaseConfig } from './config/database.config';

async function bootstrap() {
  console.log(DatabaseConfig);
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe());
  
  await app.listen(3001);
  console.log('Gomoku Backend is running on port 3001');
}
bootstrap();
