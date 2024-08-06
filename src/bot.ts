import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

import * as privateBot from "./bot_private";
import * as groupBot from "./bot_group";
import * as utils from "./utils";
import { startMonitorTrendingPool, showTrending } from "./notify";
import {
  defaultMediaURL2s,
  layoutItems,
  LOADING_STARTED,
  PoolInfo,
  socialLinks,
  STATE_IDLE,
} from "./type";
import { UserInfo } from "./type";

dotenv.config();

export let loadingState = 0;
export const sessions = new Map();
export const pools = new Map();
export const stateMap = new Map();

export const bot = new TelegramBot(process.env.BOT_TOKEN as string, {
  polling: true,
});

export let botInfo: TelegramBot.User;
export let database: any;

export const stateMap_set = (chatid: string, state: number, data = {}) => {
  stateMap.set(chatid, { state, data });
};

export const stateMap_get = (chatid: string) => {
  return stateMap.get(chatid);
};

export const stateMap_remove = (chatid: string) => {
  stateMap.delete(chatid);
};

export const stateMap_clear = () => {
  stateMap.clear();
};

export const createNewPoolInfo = async (user_id: string, address: string) => {
  const newPoolInfo: PoolInfo = {
    user_id,
    address,
    target_groups: [],
    name: await utils.getPoolName(address),
    should_monitor: false,
    settings: {
      min_buy: 10,
      emoji: "😺",
      emoji_per_ton: 2,
      media_urls: defaultMediaURL2s,
      layout_items: layoutItems,
      social_links: socialLinks,
    },
  };

  database.updatePool(newPoolInfo);
  return newPoolInfo;
};

export const addPool = (
  user_id: string,
  address: string,
  pool_info: PoolInfo
) => {
  console.log(
    `New pool created for user_id = ${user_id}, address = ${address}`
  );
  const userPools = pools.get(user_id);
  if (userPools) {
    userPools.set(address, pool_info);
    pools.set(user_id, userPools);
    return;
  }

  const newPools = new Map();
  newPools.set(address, pool_info);
  pools.set(user_id, newPools);
};

export const removePool = (user_id: string, address: string) => {
  const userPools = pools.get(user_id);
  if (!userPools) return;

  userPools.delete(address);
};

export const updatePool = async (
  user_id: string,
  address: string,
  pool_info: PoolInfo
) => {
  if (!pool_info.name)
    pool_info.name = await utils.getPoolName(pool_info.address);
  database.updatePool(pool_info);
  return pool_info;
};

export const getPool = (user_id: string, address: string) => {
  const poolsForUser = pools.get(user_id);

  if (!poolsForUser) return undefined;
  const poolInfo: PoolInfo = poolsForUser.get(address);
  if (!poolInfo) return undefined;

  return poolInfo;
};
const onMessageHandler = async (message: TelegramBot.Message) => {
  console.log("##############")
  const msgType = message?.chat?.type;
  const chatid = message?.chat?.id;

  console.log(`${msgType}: ${chatid}`);

  if (!chatid) return;

  if (msgType === "private") {
    privateBot.procMessage(message);
  } else if (msgType === "group" || msgType === "supergroup") {
    groupBot.procMessage(message);
  } else if (msgType === "channel") {
  }
};

export function showSessionLog(session: any) {
  if (session.type === "private") {
    console.log(`@${session.username} user session has been created.`);
  } else if (session.type === "group") {
    console.log(`@${session.username} group session has been created.`);
  }
}

export async function init(db: any) {
  loadingState = LOADING_STARTED;
  database = db;

  bot.setMyCommands([{ command: "start", description: "Start trending" }]);

  const usersFromDB = await database.selectUsers();

  for (const user of usersFromDB) {
    let session: UserInfo = {
      chat_id: user.chat_id,
      username: user.username,
      dex_type: user.dex_type,
      groups: user.groups,
      selected_pool: user.selected_pool,
      added_pools: user.added_pools,
      timeout_id: undefined,
      timeout_id2: undefined,
      pumpAddress: user.pumpAddress,
    };

    sessions.set(user.chat_id, session);
    stateMap_set(user.chat_id, STATE_IDLE);

    showUserLog(session);
  }

  const poolsFromDB = await database.selectPools();

  for (const pool of poolsFromDB) {
    let poolInfo: PoolInfo = await createNewPoolInfo(
      pool.user_id,
      pool.address
    );
    poolInfo.should_monitor = pool.should_monitor;

    poolInfo.target_groups = pool.target_groups;
    poolInfo.settings = pool.settings;

    addPool(pool.user_id, pool.address, pool);
  }

  bot.getMe().then((info: TelegramBot.User) => {
    loadingState++;
    botInfo = info;
  });

  bot.on("message", async (message: TelegramBot.Message) => {
    onMessageHandler(message);
  });

  // await showTrending(-1002228530766);
  await showTrending(-1002222688900);
  await startMonitorTrendingPool(-1002222688900)

  bot.on("callback_query", async (callbackQuery: TelegramBot.CallbackQuery) => {
    // console.log("========== callback query ==========");
    // console.log(callbackQuery);
    // console.log("====================================");

    const message = callbackQuery.message;
    const command = callbackQuery.data;
    if (!message || !command) return;

    if (message.chat?.type === "private") {
      await privateBot.executeCommand(
        message.message_id,
        message.chat.id,
        command
      );
    } else if (message.chat?.type === "group") {
    }
  });

  loadingState++;
}

export function showUserLog(user: UserInfo) {
  console.log(`@${user.username} user info has been created.`);
}

export const deleteSession = (chatid: TelegramBot.ChatId) => {
  sessions.delete(chatid);
  database.removeSession({ chatid });
};

export const registerUser = (privateId: number, userName: string) => {
  if (!database || !botInfo.username || !userName) {
    return;
  }

  const userInfo: UserInfo = {
    chat_id: privateId.toString(),
    username: userName,
    dex_type: undefined,
    selected_pool: "",
    groups: [],
    added_pools: [],
    timeout_id: undefined,
    timeout_id2: undefined,
    pumpAddress: "",
  };

  database.updateUser(userInfo);

  sessions.set(privateId.toString(), userInfo);

  showUserLog(userInfo);

  return userInfo;
};

export const updateUser = (userInfo: UserInfo) => {
  if (!userInfo) {
    return;
  }

  database.updateUser(userInfo);

  return userInfo;
};

export function sendMessage(chatid: TelegramBot.ChatId, message: string) {
  try {
    bot.sendMessage(chatid, message, {
      parse_mode: "HTML",
      disable_web_page_preview: false,
    });

    return true;
  } catch (error) {
    console.error(error);
  }

  return false;
}
