import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import routes from './routes/index.js';
import morgan from 'morgan';

dotenv.config();
connectDB();

const app = express();

app.use(morgan('dev')); // Use 'dev' format for concise logs

// Allowed origins: local dev (Vite 5173) + legacy 8080 + production
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:8080',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000', // Add common dev port
  'https://localhost:5173', // Add HTTPS variant
];

app.use(cors({
  origin: allowedOrigins, // allow local + deployed
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

// Body parser
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Test route
app.get('/', (req, res) => {
  res.send("RLS's client portal API is running");
});

// Auth routes
app.use('/api', routes);

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
