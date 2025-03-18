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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiscordUser = void 0;
const __1 = require("..");
const getDiscordUser = (discordId) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield (0, __1.loadData)();
    const username = data[discordId];
    console.log("LAOD DATA->", data);
    if (!username) {
        return { error: "User not found" };
    }
    return { username };
});
exports.getDiscordUser = getDiscordUser;
