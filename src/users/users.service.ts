import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    // Log database connection info on service initialization
    console.log('=== USERS SERVICE INITIALIZED ===');
    console.log('User model initialized for database:', this.userModel.db.name);
    console.log('Collection name:', this.userModel.collection.name);
  }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    try {
      console.log('=== USERS SERVICE CREATE ===');
      console.log('Creating user with email:', createUserDto.email);
      console.log('Target database:', this.userModel.db.name);
      console.log('Target collection:', this.userModel.collection.name);
      console.log('Password provided:', !!createUserDto.password);
      console.log('Password length:', createUserDto.password?.length);
      console.log('Password starts with $2 (is hashed):', createUserDto.password?.startsWith('$2'));
      console.log('Full password received:', createUserDto.password);
      
      // The password should already be hashed by auth service
      const newUser = new this.userModel({
        ...createUserDto,
        email: createUserDto.email.toLowerCase().trim(),
        password: createUserDto.password, // Use the password as-is (already hashed by auth service)
        isActive: true,
        verifiedAt: new Date(), // For development, auto-verify users
      });
      
      const savedUser = await newUser.save();
      console.log('User created successfully in database:', savedUser._id);
      console.log('Saved to database:', this.userModel.db.name);
      console.log('Saved to collection:', this.userModel.collection.name);
      console.log('Saved password starts with $2:', savedUser.password?.startsWith('$2'));
      console.log('Saved password:', savedUser.password);
      return savedUser;
    } catch (error) {
      console.error('Error creating user:', error);
      console.error('Database name:', this.userModel.db.name);
      console.error('Collection name:', this.userModel.collection.name);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    try {
      console.log('=== USERS SERVICE FIND BY EMAIL ===');
      console.log('Searching for email:', email);
      console.log('Database:', this.userModel.db.name);
      console.log('Collection:', this.userModel.collection.name);
      
      const normalizedEmail = email.toLowerCase().trim();
      console.log('Normalized email:', normalizedEmail);
      
      const user = await this.userModel.findOne({ email: normalizedEmail }).exec();
      console.log('Database query completed');
      console.log('User found:', !!user);
      
      if (user) {
        console.log('User details:', {
          id: user._id,
          email: user.email,
          name: user.name,
          verifiedAt: user.verifiedAt,
          isActive: user.isActive,
          hasPassword: !!user.password,
          passwordLength: user.password?.length,
          passwordStartsWithDollar2: user.password?.startsWith('$2')
        });
      }
      
      return user;
    } catch (error) {
      console.error('=== FIND BY EMAIL ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Database:', this.userModel.db.name);
      throw error;
    }
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByVerificationToken(token: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ verificationToken: token }).exec();
    return user;
  }

  async setVerificationToken(userId: string, token: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { verificationToken: token },
      { new: true }
    ).exec();
    
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    return user;
  }

  async verifyEmail(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { 
        verifiedAt: new Date(),
        verificationToken: null
      },
      { new: true }
    ).exec();
    
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    return user;
  }

  async setResetToken(userId: string, token: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { 
        resetPasswordToken: token,
        resetPasswordExpires: new Date(Date.now() + 3600000) // 1 hour from now
      },
      { new: true }
    ).exec();
    
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    return user;
  }

  async updatePassword(userId: string, hashedPassword: string, resetToken: string | null): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { 
        password: hashedPassword,
        resetPasswordToken: resetToken,
        resetPasswordExpires: null
      },
      { new: true }
    ).exec();
    
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
      
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return updatedUser;
  }

  async setResetPasswordToken(email: string, token: string, expires: Date): Promise<UserDocument> {
    const user = await this.findByEmail(email);
    
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    
    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    
    return user.save();
  }

  async findByResetToken(token: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    
    return user;
  }

  async remove(id: string): Promise<UserDocument> {
    const deletedUser = await this.userModel.findByIdAndDelete(id).exec();
    
    if (!deletedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return deletedUser;
  }
}
