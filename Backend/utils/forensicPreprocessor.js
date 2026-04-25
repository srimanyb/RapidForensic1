function normalizeText(input) {
    return String(input || "")
        .replace(/\r\n/g, "\n")
        .replace(/\u0000/g, "")
        .trim();
}

function extractIps(text) {
    const ipRegex = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
    const matches = text.match(ipRegex) || [];
    return [...new Set(matches)];
}

function countFailedLogins(text) {
    const failedLoginRegex = /\b(failed login|login failed|authentication failed|invalid password|failed authentication|access denied)\b/gi;
    const matches = text.match(failedLoginRegex) || [];
    return matches.length;
}

function extractKeywords(text) {
    const keywords = [
        "phishing",
        "malware",
        "admin",
        "encrypted",
        "ransomware",
        "exfiltration",
        "bruteforce",
        "brute force",
        "credential",
        "backdoor",
        "suspicious",
    ];
    const lower = text.toLowerCase();
    return keywords.filter((kw) => lower.includes(kw));
}

function hasUnusualTime(text) {
    const hourRegex = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g;
    let match = hourRegex.exec(text);
    while (match) {
        const hour = Number(match[1]);
        if (hour >= 2 && hour <= 5) return true;
        match = hourRegex.exec(text);
    }
    return false;
}

function detectSuspiciousIps(ips) {
    return ips.filter((ip) => {
        if (ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) return false;
        const secondOctet = Number(ip.split(".")[1] || 0);
        if (ip.startsWith("172.") && secondOctet >= 16 && secondOctet <= 31) return false;
        return true;
    });
}

function computeSeverity(indicators) {
    if (Number(indicators.failed_logins || 0) > 3) return "High";
    if ((indicators.keywords_detected || []).includes("phishing")) return "Medium";
    return "Low";
}

function buildIndicators(rawText) {
    const normalized = normalizeText(rawText);
    const ips = extractIps(normalized);
    const suspiciousIps = detectSuspiciousIps(ips);
    const keywords = extractKeywords(normalized);
    const indicators = {
        failed_logins: countFailedLogins(normalized),
        suspicious_ips: suspiciousIps,
        keywords_detected: keywords,
        unusual_time: hasUnusualTime(normalized),
    };

    return {
        normalizedText: normalized,
        indicators,
        severity: computeSeverity(indicators),
    };
}

module.exports = {
    buildIndicators,
    computeSeverity,
};
