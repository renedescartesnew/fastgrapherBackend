
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  try {
    console.log('=== Starting FastGrapher Backend ===');
    console.log('Node.js version:', process.version);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Port:', process.env.PORT);
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log(`Creating uploads directory: ${uploadsDir}`);
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    console.log('Creating NestJS application...');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
      bufferLogs: true,
    });
    
    // Enable CORS for frontend
    app.enableCors({
      origin: true, // Allow all origins for now
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
    
    // Use the PORT environment variable provided by Cloud Run
    const port = parseInt(process.env.PORT || '8080', 10);
    
    console.log(`Starting server on port ${port}...`);
    await app.listen(port, '0.0.0.0');
    
    console.log(`✅ Application is running on port ${port}`);
    console.log(`✅ Health check available at: http://0.0.0.0:${port}/api/health`);
    console.log('=== Server Started Successfully ===');
  } catch (error) {
    console.error('=== FATAL ERROR: Failed to start server ===');
    console.error('Error:', error);
    process.exit(1);
  }
}

bootstrap();
