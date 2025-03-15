import express, { Request, Response } from "express";
import fs from "fs/promises";

const app = express();
const PORT = 3000;
const FILE_PATH = "users_key_value_discord.json";

app.use(express.json());

interface UserData {
  [key: string]: string; // Mapping Discord ID → Username
}

const loadData = async (): Promise<UserData> => {
  try {
    await fs.access(FILE_PATH).catch(() => fs.writeFile(FILE_PATH, "{}")); // Create file if missing
    const data = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(data) as UserData;
  } catch (err) {
    return {}; // Return empty object on error
  }
};

const saveData = async (data: UserData): Promise<void> => {
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 0)); // No spaces to minimize size
};

//@ts-ignore
app.post("/discord/authentication", async (req, res) => {
  const { discord_id, username }: { discord_id: string; username: string } = req.body;

  if (!discord_id || !username) {
    return res.status(400).json({ error: "Missing discord_id or username" });
  }

  const data = await loadData();
  data[discord_id] = username;
  await saveData(data);

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

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
