import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import routes from './routes/index.js';
import morgan from 'morgan';
import { WebinarOnRecording } from './models/Webinar.js';

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

// Test route
app.get('/', (req, res) => {
  res.send("RLS's client portal API is running");
});

app.post("/webhook/daily", async (req, res) => {
  const event = req.body;

  // Log all incoming events for debugging
  console.log("Received Daily.co webhook:", event);

  // Respond immediately with 200 OK
  res.status(200).send("Webhook received");

  // Handle events asynchronously
  switch (event) {
    case "recording.started":
      console.log("Recording started for room:", event.payload.roomName);
      break;

    case "recording.ready-to-download":

      console.log("Recording ready to download:", event.payload.recording.url);

      const webinar = await WebinarOnRecording.findOne({});

      if (!webinar) {
        return res.status(404).json({ message: 'Webinar not found' });
      }
      webinar.recording = event.payload.recording.url;
      await webinar.save();

      break;

    default:
      console.log("Unhandled event type:", event.event);
  }
});

// Auth routes
app.use('/api', routes);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// 404 handler for all other routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
