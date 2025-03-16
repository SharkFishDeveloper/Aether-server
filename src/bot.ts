import { Client, GatewayIntentBits, Partials } from "discord.js";
import { extractUserMessage } from "./util/extractor";
import { cloneGithubRepo } from "./functions";
import { getDiscordUser } from "./util/getDiscordId";
require('dotenv').config()

const bot = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,  // Add this to listen for messages in servers
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel], 
  });
  

const TOKEN = process.env.DISCORD_TOKEN;

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
        console.log("Extracted Data:", extractedData);
        message.reply(`✅ Received your request!\n**Repo:** ${extractedData.repo}\n**Path:** ${extractedData.path}\n**Issue:** ${extractedData.issue}`);
        
        const {username} = await  getDiscordUser(message.author.id);
        if(!username || username === "")return message.reply(`User not registered, please connect to Aether Ai properly`)
        await cloneGithubRepo({githubName:username,repo:extractedData.repo,destination:`${username}/${extractedData.repo}`})



      } else {
        message.reply("⚠️ Please follow the format:\nrepo: <repo_name>\npath: <folder/file>\nissue: <describe the issue>");
      }
  });

  bot.login(TOKEN);
};



export default bot;
