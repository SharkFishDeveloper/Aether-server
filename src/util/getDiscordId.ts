import { loadData } from "..";

export const getDiscordUser = async (discordId: string) => {
    const data = await loadData();
    const username = data[discordId];
    console.log("LAOD DATA->",data)
    if (!username) {
      return { error: "User not found" };
    }
    return { username };
  };
  