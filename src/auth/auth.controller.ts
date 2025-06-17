
import { Body, Controller, Get, Param, Post, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('health')
  healthCheck() {
    return { status: 'ok', service: 'auth', timestamp: new Date().toISOString() };
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    try {
      console.log('=== REGISTER ENDPOINT ===');
      console.log('Registration data:', { email: createUserDto.email, name: createUserDto.name });
      
      const result = await this.authService.register(createUserDto);
      console.log('Registration successful:', result);
      return result;
    } catch (error) {
      console.error('Registration error:', error.message);
      throw error;
    }
  }

  @Get('debug-user/:email')
  async debugUser(@Param('email') email: string) {
    try {
      console.log('=== DEBUG USER ENDPOINT ===');
      console.log('Looking for email:', email);
      
      const user = await this.authService.debugFindUser(email);
      
      return {
        found: !!user,
        email: user?.email || null,
        verified: user?.verifiedAt ? true : false,
        hasPassword: user?.password ? true : false,
        isActive: user?.isActive || false
      };
    } catch (error) {
      console.error('Debug user error:', error);
      return {
        error: error.message,
        found: false
      };
    }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      console.log('=== AUTH CONTROLLER LOGIN START ===');
      console.log('Login attempt for email:', loginDto.email);
      console.log('Password provided:', !!loginDto.password);
      
      // Validate input
      if (!loginDto.email || !loginDto.password) {
        console.error('Missing credentials');
        throw new UnauthorizedException('Email and password are required');
      }

      // Validate user credentials
      console.log('Calling validateUser...');
      const validatedUser = await this.authService.validateUser(loginDto.email, loginDto.password);
      
      if (!validatedUser) {
        console.log('User validation failed');
        throw new UnauthorizedException('Invalid email or password');
      }

      console.log('User validated, generating JWT...');
      const result = await this.authService.login(validatedUser);
      
      console.log('Login successful, returning token');
      return result;
      
    } catch (error) {
      console.error('=== AUTH CONTROLLER LOGIN ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Re-throw the error to let NestJS handle it properly
      throw error;
    }
  }

  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.password);
  }

  @Get('verify/:token')
  verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return this.authService.getCurrentUser(req.user.sub);
  }
}
