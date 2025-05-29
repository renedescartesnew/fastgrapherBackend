
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
    console.log('Available environment variables:', {
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      MONGO_URI: process.env.MONGO_URI ? 'Set' : 'Not set',
    });
    
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
    
    console.log('Creating NestJS application...');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
      bufferLogs: true,
    });
    
    // Enable CORS for frontend
    app.enableCors({
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173', 
        'http://localhost:8080', 
        'https://francemed-df379.web.app'
      ],
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
    console.log(`✅ Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log(`✅ Database: ${process.env.MONGO_URI ? 'Connected' : 'Not configured'}`);
    console.log(`✅ Uploads directory: ${uploadsDir}`);
    console.log('=== Server Started Successfully ===');
  } catch (error) {
    console.error('=== FATAL ERROR: Failed to start server ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    
    // In production, we want to exit gracefully
    console.log('Exiting process due to startup failure...');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

bootstrap().catch(error => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});
