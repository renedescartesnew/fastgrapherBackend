
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    try {
      console.log('=== LocalStrategy validate START ===');
      console.log('Email received:', email);
      console.log('Password received:', !!password);
      console.log('Password length:', password?.length);
      
      if (!email || !password) {
        console.error('Missing email or password');
        throw new UnauthorizedException('Email and password are required');
      }
      
      console.log('Calling authService.validateUser...');
      const user = await this.authService.validateUser(email, password);
      console.log('authService.validateUser completed');
      console.log('User result:', user ? 'User found' : 'No user');
      
      if (!user) {
        console.log('LocalStrategy: User validation failed - throwing UnauthorizedException');
        throw new UnauthorizedException('Invalid email or password');
      }
      
      console.log('LocalStrategy: User validation successful');
      console.log('User object keys:', Object.keys(user));
      console.log('=== LocalStrategy validate END ===');
      return user;
    } catch (error) {
      console.error('=== LocalStrategy Error ===');
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error object:', error);
      throw error;
    }
  }
}
