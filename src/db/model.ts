import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  chat_id: String,
  username: String,
  dex_type: String,
  groups: [String],
  selected_pool: String,
  added_pools: [String],
  wallet: String,
});

const poolSettingsSchema = new mongoose.Schema({
  min_buy: Number,
  emoji: String,
  emoji_per_ton: Number,
  media_urls: [String],
  layout_items: [String],
  social_links: [String],
});

const poolSchema = new mongoose.Schema({
  user_id: String,
  target_groups: [String],
  address: String,
  name: String,
  should_monitor: Boolean,
  settings: poolSettingsSchema,
});

const trendingPoolSchema = new mongoose.Schema({
  trendingPools: [String]
});

export const User = mongoose.model("users", userSchema);
export const PoolSettings = mongoose.model("poolSettings", poolSettingsSchema);
export const Pool = mongoose.model("pools", poolSchema);
export const TrendingPool = mongoose.model("trendingPools", trendingPoolSchema);
