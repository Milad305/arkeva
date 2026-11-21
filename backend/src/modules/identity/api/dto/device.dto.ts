import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class DeviceTokenRequest {
  @ApiProperty({ enum: ['android', 'ios', 'web'] }) @IsIn(['android', 'ios', 'web']) readonly platform!: 'android' | 'ios' | 'web';
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(4096) readonly token!: string;
}
