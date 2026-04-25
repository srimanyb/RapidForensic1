const axios = require("axios");

const HF_API_BASE = "https://api-inference.huggingface.co/models";
const DEFAULT_MODEL = "mistralai/Mistral-7B-Instruct-v0.2";
const FALLBACK_MODELS = [
    "google/flan-t5-large",
    "tiiuae/falcon-7b-instruct",
];

function buildStructuredPrompt(indicators, severity) {
    return [
        "You are a forensic analyst. Analyze the following structured evidence:",
        JSON.stringify(indicators, null, 2),
        "",
        "Generate a report with:",
        "- Threat Type",
        "- Severity",
        "- Key Indicators",
        "- Explanation",
        "- Recommended Actions",
        "",
        `Rule-based severity computed by backend: ${severity}`,
    ].join("\n");
}

function extractGeneratedText(payload) {
    if (Array.isArray(payload) && payload[0]?.generated_text) return String(payload[0].generated_text);
    if (typeof payload?.generated_text === "string") return payload.generated_text;
    if (typeof payload === "string") return payload;
    return "";
}

function inferThreatType(indicators) {
    const keywords = indicators.keywords_detected || [];
    if (keywords.includes("phishing")) return "Phishing";
    if (keywords.includes("malware") || keywords.includes("ransomware")) return "Malware Activity";
    if ((indicators.failed_logins || 0) > 3) return "Brute-force / Credential Abuse";
    if ((indicators.suspicious_ips || []).length > 0) return "Suspicious Network Access";
    return "No clear threat";
}

async function callHuggingFace({ model, apiKey, prompt }) {
    const response = await axios.post(
        `${HF_API_BASE}/${model}`,
        {
            inputs: prompt,
            options: { wait_for_model: true },
            parameters: {
                max_new_tokens: 700,
                temperature: 0.15,
                return_full_text: false,
            },
        },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            timeout: 90000,
        }
    );
    return extractGeneratedText(response.data);
}

async function analyzeForensicEvidence({ indicators, severity }) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) throw new Error("HUGGINGFACE_API_KEY is not configured.");

    const requestedModel = process.env.HF_MODEL || DEFAULT_MODEL;
    const prompt = buildStructuredPrompt(indicators, severity);

    const modelsToTry = [requestedModel, ...FALLBACK_MODELS.filter((m) => m !== requestedModel)];
    for (const model of modelsToTry) {
        try {
            const report = await callHuggingFace({ model, apiKey, prompt });
            return {
                report: report || "No detailed model output was returned.",
                threatType: inferThreatType(indicators),
                severity,
                indicators,
                model,
            };
        } catch (_err) {
            // Try next candidate model.
        }
    }

    const keywords = (indicators.keywords_detected || []).join(", ") || "none";
    const suspiciousIps = (indicators.suspicious_ips || []).join(", ") || "none";
    const fallbackReport = [
        `Threat Type: ${inferThreatType(indicators)}`,
        `Severity: ${severity}`,
        `Key Indicators: failed_logins=${indicators.failed_logins || 0}, suspicious_ips=${suspiciousIps}, keywords=${keywords}, unusual_time=${indicators.unusual_time ? "yes" : "no"}`,
        "Explanation: Rule-based forensic triage identified these indicators from the submitted evidence using deterministic parsing and scoring.",
        "Recommended Actions: Investigate suspicious IPs, review authentication logs, isolate impacted systems, and preserve chain-of-custody evidence for legal review.",
    ].join("\n");

    return {
        report: fallbackReport,
        threatType: inferThreatType(indicators),
        severity,
        indicators,
        model: "rule-based-fallback",
    };
}

module.exports = {
    analyzeForensicEvidence,
};
