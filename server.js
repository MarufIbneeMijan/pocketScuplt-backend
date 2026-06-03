require('dotenv').config();
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const projectRoutes = require('./routes/projectRoutes');

const app = express();

// --- 🛡️ INITIALIZE GLOBAL MIDDLEWARE (DECLARED ONCE) ---
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173',"https://pocket-sculpt-frontend.vercel.app","https://pocket-sculpt-frontend.vercel.app/"],
    credentials: true
}));
app.use(express.json());

console.log("⚙️ [SYSTEM STARTUP] Core middleware bundles initialized successfully.");

// --- 🚀 DYNAMIC MULTI-ENVIRONMENT DISK DIRECTORY MATRIX ---
let uploadDir;

// Detect whether the backend is running in the cloud (Render) or locally on your desktop
if (process.env.NODE_ENV === 'production' || !fs.existsSync('D:')) {
    // Cloud Production Path: Saves to a safe tracking subfolder inside the cloud deployment directory
    uploadDir = path.join(__dirname, 'public', 'tour_assets');
    console.log("☁️ [ENVIRONMENT DETECTED]: PRODUCTION CLOUD SERVER");
} else {
    // Local Desktop Development Pathway: Defaults back to your fast local folder matching your exact drive setup
    uploadDir = path.join('D:', 'pocketsculpt-saas', 'frontend', 'public', 'tour_assets');
    console.log("💻 [ENVIRONMENT DETECTED]: LOCAL WINDOWS WORKSTATION");
}

console.log(`📂 [FILESYSTEM TARGET] Setting target asset storage engine path to: ${uploadDir}`);

// Build folder safely if it doesn't exist inside the target node footprint yet
try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`✓ [FILESYSTEM] Fresh target destination subdirectory successfully compiled: ${uploadDir}`);
    }
} catch (dirErr) {
    console.error(`❌ [FILESYSTEM CRITICAL] Directory generation failure dropped:`, dirErr.message);
}

// Configure Multer storage parameters
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log(`📥 [MULTER BLOCK] Incoming stream packet detected: "${file.originalname}". Mapping write parameters...`);
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });


// --- 📡 MULTIPART MULTIMEDIA API ENDPOINT ---
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        console.log("\n==================================================================");
        console.log("📡 [INCOMING API TRAFFIC] POST Request intercepted at /api/upload");
        console.log("==================================================================");
        console.log("📦 Body Form Parameters (req.body):", JSON.stringify(req.body, null, 2));
        console.log("🖼️ File Payload Parameter (req.file):", req.file ? {
            filename: req.file.filename,
            size: `${(req.file.size / 1024).toFixed(2)} KB`,
            path: req.file.path
        } : "⚠️ NULL - STREAM DROPPED");
        console.log("------------------------------------------------------------------");

        if (!req.file) {
            console.error("⚠️ [UPLOAD REJECTED] Form stream data compiled without an attached image component binary.");
            return res.status(400).json({ success: false, message: "Upload stream file payload missing." });
        }

        const receivedTitle = req.body.roomTitle || "Staged Unit Space Node";
        const receivedDesc = req.body.roomDesc || "No custom property layout specifications provided.";
        
        const webFilePath = `/tour_assets/${req.file.originalname}`;
        const uniqueKey = receivedTitle.toLowerCase().trim().replace(/\s+/g, '_') || `room_${Date.now()}`;

        const freshRoomPayloadNode = {
            key: uniqueKey,
            title: receivedTitle,
            image: webFilePath,
            description: receivedDesc,
            hotspots: [],
            infoTags: []
        };

        const projectId = req.body.projectId;
        console.log(`🔍 [METADATA READ] Validating tracking payload arguments. Target Project Target ID: "${projectId}"`);

        if (!projectId || projectId.length !== 24) {
            console.error(`❌ [VALIDATION FAILED] Evaluated Project ID parameter string "${projectId}" is invalid or structurally malformed.`);
            return res.status(400).json({ success: false, message: "Invalid or malformed target parent Project ID format." });
        }

        const Project = require('./models/Project'); 
        console.log(`⏳ [DB QUERY] Fetching parent project footprint dataset out of database collections...`);
        
        const projectToUpdate = await Project.findById(projectId);
        if (!projectToUpdate) {
            console.error(`❌ [DATA MISMATCH] No matching project entry located under tracking database footprint string: ${projectId}`);
            return res.status(404).json({ success: false, message: "Parent project container footprint missing from collections database." });
        }

        console.log(`✓ [DB READ SUCCESS] Core template located: "${projectToUpdate.name}". Merging mutation arrays...`);
        projectToUpdate.rooms = [...(projectToUpdate.rooms || []), freshRoomPayloadNode];
        
        if (!projectToUpdate.initialRoomKey) {
            console.log(`📌 [INITIALIZATION SETTING] Auto-assigning room key "${uniqueKey}" as entry tracking viewport baseline.`);
            projectToUpdate.initialRoomKey = uniqueKey;
        }

        const savedProjectData = await projectToUpdate.save();
        console.log(`💾 [DB WRITE EXECUTED] Document write transaction committed cleanly for project: "${savedProjectData.name}"`);

        res.json({
            success: true,
            filePath: webFilePath,
            newRoomKey: uniqueKey,
            updatedProject: savedProjectData,
            message: "File successfully written to disk and metadata committed to MongoDB Atlas."
        });

    } catch (err) {
        console.error("💥 [ENDPOINT CRASH] Critical runtime exception dropped inside upload handling stream:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- CORE REST API ROUTER MAPPING ---
app.use('/api/projects', projectRoutes);
console.log("🔗 [ROUTING LAYER] REST core endpoints mapped cleanly to /api/projects");


app.use('/tour_assets', express.static(uploadDir, {
    maxAge: '31536000000', // Forces browser network memory to store the panoramas for 1 year
    immutable: true
}));
console.log("📦 [ASSETS MATRIX] Static distribution network engine mounted on /tour_assets route.");


// --- 🔌 DATABASE INTEGRITY CONNECTION PIPELINE & LISTENER ENGINE ---
const PORT = process.env.PORT || 5000;
const fallbackURI = "mongodb+srv://maruf:maruf123MM@cluster0.ty5muei.mongodb.net/tourStudio?retryWrites=true&w=majority&srvServiceName=mongodb";

console.log("\n⏳ Attempting to initialize cloud handshake with MongoDB Atlas over Tunnel Port 443...");

mongoose.connect(fallbackURI)
    .then(() => {
        console.log("==================================================================");
        console.log("🚀 SUCCESS: Connected smoothly to your live MongoDB Atlas Cluster!");
        console.log("==================================================================");
        
        // 🚀 THE MISSING ENGINE LINK: Open the web routing gates ONLY after a clean DB match!
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🌐 LIVE LINK ACTIVE: Network data pipelines listening on port: ${PORT}`);
            console.log("==================================================================\n");
        });
    })
    .catch(err => {
        console.error("\n❌ [DATABASE CRASH] Connection handshake failed!");
        console.error(`🔴 Error Name: ${err.name}`);
        console.error(`🔴 Message:    ${err.message}`);
        console.log("==================================================================\n");
    });