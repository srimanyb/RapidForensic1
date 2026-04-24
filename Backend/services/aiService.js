const axios = require('axios');

const HF_API_BASE = 'https://api-inference.huggingface.co/models';

function getRiskLevel(anomalies, summary, reportText) {
    const text = `${summary} ${reportText} ${(anomalies || []).join(' ')}`.toLowerCase();
    const highSignals = ['malware', 'data exfiltration', 'privilege escalation', 'ransomware', 'command and control'];
    const mediumSignals = ['failed login', 'suspicious', 'anomaly', 'unauthorized', 'unusual'];

    if (highSignals.some(s => text.includes(s)) || (anomalies || []).length >= 5) return 'High';
    if (mediumSignals.some(s => text.includes(s)) || (anomalies || []).length >= 2) return 'Medium';
    return 'Low';
}

function safeParsedResponse(rawText) {
    const fallback = {
        summary: 'AI analysis completed with limited confidence.',
        anomalies: [],
        riskLevel: 'Low',
        forensicReport: 'Unable to extract a fully structured report from model output.',
    };

    if (!rawText || typeof rawText !== 'string') return fallback;

    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return fallback;

    try {
        const parsed = JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
        const anomalies = Array.isArray(parsed.anomalies)
            ? parsed.anomalies.map(v => String(v)).filter(Boolean)
            : [];
        const summary = String(parsed.summary || '').trim();
        const forensicReport = String(parsed.forensicReport || '').trim();
        const computedRisk = getRiskLevel(anomalies, summary, forensicReport);
        const riskLevel = ['Low', 'Medium', 'High'].includes(parsed.riskLevel) ? parsed.riskLevel : computedRisk;

        return {
            summary: summary || fallback.summary,
            anomalies,
            riskLevel,
            forensicReport: forensicReport || fallback.forensicReport,
        };
    } catch {
        return fallback;
    }
}

async function analyzeForensicEvidence(processedContent, fileType) {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    const model = process.env.HF_MODEL || 'meta-llama/Llama-2-7b-chat-hf';

    if (!apiKey) {
        throw new Error('HUGGINGFACE_API_KEY is not configured.');
    }

    const prompt = [
        'You are a professional digital forensic investigator analyzing evidence for anomalies, threats, and suspicious behavior.',
        'Analyze the provided evidence and return JSON only with this exact schema:',
        '{"summary":"","anomalies":[],"riskLevel":"Low | Medium | High","forensicReport":""}',
        'Rules:',
        '- anomalies must be an array of concise strings.',
        '- riskLevel must be exactly one of: Low, Medium, High.',
        '- forensicReport must be structured and actionable.',
        '- Do not include markdown. Do not include any text outside JSON.',
        `fileType: ${fileType}`,
        'evidence:',
        processedContent,
    ].join('\n');

    const response = await axios.post(
        `${HF_API_BASE}/${model}`,
        {
            inputs: prompt,
            options: { wait_for_model: true },
            parameters: {
                max_new_tokens: 700,
                temperature: 0.2,
                return_full_text: false,
            },
        },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 90000,
        }
    );

    const payload = response.data;
    let rawText = '';

    if (Array.isArray(payload) && payload[0]?.generated_text) {
        rawText = payload[0].generated_text;
    } else if (typeof payload?.generated_text === 'string') {
        rawText = payload.generated_text;
    } else if (typeof payload === 'string') {
        rawText = payload;
    }

    return safeParsedResponse(rawText);
}

module.exports = {
    analyzeForensicEvidence,
};
