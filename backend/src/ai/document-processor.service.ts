import { Injectable } from '@nestjs/common';
// @ts-ignore
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class DocumentProcessorService {
  // Extract slide text content page-by-page from a PowerPoint (.pptx) file buffer
  extractPptxText(buffer: Buffer): { text: string; pageNum: number }[] {
    try {
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      // Find all slide sheet files: ppt/slides/slide[N].xml
      const slideEntries = zipEntries.filter(
        (entry: any) =>
          entry.entryName.startsWith('ppt/slides/slide') &&
          entry.entryName.endsWith('.xml'),
      );

      // Sort slide entries by slide index number
      slideEntries.sort((a: any, b: any) => {
        const numA = parseInt(a.entryName.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.entryName.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });

      const chunks: { text: string; pageNum: number }[] = [];

      slideEntries.forEach((entry: any, idx: number) => {
        const slideXml = entry.getData().toString('utf8');
        
        // Extract text inside paragraph/text run elements (<a:t>...</a:t>)
        const matches = slideXml.match(/<a:t>([^<]*)<\/a:t>/g);
        let slideText = '';
        if (matches) {
          slideText = matches
            .map((tag: string) => {
              // Strip tags to get raw inner text content
              return tag
                .replace('<a:t>', '')
                .replace('</a:t>', '')
                .trim();
            })
            .filter(Boolean)
            .join(' ');
        }

        chunks.push({
          text: slideText || `[Empty slide ${idx + 1}]`,
          pageNum: idx + 1,
        });
      });

      console.log(`DocumentProcessorService: Successfully extracted PPTX text. Slides: ${chunks.length}`);
      return chunks;
    } catch (err) {
      console.error('Failed to parse PPTX file:', err);
      throw new Error('Invalid or corrupted PPTX file. Failed to extract slide text.');
    }
  }

  // Convert PPTX buffer to PDF buffer using LibreOffice CLI
  async convertPptxToPdf(buffer: Buffer): Promise<Buffer | null> {
    const tempDir = os.tmpdir();
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const tempInputPath = path.join(tempDir, `input-${uniqueId}.pptx`);
    
    try {
      // Write PPTX buffer to a temporary file
      fs.writeFileSync(tempInputPath, buffer);
      
      // Run headless LibreOffice conversion
      // soffice --headless --convert-to pdf --outdir <tempDir> <tempInputPath>
      console.log(`DocumentProcessorService: Converting PPTX to PDF via LibreOffice...`);
      await execAsync(`soffice --headless --convert-to pdf --outdir "${tempDir}" "${tempInputPath}"`);
      
      // The output PDF name is determined by the input filename
      const tempOutputPath = path.join(tempDir, `input-${uniqueId}.pdf`);
      
      if (fs.existsSync(tempOutputPath)) {
        const pdfBuffer = fs.readFileSync(tempOutputPath);
        
        // Clean up output file
        fs.unlinkSync(tempOutputPath);
        
        console.log(`DocumentProcessorService: PPTX successfully converted to PDF (${pdfBuffer.length} bytes)`);
        return pdfBuffer;
      } else {
        console.warn('DocumentProcessorService: Converted PDF file not found at output path.');
        return null;
      }
    } catch (err) {
      console.warn('DocumentProcessorService: Failed to convert PPTX to PDF. (Ignore if running locally without LibreOffice):', err);
      return null;
    } finally {
      // Clean up input file
      if (fs.existsSync(tempInputPath)) {
        fs.unlinkSync(tempInputPath);
      }
    }
  }
}
