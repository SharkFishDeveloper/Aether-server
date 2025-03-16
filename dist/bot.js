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
        if (extractedData.repo && extractedData.path && extractedData.issue) {
            message.reply(`✅ Received your request!\n**Repo:** ${extractedData.repo}\n**Path:** ${extractedData.path}\n**Issue:** ${extractedData.issue}`);
            const { username } = yield (0, getDiscordId_1.getDiscordUser)(message.author.id);
            const now = Date.now();
            if (!username || username === "")
                return message.reply(`User not registered, please connect to Aether Ai properly`);
            if (USER_REQUESTS[username] && USER_REQUESTS[username].length > 0) {
                const lastRequest = USER_REQUESTS[username].slice(-1)[0]; // Get the most recent request
                if (lastRequest.repo !== extractedData.repo && // If it's a different repo
                    now - lastRequest.timestamp < NEW_REPO_TIME_LIMIT // And within 5 min
                ) {
                    return message.reply("⏳ **Rate limit reached!** Try again after 5 minutes.");
                }
            }
            const { success } = yield (0, functions_1.cloneGithubRepo)({ githubName: username, repo: extractedData.repo, destination: `${username}/${extractedData.repo}` });
            if (!success) {
                message.reply('Already cloned repository');
            }
            else {
                message.reply(`\n**Cloned ${extractedData.repo}`);
            }
            const filePath = path_1.default.join(process.cwd(), `/clonedRepos/${username}/${extractedData.repo}`, extractedData.path);
            if (!fs_1.default.existsSync(filePath)) {
                return message.reply(`⚠️ File not found at path: ${extractedData.path}, please send again,
            in the same format as before`);
            }
            const fileContent = fs_1.default.readFileSync(filePath, "utf-8");
            if (!USER_REQUESTS[username]) {
                USER_REQUESTS[username] = [];
            }
            // **Store multiple requests per user**
            USER_REQUESTS[username].push({
                timestamp: now,
                repo: extractedData.repo,
                issue: extractedData.issue,
            });
        }
        else {
            message.reply("⚠️ Please follow the format:\nrepo: <repo_name>\npath: <folder/file>\nissue: <describe the issue>");
        }
    }));
    bot.login(TOKEN);
};
exports.startBot = startBot;
//########################################################################################
// Function to send request to Gemini API
const getGeminiResponse = (fileContent, issue) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const response = yield axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            contents: [
                {
                    parts: [
                        { text: `Here is the code:\n\n${fileContent}\n\nIssue: ${issue}\n\nSuggest a fix.` },
                    ],
                },
            ],
        }, { headers: { "Content-Type": "application/json" } });
        const data = response.data;
        return ((_b = (_a = data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) || "No response from AI.";
    }
    catch (error) {
        console.error("Gemini API Error:", error);
        return "⚠️ Error fetching response from AI.";
    }
});
exports.default = bot;
