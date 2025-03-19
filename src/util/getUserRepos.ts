import { generateJwt, getInstallationId, getInstallationToken } from "../functions";

export const getUserRepos = async (username:string) => {
    try {
        const jwtToken = generateJwt();
        // console.log("Generated JWT:", jwtToken);

        const installationId = await getInstallationId(jwtToken);
        // console.log("Installation ID:", installationId);

        const accessToken = await getInstallationToken(jwtToken, installationId);
        // console.log("Installation Access Token:", accessToken);

        const formattedRepos = await listUserRepos(accessToken,username);
        return { formattedRepos };
    } catch (error) {
        // console.error("Error fetching repos:", error);
        return { formattedRepos: "Try again later..." };
    }
};

export async function listUserRepos(accessToken: string,username:string): Promise<string> {
    console.log("Fetching repos with Access Token:", accessToken);

    const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, {
        headers: {
            Authorization: `token ${accessToken}`, // Use 'token' not 'Bearer'
            Accept: "application/vnd.github.v3+json",
        },
    });

    if (!response.ok) {
        const errorMessage = await response.text();
    }

    const repos = await response.json();
    return repos.map((repo: any) => `${repo.name}:${repo.private ? "private" : "public"}`).join("\n");
}
