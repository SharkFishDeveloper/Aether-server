import { Client, GatewayIntentBits, Partials } from "discord.js";
import { extractUserMessage } from "./util/extractor";
import { cloneGithubRepo } from "./functions";
import { getDiscordUser } from "./util/getDiscordId";
import fs from "fs";
import path from "path";
import axios from "axios"
import { diffLines } from "diff";
import { execSync } from "child_process";
import { createPR } from "./util/createPR";
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

const NEW_REPO_TIME_LIMIT = 60 * 5 * 1000; 

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
 
        message.author.send(`✅ Received your request!\n**Repo:** ${extractedData.repo}\n**Path:** ${extractedData.path}\n**Issue:** ${extractedData.issue}`);
        
        const now = Date.now();

 

        if(!username || username === "")return message.author.send(`User not registered, please connect to Aether Ai properly`)
          
          if (USER_REQUESTS[username]) {
            const lastRequest = USER_REQUESTS[username]; // Get the stored request
            // console.log("TIME LEFT - ",Date.now() - (USER_REQUESTS[username].timestamp ?? 0) )
            if (
                lastRequest.repo !== extractedData.repo && // If the user is switching to a new repo
                now - lastRequest.timestamp < NEW_REPO_TIME_LIMIT // And within 5 min
            ) {
                return message.author.send("⏳ **Rate limit reached!** Try again after 5 minutes.");
            }
        }else{
          USER_REQUESTS[username]={timestamp:Date.now(),repo:extractedData.repo,issues:[extractedData.issue],path:extractedData.path}
        }



        const {success} = await cloneGithubRepo({githubName:username,repo:extractedData.repo,destination:`${username}/${extractedData.repo}`})
        if(!success){ message.author.send('Already cloned repository')}
        else{
           message.author.send(`\nCloned ${extractedData.repo}`);
        }

        const filePath = path.join(process.cwd(),`/clonedRepos/${username}/${extractedData.repo}`, extractedData.path);

        if (!fs.existsSync(filePath)) {
          return message.author.send(`⚠️ File not found at path: ${extractedData.path}, please send again,
            in the same format as before`);
        }
  
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const {code,explanation,error} = await getGeminiResponse(fileContent,[extractedData.issue]);
        if(error){
          return message.author.send(error);
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
            const cleanedExplanation = explanation.replace(/\n\s*\n/g, '\n').trim();
            await message.author.send(`**Explanation:**\n${cleanedExplanation.slice(0, 1400)}`);

            await new Promise(resolve => setTimeout(resolve, 1000));

            await message.author.send(`**Code:** \`\`\`\n${truncatedPreview}\n\`\`\``);
              
          } catch (error) {
            message.author.send("❌ Error applying changes.");
          }
        }
        //* THIS ELSE BLOCK IS REQUIRED WHEN THERE IS NO CODE BLOCK AS IN CASE OF A QUERY
        else{
          return message.author.send(explanation.slice(0,1800));
        } 
      } 
      
//* //////////////////////////////////////////////////////////////////////////////////////////////////////////
      
      
      else {
          if(!username){return message.author.send('You are not registerd. Please goto Aether AI website')}
        
          
          
          if(!USER_REQUESTS[username]){
            return message.author.send("⚠️ Please follow the format:\nrepo: <repo_name>\npath: <folder/file>\nissue: <describe the issue>");
          }


          const pathRegex =  /^\s*path\s*:\s*(.+?)\s*$/; 
          let filePath='';

            const match = message.content.match(pathRegex);
            if(match){
              if (match[1]) {
                  const extractedPath = match[1]; 
                  filePath = path.join(process.cwd(), `/clonedRepos/${username}/${USER_REQUESTS[username].repo}/${extractedPath}`);
                if (!fs.existsSync(filePath)) {
                  return message.author.send(`⚠️ File not found at path: ${match[1]}, please send again,
                    in the same format as before , ${filePath}`);
                }
                else{
                  USER_REQUESTS[username].path = match[1];
                  USER_REQUESTS[username].issues = [];
                  return message.author.send(`OKay, now your file path is -> ${match[1]}`)
                }
              }
            }
        //* IT IS A NORMAL REQUEST , no change of file path
        const prRegex = /^createPR\s*:\s*(.+)$/;
        filePath = path.join(process.cwd(),`/clonedRepos/${username}/${USER_REQUESTS[username].repo}/${USER_REQUESTS[username].path}`);

        if (prRegex.test(message.content)) {
          try {
              process.chdir(path.dirname(filePath));
              execSync("git add .");
      
              //@ts-ignore
              const commitMessage = message.content.match(prRegex)[1];
              execSync(`git commit -m "${commitMessage}"`);
      
              const now = new Date();
              const formattedDate = now
                  .toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" })
                  .replace(/\//g, "-");
      
              const hours = now.getHours();
              const period = hours >= 12 ? "pm" : "am";
              const hour12 = hours % 12 === 0 ? 12 : hours % 12;
              const minutes = now.getMinutes().toString().padStart(2, "0");
              const seconds = now.getSeconds().toString().padStart(2, "0");
      
              const branchName = `aether-bot-${formattedDate}-${hour12}${period}-${minutes}-${seconds}`;
      
              try {
                  // Check if branch exists before creating
                  execSync(`git rev-parse --verify ${branchName}`, { stdio: "ignore" });
                  execSync(`git checkout ${branchName}`);
              } catch {
                  execSync(`git checkout -b ${branchName}`);
              }
      
              try {
                  execSync(`git push origin ${branchName}`);
      
                  createPR(branchName, username, USER_REQUESTS[username].repo)
                      .then((result) => {
                          if (result.success) {
                            return message.author.send(`✅ PR Created: ${result.pr_url}`);
                          } else {
                              message.author.send(`❌ PR creation failed: ${result.message}`);
                          }
                      })
                      .catch((error) => {
                        return message.author.send(`🚨 Error creating PR: ${error.message}`);
                      });
      
                  return message.author.send(`✅ Branch ${branchName} pushed successfully!`);
              } catch (error) {
                return message.author.send(`❌ Failed to push branch: ${branchName}`);
              }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return message.author.send(`🚨 Error: ${errorMessage}`);
          } finally {
              process.chdir("../../../"); // Ensure directory change happens
          }
      }
      




        let fileContent = ""; 
        try {
          fileContent = fs.readFileSync(filePath, 'utf-8');
        } catch (error) {
          return message.author.send(`⚠️ There was an error reading the file at path: ${filePath}`);
        }
        
        if (USER_REQUESTS[username] && USER_REQUESTS[username].repo) {
          USER_REQUESTS[username].issues.push(message.content);
          USER_REQUESTS[username].issues = USER_REQUESTS[username].issues.slice(-5);
          const {code,explanation,error} = await getGeminiResponse(fileContent,USER_REQUESTS[username].issues);
          if(error){
            return message.author.send(error);
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
              const cleanedExplanation = explanation.replace(/\n\s*\n/g, '\n').trim();
              await message.author.send(`**Explanation:**\n${cleanedExplanation.slice(0, 1400)}`);
              await new Promise(resolve => setTimeout(resolve, 1000));

              await message.author.send(`**Code:** \`\`\`\n${truncatedPreview}\n\`\`\``);
  
                
            } catch (error) {
              message.author.send("❌ Error applying changes.");
            }
          }
          //* THIS ELSE BLOCK IS REQUIRED WHEN THERE IS NO CODE BLOCK AS IN CASE OF A QUERY
          else{
            return message.author.send(explanation.slice(0,1800));
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
      - If the latest instruction contradicts previous ones, remove past constraints and follow the latest instruction strictly.
      - Do not assume constraints (e.g., line limits, style choices) from history if the user explicitly changes them.


      ⚠️ Important:
      - Do NOT modify the code unless the user explicitly requests an updated version.
      - Do not provide explanations if the user explicitly requests not to. Otherwise, provide the explanations.
      - Do not add unnecessary blank lines or excessive spaces in explanations unless mentioned specificaly.
      - Use this strict format only:
      - If the user's question does not require code, respond with only the explanation. Do not include an empty code block or any placeholder text —simply omit the code section entirely.
      
      ### Code:
      \`\`\`
      (Put only the full corrected code here)
      \`\`\`
      
      ### Explanation:
      (Provide explanations, reasoning, and suggestions here separately)`;

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
    console.log(formattedResponse)
    return formattedResponse;
  } catch (error) {
    return {code:"",explanation:"",error:"⚠️ Error fetching response from AI."}
  }
};


// setInterval(() => {
//   const now = Date.now();

//   Object.entries(USER_REQUESTS).forEach(([username, data]) => {
//     if (now - data.timestamp > 15 * 60* 1000) { // 15 min threshold
//       const userRepoPath = path.join(process.cwd(), `clonedRepos/${username}`);

//       if (fs.existsSync(userRepoPath)) {
//         fs.rmSync(userRepoPath, { recursive: true, force: true });
//         console.log(`✅ Deleted repo folder for ${username}/${data.repo}`);
//       }

//       // Remove user from tracking
//       delete USER_REQUESTS[username];
//     }
//   });
// }, 60 * 1000); // Runs every 1 minute


export default bot;
