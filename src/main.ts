
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
    console.log('Working directory:', process.cwd());
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log(`Creating uploads directory: ${uploadsDir}`);
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    console.log('Creating NestJS application...');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug'],
      bufferLogs: true,
    });
    
    // Enable CORS with updated backend URL
    console.log('Configuring CORS...');
    app.enableCors({
      origin: (origin, callback) => {
        console.log('CORS request from origin:', origin);
        
        const allowedOrigins = [
          'http://localhost:8080',
          'http://localhost:5173',
          'http://localhost:3000',
          'https://francemed-df379.web.app',
          'https://www.fastgrapher.com',
          'https://fastgrapher.com',
          'https://backend-fastgrapher-service-741083673218.us-central1.run.app'
        ];
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          console.log('CORS: Allowing request with no origin');
          return callback(null, true);
        }
        
        // Allow any localhost origin (covers different IP addresses and ports)
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/)) {
          console.log(`CORS: Allowing localhost/local network origin: ${origin}`);
          return callback(null, true);
        }
        
        if (allowedOrigins.includes(origin)) {
          console.log(`CORS: Allowing origin: ${origin}`);
          return callback(null, true);
        }
        
        // Log unauthorized origin attempts
        console.warn(`CORS: Blocking origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'), false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With', 
        'Accept', 
        'Origin',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Methods'
      ],
      exposedHeaders: ['Authorization'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
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
    
    // Use the PORT environment variable provided by Cloud Run, default to 8080
    const port = parseInt(process.env.PORT || '8080', 10);
    
    console.log(`Starting server on port ${port}...`);
    console.log('Allowed CORS origins:', [
      'http://localhost:8080',
      'http://localhost:5173', 
      'http://localhost:3000',
      'https://francemed-df379.web.app',
      'https://www.fastgrapher.com',
      'https://fastgrapher.com',
      'https://backend-fastgrapher-service-741083673218.us-central1.run.app',
      'Any localhost or 192.168.x.x origin'
    ]);
    
    // IMPORTANT: Listen on 0.0.0.0 for Cloud Run compatibility
    await app.listen(port, '0.0.0.0');
    
    console.log(`✅ Application is running on http://0.0.0.0:${port}`);
    console.log(`✅ Health check available at: http://0.0.0.0:${port}/api/health`);
    console.log('✅ API routes available at: http://0.0.0.0:${port}/api/*');
    console.log('=== Server Started Successfully ===');
    
    // Test basic functionality
    console.log('Testing server response...');
    
  } catch (error) {
    console.error('=== FATAL ERROR: Failed to start server ===');
    console.error('Error:', error);
    console.error('Stack trace:', error.stack);
    console.error('Environment variables:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      MONGO_URI: process.env.MONGO_URI ? 'SET' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
    });
    process.exit(1);
  }
}

bootstrap();
