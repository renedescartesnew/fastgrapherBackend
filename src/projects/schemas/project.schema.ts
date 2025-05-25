
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ProjectDocument = Project & Document;

export enum ProjectType {
  WEDDING = 'wedding',
  ENGAGEMENT = 'engagement',
  GENDER_PARTY = 'gender party',
  KID_BIRTHDAY = 'kid birthday',
  ADULT_BIRTHDAY = 'adult birthday',
  CORPORATE_PARTY = 'corporate party',
  OTHER = 'other event',
}

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ProjectType, default: ProjectType.OTHER })
  type: ProjectType;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: User;
  
  // Adding _id for TypeScript support
  _id?: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
