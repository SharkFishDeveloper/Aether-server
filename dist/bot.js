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
const diff_1 = require("diff");
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
const NEW_REPO_TIME_LIMIT = 5 * 60 * 1000;
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
        if (extractedData.repo && extractedData.path && extractedData.issue) {
            message.reply(`✅ Received your request!\n**Repo:** ${extractedData.repo}\n**Path:** ${extractedData.path}\n**Issue:** ${extractedData.issue}`);
            const now = Date.now();
            if (!username || username === "")
                return message.reply(`User not registered, please connect to Aether Ai properly`);
            if (USER_REQUESTS[username]) {
                const lastRequest = USER_REQUESTS[username]; // Get the stored request
                if (lastRequest.repo !== extractedData.repo && // If the user is switching to a new repo
                    now - lastRequest.timestamp < NEW_REPO_TIME_LIMIT // And within 5 min
                ) {
                    return message.reply("⏳ **Rate limit reached!** Try again after 5 minutes.");
                }
            }
            else {
                USER_REQUESTS[username] = { timestamp: Date.now(), repo: extractedData.repo, issues: [extractedData.issue], path: extractedData.path };
            }
            const { success } = yield (0, functions_1.cloneGithubRepo)({ githubName: username, repo: extractedData.repo, destination: `${username}/${extractedData.repo}` });
            if (!success) {
                message.reply('Already cloned repository');
            }
            else {
                message.reply(`\nCloned ${extractedData.repo}`);
            }
            const filePath = path_1.default.join(process.cwd(), `/clonedRepos/${username}/${extractedData.repo}`, extractedData.path);
            if (!fs_1.default.existsSync(filePath)) {
                return message.reply(`⚠️ File not found at path: ${extractedData.path}, please send again,
            in the same format as before`);
            }
            const fileContent = fs_1.default.readFileSync(filePath, "utf-8");
            const { code, explanation, error } = yield getGeminiResponse(fileContent, [extractedData.issue]);
            if (error) {
                return message.reply(error);
            }
            if (code) {
                try {
                    const diff = (0, diff_1.diffLines)(fileContent || "", code);
                    const preview = diff
                        .map((part) => {
                        if (part.added)
                            return `+ ${part.value.trim()}`;
                        if (part.removed)
                            return `- ${part.value.trim()}`;
                        return null;
                    })
                        .filter(Boolean) // Removes null values
                        .join("\n");
                    // Truncate if preview is too long
                    const maxLength = 800; // Reserve some space for extra text
                    const truncatedPreview = preview.length > maxLength ? preview.slice(0, maxLength) + "\n..." : preview;
                    fs_1.default.writeFileSync(filePath, code);
                    yield message.reply(`**Explanation:**\n${explanation.slice(0, 1999)}`);
                    yield new Promise(resolve => setTimeout(resolve, 1000));
                    yield message.reply(`**Code:** \`\`\`\n${truncatedPreview}\n\`\`\``);
                }
                catch (error) {
                    message.reply("❌ Error applying changes.");
                }
            }
            //* THIS ELSE BLOCK IS REQUIRED WHEN THERE IS NO CODE BLOCK AS IN CASE OF A QUERY
            else {
                return message.reply(explanation);
            }
        }
        //* //////////////////////////////////////////////////////////////////////////////////////////////////////////
        else {
            if (!username)
                return message.reply('You are not registerd. Please goto Aether AI website');
            const pathRegex = /^path:\s*\S+/;
            let filePath = '';
            if (!USER_REQUESTS[username]) {
                return message.reply("⚠️ Please follow the format:\nrepo: <repo_name>\npath: <folder/file>\nissue: <describe the issue>");
            }
            // if(USER_REQUESTS[username].timestamp - Date.now() > 900000){
            //   return message.reply('Time limit exceeded wait')
            // }
            if (pathRegex.test(message.content)) {
                filePath = path_1.default.join(process.cwd(), `/clonedRepos/${username}/${USER_REQUESTS[username].repo}/${message.content}`);
                if (!fs_1.default.existsSync(filePath)) {
                    return message.reply(`⚠️ File not found at path: ${extractedData.path}, please send again,
              in the same format as before`);
                }
                else {
                    USER_REQUESTS[username].path = message.content;
                    USER_REQUESTS[username].issues = [];
                    return message.reply(`OKay, now your file path is -> ${message.content.split(":")}`);
                }
            }
            else {
                filePath = path_1.default.join(process.cwd(), `/clonedRepos/${username}/${USER_REQUESTS[username].repo}/${USER_REQUESTS[username].path}`);
            }
            let fileContent = "";
            try {
                fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
            }
            catch (error) {
                return message.reply(`⚠️ There was an error reading the file at path: ${filePath}`);
            }
            if (USER_REQUESTS[username] && USER_REQUESTS[username].repo) {
                USER_REQUESTS[username].issues.push(message.content);
                USER_REQUESTS[username].issues = USER_REQUESTS[username].issues.slice(-5);
                const { code, explanation, error } = yield getGeminiResponse(fileContent, USER_REQUESTS[username].issues);
                if (error) {
                    return message.reply(error);
                }
                if (code) {
                    try {
                        const diff = (0, diff_1.diffLines)(fileContent || "", code);
                        const preview = diff
                            .map((part) => {
                            if (part.added)
                                return `+ ${part.value.trim()}`;
                            if (part.removed)
                                return `- ${part.value.trim()}`;
                            return null;
                        })
                            .filter(Boolean) // Removes null values
                            .join("\n");
                        // Truncate if preview is too long
                        const maxLength = 800; // Reserve some space for extra text
                        const truncatedPreview = preview.length > maxLength ? preview.slice(0, maxLength) + "\n..." : preview;
                        fs_1.default.writeFileSync(filePath, code);
                        yield message.reply(`**Explanation:**\n${explanation.slice(0, 1999)}`);
                        yield new Promise(resolve => setTimeout(resolve, 1000));
                        yield message.reply(`**Code:** \`\`\`\n${truncatedPreview}\n\`\`\``);
                    }
                    catch (error) {
                        message.reply("❌ Error applying changes.");
                    }
                }
                //* THIS ELSE BLOCK IS REQUIRED WHEN THERE IS NO CODE BLOCK AS IN CASE OF A QUERY
                else {
                    return message.reply(explanation);
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
    try {
        const formattedIssues = issues
            .map((issue, index) => `${index + 1}. ${issue}`)
            .join("\n");
        const prompt = `Here is the code:\n\n${fileContent}\n\n
      User's issue history:\n${formattedIssues}\n\n
      Latest issue is #${issues.length}. Consider the user's history if required and suggest a fix accordingly.
      
      ⚠️ Important:
      - Provide the full corrected code separately.
      - Provide explanations separately.
      - Use this strict format only:
      - If the user asks for a query and it is very clear they are not asking for code then keep code block empty and give explanation in explanation block
      
      ### Code:
      \`\`\`
      (Put only the full corrected code here)
      \`\`\`
      
      ### Explanation:
      (Provide explanations, reasoning, and suggestions here separately)`;
        console.log(prompt);
        return { code: "", explanation: "", error: "⚠️ Error fetching response from AI." };
        // const response = await axios.post(
        //   `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        //   {
        //     contents: [{ parts: [{ text: prompt }] }],
        //   },
        //   { headers: { "Content-Type": "application/json" } }
        // );
        // const data = response.data as { 
        //   candidates?: { content?: { parts?: { text: string }[] } }[] 
        // };
        // const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI.";
        // const codeMatch = generatedText.match(/```(?:\w+)?\n([\s\S]+?)```/);
        // const explanationMatch = generatedText.match(/### Explanation:\s*([\s\S]+)/);
        // const formattedResponse = {
        //   code: codeMatch ? codeMatch[1].trim() : "No code provided",
        //   explanation: explanationMatch ? explanationMatch[1].trim() : "No explanation provided",
        //   error:null
        // };
        // return formattedResponse;
    }
    catch (error) {
        return { code: "", explanation: "", error: "⚠️ Error fetching response from AI." };
    }
});
exports.default = bot;
