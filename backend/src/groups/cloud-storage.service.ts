import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class CloudStorageService {
  private readonly logger = new Logger(CloudStorageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists() {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
        this.logger.log(`Created uploads directory at ${this.uploadDir}`);
      }
    } catch (err) {
      this.logger.error('Failed to create uploads directory:', err);
    }
  }

  async uploadFile(file: any): Promise<{ url: string; sizeLabel: string }> {
    if (!file || !file.buffer) {
      throw new Error('Invalid file upload. Empty file buffer.');
    }

    const sizeBytes = file.size || file.buffer.length;
    const sizeLabel = this.formatBytes(sizeBytes);

    // Sanitize and generate unique file name
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    const uniqueId = crypto.randomBytes(4).toString('hex');
    const safeName = `${baseName}_${uniqueId}${ext}`;

    // Cloud storage integration hook (AWS S3 / Supabase Storage)
    const s3Bucket = process.env.AWS_S3_BUCKET;
    const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET;

    if (s3Bucket) {
      // Produciton AWS S3 Upload implementation goes here
      this.logger.log(`[CloudStorage] Simulated S3 upload of ${safeName} to bucket ${s3Bucket}`);
    } else if (supabaseBucket) {
      // Production Supabase Storage Upload implementation goes here
      this.logger.log(`[CloudStorage] Simulated Supabase upload of ${safeName} to bucket ${supabaseBucket}`);
    }

    // Fallback: local disk storage
    const targetPath = path.join(this.uploadDir, safeName);
    try {
      fs.writeFileSync(targetPath, file.buffer);
      this.logger.log(`Saved file locally to ${targetPath}`);
      
      const port = process.env.PORT || 3001;
      const host = process.env.API_URL || `http://localhost:${port}`;
      const url = `${host}/uploads/${safeName}`;
      
      return { url, sizeLabel };
    } catch (err) {
      this.logger.error(`Failed to write file to local disk: ${err.message}`);
      throw new Error(`Failed to store file: ${err.message}`);
    }
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      if (!fileUrl.includes('/uploads/')) {
        return false;
      }
      const filename = fileUrl.split('/uploads/').pop();
      if (!filename) return false;

      const filePath = path.join(this.uploadDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted file from disk: ${filePath}`);
        return true;
      }
      return false;
    } catch (err) {
      this.logger.error(`Failed to delete file: ${err.message}`);
      return false;
    }
  }

  private formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
