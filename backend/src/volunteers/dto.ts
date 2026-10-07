import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() @Min(50) @Max(95) age?: number;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() distanceKm?: number;
  @IsOptional() @IsString() health?: string;
  @IsOptional() @IsString() healthNote?: string;
  @IsOptional() @IsArray() skills?: string[];
  @IsOptional() @IsArray() timePrefs?: string[];
  @IsOptional() @IsString() emergencyContactName?: string;
  @IsOptional() @IsString() emergencyContactPhone?: string;
  @IsOptional() @IsBoolean() familyAware?: boolean;
  @IsOptional() @IsBoolean() familyConsentHigh?: boolean;
  @IsOptional() @IsString() insuranceStatus?: 'VALID' | 'EXPIRED' | 'NONE';
  @IsOptional() @IsString() insuranceExpireDate?: string;
  @IsOptional() @IsString() status?: 'ACTIVE' | 'PAUSED';
}

export class TrainingDto {
  @IsString() course: string;
  @IsBoolean() passed: boolean;
  @IsOptional() @IsString() note?: string;
}
