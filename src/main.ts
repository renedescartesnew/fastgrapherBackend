
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // Ensure templates directory exists
  const templatesDir = path.join(__dirname, '..', 'src', 'templates');
  if (!fs.existsSync(templatesDir)) {
    console.log(`Creating templates directory: ${templatesDir}`);
    fs.mkdirSync(templatesDir, { recursive: true });
  }

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log(`Creating uploads directory: ${uploadsDir}`);
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend - updated to allow multiple origins
  app.enableCors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:8080', 'https://francemed-df379.web.app'],
    credentials: true,
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Use cookie parser
  app.use(cookieParser());
  
  // Global prefix for all routes
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`Database: ${process.env.MONGO_URI ? 'Connected' : 'Not configured'}`);
  console.log(`Uploads directory: ${uploadsDir}`);
}
bootstrap().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
