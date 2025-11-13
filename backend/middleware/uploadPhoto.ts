import multer from "multer";
import path from "path";
import fs from "fs";

// Go up one level from backend folder → /uploads/profile_pics
const uploadDir = path.join(process.cwd(), "..", "uploads", "profile_pics");

// Ensure folder exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

export const uploadPhoto = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + path.extname(file.originalname));
        },
    }),
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png"];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error("Only JPG or PNG allowed"));
        }
        cb(null, true);
    },
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
    },
}).single("photo");
