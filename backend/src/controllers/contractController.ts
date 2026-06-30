import { Request, Response } from 'express';
import { analyseContract } from '../services/contractService';
import { contractStore } from '../services/contractStore';

export async function uploadContract(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: { code: 'NO_FILE', message: 'No file uploaded' } });
    return;
  }

  try {
    const result = await analyseContract(req.file.buffer, req.file.mimetype, req.file.originalname);
    res.status(201).json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    res.status(500).json({ error: { code: 'ANALYSIS_FAILED', message } });
  }
}

export function getContract(req: Request, res: Response): void {
  const record = contractStore.get(req.params['id'] ?? '');
  if (!record) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contract not found' } });
    return;
  }
  res.json({ data: record });
}
