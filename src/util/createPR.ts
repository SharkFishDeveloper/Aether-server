import { generateJwt, getInstallationId, getInstallationToken } from "../functions";
import { getDefaultBranch } from "./findHeadOfRepo";

export async function createPR(branchName: string, REPO_OWNER: string, REPO_NAME: string) {
    try {
        const jwtToken = generateJwt();

        if (!jwtToken) throw new Error("Failed to generate JWT token.");

        const installationId = await getInstallationId(jwtToken);
        if (!installationId) throw new Error("Failed to retrieve installation ID.");

        const token = await getInstallationToken(jwtToken, installationId);
        if (!token) throw new Error("Failed to retrieve installation token.");

        const baseBranch = await getDefaultBranch(token, REPO_OWNER, REPO_NAME);
        if (!baseBranch) throw new Error("Failed to determine the default branch.");

        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls`, {
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
            const errorData = await response.json();
            throw new Error(`GitHub API Error: ${errorData.message || "Unknown error"} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();

        if (data.html_url) {
            console.log(`✅ Pull Request Created: ${data.html_url}`);
            return {
                success: true,
                message: "Pull Request created successfully.",
                pr_url: data.html_url,
                pr_number: data.number,
            };
        } else {
            throw new Error(`Invalid API response: ${JSON.stringify(data)}`);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to create PR: ${errorMessage}`);
        return {
            success: false,
            message: errorMessage,
            errors: error instanceof Error ? error.stack : null,
        };
    }
}
