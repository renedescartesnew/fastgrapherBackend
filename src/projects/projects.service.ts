import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PhotosService } from '../photos/photos.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private photosService: PhotosService,
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: string): Promise<ProjectDocument> {
    const newProject = new this.projectModel({
      ...createProjectDto,
      user: userId,
    });
    
    return newProject.save();
  }

  async findAll(userId: string): Promise<ProjectDocument[]> {
    this.logger.log(`Finding all projects for user: ${userId}`);
    return this.projectModel.find({ user: userId }).exec();
  }

  async findOne(id: string, userId: string): Promise<any> {
    this.logger.log(`Finding project ${id} for user ${userId}`);
    
    const project = await this.projectModel.findById(id).exec();
    
    if (!project) {
      this.logger.error(`Project with ID ${id} not found`);
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    
    this.logger.log(`Project found. Project user: ${project.user}, Requesting user: ${userId}`);
    this.logger.log(`Project user type: ${typeof project.user}, Requesting user type: ${typeof userId}`);
    this.logger.log(`Project user toString(): ${project.user.toString()}`);
    this.logger.log(`Are they equal? ${project.user.toString() === userId}`);
    
    // Check if the project belongs to the user
    if (project.user.toString() !== userId) {
      this.logger.error(`Access denied. Project ${id} belongs to user ${project.user}, but ${userId} tried to access it`);
      throw new ForbiddenException('You do not have permission to access this project');
    }
    
    this.logger.log(`Access granted for project ${id} to user ${userId}`);
    
    // Get photos for this project
    const photos = await this.photosService.findByProject(id);
    
    // Return project with photos
    return {
      ...project.toObject(),
      photos,
    };
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId: string): Promise<ProjectDocument> {
    const project = await this.findOne(id, userId);
    
    const updatedProject = await this.projectModel
      .findByIdAndUpdate(id, updateProjectDto, { new: true })
      .exec();
      
    return updatedProject;
  }

  async removePhoto(projectId: string, photoId: string, userId: string): Promise<any> {
    const project = await this.findOne(projectId, userId);
    
    // Remove photo from photos collection
    await this.photosService.remove(photoId);
    
    // Return updated project with photos
    return this.findOne(projectId, userId);
  }

  async remove(id: string, userId: string): Promise<ProjectDocument> {
    const project = await this.findOne(id, userId);
    
    // Delete all photos associated with this project
    await this.photosService.removeByProject(id);
    
    const deletedProject = await this.projectModel
      .findByIdAndDelete(id)
      .exec();
      
    return deletedProject;
  }

  async addPhoto(id: string, photoData: any, userId: string, projectName: string): Promise<any> {
    this.logger.log(`Adding photo to project ${id} for user ${userId}`);
    this.logger.log(`Photo data received:`, JSON.stringify(photoData));
    
    const project = await this.findOne(id, userId);
    this.logger.log(`Project found for photo upload`);
    
    // Create photo in photos collection with project name
    const newPhoto = await this.photosService.create(photoData, id, userId, projectName);
    this.logger.log(`Photo created in photos collection:`, newPhoto._id);
    
    // Return updated project with photos
    return this.findOne(id, userId);
  }
}
