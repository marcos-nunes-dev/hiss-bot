# Railway Deployment Guide

## Environment Variables

Set these environment variables in your Railway project:

- `DISCORD_DEVELOPER_ID` - Your Discord user ID
- `DISCORD_BOT_ID` - Your Discord bot application ID
- `DISCORD_BOT_TOKEN` - Your Discord bot token

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
