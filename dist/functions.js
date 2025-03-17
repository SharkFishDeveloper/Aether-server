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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneGithubRepo = exports.getInstallationToken = exports.getInstallationId = exports.generateJwt = void 0;
const fs_1 = __importDefault(require("fs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const path_1 = __importDefault(require("path"));
const simple_git_1 = __importDefault(require("simple-git"));
require("dotenv").config();
// Load GitHub App credentials
const APP_ID = 1178184;
// const PRIVATE_KEY = fs.readFileSync("./github_key.pem", "utf8");
const PRIVATE_KEY = (process.env.GITHUB_PRIVATE_KEY || "").replace(/\\n/g, "\n");
function generateJwt() {
    const now = Math.floor(Date.now() / 1000);
    return jsonwebtoken_1.default.sign({
        iat: now, // Issued at
        exp: now + 300, // Expiry (10 mins)
        iss: APP_ID, // GitHub App ID
    }, PRIVATE_KEY, { algorithm: "RS256" });
}
exports.generateJwt = generateJwt;
// Step 2: Get Installation ID
function getInstallationId(jwtToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch("https://api.github.com/app/installations", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${jwtToken}`,
                Accept: "application/vnd.github.v3+json",
            },
        });
        const installations = yield response.json();
        if (!installations.length)
            throw new Error("No installations found!");
        return installations[0].id;
    });
}
exports.getInstallationId = getInstallationId;
// Step 3: Get Installation Access Token
function getInstallationToken(jwtToken, installationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${jwtToken}`,
                Accept: "application/vnd.github.v3+json",
            },
        });
        const data = yield response.json();
        if (!data.token)
            throw new Error("Failed to fetch installation token!");
        return data.token; // GitHub access token
    });
}
exports.getInstallationToken = getInstallationToken;
// Step 4: Clone Repository
function cloneRepo(repoUrl, token, destination, repo) {
    return __awaiter(this, void 0, void 0, function* () {
        const targetDir = path_1.default.join(process.cwd(), `clonedRepos`, destination);
        const git = (0, simple_git_1.default)();
        const authUrl = repoUrl.replace("https://", `https://x-access-token:${token}@`);
        try {
            if (!fs_1.default.existsSync(targetDir)) {
                fs_1.default.mkdirSync(targetDir, { recursive: true });
            }
            else if (fs_1.default.existsSync(targetDir)) {
                return { success: false };
            }
        }
        catch (error) {
            return { success: false };
        }
        console.log("Cloning:", repoUrl);
        yield git.clone(authUrl, targetDir);
        console.log("✅ Cloned successfully!");
        return { success: true };
    });
}
const cloneGithubRepo = ({ githubName, repo, destination }) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const jwtToken = generateJwt();
        const installationId = yield getInstallationId(jwtToken);
        const accessToken = yield getInstallationToken(jwtToken, installationId);
        console.log("->", accessToken);
        const repoUrl = `https://github.com/${githubName}/${repo}`;
        const { success } = yield cloneRepo(repoUrl, accessToken, destination, repo);
        return { success };
    }
    catch (error) {
        //@ts-ignore
        return { success: false };
    }
});
exports.cloneGithubRepo = cloneGithubRepo;
