
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'FastGrapher Backend'
    };
  }

  @Get('health/database')
  async getDatabaseHealth() {
    try {
      console.log('=== DATABASE HEALTH CHECK ===');
      console.log('Connection state:', this.connection.readyState);
      console.log('Database name:', this.connection.name);
      console.log('Host:', this.connection.host);
      
      // Test database connection with a simple operation
      const adminDb = this.connection.db.admin();
      const result = await adminDb.ping();
      
      console.log('Database ping result:', result);
      
      return {
        status: 'ok',
        database: {
          connected: this.connection.readyState === 1,
          name: this.connection.name,
          host: this.connection.host,
          readyState: this.connection.readyState,
          ping: result
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      
      return {
        status: 'error',
        database: {
          connected: false,
          error: error.message,
          readyState: this.connection.readyState
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}
