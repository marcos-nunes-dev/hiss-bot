import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    PermissionsString,
    Role,
} from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import fetch from 'node-fetch';

import { Language } from '../../models/enum-helpers/index.js';
import { EventData } from '../../models/internal-models.js';
import { Lang } from '../../services/index.js';
import { InteractionUtils } from '../../utils/index.js';
import { Command, CommandDeferType } from '../index.js';

export class AvisoCommand implements Command {
    public names = [Lang.getRef('chatCommands.aviso', Language.Default)];
    // Stricter rate limiting for PM commands to prevent spam
    public cooldown = new RateLimiter(1, 30000); // 1 use per 30 seconds
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        const message = intr.options.getString('message', true);
        const attachment = intr.options.getAttachment('attachment', false);
        const rolesInput = intr.options.getString('roles', true);

        // Validate that we're in a guild
        if (!intr.guild) {
            await InteractionUtils.send(intr, 'This command can only be used in a server.');
            return;
        }

        // Parse roles from input
        const roleIds = this.parseRoleInput(rolesInput);
        const roles: Role[] = [];
        const roleNames: string[] = [];

        for (const roleId of roleIds) {
            const role = intr.guild.roles.cache.get(roleId);
            if (role) {
                roles.push(role);
                roleNames.push(role.name);
            } else {
                await InteractionUtils.send(intr, `Role with ID ${roleId} not found.`);
                return;
            }
        }

        if (roles.length === 0) {
            await InteractionUtils.send(
                intr,
                'No valid roles found. Please provide valid role IDs or mentions.'
            );
            return;
        }

        // Get all members with the specified roles (avoiding duplicates)
        const memberSet = new Set<string>();
        const allMembers: any[] = [];

        for (const role of roles) {
            for (const member of role.members.values()) {
                if (!memberSet.has(member.id)) {
                    memberSet.add(member.id);
                    allMembers.push(member);
                }
            }
        }

        if (allMembers.length === 0) {
            await InteractionUtils.send(
                intr,
                `No users found with the specified roles: ${roleNames.join(', ')}.`
            );
            return;
        }

        // Prepare the message content with preserved formatting
        // Just use the message as-is to preserve exact formatting without code blocks
        const messageContent = `**Aviso from ${intr.guild.name}:**\n\n${message}`;
        const attachments: AttachmentBuilder[] = [];

        if (attachment) {
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
                await InteractionUtils.send(
                    intr,
                    `Failed to process attachment: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
                return;
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
                    if (member.user.bot) continue;

                    // Send message with optional attachment
                    await member.send({
                        content: messageContent,
                        files: attachments,
                    });
                    successCount++;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

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

        // Create response embed
        if (failedCount === 0) {
            // All successful
            // Truncate message for embed preview (Discord limit: 1024 chars)
            const messagePreview =
                message.length > 1000 ? message.substring(0, 1000) + '...' : message;

            const embed = Lang.getEmbed('displayEmbeds.aviso', data.lang, {
                USER_COUNT: successCount.toString(),
                MESSAGE: messagePreview,
                ROLES: roleNames.join(', '),
            });

            // Add attachment info to embed if present
            if (attachment) {
                embed.addFields({
                    name: 'Attachment',
                    value: `${attachment.name} (${this.formatFileSize(attachment.size)})`,
                    inline: true,
                });
            }

            // Add detailed statistics
            embed.addFields({
                name: 'Detailed Statistics',
                value: `**Success:** ${successCount} | **Failed:** ${failedCount} | **DM Disabled:** ${dmDisabledCount} | **Network Errors:** ${networkErrorCount} | **Total Members:** ${allMembers.length}`,
                inline: false,
            });

            await InteractionUtils.send(intr, embed);
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

            await InteractionUtils.send(intr, embed);
        }
    }

    private formatFileSize(bytes: number): string {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
    }

    private parseRoleInput(input: string): string[] {
        // Split by spaces and filter out empty strings
        const parts = input.split(/\s+/).filter(part => part.trim() !== '');
        const roleIds: string[] = [];

        for (const part of parts) {
            // Handle role mentions: <@&123456789>
            const mentionMatch = part.match(/<@&(\d+)>/);
            if (mentionMatch) {
                roleIds.push(mentionMatch[1]);
                continue;
            }

            // Handle plain role IDs (just numbers)
            if (/^\d+$/.test(part)) {
                roleIds.push(part);
                continue;
            }

            // If it's not a valid format, skip it
            console.warn(`Invalid role format: ${part}`);
        }

        return roleIds;
    }
}
