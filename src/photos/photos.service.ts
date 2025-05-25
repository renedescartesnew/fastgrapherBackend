
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Photo, PhotoDocument } from './schemas/photo.schema';
import { EyeDetectionService } from './eye-detection.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(
    @InjectModel(Photo.name) private photoModel: Model<PhotoDocument>,
    private eyeDetectionService: EyeDetectionService,
  ) {}

  async create(photoData: any, projectId: string, userId: string): Promise<PhotoDocument> {
    this.logger.log(`Creating photo for project ${projectId}`);
    
    try {
      // Check for closed eyes before saving
      const imagePath = path.join(process.cwd(), 'uploads', photoData.path);
      const hasClosedEyes = await this.eyeDetectionService.detectClosedEyes(imagePath);
      
      let finalPath = photoData.path;
      
      if (hasClosedEyes) {
        // Move to closed-eyes folder
        finalPath = await this.eyeDetectionService.moveToClosedEyesFolder(imagePath, photoData.path);
      }
      
      const newPhoto = new this.photoModel({
        ...photoData,
        path: finalPath,
        project: projectId,
        user: userId,
        hasClosedEyes: hasClosedEyes,
      });
      
      const savedPhoto = await newPhoto.save();
      this.logger.log(`Photo saved with ID: ${savedPhoto._id}, closed eyes: ${hasClosedEyes}`);
      
      return savedPhoto;
      
    } catch (error) {
      this.logger.error('Error creating photo with eye detection:', error);
      
      // Fallback: save without eye detection
      const newPhoto = new this.photoModel({
        ...photoData,
        project: projectId,
        user: userId,
        hasClosedEyes: false,
      });
      
      return newPhoto.save();
    }
  }

  async findByProject(projectId: string): Promise<PhotoDocument[]> {
    return this.photoModel.find({ project: projectId }).exec();
  }

  async findClosedEyesByProject(projectId: string): Promise<PhotoDocument[]> {
    return this.photoModel.find({ project: projectId, hasClosedEyes: true }).exec();
  }

  async remove(photoId: string): Promise<PhotoDocument> {
    const photo = await this.photoModel.findById(photoId).exec();
    
    if (photo) {
      // Delete the file from disk
      const filePath = path.join(process.cwd(), 'uploads', photo.path);
      try {
        fs.unlinkSync(filePath);
        this.logger.log(`Successfully deleted file: ${filePath}`);
      } catch (error) {
        this.logger.error(`Failed to delete file ${filePath}:`, error);
      }
      
      // Delete from database
      return this.photoModel.findByIdAndDelete(photoId).exec();
    }
    
    return null;
  }

  async removeByProject(projectId: string): Promise<void> {
    const photos = await this.findByProject(projectId);
    
    for (const photo of photos) {
      try {
        const filePath = path.join(process.cwd(), 'uploads', photo.path);
        fs.unlinkSync(filePath);
      } catch (error) {
        this.logger.error(`Failed to delete file ${photo.path}:`, error);
      }
    }
    
    await this.photoModel.deleteMany({ project: projectId }).exec();
  }
}
