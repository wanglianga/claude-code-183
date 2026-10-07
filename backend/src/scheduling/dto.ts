import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateJobDto {
  @IsString() title: string;
  @IsString() category: string;
  @IsString() location: string;
  @IsOptional() @IsNumber() distanceKm?: number;
  @IsOptional() @IsNumber() durationHours?: number;
  @IsString() riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  @IsInt() @Min(1) capacity: number;
  @IsInt() @Min(0) basePoints: number;
  @IsOptional() @IsArray() requiredSkills?: string[];
  @IsOptional() @IsBoolean() requireTraining?: boolean;
  @IsOptional() @IsString() requiredCourse?: string;
  @IsString() serviceDate: string;
  @IsString() startTime: string;
  @IsString() endTime: string;
  @IsOptional() @IsString() description?: string;
}

export class ScheduleDto {
  @IsInt() volunteerId: number;
}

export class CompleteDto {
  @IsString() method: 'PHOTO' | 'LEADER';
  @IsOptional() @IsString() proofNote?: string;
  @IsOptional() @IsInt() @Min(1) rating?: number;
}

export class CancelDto {
  @IsString() reason: string;
}

export class EscalateDto {
  @IsString() description: string;
}
