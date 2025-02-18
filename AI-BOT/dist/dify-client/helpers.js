"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unicodeToChar = unicodeToChar;
function unicodeToChar(text) {
    if (!text)
        return "";
    return text.replace(/\\u[0-9a-f]{4}/g, (_match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
    });
}
