"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractUserMessage = void 0;
const extractUserMessage = (message) => {
    const repoMatch = message.match(/repo:\s*(.+)/i);
    const pathMatch = message.match(/path:\s*(.+)/i);
    const issueMatch = message.match(/issue:\s*(.+)/i);
    return {
        repo: repoMatch ? repoMatch[1].trim() : null,
        path: pathMatch ? pathMatch[1].trim() : null,
        issue: issueMatch ? issueMatch[1].trim() : null,
    };
};
exports.extractUserMessage = extractUserMessage;
