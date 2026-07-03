import { inflateRawSync, inflateSync } from 'zlib';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { HttpError } from '../errors/httpError';

export const PDF_MIME_TYPE = 'application/pdf';
export const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const SUPPORTED_MIME_TYPES = [PDF_MIME_TYPE, DOCX_MIME_TYPE] as const;

function normaliseText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function assertExtractedText(text: string): string {
  const normalised = normaliseText(text);
  const letters = normalised.match(/[A-Za-z]/g)?.length ?? 0;

  if (normalised.length < 50 || letters < 30) {
    throw new HttpError(
      422,
      'TEXT_EXTRACTION_EMPTY',
      'The file was parsed, but there was not enough readable contract text to analyse.'
    );
  }

  return normalised;
}

function decodePdfLiteralString(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_match: string, octal: string) =>
      String.fromCharCode(Number.parseInt(octal, 8))
    );
}

function extractTextOperatorsFromContent(content: string): string {
  const chunks: string[] = [];

  const singleTextOperators = content.matchAll(/\(((?:\\.|[^\\()])*)\)\s*(?:Tj|'|")/g);

  for (const match of singleTextOperators) {
    const value = match[1];

    if (value) {
      chunks.push(decodePdfLiteralString(value));
    }
  }

  const arrayTextOperators = content.matchAll(/\[((?:.|\n|\r)*?)\]\s*TJ/g);

  for (const match of arrayTextOperators) {
    const arrayBody = match[1];

    if (!arrayBody) {
      continue;
    }

    const strings = arrayBody.matchAll(/\(((?:\\.|[^\\()])*)\)/g);

    const lineParts: string[] = [];

    for (const stringMatch of strings) {
      const value = stringMatch[1];

      if (value) {
        lineParts.push(decodePdfLiteralString(value));
      }
    }

    if (lineParts.length > 0) {
      chunks.push(lineParts.join(''));
    }
  }

  return normaliseText(chunks.join('\n'));
}

function extractPdfStreams(buffer: Buffer): Buffer[] {
  const raw = buffer.toString('latin1');
  const streams: Buffer[] = [];

  let searchFrom = 0;

  while (searchFrom < raw.length) {
    const streamKeywordIndex = raw.indexOf('stream', searchFrom);

    if (streamKeywordIndex === -1) {
      break;
    }

    let streamStart = streamKeywordIndex + 'stream'.length;

    if (raw[streamStart] === '\r' && raw[streamStart + 1] === '\n') {
      streamStart += 2;
    } else if (raw[streamStart] === '\n' || raw[streamStart] === '\r') {
      streamStart += 1;
    }

    const streamEnd = raw.indexOf('endstream', streamStart);

    if (streamEnd === -1) {
      break;
    }

    const dictionaryStart = Math.max(0, streamKeywordIndex - 1000);
    const dictionaryText = raw.slice(dictionaryStart, streamKeywordIndex);

    let streamBuffer = buffer.subarray(streamStart, streamEnd);

    while (
      streamBuffer.length > 0 &&
      (streamBuffer[streamBuffer.length - 1] === 10 || streamBuffer[streamBuffer.length - 1] === 13)
    ) {
      streamBuffer = streamBuffer.subarray(0, streamBuffer.length - 1);
    }

    if (dictionaryText.includes('/FlateDecode')) {
      try {
        streams.push(inflateSync(streamBuffer));
      } catch {
        try {
          streams.push(inflateRawSync(streamBuffer));
        } catch {
          streams.push(streamBuffer);
        }
      }
    } else {
      streams.push(streamBuffer);
    }

    searchFrom = streamEnd + 'endstream'.length;
  }

  return streams;
}

function extractTextWithPdfStringFallback(buffer: Buffer): string {
  const chunks: string[] = [];

  const raw = buffer.toString('latin1');
  const rawText = extractTextOperatorsFromContent(raw);

  if (rawText) {
    chunks.push(rawText);
  }

  const streams = extractPdfStreams(buffer);

  for (const stream of streams) {
    const streamText = extractTextOperatorsFromContent(stream.toString('latin1'));

    if (streamText) {
      chunks.push(streamText);
    }
  }

  return normaliseText(chunks.join('\n\n'));
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const result = await pdfParse(buffer);
    return assertExtractedText(result.text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error('pdf-parse failed; trying fallback extractor', {
      message,
    });

    const fallbackText = extractTextWithPdfStringFallback(buffer);

    if (fallbackText.length >= 50) {
      return assertExtractedText(fallbackText);
    }

    throw new HttpError(
      422,
      'TEXT_EXTRACTION_FAILED',
      'The contract text could not be extracted from the uploaded file. The PDF may be scanned, image-only, encrypted, or missing a readable text layer.'
    );
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return assertExtractedText(result.value);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);

    console.error('DOCX extraction failed', {
      message,
    });

    throw new HttpError(
      422,
      'TEXT_EXTRACTION_FAILED',
      'The contract text could not be extracted from the uploaded file.'
    );
  }
}

export async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === PDF_MIME_TYPE) {
    return extractPdfText(buffer);
  }

  if (mimetype === DOCX_MIME_TYPE) {
    return extractDocxText(buffer);
  }

  throw new HttpError(400, 'UNSUPPORTED_FILE_TYPE', `Unsupported file type: ${mimetype}`);
}