
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PhotosService } from './photos.service';
import { PhotosController } from './photos.controller';
import { EyeDetectionService } from './eye-detection.service';
import { Photo, PhotoSchema } from './schemas/photo.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Photo.name, schema: PhotoSchema }]),
  ],
  controllers: [PhotosController],
  providers: [PhotosService, EyeDetectionService],
  exports: [PhotosService],
})
export class PhotosModule {}
