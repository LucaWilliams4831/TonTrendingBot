import * as instance from "./bot";
import request from "request";
import { getRandomURL, validTokenAddress } from "./utils";
import TelegramBot from "node-telegram-bot-api";
import { startGasPumpTrades, startMonitorTrendingPool, startOrStopMonitorTrades } from "./notify";
import * as utils from "./utils";
import { dexTypes, LOADING_FINISHED } from "./type";
import * as types from "./type";
import { UserInfo } from "os";
import axios from "axios";

const msgForInput = [
  "Please enter the minimum value at which the @TonUniverse_bot should post the buy (value in $, e.g. 100):",
  "Here, you can choose which emoji should be used in the @TonUniverse_bot post. Please enter your preferred emoji (you can use animated emojis, too):",
  "Please enter the emoji per $ value (e.g. 50) (meaning: e.g. $320 buy - 6 emojis will be used):",
  "Here, you can choose which media should be appeared in the @TonUniverse_bot post. Please enter your preferred media link (you can use video, too):",
];

const setDEXToUser = (user_id: string | undefined, dex: string) => {
  if (!user_id) return;

  const userSession: types.UserInfo = instance.sessions.get(
    user_id?.toString()
  );

  if (userSession) {
    userSession.dex_type = dex;
    instance.updateUser(userSession);
  }
};

const removeCurrentPool = async (user_info: types.UserInfo) => {
  if (!user_info) return;

  const current_pool = user_info.selected_pool;
  const pool_info: types.PoolInfo | undefined = instance.getPool(
    user_info.chat_id,
    current_pool
  );

  if (!pool_info) return;

  if (pool_info.should_monitor) {
    user_info.timeout_id = await startOrStopMonitorTrades(user_info);
  }

  user_info.added_pools = user_info.added_pools.filter(
    (item) => item !== user_info.selected_pool
  );
  user_info.selected_pool = "";
};

const showSelectDex = (chatid: TelegramBot.ChatId, message_id: number) => {
  instance.stateMap_set(chatid.toString(), types.STATE_INPUT_DEX);

  instance.bot.sendPhoto(
    chatid,
    (getRandomURL(types.defaultMediaURLs)),
    {
      caption: `Welcome to ${process.env.BOT_TITLE}.\nTo start, choose any of the actions below:`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "DeDust",
              callback_data: JSON.stringify({
                c: types.COMMAND_SET_DEX,
                i: dexTypes[0],
              }),
            },
          ],
          [
            {
              text: "Ston.fi",
              callback_data: JSON.stringify({
                c: types.COMMAND_SET_DEX,
                i: dexTypes[1],
              }),
            },
          ],
          [
            {
              text: "GasPump",
              callback_data: JSON.stringify({
                c: types.COMMAND_SET_DEX,
                i: dexTypes[2],
              }),
            },
          ],
        ],
      },
    }
  );
};

const showSettings = async (chatid: TelegramBot.ChatId, message_id: number) => {
  const userSession: types.UserInfo = instance.sessions.get(chatid.toString());

  if (!userSession) return;

  instance.stateMap_set(chatid.toString(), types.STATE_CUSTOMIZE_SETTINGS);

  instance.bot.deleteMessage(chatid, message_id);

  instance.bot.sendMessage(
    chatid,
    `Hey @${userSession.username},
Please ensure that you are using @TonUniverse_bot. To use @TonUniverse_bot to its full potential, you need to add it as an admin (e.g. muted chat or pin functions).

If you have any questions, please contact our support team or refer to our disclaimer.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Add new token",
              callback_data: JSON.stringify({
                c: types.COMMAND_ADD_CA,
                i: "Add new token",
              }),
            },
            {
              text: "Token Settings",
              callback_data: JSON.stringify({
                c: types.COMMAND_SELECT_ADDED_POOL,
                i: "Added Pool",
              }),
            },
          ],
        ],
      },
    }
  );
};

const showPoolList = async (chatid: TelegramBot.ChatId, message_id: number) => {
  const userSession: types.UserInfo = instance.sessions.get(chatid.toString());
  if (!userSession) return;

  instance.bot.deleteMessage(chatid, message_id);

  instance.stateMap_set(chatid.toString(), types.STATE_SHOW_ADDED_POOL);

  if (userSession.added_pools.length === 0) {
    await instance.bot.sendMessage(chatid, "There is no available pool.", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Back",
              callback_data: JSON.stringify({
                c: types.COMMAND_SETTINGS,
                i: "Back",
              }),
            },
          ],
        ],
      },
    });

    return;
  }

  const inline_keyboard: any[] = [];
  for (let i = 0; i < userSession.added_pools.length; ++i) {
    const pool = userSession.added_pools[i];

    inline_keyboard.push([
      {
        text: await utils.getPoolName(pool),
        callback_data: JSON.stringify({
          c: types.COMMAND_SELECT_POOL,
          i: pool,
        }),
      },
    ]);
  }

  inline_keyboard.push([
    {
      text: "Back",
      callback_data: JSON.stringify({
        c: types.COMMAND_SETTINGS,
        i: "Back",
      }),
    },
  ]);

  await instance.bot.sendMessage(
    chatid,
    "Please select the token that you want to set:",
    {
      reply_markup: {
        inline_keyboard,
      },
    }
  );
};

const showAvailablePoolList = async (
  chatid: TelegramBot.ChatId,
  message_id: number,
  jettonAddress: string
) => {
  const userSession: types.UserInfo = instance.sessions.get(chatid.toString());
  if (!userSession) return;

  instance.stateMap_set(chatid.toString(), types.STATE_SHOW_AVAILABLE_POOL);

  const pools = await utils.getPoolAddressForToken(
    jettonAddress,
    userSession.dex_type
  );

  if (pools === undefined || pools.length === 0) {
    await instance.bot.sendMessage(chatid, "There is no available pool.", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Back",
              callback_data: JSON.stringify({
                c: types.COMMAND_SETTINGS,
                i: "Back",
              }),
            },
          ],
        ],
      },
    });

    return;
  }

  const inline_keyboard: any[] = [];
  for (let i = 0; i < pools.length; ++i) {
    const pool = pools[i];

    inline_keyboard.push([
      {
        text: await utils.getPoolName(pool),
        callback_data: JSON.stringify({
          c: types.COMMAND_SELECT_POOL,
          i: pool,
        }),
      },
    ]);
  }

  inline_keyboard.push([
    {
      text: "Back",
      callback_data: JSON.stringify({
        c: types.COMMAND_SETTINGS,
        i: "Back",
      }),
    },
  ]);

  try {
    instance.bot.sendMessage(
      chatid,
      `We have found the following pairs. Please choose your token:`,
      {
        reply_markup: {
          inline_keyboard: inline_keyboard,
        },
      }
    );
  } catch (e: any) {
    console.log(e.message);
  }
};

const showInputCA = async (chatid: TelegramBot.ChatId, message_id: number) => {
  instance.stateMap_set(chatid.toString(), types.STATE_INPUT_CA);
  instance.bot.deleteMessage(chatid, message_id);
  instance.bot.sendMessage(chatid, "Please enter your CA:", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Back",
            callback_data: JSON.stringify({
              c: types.COMMAND_SETTINGS,
              i: "Back",
            }),
          },
        ],
      ],
    },
  });
};

const showInputSettings = async (
  chatid: TelegramBot.ChatId,
  message_id: number,
  setting_command = types.COMMAND_SET_MIN_BUY
) => {
  let settings_index = 0;
  if (setting_command === types.COMMAND_SET_MIN_BUY) settings_index = 0;
  else if (setting_command === types.COMMAND_SET_EMOJI) settings_index = 1;
  else if (setting_command === types.COMMAND_SET_EMOJI_PER) settings_index = 2;
  else if (setting_command === types.COMMAND_MANAGE_MEDIA) settings_index = 3;

  instance.stateMap_set(chatid.toString(), types.STATE_INPUT_SETTINGS, {
    i: settings_index,
  });
  instance.bot.deleteMessage(chatid, message_id);
  instance.bot.sendMessage(chatid, msgForInput[settings_index], {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Back",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_SETTINGS,
              i: "Back",
            }),
          },
        ],
      ],
    },
  });
};

const showAddGroupMessage = async (
  chatid: TelegramBot.ChatId,
  message_id: number
) => {
  instance.stateMap_set(chatid.toString(), types.STATE_ADD_GROUP_FIRST);
  instance.bot.deleteMessage(chatid, message_id);
  instance.bot.sendMessage(chatid, "Please use the bot in group.", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Back",
            callback_data: JSON.stringify({
              c: types.COMMAND_SETTINGS,
              i: "Back",
            }),
          },
        ],
      ],
    },
  });
};

const showPoolSettings = async (
  chatid: TelegramBot.ChatId,
  message_id: number
) => {
  const userSession: types.UserInfo = instance.sessions.get(chatid.toString());
  if (!userSession) return;

  instance.stateMap_set(chatid.toString(), types.STATE_POOL_SETTINGS);
  const poolInfo = instance.getPool(
    chatid.toString(),
    userSession.selected_pool
  );

  if (!poolInfo) return;
  instance.bot.deleteMessage(chatid, message_id);
  instance.bot.sendMessage(
    chatid,
    "You now have the option to start your bot and make changes later, or configure the settings first and then start your bot:",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: !poolInfo.should_monitor ? "✅ Start Bot!" : "⚠️ Pause",
              callback_data: JSON.stringify({
                c: types.COMMAND_START_OR_PAUSE_BOT,
                i: "start-bot",
              }),
            },
          ],
          [
            {
              text: "Token Settings",
              callback_data: JSON.stringify({
                c: types.COMMAND_TOKEN_SETTINGS,
                i: "Back",
              }),
            },
          ],
          [
            {
              text: "Main Menu",
              callback_data: JSON.stringify({
                c: types.COMMAND_SETTINGS,
                i: "Back",
              }),
            },
          ],
        ],
      },
    }
  );
};

const showSocialLinks = async (
  chatid: TelegramBot.ChatId,
  message_id: number
) => {
  const userSession: types.UserInfo = instance.sessions.get(chatid.toString());
  if (!userSession || !userSession.selected_pool) return;
  const poolInfo: types.PoolInfo | undefined = instance.getPool(
    chatid.toString(),
    userSession.selected_pool
  );

  if (!poolInfo) return;

  instance.bot.deleteMessage(chatid, message_id);

  instance.stateMap_set(chatid.toString(), types.STATE_SELECT_SOCIAL_LINKS);

  const inline_keyboard: any[] = [];
  for (let i = 0; i < types.socialLinks.length; i += 2) {
    const socialLink1 = types.socialLinks[i];
    const socialLink2 = types.socialLinks[i + 1];

    const link1Index = poolInfo.settings?.social_links.findIndex(
      (link) => link === socialLink1
    );
    const link2Index = poolInfo.settings?.social_links.findIndex(
      (link) => link === socialLink2
    );

    inline_keyboard.push([
      {
        text: socialLink1 + (link1Index !== -1 ? " ✅" : ""),
        callback_data: JSON.stringify({
          c: types.COMMAND_SELECT_SOCIAL_LINK,
          i: socialLink1,
        }),
      },
      {
        text: socialLink2 + (link2Index !== -1 ? " ✅" : ""),
        callback_data: JSON.stringify({
          c: types.COMMAND_SELECT_SOCIAL_LINK,
          i: socialLink2,
        }),
      },
    ]);
  }

  inline_keyboard.push([
    {
      text: "Back",
      callback_data: JSON.stringify({
        c: types.COMMAND_TOKEN_SETTINGS,
        i: "Back",
      }),
    },
  ]);

  await instance.bot.sendMessage(
    chatid,
    "Here you can decide which links you want to add to the post. Please select from the following options:",
    {
      reply_markup: {
        inline_keyboard,
      },
    }
  );
};

const showSelectLayout = async (
  chatid: TelegramBot.ChatId,
  message_id: number
) => {
  const userSession: types.UserInfo = instance.sessions.get(chatid.toString());
  if (!userSession || !userSession.selected_pool) return;
  const poolInfo: types.PoolInfo | undefined = instance.getPool(
    chatid.toString(),
    userSession.selected_pool
  );

  if (!poolInfo) return;

  instance.bot.deleteMessage(chatid, message_id);

  instance.stateMap_set(chatid.toString(), types.STATE_SELECT_LAYOUT_ITEM);

  const inline_keyboard: any[] = [];
  for (let i = 0; i < types.layoutItems.length; i += 2) {
    const layoutItem1 = types.layoutItems[i];
    const layoutItem2 = types.layoutItems[i + 1];

    const link1Index = poolInfo.settings?.layout_items.findIndex(
      (link) => link === layoutItem1
    );
    const link2Index = poolInfo.settings?.layout_items.findIndex(
      (link) => link === layoutItem2
    );

    inline_keyboard.push([
      {
        text: "Show " + layoutItem1 + (link1Index !== -1 ? " ✅" : ""),
        callback_data: JSON.stringify({
          c: types.COMMAND_SELECT_LAYOUT_ITEMS,
          i: layoutItem1,
        }),
      },
      {
        text: "Show " + layoutItem2 + (link2Index !== -1 ? " ✅" : ""),
        callback_data: JSON.stringify({
          c: types.COMMAND_SELECT_LAYOUT_ITEMS,
          i: layoutItem2,
        }),
      },
    ]);
  }

  inline_keyboard.push([
    {
      text: "Back",
      callback_data: JSON.stringify({
        c: types.COMMAND_TOKEN_SETTINGS,
        i: "Back",
      }),
    },
  ]);

  await instance.bot.sendMessage(
    chatid,
    "Here you can decide which links you want to add to the post. Please select from the following options:",
    {
      reply_markup: {
        inline_keyboard,
      },
    }
  );
};

const showTokenSettings = async (
  chatid: TelegramBot.ChatId,
  message_id: number
) => {
  const userSession: types.UserInfo = instance.sessions.get(chatid.toString());
  if (!userSession) return;

  const lastState = instance.stateMap_get(chatid.toString());

  instance.stateMap_set(chatid.toString(), types.STATE_TOKEN_SETTINGS);

  const poolInfo = instance.getPool(
    chatid.toString(),
    userSession.selected_pool
  );

  if (!poolInfo) return;

  instance.bot.deleteMessage(chatid, message_id);
  instance.bot.sendMessage(
    chatid,
    `Here you can make all the settings for ${await utils.getPoolName(
      poolInfo.address
    )}:`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `Min. Buy $${poolInfo.settings?.min_buy}`,
              callback_data: JSON.stringify({
                c: types.COMMAND_SET_MIN_BUY,
                i: "min-buy",
              }),
            },
            {
              text: `Emoji ${poolInfo.settings?.emoji}`,
              callback_data: JSON.stringify({
                c: types.COMMAND_SET_EMOJI,
                i: "emoji",
              }),
            },
          ],
          [
            {
              text: `Emoji per ${poolInfo.settings?.emoji_per_ton} TON`,
              callback_data: JSON.stringify({
                c: types.COMMAND_SET_EMOJI_PER,
                i: "emoji-per",
              }),
            },
            {
              text: "Manage Media",
              callback_data: JSON.stringify({
                c: types.COMMAND_MANAGE_MEDIA,
                i: "manage-media",
              }),
            },
          ],
          [
            {
              text: "Social Links",
              callback_data: JSON.stringify({
                c: types.COMMAND_SOCIAL_LINKS,
                i: "social-links",
              }),
            },
            {
              text: "Layout",
              callback_data: JSON.stringify({
                c: types.COMMAND_SET_LAYOUT,
                i: "layout",
              }),
            },
          ],

          [
            {
              text: !poolInfo.should_monitor ? "✅ Start Bot!" : "⚠️ Pause",
              callback_data: JSON.stringify({
                c: types.COMMAND_START_OR_PAUSE_BOT,
                i: "start-or-pause-bot",
              }),
            },
          ],
          [
            {
              text: "Remove Token",
              callback_data: JSON.stringify({
                c: types.COMMAND_REMOVE_TOKEN,
                i: "remove-token",
              }),
            },
          ],
          [
            {
              text: "Back",
              callback_data: JSON.stringify({
                c:
                  lastState.state === types.STATE_SHOW_ADDED_POOL
                    ? types.COMMAND_SELECT_ADDED_POOL
                    : types.COMMAND_SELECT_POOL,
                i: "Back",
              }),
            },
          ],
        ],
      },
    }
  );
};

export const procMessage = async (message: TelegramBot.Message) => {
  let chatid = message.chat.id;
  let session: types.UserInfo | undefined = instance.sessions.get(
    chatid.toString()
  );
  let userName = message?.chat?.username;
  let messageId = message?.message_id;

  if (instance.loadingState < LOADING_FINISHED) {
    return;
  }

  if (!message.text) return;

  // @ts-ignore
  if (message.left_chat_participant) {
    // This bot has been kicked out
    console.log(`Deleted private chat ----> ${message}`);

    return;
  }

  let command = message.text;

  if (command.startsWith("/")) {
    if (!session) {
      if (!userName) {
        console.log(
          `Rejected anonymous incoming connection. chatid = ${chatid}`
        );
        instance.sendMessage(
          chatid,
          `Welcome to ${process.env.BOT_TITLE}. We noticed that your telegram does not have a username. Please create username [Setting]->[Username] and try again.`
        );
        return;
      }

      session = instance.registerUser(chatid, userName);
    }

    console.log(`${session?.username} logined.`);

    if (session && userName && session?.username !== userName) {
      session.username = userName;
    }

    let params = message.text.split(" ");
    if (params.length > 0 && params[0] === command) {
      params.shift();
    }

    command = command.slice(1);

    console.log("Input Command Private: ", command);
    console.log("Params: ", params);

    if (command === types.MESSAGE_START) {
    } else if (command === types.COMMAND_PROMOTE) {
      showTokenPromote(chatid, messageId);
    } else if (command === types.COMMAND_PAYMENT) {
      showTokenPayment(chatid, messageId);
    } else if (command === types.COMMAND_GET_GASPUMP_DATA) {
      if (session)
        startGasPumpTrades(session);
    }

    return;
  }

  const state = instance.stateMap_get(chatid.toString());

  if (!state) return;
  if (state.state === types.STATE_INPUT_CA) {
    console.log(`This is token address you entered: ${message.text}`);

    const jettonAddress = message.text;
    const jettonName = await validTokenAddress(jettonAddress);
    //@ts-ignore
    const dexType = session.dex_type;
    if (dexType !== 'GasPump') {
      if (!jettonName) {
        instance.sendMessage(chatid, "Entered CA is not valid.");
        return;
      }
    } else {
      if (session) {
        session.pumpAddress = message.text
        instance.updateUser(session);
        showPoolSettings(chatid, messageId);
      }
      return;
    }

    showAvailablePoolList(chatid, messageId, jettonAddress);

  } else if (state.state === types.STATE_INPUT_SETTINGS) {
    const setting_index = state.data.i;
    console.log(`Change settings ${setting_index}`);
    if (!session?.chat_id) return;
    const poolInfo = instance.getPool(session?.chat_id, session?.selected_pool);
    if (!poolInfo || !poolInfo.settings) return;

    if (setting_index === 0) poolInfo.settings.min_buy = parseInt(message.text);
    else if (setting_index === 1) poolInfo.settings.emoji = message.text;
    else if (setting_index === 2)
      poolInfo.settings.emoji_per_ton = parseInt(message.text);
    else if (setting_index === 3)
      poolInfo.settings.media_urls.push(message.text);

    instance.updatePool(session?.chat_id, session?.selected_pool, poolInfo);

    showTokenSettings(chatid, messageId);
  }
};

export const executeCommand = async (
  message_id: number,
  chatid: TelegramBot.ChatId,
  cc: string
) => {
  let session: types.UserInfo = instance.sessions.get(chatid.toString());
  const lastState = instance.stateMap_get(chatid.toString());

  const command_data = JSON.parse(cc);

  if (!session || !command_data.c) return;

  if (session.groups.length === 0) {
    console.log("Please use the bot in group.");
    showAddGroupMessage(chatid, message_id);
    return;
  }

  const command = command_data.c;
  const param = command_data.i;

  if (command === types.COMMAND_SETTINGS) {
    showSettings(chatid, message_id);
  } else if (command === types.COMMAND_SET_DEX) {
    setDEXToUser(chatid.toString(), param);
    showSettings(chatid, message_id);
  } else if (command === types.COMMAND_SELECT_ADDED_POOL) {
    showPoolList(chatid, message_id);
  } else if (command === types.COMMAND_ADD_CA) {
    showInputCA(chatid, message_id);
  } else if (command === types.COMMAND_TOKEN_SETTINGS) {
    showTokenSettings(chatid, message_id);
  } else if (command === types.COMMAND_SELECT_POOL) {
    console.log(`Users selected ${param} pool`);
    console.log(`Last state: ${JSON.stringify(lastState)}`);
    if (
      lastState.state === types.STATE_SHOW_AVAILABLE_POOL &&
      param !== "Back"
    ) {
      const index = session.added_pools.findIndex((value) => value === param);
      if (index === -1) {
        session.added_pools.push(param);
        session.selected_pool = param;
        instance.sessions.set(chatid.toString(), session);
        instance.updateUser(session);

        const newPoolInfo = await instance.createNewPoolInfo(
          chatid.toString(),
          param
        );
        instance.addPool(chatid.toString(), param, newPoolInfo);
      } else {
        console.log("Already exists!");
        //+++++++++++++++++++++++Already exists!return;
      }
    } else if (param !== "Back") {
      session.selected_pool = param;
      instance.sessions.set(chatid.toString(), session);
      instance.updateUser(session);
    }

    if (lastState.state === types.STATE_SHOW_ADDED_POOL)
      showTokenSettings(chatid, message_id);
    else if (lastState.state === types.STATE_SHOW_AVAILABLE_POOL)
      showPoolSettings(chatid, message_id);
  } else if (command === types.COMMAND_START_OR_PAUSE_BOT) {
    if (!session.selected_pool && session.dex_type !== "GasPump") return;
    const dex_type = session.dex_type;
    let timeout_id;
    if (dex_type === "GasPump") {
      timeout_id = await startGasPumpTrades(session);
    } else {
      timeout_id = await startOrStopMonitorTrades(session);
    }

    showPoolSettings(chatid, message_id);
    session.timeout_id = timeout_id;
  } else if (
    command === types.COMMAND_SET_MIN_BUY ||
    command === types.COMMAND_SET_EMOJI ||
    command === types.COMMAND_SET_EMOJI_PER ||
    command === types.COMMAND_MANAGE_MEDIA
  ) {
    showInputSettings(chatid, message_id, command);
  } else if (command === types.COMMAND_SOCIAL_LINKS) {
    showSocialLinks(chatid, message_id);
  } else if (command === types.COMMAND_SELECT_SOCIAL_LINK) {
    const userSession: types.UserInfo = instance.sessions.get(
      chatid.toString()
    );
    if (!userSession || !userSession.selected_pool) return;
    const poolInfo: types.PoolInfo | undefined = instance.getPool(
      chatid.toString(),
      userSession.selected_pool
    );

    if (!poolInfo) return;

    const linkIndex = poolInfo.settings?.social_links.findIndex(
      (link) => link === param
    );

    if (linkIndex === -1 || linkIndex === undefined) {
      poolInfo.settings?.social_links.push(param);
    } else {
      poolInfo.settings?.social_links.splice(linkIndex, 1);
    }

    instance.updatePool(chatid.toString(), userSession.selected_pool, poolInfo);

    showSocialLinks(chatid, message_id);
  } else if (command === types.COMMAND_SET_LAYOUT) {
    showSelectLayout(chatid, message_id);
  } else if (command === types.COMMAND_SELECT_LAYOUT_ITEMS) {
    const userSession: types.UserInfo = instance.sessions.get(
      chatid.toString()
    );
    if (!userSession || !userSession.selected_pool) return;
    const poolInfo: types.PoolInfo | undefined = instance.getPool(
      chatid.toString(),
      userSession.selected_pool
    );

    if (!poolInfo) return;

    const linkIndex = poolInfo.settings?.layout_items.findIndex(
      (link) => link === param
    );

    if (linkIndex === -1 || linkIndex === undefined) {
      poolInfo.settings?.layout_items.push(param);
    } else {
      poolInfo.settings?.layout_items.splice(linkIndex, 1);
    }

    instance.updatePool(chatid.toString(), userSession.selected_pool, poolInfo);

    showSelectLayout(chatid, message_id);
  } else if (command === types.COMMAND_REMOVE_TOKEN) {
    removeCurrentPool(session);

    showSettings(chatid, message_id);
  } else if (command === types.COMMAND_TOKEN_PROMOTE) {
    console.log("param----------", param);
  } else if (command === types.COMMAND_CHANGE_TOKEN_ADDRESS) {
    console.log("param----------", param);
  } else if (command === types.COMMAND_CONFIRM_PAYMENT) {
    console.log("param----------", param);
  } else if (command === types.COMMAND_CHECK_TRENDING_STATUS) {
    console.log("param----------", param);
  }
};

const showTokenPromote = async (
  chatid: TelegramBot.ChatId,
  message_id: number
) => {
  const userSession: types.UserInfo = instance.sessions.get(chatid.toString());

  if (!userSession) return;

  instance.stateMap_set(chatid.toString(), types.STATE_CUSTOMIZE_SETTINGS);

  instance.bot.deleteMessage(chatid, message_id);

  instance.bot.sendMessage(chatid, `➡️ Select promotion length and type.`, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Select Promotion Length and Type",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "promote_title",
            }),
          },
        ],
        [
          {
            text: "❓ How this works ❓",
            callback_data: JSON.stringify({
              c: types.COMMAND_HOW_THIS_WORKS,
              i: "how_this_works",
            }),
          },
        ],
        [
          {
            text: "⬇️ Top 3 ⬇️",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "top_3",
            }),
          },
          {
            text: "⬇️ Top 10 ⬇️",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "top_10",
            }),
          },
        ],
        [
          {
            text: "3 Hours - 17 TON",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "3h17ton",
            }),
          },
          {
            text: "3 Hours - 12 TON",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "3h12ton",
            }),
          },
        ],
        [
          {
            text: "6 Hours - 28 TON",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "6h28ton",
            }),
          },
          {
            text: "6 Hours - 22 TON",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "6h22ton",
            }),
          },
        ],
        [
          {
            text: "12 Hours - 45 TON",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "12h45ton",
            }),
          },
          {
            text: "12 Hours - 35 TON",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "12h35ton",
            }),
          },
        ],
        [
          {
            text: "24 Hours - 77 TON",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "24h77ton",
            }),
          },
          {
            text: "24 Hours - 62 TON",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "24h62ton",
            }),
          },
        ],
        [
          {
            text: "48 Hours - 130 TON",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "48h130ton",
            }),
          },
          {
            text: "48 Hours - 105 TON",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "48h105ton",
            }),
          },
        ],
        [
          {
            text: "⬇️ Any Available Position ⬇️",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "anyAvailablePosition",
            }),
          },
        ],
        [
          {
            text: "3 Hours - 10 TON",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "3h10ton",
            }),
          },
        ],
        [
          {
            text: "6 Hours - 18 TON",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "6h18ton",
            }),
          },
        ],
        [
          {
            text: "12 Hours - 30 TON",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "12h30ton",
            }),
          },
        ],
        [
          {
            text: "24 Hours - 55 TON",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "24h55ton",
            }),
          },
        ],
        [
          {
            text: "48 Hours - 95 TON",
            callback_data: JSON.stringify({
              c: types.COMMAND_TOKEN_PROMOTE,
              i: "48h95ton",
            }),
          },
        ],
      ],
    },
  });
};

const showTokenPayment = async (
  chatid: TelegramBot.ChatId,
  message_id: number
) => {
  const userSession: types.UserInfo = instance.sessions.get(chatid.toString());

  if (!userSession) return;

  instance.stateMap_set(chatid.toString(), types.STATE_CUSTOMIZE_SETTINGS);

  instance.bot.deleteMessage(chatid, message_id);
  const address = "AEFasdfefasdfasdf9e7wf89awe7f98a7e98f";
  const comment = "AEFasdfefasdfasdf9e7wf89awe7f98a7e98f";
  instance.bot.sendMessage(
    chatid,
    `Send - 3 TON/hour\n
*Payments above 36 TON will get 30% longer trending time!*\n
To address: \n
<code>[${address}]</code>\n
With comment: \n
<code>[${comment}]</code>\n`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Change Token Address",
              callback_data: JSON.stringify({
                c: types.COMMAND_CHANGE_TOKEN_ADDRESS,
              }),
            },
          ],
          [
            {
              text: "Confirm Payment",
              callback_data: JSON.stringify({
                c: types.COMMAND_CONFIRM_PAYMENT,
              }),
            },
          ],
          [
            {
              text: "Check Trending Status",
              callback_data: JSON.stringify({
                c: types.COMMAND_CHECK_TRENDING_STATUS,
              }),
            },
          ],
        ],
      },
    }
  );
};
