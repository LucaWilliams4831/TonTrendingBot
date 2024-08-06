import mongoose from "mongoose";
import { User, Pool, PoolSettings as PoolSettingsModel, TrendingPool } from "./model";
import {
  UserInfo,
  PoolInfo,
  PoolSettings,
  layoutItems,
  socialLinks,
  defaultMediaURL2s,
  TrendingPoolInfo,
} from "../type";

export const init = () => {
  return new Promise<void>(async (resolve, reject) => {
    mongoose
      .connect("mongodb://127.0.0.1:27017/TUTrendingBot")
      .then(() => {
        console.log("😊 Connected to MongoDB...");
        resolve();
      })
      .catch((err) => {
        console.error("😫 Could not connect to MongoDB...", err);
        reject();
      });
  });
};

export async function selectUsers(params = {}) {
  return new Promise(async (resolve, reject) => {
    User.find(params).then(async (users) => {
      resolve(users);
    });
  });
}

export async function selectUser(params: any) {
  return new Promise(async (resolve, reject) => {
    User.findOne(params).then(async (user) => {
      resolve(user);
    });
  });
}

export async function countUsers(params: any) {
  return new Promise(async (resolve, reject) => {
    User.countDocuments(params).then(async (count) => {
      resolve(count);
    });
  });
}

export const updateUser = (param: UserInfo) => {
  return new Promise(async (resolve, reject) => {
    User.findOne({ chat_id: param.chat_id }).then(async (user) => {
      if (!user) {
        user = new User();
      }

      user.chat_id = param.chat_id;
      user.username = param.username;
      user.dex_type = param.dex_type;
      user.groups = param.groups;
      user.selected_pool = param.selected_pool;
      user.added_pools = param.added_pools;

      await user.save();

      resolve(user);
    });
  });
};

export async function selectPools(params = {}) {
  return new Promise(async (resolve, reject) => {
    Pool.find(params).then(async (pool) => {
      resolve(pool);
    });
  });
}

export async function selectPool(params: any) {
  return new Promise(async (resolve, reject) => {
    Pool.findOne(params).then(async (pool) => {
      resolve(pool);
    });
  });
}

export const removePool = (params: any) => {
  return new Promise((resolve, reject) => {
    Pool.deleteOne({ address: params.address }).then(() => {
      resolve(true);
    });
  });
};

export const updatePool = (param: PoolInfo) => {
  return new Promise(async (resolve, reject) => {
    Pool.findOne({ address: param.address, user_id: param.user_id }).then(
      async (pool) => {
        if (!pool) {
          pool = new Pool();
        }

        pool.user_id = param.user_id;
        pool.target_groups = param.target_groups;
        pool.address = param.address;
        pool.name = param.name;
        pool.should_monitor = param.should_monitor;

        pool.settings = new PoolSettingsModel();

        pool.settings.emoji = "😺";
        pool.settings.emoji_per_ton = 2;
        pool.settings.layout_items = layoutItems;
        pool.settings.media_urls = defaultMediaURL2s;
        pool.settings.min_buy = 0;
        pool.settings.social_links = socialLinks;

        // Settings
        if (param.settings && pool.settings) {
          pool.settings.emoji = param.settings?.emoji;
          pool.settings.emoji_per_ton = param.settings?.emoji_per_ton;
          pool.settings.layout_items = param.settings?.layout_items;
          pool.settings.media_urls = param.settings?.media_urls;
          pool.settings.min_buy = param.settings?.min_buy;
          pool.settings.social_links = param.settings?.social_links;
        }

        await pool.save();

        resolve(pool);
      }
    );
  });
};

export async function selectTrendingPools(params = {}) {
  return new Promise(async (resolve, reject) => {
    TrendingPool.find(params).then(async (pool) => {
      resolve(pool);
    });
  });
}

export const updateTrendingPool = (param: TrendingPoolInfo) => {
  return new Promise(async (resolve, reject) => {
    TrendingPool.findOne().then(
      async (pool) => {
        if (!pool) {
          pool = new TrendingPool();
        }

        pool.trendingPools = param.trendingPools;

        await pool.save();

        resolve(pool);
      }
    );
  });
};
