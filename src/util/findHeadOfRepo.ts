export async function getDefaultBranch(token:string,REPO_OWNER:string,REPO_NAME:string) {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
        headers: {
            "Authorization": `token ${token}`,
            "Accept": "application/vnd.github.v3+json",
        },
    });

    const data = await response.json();
    return data.default_branch || "main"; // Fallback to "main" if not found
}