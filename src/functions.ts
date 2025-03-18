import fs from "fs";
import jwt from "jsonwebtoken";
import path from "path";
import simpleGit from "simple-git";
require("dotenv").config()

const APP_ID = process.env.GITHUB_APP_ID;
const PRIVATE_KEY = (process.env.GITHUB_PRIVATE_KEY || "").replace(/\\n/g, "\n");

export function generateJwt() {
    if(!APP_ID) console.log("NO APP ID");
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
export async function getInstallationId(jwtToken:string) {
    const response = await fetch("https://api.github.com/app/installations", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${jwtToken}`,
            Accept: "application/vnd.github.v3+json",
        },
    });
    const installations = await response.json();
    if (!installations.length) throw new Error("No installations found!");
    
    return installations[0].id;
}

// Step 3: Get Installation Access Token
export async function getInstallationToken(jwtToken:string, installationId:string) {
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
async function cloneRepo(repoUrl:string, token:string,destination:string,repo:string) {
    const targetDir = path.join(process.cwd(), `clonedRepos`,destination); 
    const git = simpleGit();
    const authUrl = repoUrl.replace("https://", `https://x-access-token:${token}@`);

    try {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }else if(fs.existsSync(targetDir)){
            return {success:false};
        }
    } catch (error) {
        return {success:false};
    }
    console.log("Cloning:", repoUrl);
    await git.clone(authUrl,targetDir);
    console.log("✅ Cloned successfully!");
    return {success:true}
}

export const cloneGithubRepo = async ({githubName,repo,destination}:{githubName:string,repo:string,destination:string}) => {
    try {
        const jwtToken = generateJwt();
        const installationId = await getInstallationId(jwtToken);
        const accessToken = await getInstallationToken(jwtToken, installationId);
        const repoUrl = `https://github.com/${githubName}/${repo}`;
        const {success} = await cloneRepo(repoUrl, accessToken,destination,repo);
        return {success}
    } catch (error) {
      //@ts-ignore
      return {success:false}
    }
};
