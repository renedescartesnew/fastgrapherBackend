
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.usersService.findByEmail(email);
      
      if (!user) {
        return null;
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return null;
      }
      
      if (!user.verifiedAt) {
        throw new UnauthorizedException('Please verify your email before logging in');
      }
      
      // Handle both Document and plain object
      const userObj = user.toObject ? user.toObject() : user;
      const { password: _, ...result } = userObj;
      return result;
    } catch (error) {
      console.error('Error validating user:', error);
      throw error;
    }
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id };
    
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    };
  }

  async register(createUserDto: CreateUserDto) {
    try {
      const { email, password, name } = createUserDto;
      console.log('Registering user:', { email, name });
      
      const existingUser = await this.usersService.findByEmail(email);
      
      if (existingUser) {
        throw new BadRequestException('User with this email already exists');
      }
      
      // Generate verification token
      const verificationToken = uuidv4() + '-verify-' + Date.now();
      
      const user = await this.usersService.create({
        email,
        password,
        name,
        verificationToken,
      });
      
      console.log('User created in database:', { id: user._id, email: user.email });
      
      // Send verification email
      try {
        const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify/${verificationToken}`;
        
        await this.mailerService.sendMail({
          to: email,
          subject: 'Fast Grapher - Verify Your Email',
          template: 'verify-email',
          context: {
            name: user.name,
            verificationUrl,
            year: new Date().getFullYear(),
          },
        });
        
        console.log('Verification email sent to:', email);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        
        // User is created but email fails - return a modified success response
        return { 
          message: 'User has been created successfully! Email verification is temporarily disabled.',
          userId: user._id,
          verificationToken // Include the token so the user can verify manually if needed
        };
      }
      
      return { 
        message: 'User has been created successfully! Please check your email for verification.',
        userId: user._id
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async verifyEmail(token: string) {
    try {
      const user = await this.usersService.findByVerificationToken(token);
      
      if (!user) {
        throw new UnauthorizedException('Invalid or expired verification token');
      }
      
      // Update user verification status
      user.verificationToken = null;
      user.verifiedAt = new Date();
      
      if (user && typeof user.save === 'function') {
        await user.save();
      } else {
        await this.usersService.update(user._id.toString(), {
          verificationToken: null,
          verifiedAt: new Date(),
        });
      }
      
      console.log('Email verified for user:', user.email);
      return { message: 'Email verified successfully. You can now login.' };
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  async forgotPassword(email: string) {
    try {
      const user = await this.usersService.findByEmail(email);
      
      if (!user) {
        // Don't leak information about user existence
        return { message: 'If this email exists, a reset password link has been sent' };
      }
      
      // Generate a reset token
      const resetToken = uuidv4() + '-reset-' + Date.now();
      
      // Set token expiration to 1 hour
      const expiration = new Date();
      expiration.setHours(expiration.getHours() + 1);
      
      // Save the token to the user
      await this.usersService.setResetPasswordToken(email, resetToken, expiration);
      
      // Send the reset email
      try {
        const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
        
        await this.mailerService.sendMail({
          to: email,
          subject: 'Fast Grapher - Reset Password',
          template: 'reset-password',
          context: {
            name: user.name,
            resetUrl,
            year: new Date().getFullYear(),
          },
        });
        
        console.log('Password reset email sent to:', email);
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError);
      }
      
      return { message: 'If this email exists, a reset password link has been sent' };
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const user = await this.usersService.findByResetToken(token) as UserDocument;
      
      if (!user) {
        throw new UnauthorizedException('Invalid or expired password reset token');
      }
      
      // Update the user's password and clear the reset token
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Check if we have a Mongoose document with save method or a plain object
      if (user && typeof user.save === 'function') {
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();
      } else {
        // For plain objects or when save() is not available
        await this.usersService.update(user._id.toString(), { 
          password: hashedPassword, 
          resetPasswordToken: null, 
          resetPasswordExpires: null 
        });
      }
      
      console.log('Password reset successfully for user:', user.email);
      return { message: 'Password has been reset successfully' };
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  async getCurrentUser(userId: string) {
    return this.usersService.findOne(userId);
  }
}
