
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PhotoDocument = Photo & Document;

@Schema({ timestamps: true })
export class Photo {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalname: string;

  @Prop({ required: true })
  path: string;

  @Prop({ required: true })
  mimetype: string;

  @Prop({ default: 0 })
  size: number;

  @Prop({ type: String, ref: 'Project', required: true })
  project: string;

  @Prop({ type: String, ref: 'User', required: true })
  user: string;

  @Prop({ default: false })
  hasClosedEyes: boolean;

  @Prop({ default: false })
  notLookingAtCamera: boolean;

  @Prop({ default: null })
  notLookingPath: string;

  @Prop({ default: false })
  isGroupPhoto: boolean;

  @Prop({ default: null })
  groupsPath: string;

  @Prop({ default: false })
  isBlurry: boolean;

  @Prop({ default: 0 })
  blurScore: number;
}

export const PhotoSchema = SchemaFactory.createForClass(Photo);
