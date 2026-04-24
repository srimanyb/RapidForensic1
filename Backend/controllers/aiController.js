const { parseFileContent } = require('../utils/fileParser');
const { analyzeForensicEvidence } = require('../services/aiService');

async function analyzeEvidence(req, res) {
    try {
        const { fileData, fileType } = req.body || {};
        const allowedTypes = ['text', 'image', 'log'];

        if (typeof fileData !== 'string' || !fileData.trim()) {
            return res.status(400).json({ message: 'fileData is required and must be a non-empty string.' });
        }

        if (!allowedTypes.includes(fileType)) {
            return res.status(400).json({ message: 'fileType must be one of: text, image, log.' });
        }

        const processedContent = parseFileContent(fileData, fileType);
        const analysis = await analyzeForensicEvidence(processedContent, fileType);

        return res.json({
            summary: analysis.summary,
            anomalies: analysis.anomalies,
            riskLevel: analysis.riskLevel,
            forensicReport: analysis.forensicReport,
        });
    } catch (error) {
        console.error('[AI Analyze Error]', error.message);
        return res.status(500).json({
            summary: 'Analysis failed.',
            anomalies: [],
            riskLevel: 'Low',
            forensicReport: 'Unable to generate forensic report due to a server error.',
        });
    }
}

module.exports = {
    analyzeEvidence,
};
