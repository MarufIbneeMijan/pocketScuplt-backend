const router = require('express').Router();
const Project = require('../models/Project');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 🔒 CLOUD CONFIGURATION INTERFACE
// In production, these variables must be saved securely in your server's .env file
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

// 🏗️ INITIALIZE OBJECT STORAGE ENGINE
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'virtual_tours_panoramas',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        // Automatically optimizes resolution and applies smart compression for fast WebGL loading
        transformation: [{ quality: 'auto:good', fetch_format: 'auto' }] 
    }
});

const uploadCloud = multer({ storage });

// ─────────────────────────────────────────────────────────────────
// 🔍 GET ALL PROJECTS (Home Directory)
// ─────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// ─────────────────────────────────────────────────────────────────
// 🏗️ INITIALIZE NEW PROJECT
// ─────────────────────────────────────────────────────────────────
router.post('/create', async (req, res) => {
    try {
        const { name, description, blueprintImage } = req.body;
        const newProject = new Project({
            name,
            description: description || undefined,
            blueprintImage: blueprintImage || undefined
        });
        const savedProject = await newProject.save();
        res.status(201).json(savedProject);
    } catch (err) { 
        res.status(400).json({ error: err.message }); 
    }
});

// ─────────────────────────────────────────────────────────────────
// 🚀 PRODUCTION EXCLUSIVE: APPEND NEW ROOM VIA CLOUD FILE UPLOAD
// Intercepts multi-part binary forms, uploads to CDN, updates document array
// ─────────────────────────────────────────────────────────────────
router.post('/:id/add-room', uploadCloud.single('panorama'), async (req, res) => {
    const { id } = req.params;
    console.log(`\n--- 📡 [CLOUD MULTIPART UPLOAD] Intercepting binary stream for Project ID: ${id} ---`);

    try {
        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ error: "Target project registry instance not found." });
        }

        const { title, description } = req.body;
        if (!title) {
            return res.status(400).json({ error: "Validation Missing: Room title name field is required." });
        }

        // If a file was sent, multer automatically places the permanent absolute HTTPS link here
        const permanentCDNUrl = req.file ? req.file.path : "/tour_assets/room_0.jpg";
        console.log(`[CLOUD STREAM COMPLETE] Image uploaded successfully. CDN Asset URI: ${permanentCDNUrl}`);

        // Construct clean unique routing slug key matching your existing frontend structure
        const distinctRoomKey = title.toLowerCase().trim().replace(/\s+/g, '-');

        // Check for unique key collisions to avoid schema mapping overwrites
        const keyExists = project.rooms.some(r => String(r.key).toLowerCase().trim() === distinctRoomKey);
        if (keyExists) {
            return res.status(400).json({ error: "Key Collision Error: A room with an identical title configuration already exists." });
        }

        const newRoomNode = {
            key: distinctRoomKey,
            title,
            description: description || undefined,
            image: permanentCDNUrl, // Stored as a highly available public link strings asset
            hotspots: [],
            infoTags: []
        };

        project.rooms.push(newRoomNode);
        const updatedProject = await project.save();

        console.log(`✓ [DATABASE SYNCED] Room "${title}" appended cleanly to MongoDB.`);
        res.status(201).json(updatedProject);

    } catch (err) {
        console.error("❌ [UPLOAD EXCEPTION] Pipeline processing dropped an error:", err.message);
        res.status(400).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────
// ⚙️ UPDATE EXISTING PROJECT OR OVERWRITE/APPEND ROOM MARKERS
// ─────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`\n--- 📡 [DATABASE MUTATION] PUT Request Received for ID: ${id} ---`);
    
    try {
        if (req.body.rooms && !Array.isArray(req.body.rooms)) {
            console.error("❌ [MUTATION ABORTED] Malformed payload received: 'rooms' must be an array.");
            return res.status(400).json({ error: "Malformed Payload: rooms property must evaluate to an array." });
        }

        let updateData = req.body;
        if (req.body.rooms) {
            updateData = { $set: { rooms: req.body.rooms } };
        }

        const updatedProject = await Project.findByIdAndUpdate(
            id, 
            updateData, 
            { 
                new: true,             
                runValidators: true    
            }
        );

        if (!updatedProject) {
            console.warn(`⚠️ [MUTATION FAILED] Document registry target ID missing: ${id}`);
            return res.status(404).json({ error: "Target project registry instance not found." });
        }

        console.log("✓ [DATABASE MUTATION] Workspace structure cleanly serialized and saved to MongoDB.");
        res.json(updatedProject);
        
    } catch (err) { 
        console.error("❌ [DATABASE ERROR] Transaction exception dropped inside PUT handler:", err.message);
        res.status(400).json({ error: err.message }); 
    }
});

// ─────────────────────────────────────────────────────────────────
// 🗑️ DELETE PROJECT (Complete Functional Reversion)
// ─────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        await Project.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Project entry purged from database registry." });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

module.exports = router;