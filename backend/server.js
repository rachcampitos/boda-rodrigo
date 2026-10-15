const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const archiver = require('archiver');

// ── Config ──────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/wedding-rsvp';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:8000', 'http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8000'];
const ADMIN_KEY = process.env.ADMIN_KEY || 'frankie-rodrigo-2026';
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '0e91e788ed10356e3800cb018e7ec41e';
const CF_STREAM_TOKEN = process.env.CF_STREAM_TOKEN || '';
const CF_LIVE_INPUT_ID = process.env.CF_LIVE_INPUT_ID || 'c7c1bf587282e31d584691b2973bca7d';
const CF_CUSTOMER_CODE = process.env.CF_CUSTOMER_CODE || '0plszfdakt07dwjq';
// Recordings started before this moment are tests and never shown to guests (3 PM in New York on the wedding day)
const WEDDING_STREAM_FROM = new Date(process.env.WEDDING_STREAM_FROM || '2026-10-15T19:00:00Z');

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
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
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

// ── Photos ──────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }, // 6 MB max
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

const photoSchema = new mongoose.Schema({
  imageData: { type: Buffer, required: true },
  mimeType:  { type: String, default: 'image/jpeg' },
  guestName: { type: String, default: '' },
  status:    { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
});

const Photo = mongoose.model('Photo', photoSchema);

// File name like 2026-10-15_2134_Maria.jpg (New York time, where the wedding is)
function photoFileName(photo) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(photo.createdAt || new Date()).map(p => [p.type, p.value]));
  const name = (photo.guestName || 'Guest')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'Guest';
  const ext = (photo.mimeType || '').includes('png') ? 'png' : 'jpg';
  return `${parts.year}-${parts.month}-${parts.day}_${parts.hour}${parts.minute}${parts.second}_${name}.${ext}`;
}

// Short-lived tokens so the ZIP can be a plain link without putting the admin key in the URL
const zipTokens = new Map();

// Upload a guest photo (public)
app.post('/api/photos', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No photo uploaded' });
  try {
    const photo = await Photo.create({
      imageData: req.file.buffer,
      mimeType:  req.file.mimetype || 'image/jpeg',
      guestName: (req.body.guestName || '').trim().slice(0, 60),
    });
    res.status(201).json({ id: photo._id, status: photo.status });
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Serve photo binary (public)
app.get('/api/photos/:id/image', async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id).select('imageData mimeType status guestName createdAt');
    if (!photo) return res.status(404).json({ message: 'Not found' });
    res.set('Content-Type', photo.mimeType || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    if (req.query.download) {
      res.set('Content-Disposition', `attachment; filename="${photoFileName(photo)}"`);
    }
    res.send(photo.imageData);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load image' });
  }
});

// List pending photos (admin)
app.get('/api/photos/pending', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const photos = await Photo.find({ status: 'pending' })
      .select('-imageData').sort({ createdAt: 1 }).lean();
    res.json(photos.map(p => ({
      id: p._id, guestName: p.guestName, createdAt: p.createdAt,
      imageUrl: `/api/photos/${p._id}/image`,
    })));
  } catch (err) {
    res.status(500).json({ message: 'Failed' });
  }
});

// Create a one-time token to download all approved photos (admin)
app.post('/api/photos/approved/zip-token', (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ message: 'Unauthorized' });
  const now = Date.now();
  for (const [t, exp] of zipTokens) if (exp < now) zipTokens.delete(t);
  const token = crypto.randomBytes(24).toString('hex');
  zipTokens.set(token, now + 5 * 60 * 1000);
  res.json({ token });
});

// Download all approved photos as a ZIP (token from zip-token)
app.get('/api/photos/approved/zip', async (req, res) => {
  const exp = zipTokens.get(req.query.token);
  zipTokens.delete(req.query.token);
  if (!exp || exp < Date.now()) return res.status(401).json({ message: 'Link expired' });

  res.set('Content-Type', 'application/zip');
  res.set('Content-Disposition', 'attachment; filename="frankie-rodrigo-photos.zip"');

  // JPEGs are already compressed, so store them as-is
  const zip = archiver('zip', { store: true });
  zip.on('error', err => {
    console.error('ZIP failed:', err.message);
    res.destroy(err);
  });
  zip.pipe(res);

  try {
    const used = new Set();
    const cursor = Photo.find({ status: 'approved' })
      .select('imageData mimeType guestName createdAt').sort({ createdAt: 1 }).cursor();
    for await (const photo of cursor) {
      let name = photoFileName(photo);
      for (let i = 2; used.has(name); i++) name = photoFileName(photo).replace(/(\.\w+)$/, `_${i}$1`);
      used.add(name);
      zip.append(photo.imageData, { name, date: photo.createdAt });
    }
    await zip.finalize();
  } catch (err) {
    console.error('ZIP failed:', err.message);
    zip.abort();
    res.destroy(err);
  }
});

// List approved photos (public gallery)
app.get('/api/photos/approved', async (_req, res) => {
  try {
    const photos = await Photo.find({ status: 'approved' })
      .select('-imageData').sort({ reviewedAt: -1 }).lean();
    res.json(photos.map(p => ({
      id: p._id, guestName: p.guestName, approvedAt: p.reviewedAt,
      imageUrl: `/api/photos/${p._id}/image`,
    })));
  } catch (err) {
    res.status(500).json({ message: 'Failed' });
  }
});

// Approve or reject a photo (admin)
app.patch('/api/photos/:id/status', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ message: 'Unauthorized' });
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be "approved" or "rejected"' });
  }
  try {
    const photo = await Photo.findByIdAndUpdate(
      req.params.id,
      { status, reviewedAt: new Date() },
      { new: true }
    ).select('-imageData');
    if (!photo) return res.status(404).json({ message: 'Not found' });
    res.json({ id: photo._id, status: photo.status });
  } catch (err) {
    res.status(500).json({ message: 'Failed' });
  }
});

// Delete a photo (admin)
app.delete('/api/photos/:id', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await Photo.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Photo deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: 'Failed' });
  }
});

// ── Live stream recordings (Cloudflare Stream) ──────────

async function cfStream(path, method = 'GET') {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream${path}`, {
    method,
    headers: { Authorization: `Bearer ${CF_STREAM_TOKEN}` },
  });
  const data = await res.json().catch(() => ({}));
  // DELETE answers 200 with an empty body
  if (method === 'DELETE' && res.ok) return null;
  if (!res.ok || !data.success) {
    const detail = (data.errors || []).map(e => e.message).join('; ');
    throw new Error(`Cloudflare Stream ${method} ${path} ${res.status} ${detail}`);
  }
  return data.result;
}

function mapDownload(result) {
  const d = (result && result.default) || {};
  return { status: d.status || 'none', percent: Math.round(d.percentComplete || 0), url: d.url || null };
}

// List recordings of the wedding live input (admin)
app.get('/api/recordings', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ message: 'Unauthorized' });
  if (!CF_STREAM_TOKEN) return res.status(503).json({ message: 'Stream not configured' });
  try {
    const videos = await cfStream(`/live_inputs/${CF_LIVE_INPUT_ID}/videos`);
    res.json(videos
      .sort((a, b) => new Date(b.created) - new Date(a.created))
      .map(v => ({
        id: v.uid,
        createdAt: v.created,
        duration: v.duration,
        live: v.status && v.status.state === 'live-inprogress',
        ready: !!v.readyToStream,
        thumbnail: `https://customer-${CF_CUSTOMER_CODE}.cloudflarestream.com/${v.uid}/thumbnails/thumbnail.jpg?height=360`,
        playerUrl: `https://customer-${CF_CUSTOMER_CODE}.cloudflarestream.com/${v.uid}/iframe`,
      })));
  } catch (err) {
    res.status(502).json({ message: 'Failed to load recordings' });
  }
});

// Public live status for the Watch Live section: is it on air, and which wedding recordings exist
let liveCache = { at: 0, data: null };
app.get('/api/live', async (_req, res) => {
  if (Date.now() - liveCache.at < 15000 && liveCache.data) return res.json(liveCache.data);
  try {
    const lifecycle = await fetch(`https://customer-${CF_CUSTOMER_CODE}.cloudflarestream.com/${CF_LIVE_INPUT_ID}/lifecycle`)
      .then(r => r.json());
    let recordings = [];
    if (CF_STREAM_TOKEN) {
      const videos = await cfStream(`/live_inputs/${CF_LIVE_INPUT_ID}/videos`);
      recordings = videos
        .filter(v => new Date(v.created) >= WEDDING_STREAM_FROM)
        .filter(v => v.readyToStream && !(v.status && v.status.state === 'live-inprogress'))
        .sort((a, b) => new Date(a.created) - new Date(b.created))
        .map(v => ({ id: v.uid, duration: v.duration, createdAt: v.created }));
    }
    liveCache = { at: Date.now(), data: { live: !!lifecycle.live, recordings } };
    res.json(liveCache.data);
  } catch (err) {
    console.error('Live status failed:', err.message);
    res.json({ live: false, recordings: [] });
  }
});

// Delete a recording of the wedding live input (admin)
app.delete('/api/recordings/:uid', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ message: 'Unauthorized' });
  if (!CF_STREAM_TOKEN) return res.status(503).json({ message: 'Stream not configured' });
  if (!/^[a-f0-9]{32}$/.test(req.params.uid)) return res.status(400).json({ message: 'Invalid id' });
  try {
    // Only allow deleting recordings of this live input, never other videos in the account
    const videos = await cfStream(`/live_inputs/${CF_LIVE_INPUT_ID}/videos`);
    const video = videos.find(v => v.uid === req.params.uid);
    if (!video) return res.status(404).json({ message: 'Not found' });
    if (video.status && video.status.state === 'live-inprogress') {
      return res.status(409).json({ message: 'Still broadcasting' });
    }
    await cfStream(`/${req.params.uid}`, 'DELETE');
    liveCache = { at: 0, data: null };
    res.json({ message: 'Recording deleted', id: req.params.uid });
  } catch (err) {
    console.error('Recording delete failed:', err.message);
    res.status(502).json({ message: 'Failed to delete recording' });
  }
});

// Get or create the MP4 download of a recording (admin)
app.get('/api/recordings/:uid/download', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ message: 'Unauthorized' });
  if (!CF_STREAM_TOKEN) return res.status(503).json({ message: 'Stream not configured' });
  if (!/^[a-f0-9]{32}$/.test(req.params.uid)) return res.status(400).json({ message: 'Invalid id' });
  try {
    // GET fails while no download exists yet, so fall back to creating it
    let download = mapDownload(await cfStream(`/${req.params.uid}/downloads`).catch(() => null));
    if (download.status === 'none') {
      download = mapDownload(await cfStream(`/${req.params.uid}/downloads`, 'POST'));
    }
    res.json(download);
  } catch (err) {
    console.error('Recording download failed:', err.message);
    res.status(502).json({ message: 'Failed to prepare download' });
  }
});

// ── Live chat ───────────────────────────────────────────

const chatSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  text:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

const ChatMessage = mongoose.model('ChatMessage', chatSchema);

const mapChat = m => ({ id: m._id, name: m.name, text: m.text, createdAt: m.createdAt });

// One message every 3 seconds per visitor, enough for a chat and stops floods
const chatLastPost = new Map();

// Latest messages, or only the newer ones with ?since= (public)
app.get('/api/chat', async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : null;
    const query = since && !isNaN(since) ? { createdAt: { $gt: since } } : {};
    const messages = await ChatMessage.find(query).sort({ createdAt: -1 }).limit(300).lean();
    res.json(messages.reverse().map(mapChat));
  } catch (err) {
    res.status(500).json({ message: 'Failed' });
  }
});

// Post a message (public)
app.post('/api/chat', async (req, res) => {
  const name = String((req.body && req.body.name) || '').trim().slice(0, 40);
  const text = String((req.body && req.body.text) || '').trim().slice(0, 300);
  if (!name || !text) return res.status(400).json({ message: 'Name and message required' });
  const ip = req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.ip;
  const now = Date.now();
  if (now - (chatLastPost.get(ip) || 0) < 3000) return res.status(429).json({ message: 'Too fast' });
  chatLastPost.set(ip, now);
  if (chatLastPost.size > 5000) chatLastPost.clear();
  try {
    const message = await ChatMessage.create({ name, text });
    res.status(201).json(mapChat(message));
  } catch (err) {
    res.status(500).json({ message: 'Failed' });
  }
});

// All messages, oldest first (admin)
app.get('/api/chat/all', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const messages = await ChatMessage.find().sort({ createdAt: 1 }).lean();
    res.json(messages.map(mapChat));
  } catch (err) {
    res.status(500).json({ message: 'Failed' });
  }
});

// Delete a message (admin)
app.delete('/api/chat/:id', async (req, res) => {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await ChatMessage.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Message deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: 'Failed' });
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
