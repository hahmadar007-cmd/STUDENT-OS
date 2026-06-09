import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAiProviderDto } from './dto/create-ai-provider.dto';
import * as crypto from 'crypto';

const ALGO = 'aes-256-cbc';
const KEY_LEN = 32; // 256-bit key

function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_SECRET || 'fasca-default-encryption-key-32b!';
  // Pad or truncate to exactly 32 bytes
  return Buffer.from(raw.padEnd(KEY_LEN, '0').slice(0, KEY_LEN), 'utf8');
}

function encryptKey(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptKey(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, getEncryptionKey(), iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function maskKey(plainKey: string): string {
  if (plainKey.length <= 4) return '••••';
  return `••••••••${plainKey.slice(-4)}`;
}

@Injectable()
export class AiProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAiProviderDto) {
    const encryptedKey = encryptKey(dto.apiKey);
    const provider = await this.prisma.aiProvider.create({
      data: {
        name: dto.name,
        providerType: dto.providerType,
        apiKey: encryptedKey,
        baseUrl: dto.baseUrl ?? null,
        isActive: false,
        userId,
      },
    });
    return this.sanitize(provider);
  }

  async findAllForUser(userId: string) {
    const providers = await this.prisma.aiProvider.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return providers.map((p) => this.sanitize(p));
  }

  async toggleActive(userId: string, id: string) {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('AI provider not found.');
    if (provider.userId !== userId) throw new ForbiddenException('Not your provider.');

    if (!provider.isActive) {
      // Deactivate all others for this user first (single-active rule)
      await this.prisma.aiProvider.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });
    }

    const updated = await this.prisma.aiProvider.update({
      where: { id },
      data: { isActive: !provider.isActive },
    });
    return this.sanitize(updated);
  }

  async remove(userId: string, id: string) {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('AI provider not found.');
    if (provider.userId !== userId) throw new ForbiddenException('Not your provider.');
    await this.prisma.aiProvider.delete({ where: { id } });
    return { success: true };
  }

  private sanitize(provider: any) {
    let maskedKey = '••••••••';
    try {
      const plain = decryptKey(provider.apiKey);
      maskedKey = maskKey(plain);
    } catch {
      // If decryption fails (legacy), just show mask
    }
    return {
      id: provider.id,
      name: provider.name,
      providerType: provider.providerType,
      apiKeyMasked: maskedKey,
      baseUrl: provider.baseUrl,
      isActive: provider.isActive,
      createdAt: provider.createdAt,
    };
  }
}
