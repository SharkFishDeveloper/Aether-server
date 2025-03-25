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
exports.startBot = exports.sendMessageToUser = void 0;
const discord_js_1 = require("discord.js");
const extractor_1 = require("./util/extractor");
const functions_1 = require("./functions");
const getDiscordId_1 = require("./util/getDiscordId");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
const createPR_1 = require("./util/createPR");
const getUserRepos_1 = require("./util/getUserRepos");
const gitDirectory_1 = require("./util/gitDirectory");
require('dotenv').config();
const bot = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.DirectMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
    partials: [discord_js_1.Partials.Channel],
});
const TOKEN = process.env.DISCORD_TOKEN;
const USER_REQUESTS = {};
const NEW_REPO_TIME_LIMIT = 60 * 5 * 1000;
const sendMessageToUser = (discordId, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield bot.users.fetch(discordId);
        if (user) {
            yield user.send(message);
            console.log(`Sent message to ${user.username}`);
        }
        else {
            console.log(`User not found: ${discordId}`);
            return { error: "User not found" };
        }
    }
    catch (error) {
        console.error("Error sending message:", error);
        return { error: "Failed to send message" };
    }
});
exports.sendMessageToUser = sendMessageToUser;
//########################################################################################
const startBot = () => {
    bot.once("ready", () => {
        var _a;
        console.log(`Logged in as ${(_a = bot.user) === null || _a === void 0 ? void 0 : _a.tag}!`);
    });
    bot.on("messageCreate", (message) => __awaiter(void 0, void 0, void 0, function* () {
        if (message.author.bot)
            return;
        const extractedData = (0, extractor_1.extractUserMessage)(message.content);
        const { username } = yield (0, getDiscordId_1.getDiscordUser)(message.author.id);
        if (!username)
            return message.author.send("Please sign in correctly, or wait for some time");
        if (message.content.trim() === "repos?") {
            try {
                const repos = yield (0, getUserRepos_1.getUserRepos)(username);
                yield message.author.send(repos.formattedRepos || "No repositories found.");
                return; // ✅ Return to prevent further execution
            }
            catch (error) {
                console.error("Error fetching repos:", error);
                return message.author.send("❌ Error fetching repositories. Try again later.");
            }
        }
        else if (message.content.trim() === "echo") {
            if (USER_REQUESTS[username]) {
                const userdetail = USER_REQUESTS[username];
                const { repo, path } = userdetail;
                return message.author.send(`Username : ${username}\nRepository : ${repo}\nPath:${path}`);
            }
            else {
                return message.author.send("Oops, there is no activity...");
            }
        }
        else if (message.content.trim() == 'list') {
            if (USER_REQUESTS[username].repo !== "") {
                const listDir = yield (0, gitDirectory_1.generateTree)(path_1.default.join(process.cwd(), '/clonedRepos', username, USER_REQUESTS[username].repo));
                return message.author.send(listDir !== null && listDir !== void 0 ? listDir : "Cannot do it ...");
            }
            else {
                return message.author.send("No repository is selected...");
            }
        }
        else if (extractedData.repo && extractedData.path && extractedData.issue) {
            message.author.send(`✅ Received your request!\n**Repo:** ${extractedData.repo}\n**Path:** ${extractedData.path}\n**Issue:** ${extractedData.issue}`);
            const now = Date.now();
            if (!username || username === "")
                return message.author.send(`User not registered, please connect to Aether Ai properly`);
            if (USER_REQUESTS[username]) {
                const lastRequest = USER_REQUESTS[username]; // Get the stored request
                // console.log("TIME LEFT - ",Date.now() - (USER_REQUESTS[username].timestamp ?? 0) )
                if (lastRequest.repo !== extractedData.repo && // If the user is switching to a new repo
                    now - lastRequest.timestamp < NEW_REPO_TIME_LIMIT // And within 5 min
                ) {
                    return message.author.send("⏳ **Rate limit reached!** Try again after 5 minutes.");
                }
            }
            else {
                USER_REQUESTS[username] = { timestamp: Date.now(), repo: extractedData.repo, issues: [extractedData.issue], path: extractedData.path };
            }
            const { success } = yield (0, functions_1.cloneGithubRepo)({ githubName: username, repo: extractedData.repo, destination: `${username}/${extractedData.repo}` });
            if (!success) {
                message.author.send('Already cloned repository');
            }
            else {
                message.author.send(`\nCloned ${extractedData.repo}`);
            }
            const filePath = path_1.default.join(process.cwd(), `/clonedRepos/${username}/${extractedData.repo}`, extractedData.path);
            if (!fs_1.default.existsSync(filePath)) {
                return message.author.send(`⚠️ File not found at path: ${extractedData.path}, please send again,
            in the same format as before`);
            }
            const fileContent = fs_1.default.readFileSync(filePath, "utf-8");
            const { code, explanation, error } = yield getGeminiResponse(fileContent, [extractedData.issue]);
            if (error) {
                return message.author.send(error);
            }
            if (code && code !== "No code provided" && code.length !== 24) {
    try {
        // Truncate if preview is too long
        const maxLength = 800; // Reserve some space for extra text
        const truncatedPreview = code.length > maxLength ? code.slice(0, maxLength) + "\n..." : code;
        
        // Write file only if conditions are met
        fs_1.default.writeFileSync(filePath, code);
        
        const cleanedExplanation = explanation.replace(/\n\s*\n/g, '\n').trim();
        yield message.author.send(`**Explanation:**\n${cleanedExplanation.slice(0, 1400)}`);
        yield new Promise(resolve => setTimeout(resolve, 1000));
        yield message.author.send(`**Code:** \`\`\`\n${truncatedPreview}\n\`\`\``);
    } catch (error) {
        message.author.send("❌ Error applying changes.");
    }
            }
            //* THIS ELSE BLOCK IS REQUIRED WHEN THERE IS NO CODE BLOCK AS IN CASE OF A QUERY
            else {
                return message.author.send(explanation.slice(0, 1800));
            }
        }
        //* //////////////////////////////////////////////////////////////////////////////////////////////////////////
        else {
            if (!username) {
                return message.author.send('You are not registerd. Please goto Aether AI website');
            }
            if (!USER_REQUESTS[username]) {
                return message.author.send("⚠️ Please follow the format:\nrepo: <repo_name>\npath: <folder/file>\nissue: <describe the issue>");
            }
            const pathRegex = /^\s*path\s*:\s*(.+?)\s*$/;
            let filePath = '';
            const match = message.content.match(pathRegex);
            if (match) {
                if (match[1]) {
                    const extractedPath = match[1];
                    filePath = path_1.default.join(process.cwd(), `/clonedRepos/${username}/${USER_REQUESTS[username].repo}/${extractedPath}`);
                    if (!fs_1.default.existsSync(filePath)) {
                        return message.author.send(`⚠️ File not found at path: ${match[1]}, please send again,
                    in the same format as before , ${filePath}`);
                    }
                    else {
                        USER_REQUESTS[username].path = match[1];
                        USER_REQUESTS[username].issues = [];
                        return message.author.send(`OKay, now your file path is -> ${match[1]}`);
                    }
                }
            }
            //* IT IS A NORMAL REQUEST , no change of file path
            const prRegex = /^createPR\s*:\s*(.+)$/;
            filePath = path_1.default.join(process.cwd(), `/clonedRepos/${username}/${USER_REQUESTS[username].repo}/${USER_REQUESTS[username].path}`);
            if (prRegex.test(message.content)) {
                try {
                    process.chdir(path_1.default.dirname(filePath));
                    (0, child_process_1.execSync)("git add .");
                    //@ts-ignore
                    const commitMessage = message.content.match(prRegex)[1];
                    (0, child_process_1.execSync)(`git commit -m "${commitMessage}"`);
                    const now = new Date();
                    const formattedDate = now
                        .toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" })
                        .replace(/\//g, "-");
                    const hours = now.getHours();
                    const period = hours >= 12 ? "pm" : "am";
                    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
                    const minutes = now.getMinutes().toString().padStart(2, "0");
                    const seconds = now.getSeconds().toString().padStart(2, "0");
                    const branchName = `aether-bot-${formattedDate}-${hour12}${period}-${minutes}-${seconds}`;
                    try {
                        // Check if branch exists before creating
                        (0, child_process_1.execSync)(`git checkout ${branchName}`);
                    }
                    catch (_a) {
                        (0, child_process_1.execSync)(`git checkout -b ${branchName}`);
                    }
                    try {
                        (0, child_process_1.execSync)(`git push origin ${branchName}`);
                        (0, createPR_1.createPR)(branchName, username, USER_REQUESTS[username].repo)
                            .then((result) => {
                            if (result.success) {
                                return message.author.send(`✅ PR Created: ${result.pr_url}`);
                            }
                            else {
                                message.author.send(`❌ PR creation failed: ${result.message}`);
                            }
                        })
                            .catch((error) => {
                            return message.author.send(`🚨 Error creating PR: ${error.message}`);
                        });
                        return message.author.send(`✅ Branch ${branchName} pushed successfully!`);
                    }
                    catch (error) {
                        return message.author.send(`❌ Failed to push branch: ${branchName}`);
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    return message.author.send(`🚨 Error: ${errorMessage}`);
                }
                finally {
                    process.chdir("../../../"); // Ensure directory change happens
                }
            }
            let fileContent = "";
            try {
                fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
            }
            catch (error) {
                return message.author.send(`⚠️ There was an error reading the file at path: ${filePath}`);
            }
            if (USER_REQUESTS[username] && USER_REQUESTS[username].repo) {
                USER_REQUESTS[username].issues.push(message.content);
                USER_REQUESTS[username].issues = USER_REQUESTS[username].issues.slice(-5);
                const { code, explanation, error } = yield getGeminiResponse(fileContent, USER_REQUESTS[username].issues);
                if (error) {
                    return message.author.send(error);
                }
                if (code && code !== "No code provided" && code.length !== 24) {
    try {
        // Truncate if preview is too long
        const maxLength = 800; // Reserve some space for extra text
        const truncatedPreview = code.length > maxLength ? code.slice(0, maxLength) + "\n..." : code;
        
        // Write file only if conditions are met
        fs_1.default.writeFileSync(filePath, code);
        
        const cleanedExplanation = explanation.replace(/\n\s*\n/g, '\n').trim();
        yield message.author.send(`**Explanation:**\n${cleanedExplanation.slice(0, 1400)}`);
        yield new Promise(resolve => setTimeout(resolve, 1000));
        yield message.author.send(`**Code:** \`\`\`\n${truncatedPreview}\n\`\`\``);
    } catch (error) {
        message.author.send("❌ Error applying changes.");
    }
}
                //* THIS ELSE BLOCK IS REQUIRED WHEN THERE IS NO CODE BLOCK AS IN CASE OF A QUERY
                else {
                    return message.author.send(explanation.slice(0, 1800));
                }
            }
        }
    }));
    bot.login(TOKEN);
};
exports.startBot = startBot;
//########################################################################################
// Function to send request to Gemini API
const getGeminiResponse = (fileContent, issues) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const formattedIssues = issues
            .map((issue, index) => `${index + 1}. ${issue}`)
            .join("\n");
        const prompt = `
      Here is the code:\n\n${fileContent}\n\n
      User's issue history:\n${formattedIssues}\n\n
      Latest issue is #${issues.length}. Consider the user's history if it is required and suggest a fix accordingly.

      Guidelines on Using History:
      - If the new issue is related to past issues (same error type, same function, or a repeated mistake), consider the history and suggest improvements accordingly.
      - If the issue is entirely new (unrelated to past errors), do not reference history.
      - If unsure, prioritize the latest issue and only mention past history if it adds value.
      - If the latest instruction contradicts previous ones, remove past constraints and follow the latest instruction strictly.
      - Do not assume constraints (e.g., line limits, style choices) from history if the user explicitly changes them.


      ⚠️ Important:
      - Do NOT modify the code unless the user explicitly requests an updated version.
      - Do not provide explanations if the user explicitly requests not to. Otherwise, provide the explanations.
      - Do not add unnecessary blank lines or excessive spaces in explanations unless mentioned specificaly.
      - Use this strict format only:
      - If the user's question does not require code, respond with only the explanation. Do not include an empty code block or any placeholder text —simply omit the code section entirely.
      
      ### Code:
      \`\`\`
      (Put only the full corrected code here)
      \`\`\`
      
      ### Explanation:
      (Provide explanations, reasoning, and suggestions here separately)`;
        const response = yield axios_1.default.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            contents: [{ parts: [{ text: prompt }] }],
        }, { headers: { "Content-Type": "application/json" } });
        const data = response.data;
        const generatedText = ((_e = (_d = (_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) || "No response from AI.";
        const codeMatch = generatedText.match(/```(?:\w+)?\n([\s\S]+?)```/);
        const explanationMatch = generatedText.match(/### Explanation:\s*([\s\S]+)/);
        const formattedResponse = {
            code: codeMatch ? codeMatch[1].trim() : "No code provided",
            explanation: explanationMatch ? explanationMatch[1].trim() : "No explanation provided",
            error: null
        };
        console.log(formattedResponse);
        return formattedResponse;
    }
    catch (error) {
        return { code: "", explanation: "", error: "⚠️ Error fetching response from AI." };
    }
});
setInterval(() => {
    const now = Date.now();
    Object.entries(USER_REQUESTS).forEach(([username, data]) => {
        if (now - data.timestamp > 15 * 60 * 1000) { // 15 min threshold
            const userRepoPath = path_1.default.join(process.cwd(), `clonedRepos/${username}`);
            if (fs_1.default.existsSync(userRepoPath)) {
                fs_1.default.rmSync(userRepoPath, { recursive: true, force: true });
                console.log(`✅ Deleted repo folder for ${username}/${data.repo}`);
            }
            // Remove user from tracking
            delete USER_REQUESTS[username];
        }
    });
}, 60 * 1000); // Runs every 1 minute
exports.default = bot;
