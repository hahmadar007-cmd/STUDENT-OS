import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

// Keep in sync with schema.prisma ProviderType enum
export enum ProviderType {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GEMINI = 'GEMINI',
  CUSTOM = 'CUSTOM',
}

export class CreateAiProviderDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEnum(ProviderType)
  providerType: ProviderType;

  @IsNotEmpty()
  @IsString()
  apiKey: string;

  @IsOptional()
  @ValidateIf((object, value) => value !== null)
  @IsString()
  baseUrl?: string;
}

