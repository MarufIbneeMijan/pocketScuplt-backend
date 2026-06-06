const mongoose = require('mongoose');

const HotspotSchema = new mongoose.Schema({
    text: { type: String, default: "Move Forward ➔" },
    target: { type: String, required: true },
    yaw: { type: Number, required: true },
    pitch: { type: Number, required: true }
});

const InfoTagSchema = new mongoose.Schema({
    title: { type: String, default: "Premium Specification" },
    text: { type: String, default: "Interior detail overlay parameters." },
    yaw: { type: Number, required: true },
    pitch: { type: Number, required: true }
});

const CustomCtaSchema = new mongoose.Schema({
    type: { type: String, enum: ["floating", "spatial"], default: "floating" }, 
    text: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    link: { type: String, required: true, trim: true }, // The destination URL redirect target
    yaw: { type: Number },   // Optional/Nullable if placement type is global floating HUD
    pitch: { type: Number }
});


const RoomSchema = new mongoose.Schema({
    key: { type: String, required: true },
    title: { type: String, required: true },
    image: { type: String, required: true }, // Local path or cloud URL string
    description: { type: String, default: "" },
    hotspots: [HotspotSchema],
    infoTags: [InfoTagSchema],
    customCtas: [CustomCtaSchema]
});

const ProjectSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "No listing summary logged." },
    blueprintImage: { type: String, default: "/tour_assets/default_blueprint.jpg" }, // Auto-fallback default
    initialRoomKey: { type: String, default: "" },
    rooms: [RoomSchema],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', ProjectSchema);