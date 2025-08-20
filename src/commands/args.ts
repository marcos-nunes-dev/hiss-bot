import { APIApplicationCommandBasicOption, ApplicationCommandOptionType } from 'discord.js';

import { DevCommandName, HelpOption, InfoOption } from '../enums/index.js';
import { Language } from '../models/enum-helpers/index.js';
import { Lang } from '../services/index.js';

export class Args {
    public static readonly AVISO_MESSAGE: APIApplicationCommandBasicOption = {
        name: Lang.getRef('arguments.message', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('arguments.message'),
        description: Lang.getRef('argDescs.avisoMessage', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('argDescs.avisoMessage'),
        type: ApplicationCommandOptionType.String,
        required: true,
    };

    public static readonly AVISO_ATTACHMENT: APIApplicationCommandBasicOption = {
        name: Lang.getRef('arguments.attachment', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('arguments.attachment'),
        description: Lang.getRef('argDescs.avisoAttachment', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('argDescs.avisoAttachment'),
        type: ApplicationCommandOptionType.Attachment,
        required: false,
    };

    public static readonly AVISO_ROLES: APIApplicationCommandBasicOption = {
        name: Lang.getRef('arguments.roles', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('arguments.roles'),
        description: Lang.getRef('argDescs.avisoRoles', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('argDescs.avisoRoles'),
        type: ApplicationCommandOptionType.String,
        required: true,
    };

    public static readonly DEV_COMMAND: APIApplicationCommandBasicOption = {
        name: Lang.getRef('arguments.command', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('arguments.command'),
        description: Lang.getRef('argDescs.devCommand', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('argDescs.devCommand'),
        type: ApplicationCommandOptionType.String,
        choices: [
            {
                name: Lang.getRef('devCommandNames.info', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('devCommandNames.info'),
                value: DevCommandName.INFO,
            },
        ],
    };
    public static readonly HELP_OPTION: APIApplicationCommandBasicOption = {
        name: Lang.getRef('arguments.option', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('arguments.option'),
        description: Lang.getRef('argDescs.helpOption', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('argDescs.helpOption'),
        type: ApplicationCommandOptionType.String,
        choices: [
            {
                name: Lang.getRef('helpOptionDescs.contactSupport', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('helpOptionDescs.contactSupport'),
                value: HelpOption.CONTACT_SUPPORT,
            },
            {
                name: Lang.getRef('helpOptionDescs.commands', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('helpOptionDescs.commands'),
                value: HelpOption.COMMANDS,
            },
        ],
    };
    public static readonly INFO_OPTION: APIApplicationCommandBasicOption = {
        name: Lang.getRef('arguments.option', Language.Default),
        name_localizations: Lang.getRefLocalizationMap('arguments.option'),
        description: Lang.getRef('argDescs.helpOption', Language.Default),
        description_localizations: Lang.getRefLocalizationMap('argDescs.helpOption'),
        type: ApplicationCommandOptionType.String,
        choices: [
            {
                name: Lang.getRef('infoOptions.about', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('infoOptions.about'),
                value: InfoOption.ABOUT,
            },
            {
                name: Lang.getRef('infoOptions.translate', Language.Default),
                name_localizations: Lang.getRefLocalizationMap('infoOptions.translate'),
                value: InfoOption.TRANSLATE,
            },
        ],
    };
}
