import { Client, GatewayIntentBits, Partials } from "discord.js";
import { extractUserMessage } from "./util/extractor";
import { cloneGithubRepo } from "./functions";
import { getDiscordUser } from "./util/getDiscordId";
import fs from "fs";
import path from "path";
import axios from "axios"
import { diffLines } from "diff";
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
const USER_REQUESTS: Record<string, { timestamp: number; repo: string;path:string, issues: string[] }> = {};

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
    const {username} = await  getDiscordUser(message.author.id);

    if (extractedData.repo && extractedData.path && extractedData.issue) {
 
        message.reply(`✅ Received your request!\n**Repo:** ${extractedData.repo}\n**Path:** ${extractedData.path}\n**Issue:** ${extractedData.issue}`);
        
        const now = Date.now();

 

        if(!username || username === "")return message.reply(`User not registered, please connect to Aether Ai properly`)

          if (USER_REQUESTS[username]) {
            const lastRequest = USER_REQUESTS[username]; // Get the stored request
        
            if (
                lastRequest.repo !== extractedData.repo && // If the user is switching to a new repo
                now - lastRequest.timestamp < NEW_REPO_TIME_LIMIT // And within 5 min
            ) {
                return message.reply("⏳ **Rate limit reached!** Try again after 5 minutes.");
            }
        }else{
          USER_REQUESTS[username]={timestamp:Date.now(),repo:extractedData.repo,issues:[extractedData.issue],path:extractedData.path}
        }



        const {success} = await cloneGithubRepo({githubName:username,repo:extractedData.repo,destination:`${username}/${extractedData.repo}`})
        if(!success){ message.reply('Already cloned repository')}
        else{
           message.reply(`\nCloned ${extractedData.repo}`);
        }

        const filePath = path.join(process.cwd(),`/clonedRepos/${username}/${extractedData.repo}`, extractedData.path);

        if (!fs.existsSync(filePath)) {
          return message.reply(`⚠️ File not found at path: ${extractedData.path}, please send again,
            in the same format as before`);
        }
  
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const {code,explanation,error} = await getGeminiResponse(fileContent,[extractedData.issue]);
        if(error){
          return message.reply(error);
        }
        if (code) {
          try {
            const diff = diffLines(fileContent || "", code);
            const preview = diff
              .map((part) => {
                if (part.added) return `+ ${part.value.trim()}`;
                if (part.removed) return `- ${part.value.trim()}`;
                return null;
              })
              .filter(Boolean) // Removes null values
              .join("\n");
        
            // Truncate if preview is too long
            const maxLength = 800; // Reserve some space for extra text
            const truncatedPreview =  preview.length > maxLength ? preview.slice(0, maxLength) + "\n..." : preview;
            fs.writeFileSync(filePath, code);
            await message.reply(`**Explanation:**\n${explanation.slice(0,1999)}`);
            await new Promise(resolve => setTimeout(resolve, 1000));

            await message.reply(`**Code:** \`\`\`\n${truncatedPreview}\n\`\`\``);
              
          } catch (error) {
            message.reply("❌ Error applying changes.");
          }
        }
        //* THIS ELSE BLOCK IS REQUIRED WHEN THERE IS NO CODE BLOCK AS IN CASE OF A QUERY
        else{
          return message.reply(explanation);
        } 
      } 
      
//* //////////////////////////////////////////////////////////////////////////////////////////////////////////
      
      
      else {
        if(!username)return message.reply('You are not registerd. Please goto Aether AI website')
        
        const pathRegex = /^path:\s*\S+/;
        let filePath='';


        if(!USER_REQUESTS[username]){
            return message.reply("⚠️ Please follow the format:\nrepo: <repo_name>\npath: <folder/file>\nissue: <describe the issue>");
        }
        // if(USER_REQUESTS[username].timestamp - Date.now() > 900000){
        //   return message.reply('Time limit exceeded wait')
        // }
        if (pathRegex.test(message.content)) {
           filePath = path.join(process.cwd(),`/clonedRepos/${username}/${USER_REQUESTS[username].repo}/${message.content}`);
          
          if (!fs.existsSync(filePath)) {
            return message.reply(`⚠️ File not found at path: ${extractedData.path}, please send again,
              in the same format as before`);
          }
          else{
            USER_REQUESTS[username].path = message.content;
            USER_REQUESTS[username].issues = [];
            return message.reply(`OKay, now your file path is -> ${message.content.split(":")}`)
          }
        }else {
          filePath = path.join(process.cwd(),`/clonedRepos/${username}/${USER_REQUESTS[username].repo}/${USER_REQUESTS[username].path}`);
        }
        let fileContent = ""; 
        try {
          fileContent = fs.readFileSync(filePath, 'utf-8');
        } catch (error) {
          return message.reply(`⚠️ There was an error reading the file at path: ${filePath}`);
        }
        
        if (USER_REQUESTS[username] && USER_REQUESTS[username].repo) {
          USER_REQUESTS[username].issues.push(message.content);
          USER_REQUESTS[username].issues = USER_REQUESTS[username].issues.slice(-5);
          const {code,explanation,error} = await getGeminiResponse(fileContent,USER_REQUESTS[username].issues);
          if(error){
            return message.reply(error);
          }
          if (code) {
            try {
              const diff = diffLines(fileContent || "", code);
              const preview = diff
                .map((part) => {
                  if (part.added) return `+ ${part.value.trim()}`;
                  if (part.removed) return `- ${part.value.trim()}`;
                  return null;
                })
                .filter(Boolean) // Removes null values
                .join("\n");
          
              // Truncate if preview is too long
              const maxLength = 800; // Reserve some space for extra text
              const truncatedPreview =  preview.length > maxLength ? preview.slice(0, maxLength) + "\n..." : preview;
              fs.writeFileSync(filePath, code);
              await message.reply(`**Explanation:**\n${explanation.slice(0,1999)}`);
              await new Promise(resolve => setTimeout(resolve, 1000));

              await message.reply(`**Code:** \`\`\`\n${truncatedPreview}\n\`\`\``);
  
                
            } catch (error) {
              message.reply("❌ Error applying changes.");
            }
          }
          //* THIS ELSE BLOCK IS REQUIRED WHEN THERE IS NO CODE BLOCK AS IN CASE OF A QUERY
          else{
            return message.reply(explanation);
          }
          
        }
      }
  });

  bot.login(TOKEN);
};



//########################################################################################
// Function to send request to Gemini API
const getGeminiResponse = async (fileContent: string, issues: string[]) => {
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
      - **If the latest instruction contradicts previous ones, remove past constraints and follow the latest instruction strictly.**
      - Do not assume constraints (e.g., line limits, style choices) from history if the user explicitly changes them.


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

      console.log(prompt)
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const data = response.data as { 
      candidates?: { content?: { parts?: { text: string }[] } }[] 
    };
    
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI.";

    const codeMatch = generatedText.match(/```(?:\w+)?\n([\s\S]+?)```/);
    const explanationMatch = generatedText.match(/### Explanation:\s*([\s\S]+)/);

    const formattedResponse = {
      code: codeMatch ? codeMatch[1].trim() : "No code provided",
      explanation: explanationMatch ? explanationMatch[1].trim() : "No explanation provided",
      error:null
    };
    return formattedResponse;
  } catch (error) {
    return {code:"",explanation:"",error:"⚠️ Error fetching response from AI."}
  }
};


export default bot;
