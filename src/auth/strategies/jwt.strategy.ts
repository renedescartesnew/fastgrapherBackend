
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET') || 'fallback-secret-key-change-in-production';
    
    console.log('JWT Strategy initialized with secret:', jwtSecret ? 'Secret provided' : 'Using fallback secret');
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
    
    if (!configService.get<string>('JWT_SECRET')) {
      console.warn('JWT_SECRET not found in environment variables. Using fallback secret. Please set JWT_SECRET in production.');
    }
  }

  async validate(payload: any) {
    console.log('JWT payload received:', payload);
    console.log('JWT payload sub (user ID):', payload.sub);
    console.log('JWT payload sub type:', typeof payload.sub);
    
    if (!payload.sub) {
      console.error('No user ID (sub) in JWT payload');
      throw new UnauthorizedException('Invalid token: missing user ID');
    }
    
    try {
      console.log('Looking up user with ID:', payload.sub);
      const user = await this.usersService.findOne(payload.sub);
      
      if (!user) {
        console.error('User not found for ID:', payload.sub);
        throw new UnauthorizedException('User not found');
      }
      
      if (!user.isActive) {
        console.error('User is not active:', payload.sub);
        throw new UnauthorizedException('User account is not active');
      }
      
      // Handle both Document and plain object
      const userObj = 'toObject' in user ? user.toObject() : user;
      const { password, ...result } = userObj;
      
      console.log('JWT validation successful for user:', result.email);
      console.log('User ID being returned:', result._id);
      console.log('User ID type:', typeof result._id);
      
      return result;
    } catch (error) {
      console.error('Error during JWT validation:', error);
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
