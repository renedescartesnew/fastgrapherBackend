
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    console.log('Root endpoint hit');
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    console.log('Health check endpoint hit');
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || '8080',
      memory: process.memoryUsage(),
      cors: 'enabled',
      message: 'FastGrapher backend is running'
    };
    console.log('Health check data:', healthData);
    return healthData;
  }
}
