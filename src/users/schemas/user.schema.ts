
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ 
  timestamps: true,
  collection: 'users' // Explicitly set collection name to 'users'
})
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: null })
  resetPasswordToken: string;

  @Prop({ default: null })
  resetPasswordExpires: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String, default: null })
  verificationToken: string;

  @Prop({ type: Date, default: null })
  verifiedAt: Date | null;

  @Prop({ type: String, default: null })
  avatar: string;

  // Adding _id for TypeScript support
  _id?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add indexes for performance (remove duplicate email index)
UserSchema.index({ verificationToken: 1 });
UserSchema.index({ resetPasswordToken: 1 });

// Ensure we're working with the fastgrapher database
UserSchema.set('collection', 'users');
