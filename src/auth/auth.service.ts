import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { MailerService } from '@nestjs-modules/mailer';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      console.log('=== AUTH SERVICE VALIDATE USER START ===');
      console.log('Email:', email);
      console.log('Password provided:', !!password);
      console.log('Plain password length:', password?.length);
      console.log('Plain password value:', password);
      
      if (!email || !password) {
        console.log('Missing email or password');
        return null;
      }
      
      console.log('Searching for user...');
      const user = await this.usersService.findByEmail(email);
      
      if (!user) {
        console.log('User not found');
        return null;
      }
      
      console.log('User found:', {
        email: user.email,
        verified: !!user.verifiedAt,
        active: user.isActive,
        hasPassword: !!user.password,
        storedPasswordPrefix: user.password?.substring(0, 10),
        storedPasswordLength: user.password?.length,
        storedPasswordFull: user.password
      });
      
      // For development, let's allow unverified users to login
      // if (!user.verifiedAt) {
      //   console.log('Email not verified');
      //   throw new UnauthorizedException('Please verify your email before logging in');
      // }

      // Check if account is active
      if (!user.isActive) {
        console.log('Account inactive');
        throw new UnauthorizedException('Your account has been deactivated');
      }

      // Check if password exists
      if (!user.password) {
        console.log('No password set');
        throw new UnauthorizedException('Account configuration error');
      }

      console.log('=== PASSWORD COMPARISON DEBUG ===');
      console.log('Plain password:', password);
      console.log('Plain password type:', typeof password);
      console.log('Plain password chars:', password.split('').map(c => c.charCodeAt(0)));
      console.log('Stored hash:', user.password);
      console.log('Stored hash type:', typeof user.password);
      console.log('Stored hash starts with $2:', user.password.startsWith('$2'));
      console.log('Hash format looks valid:', /^\$2[ab]\$\d+\$.{53}$/.test(user.password));
      
      // Test with a fresh hash of the same password to see if the issue is with the stored hash
      console.log('=== TESTING FRESH HASH ===');
      const testHash = await bcrypt.hash(password, 10);
      console.log('Fresh hash of same password:', testHash);
      const testComparison = await bcrypt.compare(password, testHash);
      console.log('Fresh hash comparison result:', testComparison);
      
      console.log('=== ACTUAL COMPARISON ===');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Actual password comparison result:', isPasswordValid);
      
      if (!isPasswordValid) {
        console.log('Password comparison failed');
        
        // Let's try a different approach - check if somehow the password was double-hashed
        console.log('=== CHECKING FOR DOUBLE HASHING ===');
        try {
          const doubleHashTest = await bcrypt.compare(user.password, user.password);
          console.log('Double hash test (comparing hash to itself):', doubleHashTest);
        } catch (doubleHashError) {
          console.log('Double hash test error:', doubleHashError.message);
        }
        
        return null;
      }

      console.log('User validation successful');
      const { password: userPassword, ...result } = user.toObject ? user.toObject() : user;
      return result;
      
    } catch (error) {
      console.error('=== VALIDATE USER ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      console.error('Unexpected validation error:', error);
      return null;
    }
  }

  async debugFindUser(email: string) {
    try {
      console.log('=== DEBUG FIND USER ===');
      console.log('Email:', email);
      
      const user = await this.usersService.findByEmail(email);
      console.log('User found:', !!user);
      
      if (user) {
        console.log('User details:', {
          id: user._id,
          email: user.email,
          verified: !!user.verifiedAt,
          active: user.isActive
        });
      }
      
      return user;
    } catch (error) {
      console.error('Debug find user error:', error);
      throw error;
    }
  }

  async login(user: any) {
    try {
      console.log('=== AUTH SERVICE LOGIN START ===');
      console.log('User:', { email: user?.email, id: user?._id });
      
      if (!user || !user.email || !user._id) {
        throw new UnauthorizedException('Invalid user data for login');
      }
      
      const payload = { email: user.email, sub: user._id };
      console.log('Creating JWT with payload:', payload);
      
      const token = this.jwtService.sign(payload);
      console.log('JWT created successfully');
      
      const response = {
        access_token: token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.name,
          lastName: user.name,
          name: user.name,
        },
      };
      
      console.log('=== AUTH SERVICE LOGIN SUCCESS ===');
      return response;
      
    } catch (error) {
      console.error('=== LOGIN SERVICE ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      throw error;
    }
  }

  async register(createUserDto: CreateUserDto) {
    try {
      console.log('=== Registering User ===');
      console.log('Email:', createUserDto.email);
      console.log('Name:', createUserDto.name);
  
      // Check if the email is already taken
      const existingUser = await this.usersService.findByEmail(createUserDto.email);
      if (existingUser) {
        console.log('Email already exists:', createUserDto.email);
        throw new ConflictException('Email already exists');
      }
  
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);
      console.log('Password hashed successfully');
      console.log('Original password:', createUserDto.password);
      console.log('Hashed password:', hashedPassword);
      console.log('Hash starts with $2:', hashedPassword.startsWith('$2'));
  
      // Create the user
      const newUser = await this.usersService.create({
        ...createUserDto,
        password: hashedPassword,
      });
      console.log('User created successfully:', newUser.email);
  
      // Generate email verification token
      const verificationToken = uuidv4();
      console.log('Verification token generated');
  
      // Save the verification token to the user
      await this.usersService.setVerificationToken(newUser._id, verificationToken);
      console.log('Verification token saved to user');
  
      // Always return success with user data (email sending is optional)
      const response = { 
        success: true,
        message: 'Registration successful. You can now login with your credentials.',
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name
        }
      };

      // Try to send verification email, but don't fail registration if email fails
      try {
        const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/verify-email?token=${verificationToken}`;
        console.log('Sending verification email...');
  
        await this.mailerService.sendMail({
          to: newUser.email,
          from: 'noreply@fastgrapher.com',
          subject: 'Email Verification - Fast Grapher',
          template: 'verify-email',
          context: {
            name: newUser.name,
            verificationUrl: verificationLink,
            year: new Date().getFullYear(),
          },
        });
        console.log('Verification email sent successfully');
        response.message = 'Registration successful. Please check your email to verify your account.';
        
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError.message);
        // Keep the success response but note email issue
        response.message = 'Registration successful. Email verification is temporarily unavailable, but you can login directly.';
      }

      return response;
    } catch (error) {
      console.error('=== Registration Error ===');
      console.error('Error:', error.message);
      throw error;
    }
  }

  async forgotPassword(email: string) {
    try {
      console.log('=== Forgot Password Request ===');
      console.log('Email:', email);
  
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        console.log('User not found:', email);
        throw new BadRequestException('Invalid email');
      }
  
      // Generate reset token
      const resetToken = uuidv4();
      console.log('Reset token generated:', resetToken);
  
      // Save reset token to user
      await this.usersService.setResetToken(user._id, resetToken);
      console.log('Reset token saved to user');
  
      // Try to send reset password email
      try {
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        console.log('Reset link:', resetLink);
  
        await this.mailerService.sendMail({
          to: user.email,
          from: 'noreply@fastgrapher.com',
          subject: 'Reset Password',
          template: 'reset-password',
          context: {
            name: user.name,
            url: resetLink,
          },
        });
        console.log('Reset password email sent to:', user.email);
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError);
        // Continue anyway - user still gets success message
      }
  
      return { message: 'Password reset email sent. Please check your email.' };
    } catch (error) {
      console.error('=== Forgot Password Error ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      console.log('=== Reset Password Request ===');
      console.log('Token:', token);
  
      const user = await this.usersService.findByResetToken(token);
      if (!user) {
        console.log('Invalid or expired token');
        throw new BadRequestException('Invalid or expired token');
      }
  
      // Hash the new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      console.log('New password hashed successfully');
  
      // Update password and clear reset token
      await this.usersService.updatePassword(user._id, hashedPassword, null);
      console.log('Password updated and reset token cleared for user:', user.email);
  
      return { message: 'Password reset successfully.' };
    } catch (error) {
      console.error('=== Reset Password Error ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async verifyEmail(token: string) {
    try {
      console.log('=== Verify Email Request ===');
      console.log('Token:', token);
  
      const user = await this.usersService.findByVerificationToken(token);
      if (!user) {
        console.log('Invalid or expired token');
        throw new BadRequestException('Invalid or expired token');
      }
  
      // Mark email as verified
      await this.usersService.verifyEmail(user._id);
      console.log('Email verified for user:', user.email);
  
      return { message: 'Email verified successfully. You can now log in.' };
    } catch (error) {
      console.error('=== Verify Email Error ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async getCurrentUser(userId: string) {
    try {
      console.log('=== Get Current User Request ===');
      console.log('User ID:', userId);
  
      const user = await this.usersService.findById(userId);
      if (!user) {
        console.log('User not found:', userId);
        throw new UnauthorizedException('User not found');
      }
  
      console.log('User found:', user.email);
      return user;
    } catch (error) {
      console.error('=== Get Current User Error ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }
}
