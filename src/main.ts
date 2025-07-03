
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    
    // Enable CORS with your frontend URLs
    app.enableCors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          'http://localhost:5173', 
          'http://localhost:3000', 
          'http://localhost:8080', 
          'https://id-preview--14c7fd51-7c95-478e-91be-63f3152c2810.lovable.app',
          'https://francemed-df379.web.app', 
          'https://www.fastgrapher.com', 
          'https://fastgrapher.com',
        ];
        
        console.log('CORS Request from origin:', origin);
        
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) {
          console.log('No origin - allowing request');
          return callback(null, true);
        }
        
        if (allowedOrigins.includes(origin)) {
          console.log('Origin allowed:', origin);
          return callback(null, true);
        } else {
          console.log('Origin NOT allowed:', origin);
          return callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      optionsSuccessStatus: 200,
    });
    
    // Add global API prefix
    app.setGlobalPrefix('api');
    
    // Enable validation pipes
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    console.log('=== FASTGRAPHER SERVER STARTING ===');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Port:', process.env.PORT || 4000);
    console.log('Host:', process.env.HOST || '0.0.0.0');
    console.log('MongoDB URI configured:', !!process.env.MONGO_URI);
    console.log('JWT Secret configured:', !!process.env.JWT_SECRET);
    console.log('CORS origins configured for production');
    console.log('Global API prefix: /api');
    console.log('Target database: fastgrapher');
    
    const port = process.env.PORT || 4000;
    const host = process.env.HOST || '0.0.0.0';
    await app.listen(port, host);
    
    console.log(`🚀 FastGrapher Backend is running on http://${host}:${port}`);
    console.log(`📋 Health check: http://${host}:${port}/api/health`);
    console.log(`🔐 Auth endpoints: http://${host}:${port}/api/auth/*`);
    console.log('✅ Server is ready to accept connections');
    
  } catch (error) {
    console.error('=== SERVER STARTUP FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

bootstrap();
