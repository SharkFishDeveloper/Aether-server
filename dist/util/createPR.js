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
exports.createPR = void 0;
const functions_1 = require("../functions");
const findHeadOfRepo_1 = require("./findHeadOfRepo");
function createPR(branchName, REPO_OWNER, REPO_NAME) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const jwtToken = (0, functions_1.generateJwt)();
            if (!jwtToken)
                throw new Error("Failed to generate JWT token.");
            const installationId = yield (0, functions_1.getInstallationId)(jwtToken);
            if (!installationId)
                throw new Error("Failed to retrieve installation ID.");
            const token = yield (0, functions_1.getInstallationToken)(jwtToken, installationId);
            if (!token)
                throw new Error("Failed to retrieve installation token.");
            const baseBranch = yield (0, findHeadOfRepo_1.getDefaultBranch)(token, REPO_OWNER, REPO_NAME);
            if (!baseBranch)
                throw new Error("Failed to determine the default branch.");
            const response = yield fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls`, {
                method: "POST",
                headers: {
                    "Authorization": `token ${token}`,
                    "Accept": "application/vnd.github.v3+json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: `Automated PR: ${branchName}`,
                    head: branchName,
                    base: baseBranch,
                    body: "This PR was automatically created by Aether Bot.",
                }),
            });
            if (!response.ok) {
                const errorData = yield response.json();
                throw new Error(`GitHub API Error: ${errorData.message || "Unknown error"} - ${JSON.stringify(errorData)}`);
            }
            const data = yield response.json();
            if (data.html_url) {
                console.log(`✅ Pull Request Created: ${data.html_url}`);
                return {
                    success: true,
                    message: "Pull Request created successfully.",
                    pr_url: data.html_url,
                    pr_number: data.number,
                };
            }
            else {
                throw new Error(`Invalid API response: ${JSON.stringify(data)}`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ Failed to create PR: ${errorMessage}`);
            return {
                success: false,
                message: errorMessage,
                errors: error instanceof Error ? error.stack : null,
            };
        }
    });
}
exports.createPR = createPR;
