import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateIncidentDto {
  @IsInt() volunteerId: number;
  @IsString() type:
    | 'FEEL_UNWELL'
    | 'ABSENT'
    | 'RISK_UPGRADE'
    | 'COMPLAINT'
    | 'INSURANCE_EXPIRED'
    | 'FAMILY_OBJECTION'
    | 'REWARD_OUT_OF_STOCK';
  @IsOptional() @IsString() level?: 'INFO' | 'WARN' | 'CRITICAL';
  @IsString() description: string;
  @IsOptional() @IsInt() assignmentId?: number;
}

export class ResolveDto {
  @IsString() resolution: string;
  @IsOptional() @IsBoolean() resumeVolunteer?: boolean;
}

export class FeelUnwellDto {
  @IsString() description: string;
}

export class FamilyObjectionDto {
  @IsString() description: string;
}

export class FollowUpDto {
  @IsString() kind: 'HEALTH' | 'SERVICE' | 'COMPLAINT' | 'ROUTINE';
  @IsString() content: string;
  @IsOptional() @IsString() healthStatus?: 'GOOD' | 'FAIR' | 'POOR';
  @IsOptional() @IsBoolean() continueWilling?: boolean;
  @IsOptional() @IsInt() assignmentId?: number;
  @IsOptional() @IsInt() incidentId?: number;
}
