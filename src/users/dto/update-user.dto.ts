
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsDate, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsString()
  @IsOptional()
  resetPasswordToken?: string | null;

  @IsOptional()
  resetPasswordExpires?: Date | null;

  @IsString()
  @IsOptional()
  verificationToken?: string | null;

  @IsOptional()
  verifiedAt?: Date | null;

  @IsString()
  @IsOptional()
  avatar?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
