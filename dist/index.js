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
exports.saveData = exports.loadData = void 0;
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const cors_1 = __importDefault(require("cors"));
const bot_1 = require("./bot");
const Hello_1 = require("./util/Hello");
const child_process_1 = require("child_process");
const pg_1 = require("pg");
//TODO: Remove this line
const app = (0, express_1.default)();
const PORT = 3000;
const FILE_PATH = "users_key_value_discord.json";
(0, bot_1.startBot)(); //* Start discord bot
app.use(express_1.default.json());
app.use((0, cors_1.default)({ origin: "https://aether-ai-two.vercel.app", credentials: true, }));
const removeGitLock = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield fs_1.default.unlinkSync(".git/config.lock"); // Correct lock file path
        console.log("✅ Removed Git lock file (if it existed)");
    }
    catch (err) {
        if (err.code !== "ENOENT") {
            console.error(`❌ Failed to remove lock file: ${err.message}`);
        }
    }
});
const setGitConfig = () => __awaiter(void 0, void 0, void 0, function* () {
    yield removeGitLock(); // Ensure no lock file exists
    try {
        (0, child_process_1.execSync)('git config  --global user.name "HlmsDeep"', { stdio: "inherit" });
        (0, child_process_1.execSync)('git config  --global user.email "first12last100@gmail.com"', { stdio: "inherit" });
        console.log("✅ Git user name & email set successfully!");
        // Verify the config
        (0, child_process_1.execSync)("git config --list", { stdio: "inherit" });
    }
    catch (error) {
        console.error(`❌ Error setting Git config: ${error.message}`);
    }
});
setGitConfig();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});
const fetchUsersFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { rows } = yield pool.query(`SELECT "discordId", "name" FROM "User" WHERE "discordId" IS NOT NULL`);
        const userMap = {};
        rows.forEach((user) => {
            if (user.discordId && user.name) {
                userMap[user.discordId] = user.name;
            }
        });
        yield fs_1.default.writeFileSync(FILE_PATH, JSON.stringify(userMap, null, 2));
        console.log("✅ User data loaded successfully into users_key_value_discord.json");
    }
    catch (error) {
        console.error("❌ Failed to fetch users from database:", error);
    }
});
fetchUsersFromDB();
const loadData = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!fs_1.default.existsSync(FILE_PATH)) {
            fs_1.default.writeFileSync(FILE_PATH, "{}"); // Create file if missing
        }
        const data = fs_1.default.readFileSync(FILE_PATH, "utf-8");
        if (!data.trim() || data === "{}") {
            console.log("File is empty. Fetching from database...");
            const res = yield pool.query(`SELECT "discordId", "name" FROM "User" WHERE "discordId" IS NOT NULL`);
            const dbData = res.rows.reduce((acc, row) => {
                acc[row.discordId] = row.name;
                return acc;
            }, {});
            fs_1.default.writeFileSync(FILE_PATH, JSON.stringify(dbData, null, 2));
            return dbData;
        }
        return JSON.parse(data);
    }
    catch (err) {
        console.error("Error loading data:", err);
        return {}; // Return empty object on error
    }
});
exports.loadData = loadData;
const saveData = (data) => {
    try {
        fs_1.default.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
    }
    catch (err) {
        console.error("Error saving data:", err);
    }
};
exports.saveData = saveData;
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
    yield (0, exports.saveData)(data);
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
