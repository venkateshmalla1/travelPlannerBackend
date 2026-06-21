import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import apiRoutes from './routes/api.js';

dotenv.config();
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/api', apiRoutes);

app.get('/health', (req, res) => res.status(200).json({ status: 'Online', date: new Date() }));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/travelPlanner';

export const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Successfully connected to MongoDB ("travelPlanner") database.');
    return app.listen(PORT, () => console.log(`Backend server running effectively on port: ${PORT}`));
  } catch (err) {
    console.error('Critical database connection failure:', err);
    process.exit(1);
  }
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer();
}

export default app;
