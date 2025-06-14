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

  async generatePhotoFilename(projectName: string, projectId: string, originalExtension: string): Promise<string> {
    const uploadDate = new Date().toISOString().split('T')[0];
    const existingPhotosCount = await this.photoModel.countDocuments({ project: projectId });
    const cleanProjectName = projectName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const filename = `${cleanProjectName}-${uploadDate}-${existingPhotosCount}${originalExtension}`;
    
    this.logger.log(`Generated filename: ${filename} for project: ${projectName}`);
    return filename;
  }

  async create(photoData: any, projectId: string, userId: string, projectName: string): Promise<PhotoDocument> {
    this.logger.log(`=== PHOTO SERVICE CREATE STARTED ===`);
    this.logger.log(`Project ID: ${projectId}`);
    this.logger.log(`Project Name: ${projectName}`);
    this.logger.log(`User ID: ${userId}`);
    this.logger.log(`Photo data received:`, {
      originalname: photoData.originalname,
      mimetype: photoData.mimetype,
      size: photoData.size,
      multerFilename: photoData.filename
    });
    
    try {
      const originalExtension = path.extname(photoData.originalname);
      this.logger.log(`Original file extension: ${originalExtension}`);
      
      const newFilename = await this.generatePhotoFilename(projectName, projectId, originalExtension);
      this.logger.log(`Generated new filename: ${newFilename}`);
      
      const currentFilePath = path.join(process.cwd(), 'uploads', photoData.filename);
      const newFilePath = path.join(process.cwd(), 'uploads', newFilename);
      
      this.logger.log(`=== FILE SYSTEM OPERATIONS ===`);
      this.logger.log(`Current path: ${currentFilePath}`);
      this.logger.log(`New path: ${newFilePath}`);
      this.logger.log(`Current working directory: ${process.cwd()}`);
      
      // Check if uploads directory exists
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        this.logger.error(`Uploads directory does not exist: ${uploadsDir}`);
        throw new Error('Uploads directory not found');
      } else {
        this.logger.log(`Uploads directory exists: ${uploadsDir}`);
      }
      
      // Verify the current file exists
      if (!fs.existsSync(currentFilePath)) {
        this.logger.error(`Original uploaded file not found at: ${currentFilePath}`);
        
        // List files in uploads directory for debugging
        try {
          const files = fs.readdirSync(uploadsDir);
          this.logger.log(`Files in uploads directory:`, files);
        } catch (err) {
          this.logger.error(`Cannot read uploads directory:`, err);
        }
        
        throw new Error('Uploaded file not found');
      } else {
        this.logger.log(`Original file found at: ${currentFilePath}`);
        
        // Get file stats
        const stats = fs.statSync(currentFilePath);
        this.logger.log(`File stats:`, {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isFile: stats.isFile()
        });
      }
      
      // Rename the file to the new naming convention
      fs.renameSync(currentFilePath, newFilePath);
      this.logger.log(`✓ File successfully renamed from ${currentFilePath} to ${newFilePath}`);
      
      // Verify the renamed file exists
      if (!fs.existsSync(newFilePath)) {
        this.logger.error(`Renamed file not found at: ${newFilePath}`);
        throw new Error('File rename failed');
      } else {
        this.logger.log(`✓ Renamed file verified at: ${newFilePath}`);
      }
      
      let hasPersonWithBothEyesClosed = false;
      let hasPersonNotLookingAtCamera = false;
      let isGroupPhoto = false;
      let isBlurry = false;
      let blurScore = 0;
      
      try {
        if (photoData.mimetype && photoData.mimetype.startsWith('image/')) {
          this.logger.log(`Starting AI detection on: ${newFilePath}`);
          
          hasPersonWithBothEyesClosed = await this.eyeDetectionService.detectClosedEyes(newFilePath);
          this.logger.log(`Eye detection result: ${hasPersonWithBothEyesClosed ? 'closed eyes detected' : 'no closed eyes'}`);
          
          hasPersonNotLookingAtCamera = await this.eyeDetectionService.detectNotLookingAtCamera(newFilePath);
          this.logger.log(`Gaze detection result: ${hasPersonNotLookingAtCamera ? 'not looking at camera' : 'looking at camera'}`);
          
          isGroupPhoto = await this.eyeDetectionService.detectGroupPhoto(newFilePath);
          this.logger.log(`Group photo detection result: ${isGroupPhoto ? 'group photo' : 'individual photo'}`);
          
          const blurResult = await this.eyeDetectionService.detectBlur(newFilePath);
          isBlurry = blurResult.isBlurry;
          blurScore = blurResult.blurScore;
          this.logger.log(`Blur detection result: ${isBlurry ? 'blurry' : 'sharp'} (score: ${blurScore})`);
        } else {
          this.logger.log(`Skipping AI detection for non-image file: ${photoData.mimetype}`);
        }
      } catch (detectionError) {
        this.logger.warn(`AI detection failed for ${photoData.originalname}:`, detectionError.message);
      }
      
      const newPhoto = new this.photoModel({
        filename: newFilename,
        originalname: photoData.originalname,
        path: newFilename,
        mimetype: photoData.mimetype,
        size: photoData.size || 0,
        project: projectId,
        user: userId,
        hasClosedEyes: hasPersonWithBothEyesClosed,
        notLookingAtCamera: hasPersonNotLookingAtCamera,
        isGroupPhoto: isGroupPhoto,
        isBlurry: isBlurry,
        blurScore: blurScore,
        createdAt: photoData.createdAt || new Date(),
      });
      
      const savedPhoto = await newPhoto.save();
      this.logger.log(`=== PHOTO SAVED TO DATABASE ===`);
      this.logger.log(`Database ID: ${savedPhoto._id}`);
      this.logger.log(`Stored filename: ${savedPhoto.filename}`);
      this.logger.log(`Stored path: ${savedPhoto.path}`);
      this.logger.log(`Original name: ${savedPhoto.originalname}`);
      this.logger.log(`File exists at: ${fs.existsSync(newFilePath) ? 'YES' : 'NO'}`);
      
      return savedPhoto;
      
    } catch (error) {
      this.logger.error('=== PHOTO SERVICE CREATE ERROR ===', error);
      throw error;
    }
  }

  async findByProject(projectId: string): Promise<PhotoDocument[]> {
    return this.photoModel.find({ project: projectId }).sort({ createdAt: -1 }).exec();
  }

  async findByFilename(filename: string): Promise<PhotoDocument | null> {
    let photo = await this.photoModel.findOne({ filename: filename }).exec();
    
    if (!photo) {
      photo = await this.photoModel.findOne({ originalname: filename }).exec();
    }
    
    if (!photo) {
      photo = await this.photoModel.findOne({ 
        $or: [
          { filename: { $regex: filename.split('.')[0], $options: 'i' } },
          { originalname: { $regex: filename.split('.')[0], $options: 'i' } }
        ]
      }).exec();
    }
    
    return photo;
  }

  async updateFilename(photoId: string, newFilename: string): Promise<void> {
    await this.photoModel.findByIdAndUpdate(photoId, { 
      filename: newFilename,
      path: newFilename 
    }).exec();
    this.logger.log(`Updated photo ${photoId} filename to: ${newFilename}`);
  }

  async findClosedEyesByProject(projectId: string): Promise<PhotoDocument[]> {
    return this.photoModel.find({ project: projectId, hasClosedEyes: true }).sort({ createdAt: -1 }).exec();
  }

  async findNotLookingAtCameraByProject(projectId: string): Promise<PhotoDocument[]> {
    return this.photoModel.find({ project: projectId, notLookingAtCamera: true }).sort({ createdAt: -1 }).exec();
  }

  async findOpenEyesByProject(projectId: string): Promise<PhotoDocument[]> {
    return this.photoModel.find({ project: projectId, hasClosedEyes: { $ne: true } }).sort({ createdAt: -1 }).exec();
  }

  async findGroupPhotosByProject(projectId: string): Promise<PhotoDocument[]> {
    return this.photoModel.find({ project: projectId, isGroupPhoto: true }).sort({ createdAt: -1 }).exec();
  }

  async findBlurryByProject(projectId: string): Promise<PhotoDocument[]> {
    return this.photoModel.find({ project: projectId, isBlurry: true }).sort({ createdAt: -1 }).exec();
  }

  async remove(photoId: string): Promise<PhotoDocument> {
    const photo = await this.photoModel.findById(photoId).exec();
    
    if (photo) {
      const filePath = path.join(process.cwd(), 'uploads', photo.filename);
      
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          this.logger.log(`Successfully deleted file: ${filePath}`);
        }
      } catch (error) {
        this.logger.error(`Failed to delete file ${filePath}:`, error);
      }
      
      return this.photoModel.findByIdAndDelete(photoId).exec();
    }
    
    return null;
  }

  async removeByProject(projectId: string): Promise<void> {
    const photos = await this.findByProject(projectId);
    
    for (const photo of photos) {
      const filePath = path.join(process.cwd(), 'uploads', photo.filename);
      
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        this.logger.error(`Failed to delete file ${filePath}:`, error);
      }
    }
    
    await this.photoModel.deleteMany({ project: projectId }).exec();
  }
}
