const crypto = require("crypto");

async function generateSha256(req, res) {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: "File is required." });
        }

        const sha256 = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
        return res.json({
            filename: req.file.originalname,
            sizeBytes: req.file.size,
            sha256,
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to generate SHA-256 hash." });
    }
}

module.exports = {
    generateSha256,
};
