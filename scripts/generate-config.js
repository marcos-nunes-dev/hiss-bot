#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

// Generate config.json
const exampleConfigPath = path.join(process.cwd(), 'config', 'config.example.json');
const configPath = path.join(process.cwd(), 'config', 'config.json');

let config = JSON.parse(fs.readFileSync(exampleConfigPath, 'utf8'));

// Replace placeholders with environment variables
config.developers = [process.env.DISCORD_DEVELOPER_ID || config.developers[0]];
config.client.id = process.env.DISCORD_BOT_ID || config.client.id;
config.client.token = process.env.DISCORD_BOT_TOKEN || config.client.token;

// Write the generated config
fs.writeFileSync(configPath, JSON.stringify(config, null, 4));

// Generate bot-sites.json
const exampleBotSitesPath = path.join(process.cwd(), 'config', 'bot-sites.example.json');
const botSitesPath = path.join(process.cwd(), 'config', 'bot-sites.json');

let botSites = JSON.parse(fs.readFileSync(exampleBotSitesPath, 'utf8'));

// Replace placeholders in bot-sites.json
botSites = botSites.map(site => ({
    ...site,
    url: site.url.replace(/<BOT_ID>/g, process.env.DISCORD_BOT_ID || '<BOT_ID>'),
    authorization: site.authorization.replace(/<TOKEN>/g, process.env[`${site.name.toUpperCase().replace(/[.-]/g, '_')}_TOKEN`] || '<TOKEN>')
}));

fs.writeFileSync(botSitesPath, JSON.stringify(botSites, null, 4));

// Generate debug.json
const exampleDebugPath = path.join(process.cwd(), 'config', 'debug.example.json');
const debugPath = path.join(process.cwd(), 'config', 'debug.json');

let debug = JSON.parse(fs.readFileSync(exampleDebugPath, 'utf8'));

// Replace developer IDs in debug.json
if (process.env.DISCORD_DEVELOPER_ID) {
    debug.dummyMode.whitelist = [process.env.DISCORD_DEVELOPER_ID];
}

fs.writeFileSync(debugPath, JSON.stringify(debug, null, 4));

console.log('All config files generated successfully from environment variables');
