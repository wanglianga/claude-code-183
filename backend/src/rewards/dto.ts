import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RewardDto {
  @IsString() name: string;
  @IsString() type: 'MEAL' | 'HAIRCUT' | 'HEALTHCHECK' | 'HONOR';
  @IsInt() @Min(1) points: number;
  @IsInt() @Min(0) stock: number;
  @IsOptional() @IsString() description?: string;
}

export class RestockDto {
  @IsInt() @Min(1) amount: number;
}

export class RefundDto {
  @IsString() reason: string;
}
