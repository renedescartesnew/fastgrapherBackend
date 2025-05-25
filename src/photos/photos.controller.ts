
import { Controller, Get, Param, Delete, UseGuards, Logger, Res, NotFoundException } from '@nestjs/common';
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
    this.logger.log(`Finding photos for project: ${projectId} by user: ${user.email}`);
    
    const photos = await this.photosService.findByProject(projectId);
    
    // Transform photos to include the correct filename field
    const transformedPhotos = photos.map(photo => ({
      _id: photo._id,
      filename: photo.path,
      originalname: photo.originalname,
      mimetype: photo.mimetype,
      projectId: photo.project,
      hasClosedEyes: photo.hasClosedEyes || false,
      createdAt: photo.createdAt instanceof Date ? photo.createdAt : new Date(),
    }));
    
    this.logger.log(`Found ${transformedPhotos.length} photos for project ${projectId}`);
    return transformedPhotos;
  }

  @UseGuards(JwtAuthGuard)
  @Get('project/:projectId/closed-eyes')
  async findClosedEyesByProject(@Param('projectId') projectId: string, @CurrentUser() user: User) {
    this.logger.log(`Finding closed-eye photos for project: ${projectId} by user: ${user.email}`);
    
    const photos = await this.photosService.findClosedEyesByProject(projectId);
    
    // Transform photos to include the correct filename field
    const transformedPhotos = photos.map(photo => ({
      _id: photo._id,
      filename: photo.path,
      originalname: photo.originalname,
      mimetype: photo.mimetype,
      projectId: photo.project,
      hasClosedEyes: photo.hasClosedEyes || false,
      createdAt: photo.createdAt instanceof Date ? photo.createdAt : new Date(),
    }));
    
    this.logger.log(`Found ${transformedPhotos.length} closed-eye photos for project ${projectId}`);
    return transformedPhotos;
  }

  @Get('file/:filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    try {
      // Handle both regular and closed-eyes folder paths
      let filePath: string;
      if (filename.startsWith('closed-eyes/')) {
        filePath = path.join(process.cwd(), 'uploads', filename);
      } else {
        filePath = path.join(process.cwd(), 'uploads', filename);
      }
      
      this.logger.log(`Serving file: ${filename}, Path: ${filePath}`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        this.logger.error(`File not found: ${filePath}`);
        throw new NotFoundException('File not found');
      }
      
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
        case '.svg':
          contentType = 'image/svg+xml';
          break;
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      
      // Send the file
      res.sendFile(filePath);
    } catch (error) {
      this.logger.error(`Error serving file ${filename}: ${error.message}`);
      throw new NotFoundException('File not found');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':photoId')
  async remove(@Param('photoId') photoId: string, @CurrentUser() user: User) {
    this.logger.log(`Deleting photo: ${photoId} by user: ${user.email}`);
    
    const deletedPhoto = await this.photosService.remove(photoId);
    
    if (!deletedPhoto) {
      this.logger.error(`Photo ${photoId} not found`);
      throw new Error('Photo not found');
    }
    
    this.logger.log(`Successfully deleted photo: ${photoId}`);
    return { success: true };
  }
}
