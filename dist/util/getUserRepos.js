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
exports.listUserRepos = exports.getUserRepos = void 0;
const functions_1 = require("../functions");
const getUserRepos = (username) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const jwtToken = (0, functions_1.generateJwt)();
        // console.log("Generated JWT:", jwtToken);
        const installationId = yield (0, functions_1.getInstallationId)(jwtToken);
        // console.log("Installation ID:", installationId);
        const accessToken = yield (0, functions_1.getInstallationToken)(jwtToken, installationId);
        // console.log("Installation Access Token:", accessToken);
        const formattedRepos = yield listUserRepos(accessToken, username);
        return { formattedRepos };
    }
    catch (error) {
        // console.error("Error fetching repos:", error);
        return { formattedRepos: "Try again later..." };
    }
});
exports.getUserRepos = getUserRepos;
function listUserRepos(accessToken, username) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Fetching repos with Access Token:", accessToken);
        const response = yield fetch(`https://api.github.com/users/${username}/repos?per_page=100`, {
            headers: {
                Authorization: `token ${accessToken}`, // Use 'token' not 'Bearer'
                Accept: "application/vnd.github.v3+json",
            },
        });
        if (!response.ok) {
            const errorMessage = yield response.text();
        }
        const repos = yield response.json();
        return repos.map((repo) => `${repo.name}:${repo.private ? "private" : "public"}`).join("\n");
    });
}
exports.listUserRepos = listUserRepos;
