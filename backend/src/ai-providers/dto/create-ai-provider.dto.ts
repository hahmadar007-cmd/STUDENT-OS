import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  @IsString()
  baseUrl?: string;
}

