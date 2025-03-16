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
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBot = exports.sendMessageToUser = void 0;
const discord_js_1 = require("discord.js");
const extractor_1 = require("./util/extractor");
const functions_1 = require("./functions");
const getDiscordId_1 = require("./util/getDiscordId");
require('dotenv').config();
const bot = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages, // Add this to listen for messages in servers
        discord_js_1.GatewayIntentBits.DirectMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
    partials: [discord_js_1.Partials.Channel],
});
const TOKEN = process.env.DISCORD_TOKEN;
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
            console.log("Extracted Data:", extractedData);
            message.reply(`✅ Received your request!\n**Repo:** ${extractedData.repo}\n**Path:** ${extractedData.path}\n**Issue:** ${extractedData.issue}`);
            const { username } = yield (0, getDiscordId_1.getDiscordUser)(message.author.id);
            if (!username || username === "")
                return message.reply(`User not registered, please connect to Aether Ai properly`);
            yield (0, functions_1.cloneGithubRepo)({ githubName: username, repo: extractedData.repo, destination: `${username}/${extractedData.repo}` });
        }
        else {
            message.reply("⚠️ Please follow the format:\nrepo: <repo_name>\npath: <folder/file>\nissue: <describe the issue>");
        }
    }));
    bot.login(TOKEN);
};
exports.startBot = startBot;
exports.default = bot;
