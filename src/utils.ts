import axios from "axios";

const TON_PATTERN = "ton_EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";

const poolNames = new Map();
const poolToAddr = new Map();

export const rankingEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

export const getRandomURL = (imgArray: string[]) => {
  return imgArray[Math.floor(Math.random() * (imgArray.length - 1))];
};

export const generateReferralLink = (bot_username: string, chatid: string) => {
  const result = `https://t.me/${bot_username}?start=${encodeURIComponent(
    btoa(chatid)
  )}`;

  return result;
};

export const validTokenAddress = async (tokenAddress: string) => {
  try {
    const geckoRes = await axios.get(
      `https://api.geckoterminal.com/api/v2/networks/ton/tokens/${tokenAddress}`
    );

    const poolData = geckoRes.data.data;
    const jettonName = poolData.attributes.name;

    return jettonName;
  } catch (e: any) {
    console.log("Error while getting pool info using Gecko API", e.message);

    return undefined;
  }
};

export const getTokenForPool = (poolAddress: string) => {
  if (!poolAddress) return undefined;
  return poolToAddr.get(poolAddress);
};

export const getPoolAddressForToken = async (
  jettonAddress: string,
  dex: string | undefined
) => {
  try {
    console.log(`Getting available pool for ${jettonAddress} in ${dex}`);
    const geckoRes = await axios.get(
      `https://api.geckoterminal.com/api/v2/networks/ton/tokens/${jettonAddress}/pools?page=1`
    );

    const poolData = geckoRes.data.data;

    const poolAddresses: string[] = [];

    console.log(`poolData`);

    for (let i = 0; i < poolData.length; ++i) {
      const poolInfo = poolData[i];
      if (poolInfo.relationships.quote_token.data.id != TON_PATTERN) continue;
      const poolAddress = poolInfo.attributes.address;
      const dexType = poolInfo.relationships.dex.data.id;

      if (dex === dexType) {
        poolAddresses.push(poolAddress);
        poolToAddr.set(poolAddress, jettonAddress);
      }
    }

    return poolAddresses;
  } catch (e: any) {
    console.log("Error");
    return undefined;
  }
};

export const getPoolName = async (address: string) => {
  const savedPoolName = poolNames.get(address);
  if (savedPoolName) return savedPoolName;

  try {
    const geckoRes = await axios.get(
      `https://api.geckoterminal.com/api/v2/networks/ton/pools/${address}`
    );

    const poolData = geckoRes.data.data;
    const name = poolData.attributes.name;

    if (!poolToAddr.get(address)) {
      const jettonId: string = poolData.relationships.base_token.data.id;
      poolToAddr.set(address, jettonId.substring(4));
    }
    poolNames.set(address, name);
    return name;
  } catch (e: any) {
    console.log("Error while getting pool name: ", e.message);
    return undefined;
  }
};
