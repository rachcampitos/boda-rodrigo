const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// ── Config ──────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/wedding-rsvp';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:8000', 'http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8000'];
const ADMIN_KEY = process.env.ADMIN_KEY || 'frankie-rodrigo-2026';

// ── Mongoose Model ──────────────────────────────────────
const rsvpSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  attendance: { type: String, enum: ['accept', 'decline'], required: true },
  createdAt:  { type: Date, default: Date.now },
});

const Rsvp = mongoose.model('Rsvp', rsvpSchema);

// ── Express App ─────────────────────────────────────────
const app = express();

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Submit RSVP
app.post('/api/rsvp', async (req, res) => {
  try {
    const { name, attendance } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!['accept', 'decline'].includes(attendance)) {
      return res.status(400).json({ message: 'Attendance must be "accept" or "decline"' });
    }

    const rsvp = await Rsvp.create({
      name: name.trim(),
      attendance,
    });

    res.status(201).json({
      message: 'RSVP received!',
      rsvp: {
        id: rsvp._id,
        name: rsvp.name,
        attendance: rsvp.attendance,
      },
    });
  } catch (err) {
    console.error('RSVP error:', err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// Get all RSVPs (admin — requires key)
app.get('/api/rsvps', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const rsvps = await Rsvp.find().sort({ createdAt: -1 });
    const stats = {
      total: rsvps.length,
      accepted: rsvps.filter(r => r.attendance === 'accept').length,
      declined: rsvps.filter(r => r.attendance === 'decline').length,
      totalAttending: rsvps.filter(r => r.attendance === 'accept').length,
    };
    res.json({ stats, rsvps });
  } catch (err) {
    console.error('Fetch RSVPs error:', err);
    res.status(500).json({ message: 'Failed to fetch RSVPs' });
  }
});

// ── Start ───────────────────────────────────────────────
async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`RSVP API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
