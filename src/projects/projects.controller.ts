import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/schemas/user.schema';
import * as path from 'path';
import * as fs from 'fs';

@Controller('projects')
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(private readonly projectsService: ProjectsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createProjectDto: CreateProjectDto, @CurrentUser() user: User) {
    this.logger.log(`Creating project for user: ${user.email}, User ID: ${user._id}`);
    const userId = user._id.toString();
    return this.projectsService.create(createProjectDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@CurrentUser() user: User) {
    this.logger.log(`Finding all projects for user: ${user.email}, User ID: ${user._id}`);
    const userId = user._id.toString();
    return this.projectsService.findAll(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    this.logger.log(`Finding project: ${id} for user: ${user.email}, User ID: ${user._id}`);
    
    try {
      const userId = user._id.toString();
      const project = await this.projectsService.findOne(id, userId);
      return project;
    } catch (error) {
      this.logger.error(`Error finding project ${id} for user ${user._id}: ${error.message}`);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: User,
  ) {
    const userId = user._id.toString();
    return this.projectsService.update(id, updateProjectDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    const userId = user._id.toString();
    return this.projectsService.remove(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`=== PHOTO UPLOAD CONTROLLER START ===`);
    this.logger.log(`Project ID: ${id}`);
    this.logger.log(`User: ${user.email} (ID: ${user._id})`);
    
    if (!file) {
      this.logger.error('No file provided in upload request');
      throw new BadRequestException('No file provided');
    }
    
    this.logger.log(`=== MULTER FILE DETAILS ===`);
    this.logger.log(`Filename: ${file.filename}`);
    this.logger.log(`Original name: ${file.originalname}`);
    this.logger.log(`Mimetype: ${file.mimetype}`);
    this.logger.log(`Size: ${file.size} bytes`);
    this.logger.log(`Path: ${file.path}`);
    this.logger.log(`Destination: ${file.destination}`);
    this.logger.log(`Field name: ${file.fieldname}`);
    this.logger.log(`Encoding: ${file.encoding}`);
    
    // Verify file was actually saved
    const fullPath = path.join(file.destination || 'uploads', file.filename);
    this.logger.log(`=== FILE SYSTEM VERIFICATION ===`);
    this.logger.log(`Expected file path: ${fullPath}`);
    this.logger.log(`File exists: ${fs.existsSync(fullPath)}`);
    
    if (!fs.existsSync(fullPath)) {
      this.logger.error(`Uploaded file not found at: ${fullPath}`);
      
      // List files in uploads directory for debugging
      try {
        const uploadsDir = file.destination || 'uploads';
        const files = fs.readdirSync(uploadsDir);
        this.logger.log(`Files in uploads directory (${uploadsDir}):`, files);
      } catch (err) {
        this.logger.error(`Cannot read uploads directory:`, err);
      }
      
      throw new BadRequestException('File upload failed - file not saved');
    }
    
    // Get file stats for additional verification
    try {
      const stats = fs.statSync(fullPath);
      this.logger.log(`File stats:`, {
        size: stats.size,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        isFile: stats.isFile()
      });
    } catch (err) {
      this.logger.error(`Cannot get file stats:`, err);
    }
    
    this.logger.log(`✓ File successfully saved and verified at: ${fullPath}`);
    
    // Get project details to pass project name for filename generation
    const userId = user._id.toString();
    let project;
    
    try {
      project = await this.projectsService.findOne(id, userId);
    } catch (error) {
      this.logger.error(`Failed to find project ${id} for user ${userId}:`, error);
      throw new NotFoundException('Project not found');
    }
    
    if (!project) {
      this.logger.error(`Project ${id} not found for user ${userId}`);
      throw new NotFoundException('Project not found');
    }
    
    this.logger.log(`=== PROJECT DETAILS ===`);
    this.logger.log(`Project name: ${project.name}`);
    this.logger.log(`Project type: ${project.type}`);
    this.logger.log(`Project ID: ${project._id || project.id}`);
    
    const photoData = {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      createdAt: new Date(),
    };
    
    this.logger.log(`=== PHOTO DATA TO PROCESS ===`, photoData);
    
    try {
      this.logger.log(`Calling projectsService.addPhoto...`);
      const updatedProject = await this.projectsService.addPhoto(id, photoData, userId, project.name);
      
      this.logger.log(`=== PHOTO UPLOAD SUCCESS ===`);
      this.logger.log(`Project now has ${updatedProject.photos?.length || 0} photos`);
      
      const lastPhoto = updatedProject.photos?.[updatedProject.photos.length - 1];
      this.logger.log(`Last uploaded photo:`, {
        id: lastPhoto?._id,
        filename: lastPhoto?.filename,
        originalname: lastPhoto?.originalname,
        size: lastPhoto?.size
      });
      
      return {
        success: true,
        message: 'Photo uploaded successfully',
        photo: {
          filename: lastPhoto?.filename || file.filename,
          originalname: file.originalname,
          size: file.size,
          id: lastPhoto?._id
        }
      };
    } catch (error) {
      this.logger.error(`=== PHOTO UPLOAD SERVICE ERROR ===`, error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/photos/:photoId')
  removePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: User,
  ) {
    const userId = user._id.toString();
    return this.projectsService.removePhoto(id, photoId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('uploads/:filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response, @CurrentUser() user: User) {
    try {
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      this.logger.log(`=== SERVING FILE ===`);
      this.logger.log(`Filename: ${filename}`);
      this.logger.log(`User: ${user.email}`);
      this.logger.log(`File path: ${filePath}`);
      this.logger.log(`File exists: ${fs.existsSync(filePath)}`);
      
      if (!fs.existsSync(filePath)) {
        this.logger.error(`File not found: ${filePath}`);
        
        // List files in uploads directory for debugging
        try {
          const uploadsDir = path.join(process.cwd(), 'uploads');
          const files = fs.readdirSync(uploadsDir);
          this.logger.log(`Files in uploads directory:`, files);
        } catch (err) {
          this.logger.error(`Cannot read uploads directory:`, err);
        }
        
        throw new NotFoundException('File not found');
      }
      
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'image/jpeg';
      
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
      
      this.logger.log(`Serving file with content type: ${contentType}`);
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      
      res.sendFile(filePath);
    } catch (error) {
      this.logger.error(`Error serving file ${filename}: ${error.message}`);
      throw new NotFoundException('File not found');
    }
  }
}
