import express, { Request, Response } from "express";
import fs from "fs/promises";
import cors from "cors"
import { sendMessageToUser, startBot } from "./bot";
import { DiscordChatRulesSyntax } from "./util/Hello";
import { exec } from "child_process";
import { Pool } from "pg";
//TODO: Remove this line



const app = express();
const PORT = 3000;
const FILE_PATH = "users_key_value_discord.json";
startBot(); //* Start discord bot

app.use(express.json());
app.use(cors(
 { origin:"https://aether-ai-two.vercel.app", credentials: true,}
))

const removeGitLock = async () => {
  try {
    await fs.unlink("/opt/render/.gitconfig.lock");
    console.log("✅ Removed Git lock file (if it existed)");
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      console.error(`❌ Failed to remove lock file: ${err.message}`);
    }
  }
};

const setGitConfig = async () => {
  await removeGitLock(); // Ensure no lock file exists

  exec('git config --global user.name "HlmsDeep"', (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error setting Git user name: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ Git config stderr: ${stderr}`);
    }
    console.log(`✅ Git user name set successfully: ${stdout}`);
  });

  exec('git config --global user.email "first12last100@gmail.com"', (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error setting Git user email: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ Git config stderr: ${stderr}`);
    }
    console.log(`✅ Git user email set successfully: ${stdout}`);
  });
};
setGitConfig();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

interface UserData {
  [key: string]: string; // Mapping Discord ID → Username
}

const fetchUsersFromDB = async () => {
  try {
    const { rows } = await pool.query(`SELECT "discordId", "name" FROM "User" WHERE "discordId" IS NOT NULL`);
    const userMap: Record<string, string> = {};
    

    rows.forEach((user) => {
      if (user.discordId && user.name) {
        userMap[user.discordId] = user.name;
      }
    });

    await fs.writeFile(FILE_PATH, JSON.stringify(userMap, null, 2));
    console.log("✅ User data loaded successfully into users_key_value_discord.json");
  } catch (error) {
    console.error("❌ Failed to fetch users from database:", error);
  }
};


fetchUsersFromDB();



export const loadData = async (): Promise<UserData> => {
  try {
    const filedata = fs.readFile(FILE_PATH,"utf-8");
    console.log(filedata)
    await fs.access(FILE_PATH).catch(() => fs.writeFile(FILE_PATH, "{}")); 
    fs
    const data = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(data) as UserData;
  } catch (err) {
    return {}; // Return empty object on error
  }
};

const saveData = async (data: UserData): Promise<void> => {
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 0)); 
};

//@ts-ignore
app.post("/discord/authentication", async (req, res) => {
  const { discord_id, username }: { discord_id: string; username: string } = req.body;

  if (!discord_id || !username) {
    return res.status(400).json({ error: "Missing discord_id or username" });
  }

  const data = await loadData();

  // Check if username already exists under a different discord_id
  const existingUser = Object.entries(data).find(([id, name]) => name === username);
  if (existingUser && existingUser[0] !== discord_id) {
    return res.status(409).json({ error: "Username already in use by another user" });
  }

  // Update or insert the new mapping
  data[discord_id] = username;
  await saveData(data);
  
  const messageResponse = await sendMessageToUser(discord_id, `Hello ${username}, ${DiscordChatRulesSyntax}`);
  if (messageResponse?.error) {
    return res.status(500).json(messageResponse);
  }

  res.json({ message: "User stored successfully", data });

});

//@ts-ignore
app.get("/discord/user/:discord_id", async (req, res) => {
  const { discord_id } = req.params;
  const data = await loadData();
  const username = data[discord_id];

  if (!username) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ discord_id, username });
});

//@ts-ignore
app.get("/",async(req,res)=>{
  return res.json({message:"HELLO WORLD"})
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
