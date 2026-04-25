function normalizeWhitespace(value) {
    return String(value || "")
        .replace(/\r\n/g, "\n")
        .replace(/\u0000/g, "")
        .trim();
}

function trimToMaxLength(value, maxLength = 12000) {
    const text = String(value || "");
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "\n...[truncated for analysis]";
}

function parseFileContent(fileData, fileType) {
    const type = String(fileType || "").toLowerCase();
    const cleaned = normalizeWhitespace(fileData);

    if (!cleaned) return "";

    if (type === "log") {
        return trimToMaxLength(`Log Evidence:\n${cleaned}`, 14000);
    }

    if (type === "image") {
        // For image uploads we expect OCR/caption text to be supplied as fileData.
        return trimToMaxLength(`Image Evidence (OCR/description):\n${cleaned}`, 10000);
    }

    if (type === "json") {
        try {
            const obj = JSON.parse(cleaned);
            return trimToMaxLength(`JSON Evidence:\n${JSON.stringify(obj, null, 2)}`, 14000);
        } catch {
            return trimToMaxLength(`JSON-like Evidence:\n${cleaned}`, 14000);
        }
    }

    if (type === "email") {
        return trimToMaxLength(`Email Evidence:\n${cleaned}`, 14000);
    }

    return trimToMaxLength(`Text Evidence:\n${cleaned}`, 12000);
}

module.exports = {
    parseFileContent,
};
