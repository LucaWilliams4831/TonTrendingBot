////////////////////////////////////////////////

export const MESSAGE_START = "start";

////////////////////////////////////////////////

export const COMMAND_SETTINGS = "settings";
export const COMMAND_SET_WELCOME = "set-welcome";
export const COMMAND_ADD_CA = "add-contract-address";
export const COMMAND_TOKEN_SETTINGS = "token-settings";
export const COMMAND_SELECT_DEDUST = "select-dedust";
export const COMMAND_SELECT_STONFI = "select-stonfi";
export const COMMAND_SELECT_GASPUMP = "select-gaspump";
export const COMMAND_SELECT_POOL = "#";
export const COMMAND_SET_DEX = "set-dex";
export const COMMAND_START_OR_PAUSE_BOT = "start-or-pause-bot";
export const COMMAND_SELECT_ADDED_POOL = "select-added-pool";
export const COMMAND_SELECT_SOCIAL_LINK = "select-social-link";
export const COMMAND_SELECT_LAYOUT_ITEMS = "select-layout-items";
// Token settings;;;;
export const COMMAND_SET_MIN_BUY = "set-min-buy";
export const COMMAND_SET_EMOJI = "set-emoji";
export const COMMAND_SET_EMOJI_PER = "set-emoji-per";
export const COMMAND_MANAGE_MEDIA = "manage-media";
export const COMMAND_SOCIAL_LINKS = "social-links";
export const COMMAND_SET_LAYOUT = "set-layout";
export const COMMAND_REMOVE_TOKEN = "remove-token";

export const COMMAND_PROMOTE = "promote";
export const COMMAND_TOKEN_PROMOTE = "token-promote";
export const COMMAND_PAYMENT = "payment";

export const COMMAND_CHANGE_TOKEN_ADDRESS = "change-token-address";
export const COMMAND_CONFIRM_PAYMENT = "confirm-payment";
export const COMMAND_CHECK_TRENDING_STATUS = "check-status";
export const COMMAND_HOW_THIS_WORKS = "how-this-works";
export const COMMAND_GET_GASPUMP_DATA = "gaspump";

// Bot States
export const STATE_IDLE = 0;
export const STATE_INPUT_DEX = 1;
export const STATE_CUSTOMIZE_SETTINGS = 2;
export const STATE_INPUT_CA = 3;
export const STATE_POOL_SETTINGS = 4;
export const STATE_SHOW_ADDED_POOL = 5;
export const STATE_SHOW_AVAILABLE_POOL = 6;
export const STATE_INPUT_POOL_ADDRESS = 7;
export const STATE_TOKEN_SETTINGS = 8;
export const STATE_INPUT_SETTINGS = 9;
export const STATE_SELECT_SOCIAL_LINKS = 10;
export const STATE_ADD_GROUP_FIRST = 11;
export const STATE_SELECT_LAYOUT_ITEM = 12;
export const STATE_SHOW_TRENDING = 13;

// Loading states
export const LOADING_STARTED = 0;
export const LOADING_STEP_1 = 1;
export const LOADING_FINISHED = 2;


export const layoutItems = [
  "Volume",
  "Liquidity",
  "Price",
  "MCap",
  "Emoji",
  "Wallet",
];

export const socialLinks = [
  "Telegram",
  "Twitter",
  "Website",
  "Discord",
  "LP Lock",
  "Renounce",
  "CG",
  "CMC",
  "Medium",
  "Custom",
];

export const defaultMediaURLs = [
  "stick.jpg",
];

export const defaultMediaURL2s = [
  "stick.jpg"
];

export const dexTypes = ["dedust", "stonfi", "GasPump"];

export const promoteMap = {
  "3h17ton": { hours: 3, ton: 17 },
  "3h12ton": { hours: 3, ton: 12 },
  "6h28ton": { hours: 6, ton: 28 },
  "6h22ton": { hours: 6, ton: 22 },
  "12h45ton": { hours: 12, ton: 45 },
  "12h35ton": { hours: 12, ton: 35 },
  "24h77ton": { hours: 24, ton: 77 },
  "24h62ton": { hours: 24, ton: 62 },
  "48h130ton": { hours: 48, ton: 130 },
  "48h105ton": { hours: 48, ton: 105 },
  anyAvailablePosition: { hours: 0, ton: 0 },
  "3h10ton": { hours: 3, ton: 10 },
  "6h18ton": { hours: 6, ton: 18 },
  "12h30ton": { hours: 12, ton: 30 },
  "24h55ton": { hours: 24, ton: 55 },
  "48h95ton": { hours: 48, ton: 95 },
};

export interface UserInfo {
  chat_id: string;
  username: string;
  dex_type: string | undefined;
  groups: string[];
  selected_pool: string;
  added_pools: string[];
  timeout_id: NodeJS.Timeout | undefined;
  timeout_id2: NodeJS.Timeout | undefined;
  pumpAddress: string;
}

export interface PoolSettings {
  min_buy: number;
  emoji: string;
  emoji_per_ton: number;
  media_urls: string[];
  layout_items: string[];
  social_links: string[];
}

export interface PoolInfo {
  user_id: string;
  target_groups: string[];
  address: string;
  name: string;
  should_monitor: boolean;
  settings?: PoolSettings;
}

export interface TrendingPoolInfo {
  trendingPools: string[];
}
