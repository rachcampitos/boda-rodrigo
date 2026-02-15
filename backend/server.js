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
  groupId:          { type: String, required: true, unique: true },
  displayName:      { type: String, required: true },
  members:          [{ type: String }],
  headCount:        { type: Number, required: true },
  attendance:       { type: String, enum: ['accept', 'decline'], required: true },
  respondedBy:      { type: String, required: true },
  attendingMembers: [{ type: String }],
  decliningMembers: [{ type: String }],
  plusOneName:       { type: String, default: null },
  totalAttending:   { type: Number, default: 0 },
  createdAt:        { type: Date, default: Date.now },
});

const Rsvp = mongoose.model('Rsvp', rsvpSchema);

// ── Express App ─────────────────────────────────────────
const app = express();

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'DELETE'],
}));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check RSVP status for a group (guest-facing, no auth)
app.get('/api/rsvp/check/:groupId', async (req, res) => {
  try {
    const rsvp = await Rsvp.findOne({ groupId: req.params.groupId });
    if (rsvp) {
      res.json({
        found: true,
        attendance: rsvp.attendance,
        respondedBy: rsvp.respondedBy,
        attendingMembers: rsvp.attendingMembers || [],
        decliningMembers: rsvp.decliningMembers || [],
        plusOneName: rsvp.plusOneName || null,
        totalAttending: rsvp.totalAttending || 0,
        createdAt: rsvp.createdAt,
      });
    } else {
      res.json({ found: false });
    }
  } catch (err) {
    console.error('Check RSVP error:', err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// Get accepted groups with attending details (public, for star constellation)
app.get('/api/rsvp/accepted', async (_req, res) => {
  try {
    const accepted = await Rsvp.find(
      { attendance: 'accept' },
      'groupId totalAttending attendingMembers -_id'
    ).lean();
    res.json(accepted.map(r => ({
      groupId: r.groupId,
      totalAttending: r.totalAttending || 0,
      attendingMembers: r.attendingMembers || [],
    })));
  } catch (err) {
    console.error('Accepted list error:', err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// Submit RSVP (upsert by groupId)
app.post('/api/rsvp', async (req, res) => {
  try {
    const {
      groupId, displayName, members, headCount,
      attendance, respondedBy,
      attendingMembers, decliningMembers, plusOneName, totalAttending,
    } = req.body;

    if (!groupId || !groupId.trim()) {
      return res.status(400).json({ message: 'Group ID is required' });
    }
    if (!['accept', 'decline'].includes(attendance)) {
      return res.status(400).json({ message: 'Attendance must be "accept" or "decline"' });
    }
    if (!respondedBy || !respondedBy.trim()) {
      return res.status(400).json({ message: 'Responded by is required' });
    }

    const rsvp = await Rsvp.findOneAndUpdate(
      { groupId: groupId.trim() },
      {
        groupId: groupId.trim(),
        displayName: displayName || '',
        members: members || [],
        headCount: headCount || 1,
        attendance,
        respondedBy: respondedBy.trim(),
        attendingMembers: attendingMembers || [],
        decliningMembers: decliningMembers || [],
        plusOneName: plusOneName || null,
        totalAttending: totalAttending || 0,
        createdAt: Date.now(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      message: 'RSVP received!',
      rsvp: {
        id: rsvp._id,
        groupId: rsvp.groupId,
        displayName: rsvp.displayName,
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
    const accepted = rsvps.filter(r => r.attendance === 'accept');
    const declined = rsvps.filter(r => r.attendance === 'decline');
    const totalAttendingPeople = accepted.reduce((sum, r) => sum + (r.totalAttending || r.headCount || 1), 0);
    const stats = {
      total: rsvps.length,
      accepted: accepted.length,
      declined: declined.length,
      totalHeadCount: rsvps.reduce((sum, r) => sum + (r.headCount || 1), 0),
      acceptedHeadCount: accepted.reduce((sum, r) => sum + (r.headCount || 1), 0),
      declinedHeadCount: declined.reduce((sum, r) => sum + (r.headCount || 1), 0),
      totalAttendingPeople,
    };
    res.json({ stats, rsvps });
  } catch (err) {
    console.error('Fetch RSVPs error:', err);
    res.status(500).json({ message: 'Failed to fetch RSVPs' });
  }
});

// Delete an RSVP (admin — requires key)
app.delete('/api/rsvps/:id', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const result = await Rsvp.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ message: 'RSVP not found' });
    res.json({ message: 'RSVP deleted', id: req.params.id });
  } catch (err) {
    console.error('Delete RSVP error:', err);
    res.status(500).json({ message: 'Failed to delete RSVP' });
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
