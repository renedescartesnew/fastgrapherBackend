
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
        const mongoUri = configService.get<string>('MONGO_URI') || 
          'mongodb+srv://renedescartesnew:FHUwCVuj5y6SL8nW@breakroomcupcluster.uudts.mongodb.net/?retryWrites=true&w=majority&appName=breakRoomCupCluster';
        
        console.log('=== MONGODB CONNECTION SETUP ===');
        console.log('MONGO_URI from env:', configService.get<string>('MONGO_URI') ? 'SET' : 'NOT SET');
        console.log('Using MONGO_URI:', mongoUri.replace(/:[^@]+@/, ':***@')); // Hide password in logs
        
        return {
          uri: mongoUri,
          retryWrites: true,
          w: 'majority',
          appName: 'breakRoomCupCluster',
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          bufferCommands: false,
          bufferMaxEntries: 0,
        };
      },
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Calculate the correct templates path
        const templatesPath = join(__dirname, 'templates');
        console.log('Email templates path:', templatesPath);
        
        return {
          transport: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
              user: 'your-email@gmail.com',
              pass: 'your-app-password',
            },
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
          preview: false,
          verifyTransporter: false,
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
