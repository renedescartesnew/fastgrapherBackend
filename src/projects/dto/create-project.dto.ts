
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ProjectType } from '../schemas/project.schema';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ProjectType)
  @IsNotEmpty()
  type: ProjectType;
}
