import axios from "axios";
import * as instance from "./bot";
import request from "request";
import { getRandomURL, getTokenForPool, rankingEmojis } from "./utils";
import { defaultMediaURL2s, MESSAGE_START, PoolInfo, UserInfo } from "./type";
import { setInterval } from "timers";
import TelegramBot from "node-telegram-bot-api";

export let trendingMessage: Promise<TelegramBot.Message | undefined>;
const TIMEOUT_INTERVAL = 10000;
const DOG_PER_TON = 2;
const MAX_DOG_NUM = 100;
const TON_DECIMAL = 10 ** 9;
// const JETTON_DECIMAL = 10**9;
const CHANNEL_LINK = 'https://t.me/TonUniverse_bot';

const shouldShowLayoutItem = (poolInfo: PoolInfo, layout_item: string) => {
  const index = poolInfo.settings?.layout_items.findIndex(
    (item) => item === layout_item
  );
  return index !== -1;
};

const notifyNewBuy = (chatid: string, caption: string) => {
  instance.bot.sendPhoto(chatid, getRandomURL(defaultMediaURL2s), {
    caption,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Promote Your Token",
            url: "https://t.me/TonUniverse_bot/?start=start",
          },
          {
            text: "Trending",
            url: "https://t.me/Tontrendingboard",
          },
        ],
      ],
    },
  });
};

const notifyTrendingBuy = (chatid: string, caption: string) => {
  instance.bot.sendMessage(chatid, caption, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Ton Universe Chat",
            url: "https://t.me/+Rg_YUf5Aaaw2MDU0",
          }
        ],
      ],
    }
  });
};

export const startOrStopMonitorTrades = async (
  user_info: UserInfo,
  startup = false
) => {
  const fromJettonName = "TON";
  let toJettonName = "";
  const chatid = user_info.chat_id;
  const poolAddress = user_info.selected_pool;
  const poolInfo = instance.getPool(chatid, poolAddress);
  const tokenAddress = getTokenForPool(poolAddress);
  let lastBuyTx = -1;

  if (!poolInfo) return;
  if (!chatid || !poolAddress || !tokenAddress) {
    console.log("Settings are not finished yet.");
    return;
  }

  if (!startup && poolInfo.should_monitor) {
    if (user_info.timeout_id) {
      clearInterval(user_info.timeout_id);
    }

    console.log();
    console.log(`💖 Stop Monitoring ${poolAddress} ${tokenAddress}`);
    console.log();

    poolInfo.should_monitor = false;
    instance.updatePool(chatid, poolAddress, poolInfo);

    return undefined;
  }

  if (startup && !poolInfo.should_monitor) return undefined;

  const target_group_id = user_info.groups[0];

  console.log();
  console.log(
    `💖 Started Monitoring ${target_group_id} ${poolAddress} ${tokenAddress}`
  );
  console.log();

  instance.sendMessage(
    target_group_id,
    `Monitoring started for pool ${poolAddress}.`
  );

  const interval = setInterval(async () => {
    try {
      let lastMarketCap = 0;
      let lastLiquidity = 0;
      try {
        const geckoRes = await axios.get(
          `https://api.geckoterminal.com/api/v2/networks/ton/tokens/${tokenAddress}`
        );

        const poolData = geckoRes.data.data;

        const totaySupply = poolData.attributes.total_supply;
        const priceInUSD = poolData.attributes.price_usd;
        const decimals = poolData.attributes.decimals;
        const reserve = poolData.attributes.total_reserve_in_usd;
        const marketcap = poolData.attributes.fdv_usd;
        toJettonName = poolData.attributes.name;

        lastMarketCap = marketcap;
        lastLiquidity = (reserve * 2)
      } catch (e: any) {
        console.log("Error while getting pool info using Gecko API", e.message);
      }

      // const tokenHolders = await axios.get(
      //   `https://tonapi.io/v2jettons/${tokenAddress}/holders?limit=1&offset=0`
      // );

      // console.log(tokenHolders)

      const geckoRes = await axios.get(
        `https://api.geckoterminal.com/api/v2/networks/ton/pools/${poolAddress}/trades?trade_volume_in_usd_greater_than=${poolInfo.settings?.min_buy}`
      );

      const tradeData = geckoRes.data.data;
      let foundBuy = false;
      let lastBuyTxInFetch = lastBuyTx;

      for (let i = 0; i < tradeData.length; ++i) {
        const tradeInfo = tradeData[i];

        if (tradeInfo.type === "trade" && tradeInfo.attributes.kind !== "buy")
          continue;

        if (lastBuyTx === tradeInfo.attributes.tx_hash) break;

        if (!foundBuy) {
          // Sort by descending, so the earlier in fetch the later in time
          lastBuyTxInFetch = tradeData[i].attributes.tx_hash;
          foundBuy = true;

          if (lastBuyTx === -1) break;
        }

        // console.log();
        // console.log(
        //   `${tradeInfo.attributes.from_token_amount}${fromJettonName}(${tradeInfo.attributes.from_token_amount *
        //   tradeInfo.attributes.price_from_in_usd
        //   })`
        // );
        // console.log(`${tradeInfo.attributes.to_token_amount}${toJettonName}`);

        // console.log(`Price: $${tradeInfo.attributes.price_to_in_usd}`);
        // console.log(`Market Cap: $${lastMarketCap}`);

        // console.log(`${tradeInfo.attributes.tx_hash}|Txn`);

        const numDogs = Math.min(
          Math.floor(
            tradeInfo.attributes.from_token_amount /
            (poolInfo.settings?.emoji_per_ton
              ? poolInfo.settings?.emoji_per_ton
              : DOG_PER_TON)
          ),
          MAX_DOG_NUM
        ); // Adjust the divisor and max number as needed

        const dogsEmoji = poolInfo.settings?.emoji.repeat(numDogs);

        notifyNewBuy(
          target_group_id,
          `🆕  ${toJettonName} Buy! 🆕 
${shouldShowLayoutItem(poolInfo, "Emoji") ? `${dogsEmoji}` : ""}
Spent: 🥇 ${Number(tradeInfo.attributes.from_token_amount).toFixed(
            2
          )} ${fromJettonName} ($${(
            tradeInfo.attributes.from_token_amount *
            tradeInfo.attributes.price_from_in_usd
          ).toFixed(2)})
Got: 💰 ${Number(tradeInfo.attributes.to_token_amount).toFixed(0)} ${toJettonName} 
Wallet: ${shouldShowLayoutItem(poolInfo, "Wallet")
            ? `🗣️ <a href="https://tonviewer.com/${tradeInfo.attributes.tx_from_address}">${tradeInfo.attributes.tx_from_address} </a>`
            : ""
          }
Price: ${shouldShowLayoutItem(poolInfo, "Price")
            ? `💲 $${Number(tradeInfo.attributes.price_to_in_usd).toFixed(8)}`
            : ""
          }
MCap: ${shouldShowLayoutItem(poolInfo, "MCap")
            ? `📊 $${lastMarketCap.toLocaleString()}`
            : ""
          }
Liquidity: ${shouldShowLayoutItem(poolInfo, "Liquidity")
            ? `📊 $${lastLiquidity.toLocaleString()}`
            : ""
          }

📈 <a href="https://dexscreener.com/ton/${poolAddress}">DexScreener</a> | <a href="https://www.dextools.io/app/en/ton/pair-explorer/${poolAddress}">DexTools</a> | <a href="https://www.geckoterminal.com/ton/pools/${poolAddress}">GT</a>

Ad: Add @TonUniverse_bot to your group and trend your project free`
        );
      }

      lastBuyTx = lastBuyTxInFetch;
    } catch (e: any) {
      console.log("Error while getting trade info using Gecko API", e.message);
    }
  }, TIMEOUT_INTERVAL);

  poolInfo.should_monitor = true;
  instance.updatePool(chatid, poolAddress, poolInfo);

  return interval;
};

export const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const startMonitorTrendingPool = async (
  chatid: TelegramBot.ChatId
) => {
  const fromJettonName = "TON";
  let toJettonName = "";
  let lastBuyTx: number[] = [];
  let lastBuyTxInFetch: number[] = [];

  if (!chatid) {
    console.log("Settings are not finished yet.");
    return;
  }

  const pools = await instance.database.selectTrendingPools()
  if (!pools || pools.length == 0)
    return
  console.log(pools[0].trendingPools.length)

  const interval = setInterval(async () => {
    for (let index = 0; index < pools[0].trendingPools.length; index++) {
      try {
        // const tokenHolders = await axios.get(
        //   `https://tonapi.io/v2jettons/${tokenAddress}/holders?limit=1&offset=0`
        // );

        // console.log(tokenHolders)
        const poolAddress = pools[0].trendingPools[index];
        let volume = 1000;
        if (index === 0)
          volume = 1;
        const geckoRes = await axios.get(
          `https://api.geckoterminal.com/api/v2/networks/ton/pools/${poolAddress}/trades?trade_volume_in_usd_greater_than=${volume}`
        );

        const tradeData = geckoRes.data.data;
        let foundBuy = 0;

        for (let i = 0; i < tradeData.length; i++) {
          const tradeInfo = tradeData[i];

          if (tradeInfo.type === "trade" && tradeInfo.attributes.kind !== "buy")
            continue;

          if (foundBuy >= 1) break;
          foundBuy++;

          if (lastBuyTxInFetch[index] === tradeInfo.attributes.tx_hash) break;

          //if (!foundBuy) {
          // Sort by descending, so the earlier in fetch the later in time
          lastBuyTxInFetch[index] = tradeInfo.attributes.tx_hash;
          console.log(lastBuyTxInFetch)

          if (lastBuyTxInFetch[index] === -1) break;
          //}
          const tokenAddress = tradeInfo.attributes.to_token_address;
          let lastMarketCap: any;
          let lastLiquidity: any;
          try {
            const geckoRes = await axios.get(
              `https://api.geckoterminal.com/api/v2/networks/ton/tokens/${tokenAddress}`
            );

            const poolData = geckoRes.data.data;

            const totaySupply = poolData.attributes.total_supply;
            const priceInUSD = poolData.attributes.price_usd;
            const decimals = poolData.attributes.decimals;
            const reserve = poolData.attributes.total_reserve_in_usd;
            const marketcap = poolData.attributes.fdv_usd;
            toJettonName = poolData.attributes.name;

            lastMarketCap = formatNumber(marketcap);
            lastLiquidity = (reserve * 2).toLocaleString();
          } catch (e: any) {
            console.log("Error while getting pool info using Gecko API", e.message);
          }

          let numDogs = Math.min(
            Math.floor(
              tradeInfo.attributes.from_token_amount / 20
            ),
            MAX_DOG_NUM
          ); // Adjust the divisor and max number as needed

          if (index === 0) {
            numDogs = Math.min(
              Math.floor(
                tradeInfo.attributes.from_token_amount / 1
              ),
              MAX_DOG_NUM
            );
          }

          const dogsEmoji = '🔥'.repeat(numDogs);

          notifyTrendingBuy(
            chatid.toString(),
            `${rankingEmojis[index]} |  ${toJettonName} Buy!

  ${dogsEmoji}

  🥇 ${Number(tradeInfo.attributes.from_token_amount).toFixed(
              2
            )} ${fromJettonName} ($${(
              tradeInfo.attributes.from_token_amount *
              tradeInfo.attributes.price_from_in_usd
            ).toFixed(2)})
  💰 ${Number(tradeInfo.attributes.to_token_amount).toFixed(0)} ${toJettonName} 

  Price: 💲 $${Number(tradeInfo.attributes.price_to_in_usd).toFixed(8)}
  Market Cap: 📊 $${lastMarketCap}
  Liquidity: 📊 $${lastLiquidity}
  
  📈 <a href="https://dexscreener.com/ton/${poolAddress}">DexScreener</a> | <a href="https://www.dextools.io/app/en/ton/pair-explorer/${poolAddress}">DexTools</a> | <a href="https://www.geckoterminal.com/ton/pools/${poolAddress}">GT</a>`
          );
          await sleep(TIMEOUT_INTERVAL)
        }
        await sleep(TIMEOUT_INTERVAL * 1.5)
      } catch (e: any) {
        console.log("Error while getting trade info using Gecko API", e.message);
      }
    }
  }, TIMEOUT_INTERVAL * 3);

  return interval
};

function formatNumber(number: any) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export const startGasPumpTrades = async (
  user_info: UserInfo,
  startup = false
) => {
  const tokenAddress = user_info.pumpAddress;
  console.log("tokenAddress________________", tokenAddress);
  const tempAddress = 'EQByPhuqdefXpeHw1KJyAgMyVdxlV4H5nQYLU2GxeVJs3bh3';
  const target_group_id = user_info.groups[0];
  let lastBuyTx = 'empty';
  const interval = setInterval(async () => {

    const tonPrice = await axios.get(
      `https://tonapi.io/v2/rates?tokens=ton&currencies=usd`
    );

    console.log("TON--Price--", tonPrice.data.rates.TON.prices.USD);

    try {
      const hoderList = await axios.get(
        `https://api-dev.gas111.com/api/v1/holders/list?token_address=${tokenAddress}&limit=1000`
      );
      const holderCnt = hoderList.data.holders.length;
      console.log("hoderList", holderCnt);

      const transactionData = await axios.get(
        `https://api-dev.gas111.com/api/v1/transactions/list?limit=100&offset=0&token_address=${tokenAddress}`
      );

      const txList = transactionData.data;
      console.log("lastBuyTx#############", lastBuyTx);
      // console.log("firstBuyTx",txList[0].created_at)
      for (let index = 0; index < txList.length; index++) {
        // console.log("firstBuyTx1",txList[0].created_at)
        const element = txList[index];
        // console.log("firstBuyTx2",element.created_at)
        if (element.type === 'sell')
          continue;
        if (lastBuyTx === 'empty') {
          lastBuyTx = element.created_at;
          break;
        }
        if (lastBuyTx === element.created_at)
          break;
        const tonAmount = parseInt(element.transaction_info.ton_amount) / TON_DECIMAL;
        const tokenAmount = parseInt(element.transaction_info.jetton_amount) / TON_DECIMAL;
        const marketCap = parseFloat(element.token_info.market_cap);
        const price = parseFloat(element.transaction_info.price);
        const holders = holderCnt;
        const userWalletAddress = element.token_info.user_info.wallet_address;
        const dexs = 'https://gaspump.tg/#/token/trade?token_address=' + tokenAddress;
        const ad_url = element.token_info.tg_channel_link;
        const img_url = element.token_info.image_url;
        const createAt = element.created_at;
        console.log("transaction################");
        const tobject = {
          tokenAddress,
          tonAmount,
          tokenAmount,
          marketCap,
          price,
          holders,
          userWalletAddress,
          dexs,
          ad_url,
          img_url,
          createAt
        };
        console.log(tobject)
        console.log("transaction################");

        notifyNewBuy(
          target_group_id,
          `🆕  BUY ${element.token_info.ticker} 🆕 
 "************************"


💎 ${tonAmount.toFixed(
            2
          )} TON 
💰 ${tokenAmount.toFixed(0)} ${element.token_info.ticker} 

${`📊 Market Cap $${marketCap.toFixed(0)}`
          }
${`💲  Price: $${price.toFixed(7)}`
          }
🏦 Holders: ${holders}
${`🗣️ <a href="https://tonviewer.com/${userWalletAddress}">${userWalletAddress} </a>`
          }
📈 <a href="${dexs}">GasPump</a>

Ad: <a href="${ad_url}">${ad_url}</a>`
        );
        break;
      }
    } catch (error) {
      console.log(error)
    }

  }, TIMEOUT_INTERVAL);

  console.log("################################");
  return interval;
}

const TRENDING_INTERVAL = 30 * 1000

export const showTrending = async (chatid: TelegramBot.ChatId) => {
  const interval = setInterval(async () => {
    const messageId = (await trendingMessage)?.message_id
    const caption = (await trendingMessage)?.text
    if (messageId && caption)
      editTrendingMsg(chatid, messageId, caption)
  }, TRENDING_INTERVAL);

  trendingMessage = showTrendingMsg(chatid)
};

export const showTrendingMsg = async (chatid: TelegramBot.ChatId) => {
  let msg;
  try {
    const geckoRes = await axios.get('https://api.geckoterminal.com/api/v2/networks/ton/trending_pools?page=1');
    const tuRes = await axios.get('https://api.geckoterminal.com/api/v2/networks/ton/pools/EQCdJh9wCLDDdT5JDdGtEsTPWcLlGJLdlSaCpoUWsJUEbteo');

    const resData = geckoRes.data.data
    const tuData = tuRes.data.data

    let rankCnt = 0;
    let trendingPools: string[] = [];
    trendingPools.push('EQCdJh9wCLDDdT5JDdGtEsTPWcLlGJLdlSaCpoUWsJUEbteo')
    for (let index = 0; index < resData.length; index++) {
      if (!resData[index])
        continue

      const poolAddress = resData[index]?.attributes?.address
      if (!poolAddress)
        continue

      trendingPools.push(poolAddress)

      rankCnt++
      if (rankCnt == 9)
        break
    }

    await instance.database.updateTrendingPool({ trendingPools });

    const timeNow = new Date();
    
    const caption = `
      🟢 TON Trending Board 🟢
        
      1️⃣  ${addLink(tuData.attributes.address, tuData.attributes.name)}  |  ${addLink(tuData.attributes.address, outputPercentage(Math.floor(Number(tuData.attributes.price_change_percentage.h24))))}

      2️⃣  ${addLink(resData[0].attributes.address, resData[0].attributes.name)}  |  ${addLink(resData[0].attributes.address, outputPercentage(Math.floor(Number(resData[0].attributes.price_change_percentage.h24))))}
    
      3️⃣  ${addLink(resData[1].attributes.address, resData[1].attributes.name)}  |  ${addLink(resData[1].attributes.address, outputPercentage(Math.floor(Number(resData[1].attributes.price_change_percentage.h24))))}
    
      -----------------------------------

      4️⃣  ${addLink(resData[2].attributes.address, resData[2].attributes.name)}  |  ${addLink(resData[2].attributes.address, outputPercentage(Math.floor(Number(resData[2].attributes.price_change_percentage.h24))))}
    
      5️⃣  ${addLink(resData[3].attributes.address, resData[3].attributes.name)}  |  ${addLink(resData[3].attributes.address, outputPercentage(Math.floor(Number(resData[3].attributes.price_change_percentage.h24))))}
    
      6️⃣  ${addLink(resData[4].attributes.address, resData[4].attributes.name)}  |  ${addLink(resData[4].attributes.address, outputPercentage(Math.floor(Number(resData[4].attributes.price_change_percentage.h24))))}
    
      7️⃣  ${addLink(resData[5].attributes.address, resData[5].attributes.name)}  |  ${addLink(resData[5].attributes.address, outputPercentage(Math.floor(Number(resData[5].attributes.price_change_percentage.h24))))}
    
      8️⃣  ${addLink(resData[6].attributes.address, resData[6].attributes.name)}  |  ${addLink(resData[6].attributes.address, outputPercentage(Math.floor(Number(resData[6].attributes.price_change_percentage.h24))))}
    
      9️⃣  ${addLink(resData[7].attributes.address, resData[7].attributes.name)}  |  ${addLink(resData[7].attributes.address, outputPercentage(Math.floor(Number(resData[7].attributes.price_change_percentage.h24))))}
    
      🔟  ${addLink(resData[8].attributes.address, resData[8].attributes.name)}  |  ${addLink(resData[8].attributes.address, outputPercentage(Math.floor(Number(resData[8].attributes.price_change_percentage.h24))))}
      
      
      <a href="https://t.me/disclaimertu">Read Disclaimer</a>

      Updated at: ${timeNow.getUTCMonth() + 1}/${timeNow.getUTCDate()}/${timeNow.getUTCFullYear()}, ${timeNow.getUTCHours()}:${timeNow.getUTCMinutes()}:${timeNow.getUTCSeconds()}
      `;

    msg = instance.bot.sendMessage(
      chatid,
      caption,
      {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Ton Universe Chat",
                url: "https://t.me/+Rg_YUf5Aaaw2MDU0",
              }
            ],
          ],
        },
      }
    );
  } catch (error) {
    console.log(error)
  }

  return msg;
}

export const editTrendingMsg = async (chatid: TelegramBot.ChatId, messageId: number, caption: string) => {
  try {
    const geckoRes = await axios.get('https://api.geckoterminal.com/api/v2/networks/ton/trending_pools?page=1');
    const tuRes = await axios.get('https://api.geckoterminal.com/api/v2/networks/ton/pools/EQCdJh9wCLDDdT5JDdGtEsTPWcLlGJLdlSaCpoUWsJUEbteo');

    const resData = geckoRes.data.data
    const tuData = tuRes.data.data

    let rankCnt = 0;
    let trendingPools: string[] = [];
    trendingPools.push('EQCdJh9wCLDDdT5JDdGtEsTPWcLlGJLdlSaCpoUWsJUEbteo');
    for (let index = 0; index < resData.length; index++) {
      if (!resData[index])
        continue

      const poolAddress = resData[index]?.attributes?.address
      if (!poolAddress)
        continue

      trendingPools.push(poolAddress)

      rankCnt++
      if (rankCnt == 9)
        break
    }

    await instance.database.updateTrendingPool({ trendingPools });
    const timeNow = new Date();
    const editCaption = `
      🟢 TON Trending Board 🟢
        
      1️⃣  ${addLink(tuData.attributes.address, tuData.attributes.name)}  |  ${addLink(tuData.attributes.address, outputPercentage(Math.floor(Number(tuData.attributes.price_change_percentage.h24))))}

      2️⃣  ${addLink(resData[0].attributes.address, resData[0].attributes.name)}  |  ${addLink(resData[0].attributes.address, outputPercentage(Math.floor(Number(resData[0].attributes.price_change_percentage.h24))))}
    
      3️⃣  ${addLink(resData[1].attributes.address, resData[1].attributes.name)}  |  ${addLink(resData[1].attributes.address, outputPercentage(Math.floor(Number(resData[1].attributes.price_change_percentage.h24))))}
    
      -----------------------------------

      4️⃣  ${addLink(resData[2].attributes.address, resData[2].attributes.name)}  |  ${addLink(resData[2].attributes.address, outputPercentage(Math.floor(Number(resData[2].attributes.price_change_percentage.h24))))}
    
      5️⃣  ${addLink(resData[3].attributes.address, resData[3].attributes.name)}  |  ${addLink(resData[3].attributes.address, outputPercentage(Math.floor(Number(resData[3].attributes.price_change_percentage.h24))))}
    
      6️⃣  ${addLink(resData[4].attributes.address, resData[4].attributes.name)}  |  ${addLink(resData[4].attributes.address, outputPercentage(Math.floor(Number(resData[4].attributes.price_change_percentage.h24))))}
    
      7️⃣  ${addLink(resData[5].attributes.address, resData[5].attributes.name)}  |  ${addLink(resData[5].attributes.address, outputPercentage(Math.floor(Number(resData[5].attributes.price_change_percentage.h24))))}
    
      8️⃣  ${addLink(resData[6].attributes.address, resData[6].attributes.name)}  |  ${addLink(resData[6].attributes.address, outputPercentage(Math.floor(Number(resData[6].attributes.price_change_percentage.h24))))}
    
      9️⃣  ${addLink(resData[7].attributes.address, resData[7].attributes.name)}  |  ${addLink(resData[7].attributes.address, outputPercentage(Math.floor(Number(resData[7].attributes.price_change_percentage.h24))))}
    
      🔟  ${addLink(resData[8].attributes.address, resData[8].attributes.name)}  |  ${addLink(resData[8].attributes.address, outputPercentage(Math.floor(Number(resData[8].attributes.price_change_percentage.h24))))}
      
      
      <a href="https://t.me/disclaimertu">Read Disclaimer</a>

      Updated at: ${timeNow.getUTCMonth() + 1}/${timeNow.getUTCDate()}/${timeNow.getUTCFullYear()}, ${timeNow.getUTCHours()}:${timeNow.getUTCMinutes()}:${timeNow.getUTCSeconds()}
      `;
    
    if (caption !== editCaption) {
      instance.bot.editMessageText(
        editCaption,
        {
          chat_id: chatid,
          message_id: messageId,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Ton Universe Chat",
                  url: "https://t.me/+Rg_YUf5Aaaw2MDU0",
                }
              ],
            ],
          },
        }
      );
    }
  } catch (error) {
    console.log(error)
  }
}

const outputPercentage = (volume: number) : string => {
  if (volume > 0)
    return ('+' + volume + '%')
  else if (volume < 0)
    return (volume + '%')

  return '0 %'
}

const addLink = (poolAddress: string, name: string) : string => {
  return `<a href="https://www.geckoterminal.com/ton/pools/${poolAddress}">${name}</a>`
}