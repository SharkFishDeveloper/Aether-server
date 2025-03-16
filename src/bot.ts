import { Client, GatewayIntentBits, Partials } from "discord.js";
import { extractUserMessage } from "./util/extractor";
import { cloneGithubRepo } from "./functions";
import { getDiscordUser } from "./util/getDiscordId";
import fs from "fs";
import path from "path";
require('dotenv').config()

const bot = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,  
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel], 
  });
  

const TOKEN = process.env.DISCORD_TOKEN;
const USER_REQUESTS: Record<string, { timestamp: number; repo: string; issue: string }[]> = {};

const NEW_REPO_TIME_LIMIT = 5 * 60 * 1000; 

export const sendMessageToUser = async (discordId: string, message: string) => {
    try {
      const user = await bot.users.fetch(discordId);
      if (user) {
        await user.send(message);
        console.log(`Sent message to ${user.username}`);
      } else {
        console.log(`User not found: ${discordId}`);
        return { error: "User not found" };
      }
    } catch (error) {
      console.error("Error sending message:", error);
      return { error: "Failed to send message" };
    }
  };
//########################################################################################
export const startBot = () => {
  bot.once("ready", () => {
    console.log(`Logged in as ${bot.user?.tag}!`);
  });

  bot.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    const extractedData = extractUserMessage(message.content);

    if (extractedData.repo && extractedData.path && extractedData.issue) {
 
        message.reply(`✅ Received your request!\n**Repo:** ${extractedData.repo}\n**Path:** ${extractedData.path}\n**Issue:** ${extractedData.issue}`);
        
        const {username} = await  getDiscordUser(message.author.id);
        const now = Date.now();

 

        if(!username || username === "")return message.reply(`User not registered, please connect to Aether Ai properly`)

          if (USER_REQUESTS[username] && USER_REQUESTS[username].length > 0) {
            const lastRequest = USER_REQUESTS[username].slice(-1)[0]; // Get the most recent request
        
            if (
              lastRequest.repo !== extractedData.repo && // If it's a different repo
              now - lastRequest.timestamp < NEW_REPO_TIME_LIMIT // And within 5 min
            ) {
              return message.reply("⏳ **Rate limit reached!** Try again after 5 minutes.");
            }
          }



        const {success} = await cloneGithubRepo({githubName:username,repo:extractedData.repo,destination:`${username}/${extractedData.repo}`})
        if(!success){ message.reply('Already cloned repository')}
        else{
           message.reply(`\n**Cloned ${extractedData.repo}`);
        }

        const filePath = path.join(process.cwd(),`/clonedRepos/${username}/${extractedData.repo}`, extractedData.path);

        if (!fs.existsSync(filePath)) {
          return message.reply(`⚠️ File not found at path: ${extractedData.path}, please send again,
            in the same format as before`);
        }
  
        const fileContent = fs.readFileSync(filePath, "utf-8");

        if (!USER_REQUESTS[username]) {
          USER_REQUESTS[username] = [];
        }
      
        // **Store multiple requests per user**
        USER_REQUESTS[username].push({
          timestamp: now,
          repo: extractedData.repo,
          issue: extractedData.issue,
        });
      

      } else {
        message.reply("⚠️ Please follow the format:\nrepo: <repo_name>\npath: <folder/file>\nissue: <describe the issue>");
      }
  });

  bot.login(TOKEN);
};



//########################################################################################
// Function to send request to Gemini API
const getGeminiResponse = async (fileContent: string, issue: string) => {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: `Here is the code:\n\n${fileContent}\n\nIssue: ${issue}\n\nSuggest a fix.` },
            ],
          },
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const data = response.data as { candidates?: { content: string }[] };
    return data.candidates?.[0]?.content || "No response from AI.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "⚠️ Error fetching response from AI.";
  }
};



export default bot;
