import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { contractRoutes } from './routes/contracts';
import { evalRouter } from './controllers/evalController';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/contracts', contractRoutes);
app.use('/api/evals', evalRouter);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
