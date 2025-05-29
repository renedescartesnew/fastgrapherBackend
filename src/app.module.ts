
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URI');
        
        if (!uri) {
          console.warn('⚠️  MONGO_URI not provided. Database features will be disabled.');
          // Return a mock configuration that won't actually connect
          return {
            uri: 'mongodb://localhost:27017/mock',
            connectionFactory: () => {
              console.log('Mock MongoDB connection - no actual database');
              return null;
            },
          };
        }
        
        console.log('Connecting to MongoDB:', uri?.replace(/\/\/.*@/, '//***:***@'));
        return {
          uri,
          dbName: 'fastgrapher',
          retryWrites: true,
          retryReads: true,
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        };
      },
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Calculate the correct templates path
        const templatesPath = join(__dirname, '..', 'src', 'templates');
        console.log('Email templates path:', templatesPath);
        
        const mailHost = configService.get('MAIL_HOST');
        const mailUser = configService.get('MAIL_USER');
        const mailPass = configService.get('MAIL_PASS');
        
        // If email credentials are not configured, use a dummy configuration
        if (!mailHost || !mailUser || !mailPass) {
          console.warn('⚠️  Email configuration is incomplete. Email sending will be disabled.');
          return {
            transport: {
              streamTransport: true,
              newline: 'unix',
              buffer: true,
            },
            defaults: {
              from: 'noreply@fastgrapher.com',
            },
            template: {
              dir: templatesPath,
              adapter: new HandlebarsAdapter(),
              options: {
                strict: true,
              },
            },
            options: {
              partials: {
                dir: templatesPath,
                options: {
                  strict: true,
                },
              },
            },
            preview: false,
            verifyTransporter: false, // Disable transporter verification
          };
        }
        
        return {
          transport: {
            host: mailHost,
            port: configService.get('MAIL_PORT'),
            secure: configService.get('MAIL_SECURE') === 'true',
            auth: {
              user: mailUser,
              pass: mailPass,
            },
          },
          defaults: {
            from: configService.get('MAIL_FROM'),
          },
          template: {
            dir: templatesPath,
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
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
