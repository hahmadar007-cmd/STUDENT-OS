import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string) {
    return this.prisma.material.findMany({ where: { userId } });
  }

  create(userId: string, data: { fileName: string; fileUrl: string; sizeLabel?: string; mimeType?: string; subjectId?: string; courseCode?: string; category?: string }) {
    return this.prisma.material.create({
      data: {
        ...data,
        userId,
      },
    });
  }
}
