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

// Allowed origins: local dev + production frontend
const allowedOrigins = [process.env.CLIENT_URL || 'http://localhost:8080'];

// CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// Handle preflight OPTIONS requests correctly
app.options(
  '*',
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json());

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
