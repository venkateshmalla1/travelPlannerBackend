import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import 'dotenv/config';
import apiRouter from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Essential Global Middlewares
app.use(cors());
app.use(express.json());

// Main Route Mapping Namespace
app.use('/api', apiRouter);

// Health Check Path
app.get('/health', (req, res) => res.status(200).json({ status: "healthy" }));

// Establish Database Connections
mongoose.connect(process.env.MONGO_URI || process.env.DATABASE_URL)
  .then(() => {
    console.log('✅ Connected safely to Database Engine Cluster.');
    app.listen(PORT, () => console.log(`🚀 Server compiling successfully on Port context ${PORT}`));
  })
  .catch(err => {
    console.error('❌ Database context cluster coupling failure:', err);
    process.exit(1);
  });

export default app;