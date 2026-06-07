import { Injectable } from '@nestjs/common';
// @ts-ignore
import * as AdmZip from 'adm-zip';

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
}
