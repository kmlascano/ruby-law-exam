import { Router } from 'express';
import multer from 'multer';
import { uploadContract, getContract } from '../controllers/contractController';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only .pdf and .docx files are accepted'));
    }
  },
});

export const contractRoutes = Router();

contractRoutes.post('/upload', upload.single('file'), uploadContract);
contractRoutes.get('/:id', getContract);
