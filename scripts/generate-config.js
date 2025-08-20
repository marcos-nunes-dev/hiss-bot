#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Read the example config
const exampleConfigPath = path.join(process.cwd(), 'config', 'config.example.json');
const configPath = path.join(process.cwd(), 'config', 'config.json');

let config = JSON.parse(fs.readFileSync(exampleConfigPath, 'utf8'));

// Replace placeholders with environment variables
config.developers = [process.env.DISCORD_DEVELOPER_ID || config.developers[0]];
config.client.id = process.env.DISCORD_BOT_ID || config.client.id;
config.client.token = process.env.DISCORD_BOT_TOKEN || config.client.token;

// Write the generated config
fs.writeFileSync(configPath, JSON.stringify(config, null, 4));

console.log('Config generated successfully from environment variables');
