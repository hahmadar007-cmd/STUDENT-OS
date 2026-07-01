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

  // Extract text content paragraph-by-paragraph from a Word (.docx) file buffer
  extractDocxText(buffer: Buffer): { text: string; pageNum: number }[] {
    try {
      const zip = new AdmZip(buffer);
      const docEntry = zip.getEntry('word/document.xml');
      if (!docEntry) {
        throw new Error('No word/document.xml found in .docx archive.');
      }

      const docXml = docEntry.getData().toString('utf8');

      // Extract text from paragraph run elements (<w:t ...>...</w:t>)
      // Group by paragraphs (<w:p>...</w:p>)
      const paragraphs = docXml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
      const lines: string[] = [];

      for (const para of paragraphs) {
        const textMatches = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
        if (textMatches) {
          const paraText = textMatches
            .map((tag: string) => tag.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '').trim())
            .join('');
          if (paraText.trim()) {
            lines.push(paraText.trim());
          }
        }
      }

      // Group into page-sized chunks (~40 lines per "page") for consistent chunk interface
      const LINES_PER_PAGE = 40;
      const chunks: { text: string; pageNum: number }[] = [];
      for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
        const pageLines = lines.slice(i, i + LINES_PER_PAGE);
        chunks.push({
          text: pageLines.join('\n'),
          pageNum: Math.floor(i / LINES_PER_PAGE) + 1,
        });
      }

      if (chunks.length === 0) {
        chunks.push({ text: '[Empty document]', pageNum: 1 });
      }

      console.log(`DocumentProcessorService: Successfully extracted DOCX text. Pages: ${chunks.length}`);
      return chunks;
    } catch (err) {
      console.error('Failed to parse DOCX file:', err);
      throw new Error('Invalid or corrupted DOCX file. Failed to extract document text.');
    }
  }

  // Convert DOCX buffer to PDF buffer using LibreOffice CLI
  async convertDocxToPdf(buffer: Buffer): Promise<Buffer | null> {
    const tempDir = os.tmpdir();
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const tempInputPath = path.join(tempDir, `input-${uniqueId}.docx`);

    try {
      fs.writeFileSync(tempInputPath, buffer);

      console.log(`DocumentProcessorService: Converting DOCX to PDF via LibreOffice...`);
      const tempOutputPath = path.join(tempDir, `input-${uniqueId}.pdf`);

      try {
        await execAsync(`soffice --headless --convert-to pdf --outdir "${tempDir}" "${tempInputPath}"`);
      } catch (libreErr) {
        if (process.platform === 'win32') {
          console.log(`DocumentProcessorService: LibreOffice not found. Falling back to Microsoft Word COM Object on Windows...`);
          const psCommand = `
            param([string]$in, [string]$out)
            try {
                $word = New-Object -ComObject Word.Application
                $doc = $word.Documents.Open($in, $false, $true, $false)
                $doc.SaveAs([ref] $out, [ref] 17)
                $doc.Close()
                $word.Quit()
            } catch {
                Write-Error $_.Exception.Message
                exit 1
            }
          `;
          const psScriptPath = path.join(tempDir, `convert-docx-${uniqueId}.ps1`);
          fs.writeFileSync(psScriptPath, psCommand);
          try {
            await execAsync(`powershell -ExecutionPolicy Bypass -File "${psScriptPath}" -in "${tempInputPath}" -out "${tempOutputPath}"`, { timeout: 30000 });
          } finally {
            if (fs.existsSync(psScriptPath)) {
              fs.unlinkSync(psScriptPath);
            }
          }
        } else {
          throw libreErr;
        }
      }

      if (fs.existsSync(tempOutputPath)) {
        const pdfBuffer = fs.readFileSync(tempOutputPath);
        fs.unlinkSync(tempOutputPath);
        console.log(`DocumentProcessorService: DOCX successfully converted to PDF (${pdfBuffer.length} bytes)`);
        return pdfBuffer;
      } else {
        console.warn('DocumentProcessorService: Converted PDF file not found at output path.');
        return null;
      }
    } catch (err) {
      console.warn('DocumentProcessorService: Failed to convert DOCX to PDF:', err);
      return null;
    } finally {
      if (fs.existsSync(tempInputPath)) {
        fs.unlinkSync(tempInputPath);
      }
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
      
      try {
        await execAsync(`soffice --headless --convert-to pdf --outdir "${tempDir}" "${tempInputPath}"`);
      } catch (libreErr) {
        if (process.platform === 'win32') {
          console.log(`DocumentProcessorService: LibreOffice not found. Falling back to Microsoft PowerPoint COM Object on Windows...`);
          const psCommand = `
            param([string]$in, [string]$out)
            try {
                $ppt = New-Object -ComObject PowerPoint.Application
                $presentation = $ppt.Presentations.Open($in, [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)
                $presentation.SaveAs($out, 32)
                $presentation.Close()
                $ppt.Quit()
            } catch {
                Write-Error $_.Exception.Message
                exit 1
            }
          `;
          const psScriptPath = path.join(tempDir, `convert-pptx-${uniqueId}.ps1`);
          const tempOutputPathPs = path.join(tempDir, `input-${uniqueId}.pdf`);
          fs.writeFileSync(psScriptPath, psCommand);
          try {
            await execAsync(`powershell -ExecutionPolicy Bypass -File "${psScriptPath}" -in "${tempInputPath}" -out "${tempOutputPathPs}"`, { timeout: 30000 });
          } finally {
            if (fs.existsSync(psScriptPath)) {
              fs.unlinkSync(psScriptPath);
            }
          }
        } else {
          throw libreErr;
        }
      }
      
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
