require('dotenv').config();
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');

const path = require('path');
const multer = require('multer');
const fs = require('fs');
const projectRoutes = require('./routes/projectRoutes');

const app = express();

app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
}));

// --- 🚀 AUTOMATED DIRECTORY CREATION MATRIX ---
// Formulate the path directly to your frontend's public/tour_assets folder on the D drive
const uploadDir = path.join('D:', 'pocketsculpt-saas', 'frontend', 'public', 'tour_assets');

// If the tour_assets folder doesn't exist on the drive, Node.js will create it automatically
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`✓ Directory Created: ${uploadDir}`);
}

// Configure Multer storage engine parameters
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Save files directly inside the generated D drive path
    },
    filename: (req, file, cb) => {
        // Keeps the original filename cleanly (e.g., master_bedroom.jpg)
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// --- MIDDLEWARE SYSTEM SETUP ---
app.use(cors());
app.use(express.json());

// --- 📡 MULTIPART MULTIMEDIA API ENDPOINT ---
// This endpoint catches physical file binaries from the frontend form and processes them
// 📡 THE COMBINED ENGINE ENDPOINT: PROCESSES IMAGES AND MUTATES MONGODB DATA SIMULTANEOUSLY
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        console.log("\n--- UNIFIED MULTIPART STREAM CAPTURED ---");
        console.log("Captured Metadata Strings (req.body):", req.body);
        console.log("Captured File Properties (req.file):", req.file?.filename);
        console.log("-----------------------------------------");

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Upload stream file payload missing." });
        }

        // 🔍 Read the parameters out of the incoming text streams safely
        const receivedTitle = req.body.roomTitle || "Staged Unit Space Node";
        const receivedDesc = req.body.roomDesc || "No custom property layout specifications provided.";
        
        // Formulate standard production URL file references paths strings tags
        const webFilePath = `/tour_assets/${req.file.originalname}`;
        const uniqueKey = receivedTitle.toLowerCase().replace(/\s+/g, '_') || `room_${Date.now()}`;

        // Build a perfect sub-document dataset map block matching your model schemas
        const freshRoomPayloadNode = {
            key: uniqueKey,
            title: receivedTitle,
            image: webFilePath,
            description: receivedDesc,
            hotspots: [],
            infoTags: []
        };

        // Resolve the target parent project database tracking record identifier out of the HTTP referer URL header string!
        // const urlSegments = req.headers.referer ? req.headers.referer.split('/') : [];
        // const projectId = urlSegments[urlSegments.length - 1];
        const projectId = req.body.projectId;
        if (!projectId || projectId.length !== 24) {
            return res.status(400).json({ success: false, message: "Could not safely resolve parent Project ID from reference headers." });
        }

        console.log(`[DB MATRIX] Injecting room metadata node into Project ID document: ${projectId}`);
        
        // Import your Mongoose Model dynamically inside the endpoint execution thread scope
        const Project = require('./models/Project'); // Adjust this file path line matching your structure if needed!

        // Find the project, push the fresh sub-array node block, and execute the save parameters action loops
        const projectToUpdate = await Project.findById(projectId);
        if (!projectToUpdate) {
            return res.status(404).json({ success: false, message: "Parent project container footprint missing from collections database." });
        }

        // Append the new room array configuration map cleanly
        projectToUpdate.rooms = [...(projectToUpdate.rooms || []), freshRoomPayloadNode];
        
        // Handle setting initial landing page entrance coordinates index reference links fallbacks
        if (!projectToUpdate.initialRoomKey) {
            projectToUpdate.initialRoomKey = uniqueKey;
        }

        const savedProjectData = await projectToUpdate.save();
        console.log(`✓ Database write execution matrix verified and committed for project: "${savedProjectData.name}"`);

        // Return everything back to the frontend to trigger immediate UI re-rendering tracks
        res.json({
            success: true,
            filePath: webFilePath,
            newRoomKey: uniqueKey,
            updatedProject: savedProjectData,
            message: "File successfully written to disk and metadata committed to MongoDB."
        });

    } catch (err) {
        console.error("Critical Upload & Database Append Crash Exception dropped:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- CORE REST API ROUTER MAPPING ---
app.use('/api/projects', projectRoutes);

// --- DATABASE INTEGRITY CONNECTION PIPELINE ---
const PORT = process.env.PORT || 5000;
const databaseUrl = process.env.MONGO_URI;

console.log("⏳ Attempting to initialize cloud handshake with MongoDB Atlas...");


console.log("⏳ Attempting to initialize cloud handshake with MongoDB Atlas...");

// 🚀 PORT 443 TUNNEL OVERRIDE: Forces MongoDB traffic over the standard secure HTTPS port
const fallbackURI = "mongodb+srv://maruf:maruf123MM@cluster0.ty5muei.mongodb.net/tourStudio?retryWrites=true&w=majority&srvServiceName=mongodb";

mongoose.connect(fallbackURI)
    .then(() => {
        console.log("==================================================================");
        console.log("🚀 SUCCESS: Connected smoothly to your live MongoDB Atlas Cluster!");
        console.log("==================================================================");
    })
    .catch(err => {
        console.error("\n❌ [DATABASE CRASH] Connection handshake failed!");
        console.error(`🔴 Error Name: ${err.name}`);
        console.error(`🔴 Message:    ${err.message}`);
        console.log("==================================================================\n");
    });