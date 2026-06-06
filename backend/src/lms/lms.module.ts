import { Module } from '@nestjs/common';
import { LmsService } from './lms.service';

@Module({
  providers: [LmsService],
  exports: [LmsService],
})
export class LmsModule {}
