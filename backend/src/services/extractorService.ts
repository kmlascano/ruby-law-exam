// TODO: implement text extraction from PDF and DOCX buffers
// Suggested libraries: pdf-parse (PDF), mammoth (DOCX)

export async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === 'application/pdf') {
    // TODO: use pdf-parse to extract text
    throw new Error('PDF extraction not implemented yet');
  }

  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // TODO: use mammoth to extract text
    throw new Error('DOCX extraction not implemented yet');
  }

  throw new Error(`Unsupported file type: ${mimetype}`);
}
