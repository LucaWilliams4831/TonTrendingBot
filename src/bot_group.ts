import * as instance from "./bot";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import request from "request";
import { getRandomURL } from "./utils";
import { LOADING_FINISHED } from "./type";
import * as types from "./type";

const poolAddress = "EQDEdgaIgYQXCvNJ1evGAInViJtYLJtt3ebMzonRfvfbZeoe";
const tokenAddress = "EQBlidWRE0FN3CafcJ1J_o5cByBQHr08OQ4gphVQ99VI3tKX";

dotenv.config();

const setWelcomeMessage = (chatid: TelegramBot.ChatId) => {
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
              text: "Set Welcome",
              url: `https://t.me/TonUniverse_bot`,
            },
            {
              text: "Set Buy Bot",
              url: `https://t.me/TonUniverse_bot`,
            },
          ],
          // [
          //   {
          //     text: "Set Buy Bot",
          //     url: `https://t.me/TonUniverse_bot`,
          //   },
          // ],
        ],
      },
    }
  );
};

const addGroupToUser = (
  user_id: string | undefined,
  group_id: string | undefined
) => {
  if (!user_id || !group_id) return;

  const userSession: types.UserInfo = instance.sessions.get(
    user_id?.toString()
  );
  if (userSession) {
    userSession.groups.push(group_id);
    instance.updateUser(userSession);
  }
};

export const procMessage = async (msg: TelegramBot.Message) => {
  if (instance.loadingState < LOADING_FINISHED) {
    return;
  }
  console.log(msg)

  const group_id = msg?.chat?.id.toString();
  const group_title = msg?.chat?.title;
  const actor_id = msg?.from?.id.toString();
  const actor_name = msg?.from?.username;

  console.log(
    `procMessage(Group): group_id:${group_id}, actor_id: ${actor_id}`
  );

  if (msg.new_chat_title) {
    // Changed the Group title

    return;
  }

  // @ts-ignore
  if (msg.left_chat_participant) {
    // This bot has been kicked out

    if (
      // @ts-ignore
      msg.left_chat_participant.id.toString() === instance.botInfo.id.toString()
    ) {
      console.log(
        `🥾 Bot has kicked by @${actor_name} in group @${group_title}.`
      );
    }

    return;
  }

  // @ts-ignore
  if (msg.new_chat_participant) {
    // @ts-ignore
    const newParticipant = msg.new_chat_participant;
    const newParticipantId = newParticipant.id.toString();

    if (newParticipant.is_bot === false) {
      console.log(`@${newParticipant} has joined to group `);
      addGroupToUser(newParticipantId, group_id);
    } else if (instance.botInfo.id.toString() === newParticipantId) {
      console.log(`😚 Bot added to ${group_title} group by @${actor_name}`);
      setWelcomeMessage(group_id);

      addGroupToUser(actor_id, group_id);
    }

    console.log(newParticipantId);
  }

  let command = msg.text;

  if (!command) return;

  if (command.startsWith("/")) {
    let params = msg.text?.split(" ");
    if (params && params.length > 0 && params[0] === command) {
      params.shift();
    }

    command = command.slice(1);

    console.log(`Input Command: ${command}, Params: ${params}`);

    if (command === types.MESSAGE_START) {
      setWelcomeMessage(group_id);
    }

    return;
  }
};

export const executeCommand = async (
  message_id: number,
  chatid: TelegramBot.ChatId,
  command: string
) => {
  let session = instance.sessions.get(chatid);
};
