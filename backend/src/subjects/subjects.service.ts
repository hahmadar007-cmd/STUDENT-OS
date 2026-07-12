import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string) {
    return this.prisma.subject.findMany({ where: { userId } });
  }

  create(userId: string, data: { name: string; code?: string; parentSubjectId?: string }) {
    return this.prisma.subject.create({
      data: {
        ...data,
        userId,
      },
    });
  }
}
