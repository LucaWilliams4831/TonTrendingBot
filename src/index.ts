import dotenv from "dotenv";

// import { Connection } from '@solana/web3.js';

import * as server from "../server";
import * as bot from "./bot";
import * as db from "./db/db";

dotenv.config();

db.init();
bot.init(db);
