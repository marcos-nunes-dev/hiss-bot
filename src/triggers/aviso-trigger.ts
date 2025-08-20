import { AttachmentBuilder, Message } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import fetch from 'node-fetch';

import { Language } from '../models/enum-helpers/index.js';
import { EventData } from '../models/internal-models.js';
import { Lang } from '../services/index.js';
import { InteractionUtils } from '../utils/index.js';
import { Trigger } from './trigger.js';

export class AvisoTrigger implements Trigger {
    public requireGuild = true;
    // Stricter rate limiting for PM commands to prevent spam
    private cooldown = new RateLimiter(1, 30000); // 1 use per 30 seconds

    constructor() {
        console.log('AvisoTrigger: Constructor called - trigger registered');
    }

    public triggered(msg: Message): boolean {
        const triggered = msg.content.startsWith('!aviso ');
        if (triggered) {
            console.log(`AvisoTrigger: Triggered by message: "${msg.content}"`);
        }
        return triggered;
    }

    public async execute(msg: Message, data: EventData): Promise<void> {
        console.log(`AvisoTrigger: Execute called for user ${msg.author.tag}`);

        // Check if user has administrator permission
        if (!msg.member?.permissions.has('Administrator')) {
            console.log(`AvisoTrigger: Permission denied for user ${msg.author.tag}`);
            await msg.reply(
                '❌ **Permission Denied**: This command can only be used by server administrators.'
            );
            return;
        }

        // Check rate limiting
        if (this.cooldown.take(msg.author.id)) {
            await msg.reply('⏰ **Rate Limited**: Please wait before using this command again.');
            return;
        }

        // Parse the command: !aviso <message> @role1 @role2
        const content = msg.content.substring(7); // Remove "!aviso "

        // Find roles mentioned in the message
        const roleMentions = msg.mentions.roles;
        if (roleMentions.size === 0) {
            await msg.reply(
                '❌ **Error**: Please mention at least one role. Usage: `!aviso <message> @role1 @role2`'
            );
            return;
        }

        // Extract the message (everything before the first role mention)
        const firstRoleIndex = content.indexOf('<@&');
        if (firstRoleIndex === -1) {
            await msg.reply(
                '❌ **Error**: Please mention at least one role. Usage: `!aviso <message> @role1 @role2`'
            );
            return;
        }

        const message = content.substring(0, firstRoleIndex).trim();
        if (!message && msg.attachments.size === 0) {
            await msg.reply(
                '❌ **Error**: Please provide a message or attachment. Usage: `!aviso <message> @role1 @role2`'
            );
            return;
        }

        // Fetch all guild members first (including offline users)
        let allGuildMembers;
        try {
            allGuildMembers = await msg.guild.members.fetch();
            console.log(`Aviso: Fetched ${allGuildMembers.size} total guild members`);
        } catch (error) {
            console.error('Aviso: Failed to fetch guild members:', error);
            await msg.reply(
                '❌ **Error**: Failed to fetch guild members. This might be because:\n' +
                    '• The bot lacks "Server Members Intent" or "View Server Members" permission\n' +
                    '• The bot application needs "Server Members Intent" enabled in Discord Developer Portal\n\n' +
                    '**Solution**: Enable "Server Members Intent" in your bot settings and ensure the bot has "View Server Members" permission.'
            );
            return;
        }

        // Get all members with the specified roles (avoiding duplicates)
        const memberSet = new Set<string>();
        const allMembers: any[] = [];
        const roleNames: string[] = [];

        for (const role of roleMentions.values()) {
            roleNames.push(role.name);
            // Filter all guild members by this role
            for (const member of allGuildMembers.values()) {
                if (member.roles.cache.has(role.id) && !memberSet.has(member.id)) {
                    memberSet.add(member.id);
                    allMembers.push(member);
                }
            }
        }

        if (allMembers.length === 0) {
            await msg.reply(
                '⚠️ **Warning**: No members found. This might be because:\n' +
                    '• The bot lacks "Server Members Intent" or "View Server Members" permission\n' +
                    '• Members are offline and not cached\n' +
                    '• The specified roles have no members\n\n' +
                    '**Solution**: Enable "Server Members Intent" in your bot settings and ensure the bot has "View Server Members" permission.'
            );
            return;
        }

        // Add debug info about who will receive messages
        const memberNames = allMembers.map(member => member.user.tag).join(', ');
        console.log(
            `Aviso: Found ${allMembers.length} members to message (including offline users): ${memberNames}`
        );

        // Prepare the message content with preserved formatting
        const messageContent = message
            ? `**Aviso from ${msg.guild.name}:**\n\n${message}`
            : `**Aviso from ${msg.guild.name}:**`;

        // Process attachments if they exist
        const attachments: AttachmentBuilder[] = [];
        if (msg.attachments.size > 0) {
            for (const attachment of msg.attachments.values()) {
                try {
                    // Download the attachment
                    const response = await fetch(attachment.url);
                    if (!response.ok) {
                        throw new Error(`Failed to download attachment: ${response.statusText}`);
                    }

                    const buffer = await response.arrayBuffer();
                    const attachmentBuilder = new AttachmentBuilder(Buffer.from(buffer), {
                        name: attachment.name || 'attachment',
                        description: attachment.description || undefined,
                    });
                    attachments.push(attachmentBuilder);
                } catch (error) {
                    console.error(`Failed to process attachment ${attachment.name}:`, error);
                    await msg.reply(
                        `❌ **Error**: Failed to process attachment "${attachment.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                    return;
                }
            }
        }

        // Send the message to each member
        let successCount = 0;
        let failedCount = 0;
        let dmDisabledCount = 0;
        let networkErrorCount = 0;
        const errors: string[] = [];
        const dmDisabledUsers: string[] = [];
        const networkErrorUsers: string[] = [];

        // Process members in batches to avoid rate limits
        const batchSize = 5; // Process 5 users at a time with delays

        for (let i = 0; i < allMembers.length; i += batchSize) {
            const batch = allMembers.slice(i, i + batchSize);

            // Process batch
            for (const member of batch) {
                try {
                    // Skip bots
                    if (member.user.bot) {
                        console.log(`Aviso: Skipping bot ${member.user.tag}`);
                        continue;
                    }

                    console.log(
                        `Aviso: Attempting to send message to ${member.user.tag} (${member.user.id})`
                    );

                    // Send message with attachments
                    await member.send({
                        content: messageContent,
                        files: attachments,
                    });
                    successCount++;
                    console.log(`Aviso: Successfully sent message to ${member.user.tag}`);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.log(`Aviso: Error sending to ${member.user.tag}: ${errorMessage}`);

                    // Check for network errors and retry once
                    if (
                        errorMessage.includes('ECONNRESET') ||
                        errorMessage.includes('ENOTFOUND') ||
                        errorMessage.includes('ETIMEDOUT') ||
                        errorMessage.includes('network') ||
                        errorMessage.includes('connection')
                    ) {
                        try {
                            // Wait a bit and retry
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            await member.send({
                                content: messageContent,
                                files: attachments,
                            });
                            successCount++;
                            continue; // Skip to next member
                        } catch (_retryError) {
                            // Retry also failed
                            failedCount++;
                            networkErrorCount++;
                            networkErrorUsers.push(member.user.tag);
                        }
                    } else {
                        failedCount++;

                        // Check for specific DM-related errors
                        if (
                            errorMessage.includes('other side closed') ||
                            errorMessage.includes('Cannot send messages to this user') ||
                            errorMessage.includes('DM disabled')
                        ) {
                            dmDisabledCount++;
                            dmDisabledUsers.push(member.user.tag);
                        } else {
                            errors.push(`Failed to send to ${member.user.tag}: ${errorMessage}`);
                        }
                    }
                }
            }

            // Add delay between batches to respect rate limits
            if (i + batchSize < allMembers.length) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
            }
        }

        // Log final statistics
        console.log(
            `Aviso: Final stats - Success: ${successCount}, Failed: ${failedCount}, DM Disabled: ${dmDisabledCount}, Network Errors: ${networkErrorCount}, Total Members: ${allMembers.length}`
        );

        // Create response
        if (failedCount === 0) {
            // All successful - no message preview for privacy
            const embed = Lang.getEmbed('displayEmbeds.avisoPrivate', data.lang, {
                USER_COUNT: successCount.toString(),
                ROLES: roleNames.join(', '),
            });

            // Add detailed statistics
            embed.addFields({
                name: 'Detailed Statistics',
                value: `**Success:** ${successCount} | **Failed:** ${failedCount} | **DM Disabled:** ${dmDisabledCount} | **Network Errors:** ${networkErrorCount} | **Total Members:** ${allMembers.length}`,
                inline: false,
            });

            // Send status as DM to the user who executed the command
            try {
                await msg.author.send({ embeds: [embed] });
            } catch (error) {
                // If DM fails, send as public reply with short deletion
                const response = await msg.reply({ embeds: [embed] });
                setTimeout(async () => {
                    try {
                        await response.delete();
                    } catch (error) {
                        // Ignore deletion errors
                    }
                }, 5000); // Delete after 5 seconds
            }
        } else {
            // Some failed - provide better error categorization
            let errorDescription = '';

            if (dmDisabledCount > 0) {
                errorDescription += `**${dmDisabledCount} user(s) have DMs disabled:** ${dmDisabledUsers.slice(0, 5).join(', ')}${dmDisabledUsers.length > 5 ? ` and ${dmDisabledUsers.length - 5} more` : ''}\n\n`;
            }

            if (networkErrorCount > 0) {
                errorDescription += `**${networkErrorCount} user(s) had network issues:** ${networkErrorUsers.slice(0, 5).join(', ')}${networkErrorUsers.length > 5 ? ` and ${networkErrorUsers.length - 5} more` : ''}\n\n`;
            }

            if (errors.length > 0) {
                errorDescription += `**Other errors:**\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n... and ${errors.length - 3} more errors` : ''}`;
            }

            const embed = Lang.getEmbed('displayEmbeds.avisoError', data.lang, {
                SUCCESS_COUNT: successCount.toString(),
                FAILED_COUNT: failedCount.toString(),
                ERRORS: errorDescription || 'Unknown error occurred',
            });

            // Add detailed statistics to error embed too
            embed.addFields({
                name: 'Detailed Statistics',
                value: `**Success:** ${successCount} | **Failed:** ${failedCount} | **DM Disabled:** ${dmDisabledCount} | **Network Errors:** ${networkErrorCount} | **Total Members:** ${allMembers.length}`,
                inline: false,
            });

            // Send status as DM to the user who executed the command
            try {
                await msg.author.send({ embeds: [embed] });
            } catch (error) {
                // If DM fails, send as public reply with short deletion
                const response = await msg.reply({ embeds: [embed] });
                setTimeout(async () => {
                    try {
                        await response.delete();
                    } catch (error) {
                        // Ignore deletion errors
                    }
                }, 5000); // Delete after 5 seconds
            }
        }
    }
}
