function normalizeWhitespace(value) {
    return String(value || '')
        .replace(/\r\n/g, '\n')
        .replace(/\u0000/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim();
}

function trimToMaxLength(value, maxLength = 12000) {
    if (value.length <= maxLength) return value;
    return value.slice(0, maxLength) + '\n...[truncated for analysis]';
}

function parseFileContent(fileData, fileType) {
    const type = String(fileType || '').toLowerCase();
    const cleaned = normalizeWhitespace(fileData);

    if (!cleaned) return '';

    if (type === 'log') {
        return trimToMaxLength(
            `Log Evidence:\n${cleaned}`,
            14000
        );
    }

    if (type === 'image') {
        // For image uploads we expect OCR/caption text to be supplied as fileData.
        return trimToMaxLength(
            `Image Evidence (OCR/description):\n${cleaned}`,
            10000
        );
    }

    return trimToMaxLength(
        `Text Evidence:\n${cleaned}`,
        12000
    );
}

module.exports = {
    parseFileContent,
};
