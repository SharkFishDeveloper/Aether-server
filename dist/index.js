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
const fs_1 = __importDefault(require("fs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const simple_git_1 = __importDefault(require("simple-git"));
// Load GitHub App credentials
const APP_ID = 1178184;
const PRIVATE_KEY = fs_1.default.readFileSync("./github_key.pem", "utf8");
// Step 1: Generate a JWT
function generateJwt() {
    const now = Math.floor(Date.now() / 1000);
    return jsonwebtoken_1.default.sign({
        iat: now, // Issued at
        exp: now + 300, // Expiry (10 mins)
        iss: APP_ID, // GitHub App ID
    }, PRIVATE_KEY, { algorithm: "RS256" });
}
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
        console.log(installations);
        if (!installations.length)
            throw new Error("No installations found!");
        return installations[0].id;
    });
}
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
// Step 4: Clone Repository
function cloneRepo(repoUrl, token) {
    return __awaiter(this, void 0, void 0, function* () {
        const git = (0, simple_git_1.default)();
        const authUrl = repoUrl.replace("https://", `https://x-access-token:${token}@`);
        console.log("Cloning:", repoUrl);
        yield git.clone(authUrl);
        console.log("✅ Cloned successfully!");
    });
}
// Main Execution
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const jwtToken = generateJwt();
        const installationId = yield getInstallationId(jwtToken);
        console.log("installationId", installationId);
        const accessToken = yield getInstallationToken(jwtToken, installationId);
        console.log("->", accessToken);
        const repoUrl = "https://github.com/SharkFishDeveloper/Code-Chef";
        yield cloneRepo(repoUrl, accessToken);
    }
    catch (error) {
        //@ts-ignore
        console.error("❌ Error:", error);
    }
}))();
