import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { HttpError } from '../errors/httpError';
import {
  analyseContract,
  clearAnalysisHistory,
  deleteAnalysis,
  getAnalysis,
  listAnalysisHistory,
} from '../services/contractService';
import { SUPPORTED_MIME_TYPES } from '../services/extractorService';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const contractRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_request, file, callback) => {
    if (SUPPORTED_MIME_TYPES.includes(file.mimetype as (typeof SUPPORTED_MIME_TYPES)[number])) {
      callback(null, true);
      return;
    }

    callback(
      new HttpError(
        400,
        'UNSUPPORTED_FILE_TYPE',
        'Unsupported file type. Please upload a PDF or DOCX contract.'
      )
    );
  },
});

contractRoutes.get('/history', (_request: Request, response: Response) => {
  response.json({ data: listAnalysisHistory() });
});

contractRoutes.delete('/history', (_request: Request, response: Response) => {
  const deletedCount = clearAnalysisHistory();

  response.json({
    data: {
      deleted: true,
      deletedCount,
    },
  });
});

contractRoutes.get('/:id', (request: Request, response: Response) => {
  const analysis = getAnalysis(request.params.id);

  if (!analysis) {
    throw new HttpError(404, 'CONTRACT_ANALYSIS_NOT_FOUND', 'Saved analysis was not found.');
  }

  response.json({ data: analysis });
});

contractRoutes.delete('/:id', (request: Request, response: Response) => {
  const wasDeleted = deleteAnalysis(request.params.id);

  if (!wasDeleted) {
    throw new HttpError(404, 'CONTRACT_ANALYSIS_NOT_FOUND', 'Saved analysis was not found.');
  }

  response.json({
    data: {
      id: request.params.id,
      deleted: true,
    },
  });
});

contractRoutes.post('/upload', upload.single('file'), async (request: Request, response: Response, next: NextFunction) => {
  try {
    if (!request.file) {
      throw new HttpError(400, 'FILE_REQUIRED', 'Please upload a PDF or DOCX contract.');
    }

    const result = await analyseContract(request.file.buffer, request.file.mimetype, request.file.originalname);

    response.json({
      data: result,
      meta: {
        fromCache: result.fromCache === true,
      },
    });
  } catch (error) {
    next(error);
  }
});

contractRoutes.use((error: unknown, _request: Request, response: Response, next: NextFunction) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const typedError = error as {
    status?: number;
    statusCode?: number;
    code?: string;
    message?: string;
  };

  const status = typeof typedError.statusCode === 'number'
    ? typedError.statusCode
    : typeof typedError.status === 'number'
      ? typedError.status
      : 500;

  const code = typeof typedError.code === 'string' ? typedError.code : 'INTERNAL_SERVER_ERROR';
  const message = typeof typedError.message === 'string' && typedError.message.trim().length > 0
    ? typedError.message
    : 'The server could not complete the request.';

  response.status(status).json({
    error: {
      code,
      message,
    },
  });
});
