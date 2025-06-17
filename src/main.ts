
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    
    // Enable CORS with more permissive settings
    app.enableCors({
      origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080', 'https://id-preview--14c7fd51-7c95-478e-91be-63f3152c2810.lovable.app', 'https://francemed-df379.web.app', 'https://www.fastgrapher.com', 'https://fastgrapher.com'],
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
    
    console.log('=== SERVER STARTING ===');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Port:', process.env.PORT || 4000);
    console.log('MongoDB URI configured:', !!process.env.MONGO_URI);
    console.log('JWT Secret configured:', !!process.env.JWT_SECRET);
    console.log('CORS origins configured');
    console.log('Global API prefix: /api');
    console.log('Target database: fastgrapher');
    console.log('Target collection: users');
    
    const port = process.env.PORT || 4000;
    await app.listen(port, '0.0.0.0'); // Listen on all interfaces
    
    console.log(`Server is running on port ${port}`);
    console.log(`Health check available at: http://localhost:${port}/api/health`);
    console.log(`Auth endpoints available at: http://localhost:${port}/api/auth/*`);
    console.log('Server is ready to accept connections');
    
  } catch (error) {
    console.error('=== SERVER STARTUP FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

bootstrap();
