import 'module-alias/register';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

process.env.APP_ROOT_DIRECTORY = __dirname || process.cwd();

import Server from './app';

Server.initializeApp();
