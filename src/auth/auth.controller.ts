
import { Body, Controller, Get, Param, Post, UseGuards, Request, Redirect } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    try {
      console.log('=== Auth Controller Login Start ===');
      console.log('Request body:', req.body);
      console.log('User from LocalAuthGuard:', req.user);
      console.log('User object keys:', req.user ? Object.keys(req.user) : 'no user');
      
      if (!req.user) {
        console.error('No user object from LocalAuthGuard');
        throw new Error('Authentication failed - no user object');
      }
      
      console.log('Calling authService.login...');
      const result = await this.authService.login(req.user);
      console.log('Login successful, returning response');
      console.log('Result keys:', Object.keys(result));
      
      return result;
    } catch (error) {
      console.error('=== Login Controller Error ===');
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error object:', error);
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
