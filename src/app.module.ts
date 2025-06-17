
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { PhotosModule } from './photos/photos.module';
import { existsSync } from 'fs';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const baseUri = configService.get<string>('MONGO_URI') || 
          'mongodb+srv://renedescartesnew:FHUwCVuj5y6SL8nW@breakroomcupcluster.uudts.mongodb.net';
        
        // Clean the URI and ensure it points to fastgrapher database
        let mongoUri = baseUri;
        
        // Remove any existing database name from the URI
        if (mongoUri.includes('?')) {
          const [uriPart, queryPart] = mongoUri.split('?');
          const uriWithoutDb = uriPart.split('/').slice(0, -1).join('/');
          mongoUri = `${uriWithoutDb}/fastgrapher?${queryPart}`;
        } else {
          // If no query parameters, just ensure we have the fastgrapher database
          const uriWithoutDb = mongoUri.split('/').slice(0, -1).join('/');
          mongoUri = `${uriWithoutDb}/fastgrapher`;
        }
        
        console.log('=== MONGODB CONNECTION SETUP ===');
        console.log('Base URI configured');
        console.log('Final URI configured for fastgrapher database');
        console.log('Database name: fastgrapher');
        
        return {
          uri: mongoUri,
          dbName: 'fastgrapher',
          serverSelectionTimeoutMS: 30000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
          minPoolSize: 5,
          connectTimeoutMS: 30000,
        };
      },
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Determine correct template path
        const isDevelopment = process.env.NODE_ENV !== 'production';
        let templatesPath: string;
        
        if (isDevelopment) {
          // In development, templates are in src/templates
          const srcTemplatesPath = join(process.cwd(), 'src', 'templates');
          const distTemplatesPath = join(__dirname, '..', 'templates');
          
          // Check if src/templates exists first
          if (existsSync(srcTemplatesPath)) {
            templatesPath = srcTemplatesPath;
          } else if (existsSync(distTemplatesPath)) {
            templatesPath = distTemplatesPath;
          } else {
            // Fallback to relative from current directory
            templatesPath = join(__dirname, '..', '..', 'src', 'templates');
          }
        } else {
          // In production, templates should be in dist
          templatesPath = join(__dirname, 'templates');
        }
        
        console.log('=== EMAIL CONFIGURATION ===');
        console.log('Environment:', process.env.NODE_ENV);
        console.log('Current __dirname:', __dirname);
        console.log('Process CWD:', process.cwd());
        console.log('Templates path:', templatesPath);
        console.log('Templates directory exists:', existsSync(templatesPath));
        
        const emailHost = configService.get<string>('MAIL_HOST') || 'smtp.gmail.com';
        const emailUser = configService.get<string>('MAIL_USER') || 'noreply@fastgrapher.com';
        const emailPassword = configService.get<string>('MAIL_PASSWORD') || 'dummy-password';
        
        console.log('Email configuration:');
        console.log('- Host:', emailHost);
        console.log('- User:', emailUser);
        console.log('- Password configured:', !!emailPassword);
        
        return {
          transport: {
            host: emailHost,
            port: 587,
            secure: false,
            auth: {
              user: emailUser,
              pass: emailPassword,
            },
            pool: true,
            maxConnections: 1,
            rateDelta: 20000,
            rateLimit: 5,
          },
          defaults: {
            from: configService.get<string>('MAIL_FROM') || 'noreply@fastgrapher.com',
          },
          template: {
            dir: templatesPath,
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
          preview: false,
          verifyTransporter: false, // Disable verification to prevent startup issues
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ProjectsModule,
    PhotosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
