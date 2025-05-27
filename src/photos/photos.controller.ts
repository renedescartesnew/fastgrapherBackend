import {
  Controller,
  Get,
  Param,
  Delete,
  UseGuards,
  Logger,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { PhotosService } from './photos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/schemas/user.schema';
import * as path from 'path';
import * as fs from 'fs';

@Controller('photos')
export class PhotosController {
  private readonly logger = new Logger(PhotosController.name);

  constructor(private readonly photosService: PhotosService) {}

  @UseGuards(JwtAuthGuard)
  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string, @CurrentUser() user: User) {
    this.logger.log(`Finding photos for project: ${projectId}`);
    try {
      const photos = await this.photosService.findByProject(projectId);
      return photos;
    } catch (error) {
      this.logger.error(`Error finding photos for project ${projectId}:`, error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('project/:projectId/closed-eyes')
  async findClosedEyesByProject(@Param('projectId') projectId: string, @CurrentUser() user: User) {
    this.logger.log(`Finding closed-eyes photos for project: ${projectId}`);
    try {
      const photos = await this.photosService.findClosedEyesByProject(projectId);
      return photos;
    } catch (error) {
      this.logger.error(`Error finding closed-eyes photos for project ${projectId}:`, error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('project/:projectId/not-looking-at-camera')
  async findNotLookingAtCameraByProject(@Param('projectId') projectId: string, @CurrentUser() user: User) {
    this.logger.log(`Finding not-looking-at-camera photos for project: ${projectId}`);
    try {
      const photos = await this.photosService.findNotLookingAtCameraByProject(projectId);
      return photos;
    } catch (error) {
      this.logger.error(`Error finding not-looking-at-camera photos for project ${projectId}:`, error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('project/:projectId/groups')
  async findGroupsByProject(@Param('projectId') projectId: string, @CurrentUser() user: User) {
    this.logger.log(`Finding group photos for project: ${projectId}`);
    try {
      const groups = await this.photosService.findGroupPhotosByProject(projectId);
      return groups;
    } catch (error) {
      this.logger.error(`Error finding group photos for project ${projectId}:`, error);
      throw error;
    }
  }

  @Get('file/:filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const decodedFilename = decodeURIComponent(filename);
      this.logger.log(`=== SERVING FILE REQUEST (PUBLIC) ===`);
      this.logger.log(`Requested filename: ${decodedFilename}`);
      
      // First check if this is a database filename or filesystem filename
      const photo = await this.photosService.findByFilename(decodedFilename);
      
      if (!photo) {
        this.logger.error(`Photo not found in database: ${decodedFilename}`);
        throw new NotFoundException('Photo not found in database');
      }
      
      this.logger.log(`=== PHOTO FOUND IN DATABASE ===`);
      this.logger.log(`Database ID: ${photo._id}`);
      this.logger.log(`Stored filename: ${photo.filename}`);
      this.logger.log(`Stored path: ${photo.path}`);
      this.logger.log(`Original name: ${photo.originalname}`);
      
      // Use the stored filename (which should be the actual filesystem filename)
      const actualFilename = photo.filename;
      const filePath = path.join(process.cwd(), 'uploads', actualFilename);
      
      this.logger.log(`=== FILESYSTEM LOOKUP ===`);
      this.logger.log(`Looking for file at: ${filePath}`);
      this.logger.log(`File exists: ${fs.existsSync(filePath)}`);
      
      if (!fs.existsSync(filePath)) {
        // If the direct path doesn't work, try to find the file by pattern
        this.logger.log(`Direct file not found, searching uploads directory...`);
        const uploadsDir = path.join(process.cwd(), 'uploads');
        
        if (fs.existsSync(uploadsDir)) {
          const files = fs.readdirSync(uploadsDir);
          this.logger.log(`Files in uploads directory:`, files);
          
          // Try to find a file that contains the original name or matches the stored filename
          const matchingFile = files.find(file => 
            file === actualFilename || 
            file === photo.originalname ||
            file.includes(photo.originalname.split('.')[0])
          );
          
          if (matchingFile) {
            this.logger.log(`Found matching file: ${matchingFile}`);
            const matchingFilePath = path.join(uploadsDir, matchingFile);
            
            // Update the database with the correct filename
            await this.photosService.updateFilename(photo._id.toString(), matchingFile);
            
            return this.sendFile(res, matchingFilePath, matchingFile);
          }
        }
        
        this.logger.error(`File not found anywhere: ${decodedFilename}`);
        throw new NotFoundException('File not found on filesystem');
      }
      
      this.logger.log(`=== SERVING FILE SUCCESSFULLY ===`);
      return this.sendFile(res, filePath, actualFilename);
    } catch (error) {
      this.logger.error(`Error serving file ${filename}:`, error.message);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('File not found');
    }
  }

  private sendFile(res: Response, filePath: string, filename: string) {
    // Set proper headers based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg'; // default
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    
    this.logger.log(`Sending file: ${filePath} with content-type: ${contentType}`);
    
    // Send the file
    res.sendFile(filePath);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':photoId')
  async remove(@Param('photoId') photoId: string, @CurrentUser() user: User) {
    this.logger.log(`Deleting photo: ${photoId} by user: ${user.email}`);
    try {
      const result = await this.photosService.remove(photoId);
      return { success: true, message: 'Photo deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting photo ${photoId}:`, error);
      throw error;
    }
  }
}
