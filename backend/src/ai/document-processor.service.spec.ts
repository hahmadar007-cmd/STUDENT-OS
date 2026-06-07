/* eslint-disable @typescript-eslint/no-require-imports */
const ActualAdmZip = require('adm-zip');

// The source uses `import * as AdmZip from 'adm-zip'` + @ts-ignore.
// ts-jest wraps this with __importStar. We mark the module as ESM so
// __importStar returns the function directly, making `new AdmZip()` work.
jest.mock('adm-zip', () => {
  const Actual = jest.requireActual('adm-zip');
  Actual.__esModule = true;
  Actual.default = Actual;
  return Actual;
});

import { DocumentProcessorService } from './document-processor.service';

describe('DocumentProcessorService', () => {
  let service: DocumentProcessorService;

  beforeEach(() => {
    service = new DocumentProcessorService();
  });

  describe('extractPptxText', () => {
    it('should extract text from a valid pptx buffer', () => {
      const zip = new ActualAdmZip();
      const slideXml = `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:sp><p:txBody><a:p><a:r><a:t>Hello World</a:t></a:r></a:p></p:txBody></p:sp>
    <p:sp><p:txBody><a:p><a:r><a:t>Second line</a:t></a:r></a:p></p:txBody></p:sp>
  </p:spTree></p:cSld>
</p:sld>`;
      zip.addFile('ppt/slides/slide1.xml', Buffer.from(slideXml, 'utf8'));

      const result = service.extractPptxText(zip.toBuffer());
      expect(result).toHaveLength(1);
      expect(result[0].pageNum).toBe(1);
      expect(result[0].text).toContain('Hello World');
      expect(result[0].text).toContain('Second line');
    });

    it('should handle multiple slides and sort them correctly', () => {
      const zip = new ActualAdmZip();
      const makeSlideXml = (text: string) => `<?xml version="1.0"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:sp><p:txBody><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp>
  </p:spTree></p:cSld>
</p:sld>`;

      // Add slides out of order
      zip.addFile(
        'ppt/slides/slide3.xml',
        Buffer.from(makeSlideXml('Third'), 'utf8'),
      );
      zip.addFile(
        'ppt/slides/slide1.xml',
        Buffer.from(makeSlideXml('First'), 'utf8'),
      );
      zip.addFile(
        'ppt/slides/slide2.xml',
        Buffer.from(makeSlideXml('Second'), 'utf8'),
      );

      const result = service.extractPptxText(zip.toBuffer());
      expect(result).toHaveLength(3);
      expect(result[0].text).toBe('First');
      expect(result[1].text).toBe('Second');
      expect(result[2].text).toBe('Third');
      expect(result[0].pageNum).toBe(1);
      expect(result[1].pageNum).toBe(2);
      expect(result[2].pageNum).toBe(3);
    });

    it('should mark empty slides with placeholder text', () => {
      const zip = new ActualAdmZip();
      const emptySlide = `<?xml version="1.0"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree></p:spTree></p:cSld>
</p:sld>`;
      zip.addFile('ppt/slides/slide1.xml', Buffer.from(emptySlide, 'utf8'));

      const result = service.extractPptxText(zip.toBuffer());
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('[Empty slide 1]');
    });

    it('should throw on invalid buffer', () => {
      expect(() => service.extractPptxText(Buffer.from('not a zip'))).toThrow(
        'Invalid or corrupted PPTX file',
      );
    });
  });
});
