import fs from "fs";
import jwt from "jsonwebtoken";
import simpleGit from "simple-git";

// Load GitHub App credentials
const APP_ID = 1178184;
const PRIVATE_KEY = fs.readFileSync("./aether-server.2025-03-14.private-key.pem", "utf8");

// Step 1: Generate a JWT
function generateJwt() {
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign(
        {
            iat: now, // Issued at
            exp: now + 300, // Expiry (10 mins)
            iss: APP_ID, // GitHub App ID
        },
        PRIVATE_KEY,
        { algorithm: "RS256" }
    );
}

// Step 2: Get Installation ID
async function getInstallationId(jwtToken:string) {
    const response = await fetch("https://api.github.com/app/installations", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${jwtToken}`,
            Accept: "application/vnd.github.v3+json",
        },
    });
    const installations = await response.json();
    console.log(installations)
    if (!installations.length) throw new Error("No installations found!");
    
    return installations[0].id;
}

// Step 3: Get Installation Access Token
async function getInstallationToken(jwtToken:string, installationId:string) {
    const response = await fetch(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${jwtToken}`,
                Accept: "application/vnd.github.v3+json",
            },
        }
    );

    const data = await response.json();
    if (!data.token) throw new Error("Failed to fetch installation token!");

    return data.token; // GitHub access token
}

// Step 4: Clone Repository
async function cloneRepo(repoUrl:string, token:string) {
    const git = simpleGit();
    const authUrl = repoUrl.replace("https://", `https://x-access-token:${token}@`);

    
    console.log("Cloning:", repoUrl);
    await git.clone(authUrl);
    console.log("✅ Cloned successfully!");
}

// Main Execution
(async () => {
    try {
        const jwtToken = generateJwt();
        const installationId = await getInstallationId(jwtToken);
        console.log("installationId",installationId)
        const accessToken = await getInstallationToken(jwtToken, installationId);
      console.log("->",accessToken)
        const repoUrl = "https://github.com/SharkFishDeveloper/Code-Chef";
        await cloneRepo(repoUrl, accessToken);
    } catch (error) {
      //@ts-ignore
        console.error("❌ Error:", error);
    }
})();
