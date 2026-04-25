const { parseFileContent } = require("../utils/fileParser");
const { buildIndicators } = require("../utils/forensicPreprocessor");
const { analyzeForensicEvidence } = require("../services/aiService");

async function analyzeEvidence(req, res) {
    try {
        const { fileData, fileType } = req.body || {};
        const allowedTypes = ["text", "image", "log", "json", "email"];

        if (typeof fileData !== "string" || !fileData.trim()) {
            return res.status(400).json({ message: "fileData is required and must be a non-empty string." });
        }

        if (!allowedTypes.includes(fileType)) {
            return res.status(400).json({ message: "fileType must be one of: text, image, log, json, email." });
        }

        const processedContent = parseFileContent(fileData, fileType);
        const { indicators, severity } = buildIndicators(processedContent);
        const analysis = await analyzeForensicEvidence({ indicators, severity });

        return res.json(analysis);
    } catch (error) {
        console.error("[AI Analyze Error]", error.message);
        return res.status(500).json({
            report: "Analysis failed due to a server error.",
            severity: "Low",
            threatType: "Unknown",
            indicators: {
                failed_logins: 0,
                suspicious_ips: [],
                keywords_detected: [],
                unusual_time: false,
            },
            model: "unavailable",
        });
    }
}

module.exports = {
    analyzeEvidence,
};
