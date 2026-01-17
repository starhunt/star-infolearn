/**
 * Text Extractor Service - Handles text extraction from PDFs and images
 */

import * as pdfjsLib from 'pdfjs-dist';
import { TextExtractionResult } from '../types/ai';
import { TextExtractionError } from '../types/errors';

// PDF.js worker 설정 (Obsidian 환경에서는 인라인 워커 사용)
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

interface PDFTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

export class TextExtractorService {
  /**
   * Extract text from file
   */
  async extractTextFromFile(file: File): Promise<TextExtractionResult[]> {
    const fileType = file.type;

    try {
      if (fileType.includes('pdf')) {
        return await this.extractFromPDF(file);
      } else if (fileType.includes('image')) {
        return await this.extractFromImage(file);
      } else if (fileType.includes('text')) {
        return await this.extractFromText(file);
      } else {
        throw new TextExtractionError(
          `Unsupported file type: ${fileType}`,
          fileType
        );
      }
    } catch (error) {
      if (error instanceof TextExtractionError) {
        throw error;
      }
      throw new TextExtractionError(
        `Failed to extract text from file: ${file.name}`,
        fileType,
        error
      );
    }
  }

  /**
   * Extract text from PDF using PDF.js
   */
  private async extractFromPDF(file: File): Promise<TextExtractionResult[]> {
    const arrayBuffer = await file.arrayBuffer();
    const results: TextExtractionResult[] = [];

    try {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        for (const item of textContent.items) {
          if ('str' in item && item.str.trim()) {
            const textItem = item as PDFTextItem;
            const transform = textItem.transform;

            // transform[4] = x, transform[5] = y (PDF 좌표계)
            // PDF 좌표계는 왼쪽 하단이 원점이므로 변환 필요
            const x = transform[4];
            const y = viewport.height - transform[5];

            results.push({
              text: textItem.str,
              bounds: {
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(textItem.width || 100),
                height: Math.round(textItem.height || 20),
              },
            });
          }
        }
      }

      return results;
    } catch (error) {
      throw new TextExtractionError(
        'Failed to parse PDF file',
        'pdf',
        error
      );
    }
  }

  /**
   * Extract text from image (placeholder - OCR 구현 필요)
   * 실제 구현시 Tesseract.js 또는 외부 OCR API 사용 권장
   */
  private async extractFromImage(file: File): Promise<TextExtractionResult[]> {
    // OCR 구현이 필요함
    // Tesseract.js는 번들 크기가 크므로, 외부 서비스 사용 권장
    console.warn('Image OCR not implemented. Using placeholder data.');

    return this.getPlaceholderResults('이미지에서 텍스트 추출 기능은 아직 구현되지 않았습니다.');
  }

  /**
   * Extract text from plain text file
   */
  private async extractFromText(file: File): Promise<TextExtractionResult[]> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const results: TextExtractionResult[] = [];

    let y = 10;
    for (const line of lines) {
      results.push({
        text: line.trim(),
        bounds: {
          x: 10,
          y,
          width: Math.min(line.length * 8, 600),
          height: 20,
        },
      });
      y += 25;
    }

    return results;
  }

  /**
   * Get placeholder results for unimplemented features
   */
  private getPlaceholderResults(message: string): TextExtractionResult[] {
    return [
      {
        text: message,
        bounds: { x: 10, y: 10, width: 400, height: 20 },
      },
    ];
  }

  /**
   * Extract full text content as a single string
   */
  async extractFullText(file: File): Promise<string> {
    const results = await this.extractTextFromFile(file);
    return results.map(r => r.text).join(' ');
  }

  /**
   * Extract text from ArrayBuffer (PDF)
   */
  async extractFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<TextExtractionResult[]> {
    const results: TextExtractionResult[] = [];

    try {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        for (const item of textContent.items) {
          if ('str' in item && item.str.trim()) {
            const textItem = item as PDFTextItem;
            const transform = textItem.transform;

            const x = transform[4];
            const y = viewport.height - transform[5];

            results.push({
              text: textItem.str,
              bounds: {
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(textItem.width || 100),
                height: Math.round(textItem.height || 20),
              },
            });
          }
        }
      }

      return results;
    } catch (error) {
      throw new TextExtractionError(
        'Failed to parse PDF from ArrayBuffer',
        'pdf',
        error
      );
    }
  }

  /**
   * Get text at specific region
   */
  getTextInRegion(
    results: TextExtractionResult[],
    x: number,
    y: number,
    width: number,
    height: number
  ): string[] {
    return results
      .filter(result => {
        const resultX = result.bounds.x;
        const resultY = result.bounds.y;
        const resultWidth = result.bounds.width;
        const resultHeight = result.bounds.height;

        // Check if result overlaps with region
        return (
          resultX < x + width &&
          resultX + resultWidth > x &&
          resultY < y + height &&
          resultY + resultHeight > y
        );
      })
      .map(r => r.text);
  }

  /**
   * Combine adjacent text items into sentences
   */
  combineTextItems(results: TextExtractionResult[], maxGap: number = 50): TextExtractionResult[] {
    if (results.length === 0) return [];

    // Sort by y position, then x position
    const sorted = [...results].sort((a, b) => {
      const yDiff = a.bounds.y - b.bounds.y;
      if (Math.abs(yDiff) < 10) {
        return a.bounds.x - b.bounds.x;
      }
      return yDiff;
    });

    const combined: TextExtractionResult[] = [];
    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const sameRow = Math.abs(next.bounds.y - current.bounds.y) < 10;
      const closeEnough = next.bounds.x - (current.bounds.x + current.bounds.width) < maxGap;

      if (sameRow && closeEnough) {
        // Combine with current
        current.text += ' ' + next.text;
        current.bounds.width = next.bounds.x + next.bounds.width - current.bounds.x;
      } else {
        // Start new item
        combined.push(current);
        current = { ...next };
      }
    }

    combined.push(current);
    return combined;
  }
}
