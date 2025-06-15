
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
      console.log('=== LocalStrategy validate ===');
      console.log('Email:', email);
      console.log('Password provided:', !!password);
      
      const user = await this.authService.validateUser(email, password);
      
      if (!user) {
        console.log('LocalStrategy: User validation failed');
        throw new UnauthorizedException('Invalid email or password');
      }
      
      console.log('LocalStrategy: User validation successful');
      return user;
    } catch (error) {
      console.error('LocalStrategy validation error:', error);
      throw error;
    }
  }
}
