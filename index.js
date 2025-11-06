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

  // Respond immediately
  res.status(200).send("Webhook received");

  if (event.type === "recording.ready-to-download") {
    const { recording_id, room_name } = event.payload;

    // Fetch download link from Daily API
    const response = await fetch(`https://api.daily.co/v1/recordings/${recording_id}/access-link`, {
      headers: {
        "Authorization": `Bearer ${process.env.DAILY_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    const downloadUrl = data.url;

    console.log("Recording ready for room:", room_name);
    console.log("Download URL:", downloadUrl);

    // Save to your DB
    const webinar = await WebinarOnRecording.findOne();
    if (webinar) {
      webinar.recording = downloadUrl;
      await webinar.save();
      console.log("Recording URL saved to webinar");
    }
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
