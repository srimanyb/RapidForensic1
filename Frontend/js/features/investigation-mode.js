// ===== Investigation Mode (AI Assistant) Feature =====

// Core chat functionality already implemented in app.js
// This file provides additional AI query processing

async function processAIQuery(query, evidence) {
    // In production, this would call actual AI API (Gemini/OpenAI)
    // For demo, return mock intelligent responses

    const lowerQuery = query.toLowerCase();

    // Pattern detection
    if (lowerQuery.includes('suspicious') || lowerQuery.includes('pattern')) {
        return generatePatternAnalysis(evidence);
    }

    // IP address search
    if (lowerQuery.includes('ip') || lowerQuery.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
        return generateIPAnalysis(evidence, query);
    }

    // Timeline queries
    if (lowerQuery.includes('timeline') || lowerQuery.includes('when') || lowerQuery.includes('events')) {
        return generateTimelineAnalysis(evidence);
    }

    // Default response
    return `I'm analyzing your query: "${query}". Based on the ${evidence.length} evidence file(s) uploaded, I can help you find patterns, analyze timestamps, and identify suspicious activity. Try asking about specific IP addresses, time periods, or patterns.`;
}

function generatePatternAnalysis(evidence) {
    const patterns = [];

    evidence.forEach(e => {
        if (e.riskScore.level === 'critical') {
            patterns.push(`🔴 Critical risk detected in ${e.filename}`);
        }
        if (e.content && e.content.includes('failed')) {
            patterns.push(`⚠️ Failed authentication attempts in ${e.filename}`);
        }
    });

    if (patterns.length === 0) {
        return '✅ No immediate suspicious patterns detected across evidence files.';
    }

    return `**Suspicious Patterns Detected:**\n\n${patterns.join('\n')}`;
}

function generateIPAnalysis(evidence, query) {
    return `🌐 Searching for IP address references in evidence files...\n\nFound references in log files. Common IPs detected:\n\n• 192.168.1.1 (Internal network)\n• 10.0.0.5 (Server)\n\n(Full IP analysis requires actual content parsing)`;
}

function generateTimelineAnalysis(evidence) {
    const sorted = [...evidence].sort((a, b) => new Date(a.uploaded) - new Date(b.uploaded));

    let response = '📅 **Event Timeline:**\n\n';
    sorted.slice(0, 5).forEach((e, i) => {
        const time = new Date(e.uploaded).toLocaleString();
        response += `${i + 1}. ${time} - ${e.filename} uploaded\n`;
    });

    return response;
}

// Make functions globally available
window.processAIQuery = processAIQuery;
