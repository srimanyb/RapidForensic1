const express = require("express");
const multer = require("multer");
const { generateSha256 } = require("../controllers/hashController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

router.post("/sha256", upload.single("file"), generateSha256);

module.exports = router;
