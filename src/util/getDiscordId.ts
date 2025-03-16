import { loadData } from "..";

export const getDiscordUser = async (discordId: string) => {
    const data = await loadData();
    const username = data[discordId];
  
    if (!username) {
      return { error: "User not found" };
    }
    return { username };
  };
  