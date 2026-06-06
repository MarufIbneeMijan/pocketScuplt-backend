// routes.js
const router = require('express').Router();
const Project = require('../models/Project');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 🔒 CLOUD CONFIGURATION INTERFACE
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
// 🚀 APPEND NEW ROOM VIA CLOUD FILE UPLOAD
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

        const permanentCDNUrl = req.file ? req.file.path : "/tour_assets/room_0.jpg";
        console.log(`[CLOUD STREAM COMPLETE] Image uploaded successfully. CDN Asset URI: ${permanentCDNUrl}`);

        const distinctRoomKey = title.toLowerCase().trim().replace(/\s+/g, '-');

        const keyExists = project.rooms.some(r => String(r.key).toLowerCase().trim() === distinctRoomKey);
        if (keyExists) {
            return res.status(400).json({ error: "Key Collision Error: A room with an identical title configuration already exists." });
        }

        // 🌟 CHANGE 1: Explicitly initialize an empty array node tracking target subdocuments
        const newRoomNode = {
            key: distinctRoomKey,
            title,
            description: description || undefined,
            image: permanentCDNUrl, 
            hotspots: [],
            infoTags: [],
            customCtas: [] // 👈 NEW PARAMETER ASSIGNED HERE FOR MODEL REDRAW UNIFORMITY
        };

        project.rooms.push(newRoomNode);
        const updatedProject = await project.save();

        console.log(`✓ [DATABASE SYNCED] Room "${title}" appended cleanly to MongoDB with custom CTA handlers.`);
        res.status(201).json(updatedProject);

    } catch (err) {
        console.error("❌ [UPLOAD EXCEPTION] Pipeline processing dropped an error:", err.message);
        res.status(400).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────
// ⚙️ ATOMIC LOCATION PATH: LOCK AND SYNCHRONIZE MARKER NODE BUNDLES
// Matches the exact endpoint format targeted by the updated front-end editor
// ─────────────────────────────────────────────────────────────────
router.put('/:id/room/:roomKey/markers', async (req, res) => {
    const { id, roomKey } = req.params;
    const { hotspots, infoTags, customCtas } = req.body;
    
    console.log(`\n--- 📡 [ATOMIC MARKER SYNC] PUT Request Received for Project ID: ${id} | Room Key: ${roomKey} ---`);
    
    try {
        const cleanRoomKey = String(roomKey).toLowerCase().trim();

        // 🌟 CHANGE 2: Utilize Mongoose positional logic ($) to isolate the target room subdocument array path cleanly
        const updatedProject = await Project.findOneAndUpdate(
            { 
                _id: id, 
                "rooms.key": cleanRoomKey 
            },
            {
                $set: {
                    "rooms.$.hotspots": hotspots || [],
                    "rooms.$.infoTags": infoTags || [],
                    "rooms.$.customCtas": customCtas || [] // 👈 Dynamic CTA updates synchronized atomically here
                }
            },
            { 
                new: true, 
                runValidators: true 
            }
        );

        if (!updatedProject) {
            console.warn(`⚠️ [MUTATION MISMATCH] Could not find matching project or room key structure.`);
            return res.status(404).json({ error: "Layout alignment target path error: project instance or target room identifier missing." });
        }

        console.log(`✓ [DATABASE POSITION SECURED] Marker channels for room "${cleanRoomKey}" safely synced and serialized.`);
        res.json(updatedProject);

    } catch (err) {
        console.error("❌ [DATABASE ERROR] Transaction exception inside markers update route:", err.message);
        res.status(400).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────
// ⚙️ PRE-EXISTING GENERIC UPDATE ENDPOINT FOR OVERALL METADATA
// ─────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`\n--- 📡 [DATABASE MUTATION] PUT Generic Project Request Received for ID: ${id} ---`);
    
    try {
        if (req.body.rooms && !Array.isArray(req.body.rooms)) {
            return res.status(400).json({ error: "Malformed Payload: rooms property must evaluate to an array." });
        }

        let updateData = req.body;
        if (req.body.rooms) {
            updateData = { $set: { rooms: req.body.rooms } };
        }

        const updatedProject = await Project.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true, runValidators: true }
        );

        if (!updatedProject) {
            return res.status(404).json({ error: "Target project registry instance not found." });
        }

        console.log("✓ [DATABASE MUTATION] Base workspace fields metadata successfully updated.");
        res.json(updatedProject);
        
    } catch (err) { 
        console.error("❌ [DATABASE ERROR] Transaction exception dropped inside generic PUT handler:", err.message);
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