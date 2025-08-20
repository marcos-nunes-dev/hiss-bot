# Railway Deployment Guide

## Environment Variables

Set these environment variables in your Railway project:

### Required Variables
- `DISCORD_DEVELOPER_ID` - Your Discord user ID
- `DISCORD_BOT_ID` - Your Discord bot application ID
- `DISCORD_BOT_TOKEN` - Your Discord bot token

### Optional Bot Site Tokens (if you want to post stats)
- `TOP_GG_TOKEN` - Top.gg bot token
- `BOTS_ONDISCORD_XYZ_TOKEN` - Bots.ondiscord.xyz token
- `DISCORD_BOTS_GG_TOKEN` - Discord.bots.gg token
- `DISCORDBOTLIST_COM_TOKEN` - Discordbotlist.com token
- `DISCORDS_COM_TOKEN` - Discords.com token
- `DISFORGE_COM_TOKEN` - Disforge.com token

## Deployment Steps

1. Connect your GitHub repository to Railway
2. Set the environment variables above in Railway dashboard
3. Deploy - the bot will automatically:
    - Generate config.json from environment variables
    - Start the bot with proper configuration

## Security Notes

- Never commit `config.json` with real tokens to your repository
- Use environment variables for all sensitive data
- The `config.json` file is generated at runtime from environment variables
