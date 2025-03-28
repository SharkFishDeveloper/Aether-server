"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultBranch = void 0;
function getDefaultBranch(token, REPO_OWNER, REPO_NAME) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
            headers: {
                "Authorization": `token ${token}`,
                "Accept": "application/vnd.github.v3+json",
            },
        });
        const data = yield response.json();
        return data.default_branch || "main"; // Fallback to "main" if not found
    });
}
exports.getDefaultBranch = getDefaultBranch;
