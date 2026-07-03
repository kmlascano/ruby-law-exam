import type { Request, Response } from 'express';
import { analyseContract } from '../services/contractService';
import { contractStore } from '../services/contractStore';
import { isHttpError } from '../errors/httpError';

function sendError(res: Response, statusCode: number, code: string, message: string): void {
  res.status(statusCode).json({ error: { code, message } });
}

export async function uploadContract(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    sendError(res, 400, 'NO_FILE', 'No file uploaded.');
    return;
  }

  try {
    const result = await analyseContract(req.file.buffer, req.file.mimetype, req.file.originalname);
    res.status(201).json({ data: result });
  } catch (error) {
    if (isHttpError(error)) {
      sendError(res, error.statusCode, error.code, error.message);
      return;
    }

    sendError(res, 500, 'ANALYSIS_FAILED', 'The contract could not be analysed.');
  }
}

export function getContract(req: Request, res: Response): void {
  const record = contractStore.get(req.params['id'] ?? '');

  if (!record) {
    sendError(res, 404, 'NOT_FOUND', 'Contract not found.');
    return;
  }

  res.json({ data: record });
}
