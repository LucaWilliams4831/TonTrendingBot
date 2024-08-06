import cors from 'cors';
import dotenv from 'dotenv';
import express, {
  Express,
  NextFunction,
  Request,
  Response,
} from 'express';
import passport from 'passport';

import passport_jwt from './passport-jwt';

dotenv.config()

passport_jwt(passport);
