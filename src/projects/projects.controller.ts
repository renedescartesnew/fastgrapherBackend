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
    const userId = user._id.toString(); // Convert ObjectId to string
    return this.projectsService.create(createProjectDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@CurrentUser() user: User) {
    this.logger.log(`Finding all projects for user: ${user.email}, User ID: ${user._id}`);
    const userId = user._id.toString(); // Convert ObjectId to string
    return this.projectsService.findAll(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    this.logger.log(`Finding project: ${id} for user: ${user.email}, User ID: ${user._id}`);
    
    try {
      const userId = user._id.toString(); // Convert ObjectId to string
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
    const userId = user._id.toString(); // Convert ObjectId to string
    return this.projectsService.update(id, updateProjectDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    const userId = user._id.toString(); // Convert ObjectId to string
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
    this.logger.log(`Photo upload request for project ${id}`);
    this.logger.log(`File details:`, {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    });
    
    // Store only the filename, not the full path
    const photoData = {
      path: file.filename, // Store just the filename instead of full path
      originalname: file.originalname,
      mimetype: file.mimetype,
      createdAt: new Date(),
    };
    
    this.logger.log(`Photo data to store:`, photoData);
    
    const userId = user._id.toString(); // Convert ObjectId to string
    const updatedProject = await this.projectsService.addPhoto(id, photoData, userId);
    
    this.logger.log(`Photo upload completed. Project now has ${updatedProject.photos.length} photos`);
    
    return updatedProject;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/photos/:photoId')
  removePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: User,
  ) {
    const userId = user._id.toString(); // Convert ObjectId to string
    return this.projectsService.removePhoto(id, photoId, userId);
  }

  // Protected endpoint for serving uploaded files - requires authentication
  @UseGuards(JwtAuthGuard)
  @Get('uploads/:filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response, @CurrentUser() user: User) {
    try {
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      this.logger.log(`Serving file: ${filename} to authenticated user: ${user.email}, Path: ${filePath}`);
      
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
}
