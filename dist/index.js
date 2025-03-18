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
exports.loadData = void 0;
const express_1 = __importDefault(require("express"));
const promises_1 = __importDefault(require("fs/promises"));
const cors_1 = __importDefault(require("cors"));
const bot_1 = require("./bot");
const Hello_1 = require("./util/Hello");
const app = (0, express_1.default)();
const PORT = 3000;
const FILE_PATH = "users_key_value_discord.json";
(0, bot_1.startBot)(); //* Start discord bot
app.use(express_1.default.json());
app.use((0, cors_1.default)({ origin: "http://localhost:3000", credentials: true, }));
const loadData = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield promises_1.default.access(FILE_PATH).catch(() => promises_1.default.writeFile(FILE_PATH, "{}")); // Create file if missing
        const data = yield promises_1.default.readFile(FILE_PATH, "utf-8");
        return JSON.parse(data);
    }
    catch (err) {
        return {}; // Return empty object on error
    }
});
exports.loadData = loadData;
const saveData = (data) => __awaiter(void 0, void 0, void 0, function* () {
    yield promises_1.default.writeFile(FILE_PATH, JSON.stringify(data, null, 0));
});
//@ts-ignore
app.post("/discord/authentication", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { discord_id, username } = req.body;
    if (!discord_id || !username) {
        return res.status(400).json({ error: "Missing discord_id or username" });
    }
    const data = yield (0, exports.loadData)();
    // Check if username already exists under a different discord_id
    const existingUser = Object.entries(data).find(([id, name]) => name === username);
    if (existingUser && existingUser[0] !== discord_id) {
        return res.status(409).json({ error: "Username already in use by another user" });
    }
    // Update or insert the new mapping
    data[discord_id] = username;
    yield saveData(data);
    const messageResponse = yield (0, bot_1.sendMessageToUser)(discord_id, `Hello ${username}, ${Hello_1.DiscordChatRulesSyntax}`);
    if (messageResponse === null || messageResponse === void 0 ? void 0 : messageResponse.error) {
        return res.status(500).json(messageResponse);
    }
    res.json({ message: "User stored successfully", data });
}));
//@ts-ignore
app.get("/discord/user/:discord_id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { discord_id } = req.params;
    const data = yield (0, exports.loadData)();
    const username = data[discord_id];
    if (!username) {
        return res.status(404).json({ error: "User not found" });
    }
    res.json({ discord_id, username });
}));
//@ts-ignore
app.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.json({ message: "HELLO WORLD" });
}));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
