/**
 * RapidForensics — Express Backend
 * Provides REST APIs for:
 *  - Case management (create, list, get)
 *  - Evidence file upload with SHA-256 hashing (via multer)
 */
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose'); // [AI] Used for the Report Mongoose schema
const aiRoutes = require('./routes/aiRoutes');
const hashRoutes = require('./routes/hashRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// // 🔥 ADD THIS
// const ReportSchema = new mongoose.Schema({
//   content: String,
//   summary: String,
//   riskScore: String,
//   createdAt: { type: Date, default: Date.now }
// });

// const Report = mongoose.model("Report", ReportSchema);
app.get("/test-db", async (req, res) => {
  try {
    const test = new Report({
      content: "test data",
      summary: "test summary",
      riskScore: "Low"
    });

    await test.save();

    res.send("Saved to DB");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
  }
});

// ─── Directories ─────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const CASES_FILE = path.join(DATA_DIR, 'cases.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure required directories exist on startup (handle Vercel read-only filesystem)
[DATA_DIR, UPLOADS_DIR].forEach(dir => {
    try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
        console.warn(`  ⚠  Could not create directory ${dir}: ${err.message}`);
    }
});

// Seed empty data stores if not present
try {
    if (!fs.existsSync(CASES_FILE)) fs.writeFileSync(CASES_FILE, JSON.stringify([], null, 2));
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
} catch (err) {
    console.warn(`  ⚠  Could not seed local databases: ${err.message}`);
}

// ─── [AI] Report Schema & Store ───────────────────────────────────────────────
/**
 * Report "schema" — mirrors a Mongoose schema but persists to a JSON file
 * because this project uses flat-file storage (no MongoDB configured).
 *
 * Fields:
 *   id        (String)  — UUID primary key
 *   content   (String)  — the raw text that was analysed
 *   summary   (String)  — AI-generated summary
 *   riskScore (String)  — "Low" | "Medium" | "High"
 *   createdAt (Date)    — ISO timestamp, defaults to now
 */
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
try {
    if (!fs.existsSync(REPORTS_FILE)) fs.writeFileSync(REPORTS_FILE, JSON.stringify([], null, 2));
} catch (err) {
    console.warn(`  ⚠  Could not seed local reports database: ${err.message}`);
}

async function readReports() {
    const raw = await fsp.readFile(REPORTS_FILE, 'utf8');
    return JSON.parse(raw);
}
async function writeReports(reports) {
    await fsp.writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2));
}

/**
 * createReport — factory that mirrors a Mongoose model's .save() pattern.
 * @param {{ content: string, summary: string, riskScore: string }} data
 * @returns {Promise<object>} Saved report record
 */
async function createReport({ content, summary, riskScore }) {
    const record = {
        id: uuidv4(),
        content:   content   || '',
        summary:   summary   || '',
        riskScore: riskScore || 'Low',
        createdAt: new Date().toISOString(), // default: now
    };
    const reports = await readReports();
    reports.push(record);
    await writeReports(reports);
    return record;
}
// ──────────────────────────────────────────────────────────────────────────────

// ─── [AI] Mongoose — Report Schema ───────────────────────────────────────────
/**
 * Connect to MongoDB if MONGO_URI env var is set.
 * If not set the server still starts normally;
 * Report.save() calls will simply no-op via the guard below.
 *
 * Set the variable before starting:
 *   $env:MONGO_URI = "mongodb://localhost:27017/rapidforensics"
 */
const MONGO_URI = process.env.MONGO_URI || '';

// DEBUG: Log the MONGO_URI to verify it's loaded (masking the password for safety)
if (MONGO_URI) {
    const maskedURI = MONGO_URI.replace(/\/\/.*:.*@/, '//****:****@');
    console.log(`  ➜  MONGO_URI found: ${maskedURI}`);
} else {
    console.warn('  ⚠  MONGO_URI not set — Mongoose will not connect to MongoDB.');
}

if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('  ➜  MongoDB connected successfully to Atlas'))
        .catch(err => {
            console.error('  ✖  MongoDB connection error:', err.message);
            console.error('     Check your MONGO_URI and IP whitelist in MongoDB Atlas.');
        });
} else {
    console.log('  ℹ  Falling back to local JSON storage for reports.');
}

/**
 * Report — Mongoose Schema
 * Fields:
 *   content   {String} — raw text that was analysed
 *   summary   {String} — AI-generated summary
 *   riskScore {String} — "Low" | "Medium" | "High"
 *   createdAt {Date}   — auto-set to current timestamp
 */
const reportSchema = new mongoose.Schema({
    content:   { type: String },
    summary:   { type: String },
    riskScore: { type: String },
    createdAt: { type: Date, default: Date.now }, // default: now
});

// Model — use existing compiled model if hot-reloaded (avoids OverwriteModelError)
const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);

/**
 * User — Mongoose Schema
 */
const userSchema = new mongoose.Schema({
    username:     { type: String, required: true, unique: true },
    email:        { type: String },
    passwordHash: { type: String, required: true },
    createdAt:    { type: Date, default: Date.now },
});
const User = mongoose.models.User || mongoose.model('User', userSchema);
// ──────────────────────────────────────────────────────────────────────────────

// In-memory session tokens  {token -> {username, expiresAt}}
const sessions = new Map();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
    origin: true,          // Accept any origin (dev mode — restrict in production)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/ai', aiRoutes);
app.use('/api/hash', hashRoutes);

// ─── Serve Frontend Static Files ──────────────────────────────────────────────
// Serve all HTML/CSS/JS from the Frontend folder.
// This means you only need to open http://localhost:5000 — no separate file server.
const FRONTEND_DIR = path.join(__dirname, '..', 'Frontend');
app.use(express.static(FRONTEND_DIR));

// SPA fallback — serve index.html for any unknown route so deep links work
app.get('/', (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ─── Multer — file storage ────────────────────────────────────────────────────
/**
 * Files are stored under:  uploads/<caseId>/<originalName>
 * The destination is set per-request using req.params.id (set before upload).
 */
const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const caseDir = path.join(UPLOADS_DIR, req.params.id);
        fs.mkdirSync(caseDir, { recursive: true });
        cb(null, caseDir);
    },
    filename: (_req, file, cb) => {
        // Preserve original filename; prefix with timestamp to avoid collisions
        const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}_${safeBase}`);
    },
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500 MB limit

// ─── Auth Helpers ───────────────────────────────────────────────────────────
async function readUsers() {
    const raw = await fsp.readFile(USERS_FILE, 'utf8');
    return JSON.parse(raw);
}
async function writeUsers(users) {
    await fsp.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password) {
    // SHA-256 with a fixed salt prefix for simplicity
    return crypto.createHash('sha256').update('RF_SALT_2026_' + password).digest('hex');
}

function createSession(username) {
    const token = uuidv4();
    sessions.set(token, { username, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    return token;
}

// Optional auth middleware — uses bearer token but degrades gracefully
function optionalAuth(req, _res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token && sessions.has(token)) {
        const sess = sessions.get(token);
        if (sess.expiresAt > Date.now()) {
            req.username = sess.username;
        } else {
            sessions.delete(token);
        }
    }
    next();
}

// ─── Helpers ────────────────────────────────────────────────────────────────
async function readCases() {
    const raw = await fsp.readFile(CASES_FILE, 'utf8');
    return JSON.parse(raw);
}

async function writeCases(cases) {
    await fsp.writeFile(CASES_FILE, JSON.stringify(cases, null, 2));
}

/**
 * Compute SHA-256 hash of a file on disk.
 * @param {string} filePath - Absolute path to the file
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
function computeSHA256(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

// ─── Auth Routes ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { username, password, email }
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, email = '' } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required.' });
        }

        const normalizedUser = username.trim().toLowerCase();

        // 1. Check MongoDB first if connected
        if (mongoose.connection.readyState === 1) {
            const existing = await User.findOne({ username: new RegExp(`^${normalizedUser}$`, 'i') });
            if (existing) return res.status(409).json({ success: false, message: 'Username already exists.' });

            const newUser = new User({
                username: username.trim(),
                email: email.trim(),
                passwordHash: hashPassword(password),
            });
            await newUser.save();
            const token = createSession(newUser.username);
            return res.status(201).json({ success: true, token, user: { id: newUser._id, username: newUser.username, email: newUser.email } });
        }

        // 2. Fallback to Local JSON (will fail on Vercel)
        const users = await readUsers();
        if (users.find(u => u.username.toLowerCase() === normalizedUser)) {
            return res.status(409).json({ success: false, message: 'Username already exists.' });
        }
        const user = {
            id: uuidv4(),
            username: username.trim(),
            email: email.trim(),
            passwordHash: hashPassword(password),
            createdAt: new Date().toISOString(),
        };
        users.push(user);
        await writeUsers(users);
        const token = createSession(user.username);
        res.status(201).json({ success: true, token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required.' });
        }

        const normalizedUser = username.trim().toLowerCase();
        const pwdHash = hashPassword(password);

        // 1. Check MongoDB first if connected
        if (mongoose.connection.readyState === 1) {
            const user = await User.findOne({ username: new RegExp(`^${normalizedUser}$`, 'i') });
            if (!user || user.passwordHash !== pwdHash) {
                return res.status(401).json({ success: false, message: 'Invalid username or password.' });
            }
            const token = createSession(user.username);
            return res.json({ success: true, token, user: { id: user._id, username: user.username, email: user.email } });
        }

        // 2. Fallback to Local JSON
        const users = await readUsers();
        const user = users.find(u => u.username.toLowerCase() === normalizedUser);
        if (!user || user.passwordHash !== pwdHash) {
            return res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }
        const token = createSession(user.username);
        res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/auth/logout
 */
app.post('/api/auth/logout', (req, res) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) sessions.delete(token);
    res.json({ success: true, message: 'Logged out.' });
});

// ─── Routes ────────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Simple health check
 */
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Cases ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/cases
 * Returns all cases (summary list, no files embedded)
 */
app.get('/api/cases', async (_req, res) => {
    try {
        const cases = await readCases();
        res.json({ success: true, cases });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/cases
 * Create a new forensic case.
 * Body: { name, type, priority, investigator, description }
 */
app.post('/api/cases', async (req, res) => {
    try {
        const { name, type, priority, investigator, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Case name is required.' });
        }

        const newCase = {
            id: uuidv4(),
            name: name.trim(),
            type: type || 'other',
            priority: priority || 'medium',
            investigator: investigator || 'Unknown',
            description: description || '',
            status: 'open',
            files: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const cases = await readCases();
        cases.push(newCase);
        await writeCases(cases);

        // Create a dedicated upload folder for this case
        fs.mkdirSync(path.join(UPLOADS_DIR, newCase.id), { recursive: true });

        res.status(201).json({ success: true, case: newCase });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/cases/:id
 * Get a single case by ID (includes file list with hashes)
 */
app.get('/api/cases/:id', async (req, res) => {
    try {
        const cases = await readCases();
        const theCase = cases.find(c => c.id === req.params.id);
        if (!theCase) return res.status(404).json({ success: false, message: 'Case not found.' });
        res.json({ success: true, case: theCase });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Files ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/cases/:id/upload
 * Upload one or more evidence files to a case.
 * Computes SHA-256 for each file and stores metadata.
 * Accepts multipart/form-data with field name "files".
 */
app.post('/api/cases/:id/upload', upload.array('files', 50), async (req, res) => {
    try {
        const cases = await readCases();
        const caseIdx = cases.findIndex(c => c.id === req.params.id);
        if (caseIdx === -1) {
            return res.status(404).json({ success: false, message: 'Case not found.' });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded.' });
        }

        // Calculate SHA-256 for every uploaded file
        const fileResults = await Promise.all(req.files.map(async file => {
            const sha256 = await computeSHA256(file.path);
            const record = {
                id: uuidv4(),
                originalName: file.originalname,
                storedName: file.filename,
                storedPath: file.path,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                sha256,
                uploadedAt: new Date().toISOString(),
            };
            return record;
        }));

        // Append to case record
        cases[caseIdx].files.push(...fileResults);
        cases[caseIdx].updatedAt = new Date().toISOString();
        await writeCases(cases);

        res.status(201).json({
            success: true,
            message: `${fileResults.length} file(s) uploaded and hashed successfully.`,
            files: fileResults,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/cases/:id/files
 * List all evidence files for a case
 */
app.get('/api/cases/:id/files', async (req, res) => {
    try {
        const cases = await readCases();
        const theCase = cases.find(c => c.id === req.params.id);
        if (!theCase) return res.status(404).json({ success: false, message: 'Case not found.' });
        res.json({ success: true, caseId: theCase.id, files: theCase.files });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// AI routes mounted at /api/ai

// ─── 404 catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('[ERROR]', err);
    res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log(`\n  RapidForensics Backend`);
        console.log(`  ➜  Local: http://localhost:${PORT}/`);
        console.log(`  ➜  Health check: http://localhost:${PORT}/api/health\n`);
    });

    // Keep one referenced timer so the process does not auto-exit in constrained runtimes.
    const keepAliveTimer = setInterval(() => {}, 60_000);

    server.on('close', () => {
        clearInterval(keepAliveTimer);
        console.warn('[SERVER] HTTP server closed.');
    });
}

// Export the app for Vercel serverless environment
module.exports = app;
