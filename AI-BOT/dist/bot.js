"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const builders_1 = require("@discordjs/builders");
const rest_1 = require("@discordjs/rest");
const v9_1 = require("discord-api-types/v9");
const discord_js_1 = require("discord.js");
const dify_client_1 = __importDefault(require("./dify-client/dify-client"));
const config_service_1 = require("@shared/config/config.service");
const conversationCache = new Map();
class DiscordBot {
    constructor(configService = new config_service_1.ConfigService()) {
        this.configService = configService;
        this.TOKEN = configService.discordToken;
        this.HISTORY_MODE = configService.historyMode;
        this.MAX_MESSAGE_LENGTH = configService.maxMessageLength;
        this.MESSAGE_CONTENT_ALLOWED = configService.messageContentAllowed;
        this.TRIGGER_KEYWORDS = configService.triggerKeywords;
        if (!this.TOKEN) {
            throw new Error("DISCORD_BOT_TOKEN must be provided in config.json");
        }
        const intents = [
            discord_js_1.IntentsBitField.Flags.Guilds,
            discord_js_1.IntentsBitField.Flags.GuildMessages,
            discord_js_1.IntentsBitField.Flags.DirectMessages,
        ];
        if (this.MESSAGE_CONTENT_ALLOWED) {
            intents.push(discord_js_1.IntentsBitField.Flags.MessageContent);
        }
        this.client = new discord_js_1.Client({
            intents,
        });
        this.difyClient = new dify_client_1.default();
        this.client.once("ready", () => {
            console.log("Discord bot is ready!", "Client ID:", this.client.user.id, `\nInstall this bot to your server with this link: https://discord.com/api/oauth2/authorize?client_id=${this.client.user.id}&permissions=0&scope=bot%20applications.commands `);
        });
        this.client.on("messageCreate", async (message) => {
            if (message.author.bot)
                return;
            const isMentioned = message.mentions.has(this.client.user);
            const isKeywordTriggered = this.MESSAGE_CONTENT_ALLOWED &&
                this.TRIGGER_KEYWORDS.some((keyword) => message.content.toLowerCase().includes(keyword.toLowerCase()));
            if (isMentioned || isKeywordTriggered) {
                await this.handleChatMessage(message);
            }
        });
        this.client.on("interactionCreate", async (interaction) => {
            if (!interaction.isCommand())
                return;
            if (interaction.commandName === "chat") {
                await this.handleChatCommand(interaction);
            }
            else if (interaction.commandName === "new-conversation") {
                const cacheId = this.HISTORY_MODE && this.HISTORY_MODE === "user"
                    ? interaction.user.id
                    : interaction.channelId;
                conversationCache.delete(cacheId);
                await interaction.reply("New conversation started!");
            }
        });
    }
    start() {
        return this.client.login(this.TOKEN);
    }
    parseTriggerKeywords() {
        let keywords = [];
        const rawKeywords = process.env.TRIGGER_KEYWORDS;
        if (!rawKeywords)
            return keywords;
        try {
            keywords = JSON.parse(rawKeywords);
        }
        catch (error) {
            console.warn("Invalid JSON in TRIGGER_KEYWORDS. Ignoring this configuration.", error);
        }
        return keywords;
    }
    async installSlashCommand(guildId) {
        const commands = [
            new builders_1.SlashCommandBuilder()
                .setName("chat")
                .setDescription("Chat with the bot in private. No one but you will see this messasge or the bot response.")
                .addStringOption((option) => option
                .setName("message")
                .setDescription("Your message.")
                .setRequired(true))
                .toJSON(),
            new builders_1.SlashCommandBuilder()
                .setName("new-conversation")
                .setDescription("Start a new conversation with the bot. This will clear the chat history.")
                // .addStringOption(option =>
                //     option.setName('summarize')
                //         .setDescription('Summarize the current conversation history and take it over to the new conversation.')
                //         .setRequired(true))
                .toJSON(),
        ];
        const rest = new rest_1.REST({ version: "9" }).setToken(this.TOKEN);
        try {
            console.log("Started refreshing application (/) commands.");
            await rest.put(v9_1.Routes.applicationGuildCommands(this.client.user.id, guildId), { body: commands });
            console.log("Successfully reloaded application (/) commands.");
        }
        catch (error) {
            console.error(error);
        }
    }
    async handleChatCommand(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const message = interaction.options.get("message", true);
        const cacheKey = this.getCacheKey(interaction.user.id, interaction.channel?.id);
        try {
            const { messages, files } = await this.generateAnswer({
                inputs: {
                    username: interaction.user.globalName || interaction.user.username,
                    now: new Date().toUTCString(),
                },
                query: message.value,
                response_mode: "streaming",
                conversation_id: (cacheKey && conversationCache.get(cacheKey)) || "",
                user: this.getUserId(interaction.user.id, interaction.guild?.id),
            }, {
                cacheKey,
                handleChatflowAnswer: (chatflowMessages, files) => {
                    if (chatflowMessages.length > 0) {
                        this.sendInteractionAnswer(interaction, chatflowMessages, files);
                    }
                },
            });
            this.sendInteractionAnswer(interaction, messages, files);
        }
        catch (error) {
            console.error("Error sending message to Dify:", error);
            await interaction.editReply({
                content: "Sorry, something went wrong while generating the answer.",
            });
        }
    }
    sendInteractionAnswer(interaction, messages, files) {
        for (const [index, m] of messages.entries()) {
            if (m.length === 0)
                continue;
            const additionalFields = index === 0
                ? {
                    files: files?.map((f) => ({
                        attachment: f.url,
                        name: f.extension
                            ? `generated_${f.type}.${f.extension}`
                            : `generated_${f.type}`,
                    })),
                }
                : {};
            if (!interaction.replied && index === 0) {
                interaction.editReply({
                    content: m,
                    ...additionalFields,
                });
            }
            else {
                interaction.followUp({
                    content: m,
                    ephemeral: true,
                    ...additionalFields,
                });
            }
        }
    }
    async handleChatMessage(message) {
        const cacheKey = this.getCacheKey(message.author.id, message.channelId);
        if (message.channel.type !== discord_js_1.ChannelType.GroupDM) {
            message.channel.sendTyping().catch(console.error);
        }
        try {
            const { messages, files } = await this.generateAnswer({
                inputs: {
                    username: message.author.globalName || message.author.username,
                    now: new Date().toUTCString(),
                },
                query: message.content.replace(`<@${this.client.user?.id}>`, ""),
                response_mode: "streaming",
                conversation_id: (cacheKey && conversationCache.get(cacheKey)) || "",
                user: this.getUserId(message.author.id, message.guild?.id),
            }, {
                cacheKey,
                onPing: async () => {
                    if (message.channel.type !== discord_js_1.ChannelType.GroupDM) {
                        await message.channel.sendTyping().catch(console.error);
                    }
                },
                handleChatflowAnswer: (chatflowMessages, files) => {
                    if (chatflowMessages.length > 0) {
                        this.sendChatnswer(message, chatflowMessages, files);
                    }
                },
            });
            this.sendChatnswer(message, messages, files);
        }
        catch (error) {
            console.error("Error sending message to Dify:", error);
            await message.reply("Sorry, something went wrong while generating the answer.");
        }
    }
    sendChatnswer(message, messages, files) {
        for (const [index, m] of messages.entries()) {
            if (m.length === 0)
                continue;
            if (index === 0) {
                message.reply({
                    content: m,
                    files: files?.map((f) => ({
                        attachment: f.url,
                        name: f.extension
                            ? `generated_${f.type}.${f.extension}`
                            : `generated_${f.type}`,
                    })),
                });
            }
            else {
                message.reply(m);
            }
        }
    }
    async generateAnswer(reqiest, { cacheKey, onPing, handleChatflowAnswer, }) {
        if (reqiest.query.length === 0)
            return Promise.resolve({ messages: [], files: [] });
        return new Promise(async (resolve, reject) => {
            try {
                let buffer = { defaultAnswer: "", chatflowAnswer: "" };
                let files = [];
                let fileGenerationThought = [];
                let bufferType = "defaultMessage";
                await this.difyClient.streamChatMessage(reqiest, {
                    onMessage: async (answer, isFirstMessage, { conversationId }) => {
                        switch (bufferType) {
                            case "defaultMessage":
                                buffer.defaultAnswer += answer;
                                break;
                            case "chatflowAnswer":
                                buffer.chatflowAnswer += answer;
                                break;
                        }
                        if (cacheKey) {
                            conversationCache.set(cacheKey, conversationId);
                        }
                    },
                    onFile: async (file) => {
                        files.push(file);
                    },
                    onThought: async (thought) => {
                        fileGenerationThought.push(thought);
                    },
                    onNodeStarted: async (nodeStarted) => {
                        switch (nodeStarted.data.node_type) {
                            case "llm":
                                bufferType = "chatflowAnswer";
                                onPing?.();
                                break;
                            case "tool":
                                onPing?.();
                                break;
                        }
                    },
                    onNodeFinished: async (nodeFinished) => {
                        switch (nodeFinished.data.node_type) {
                            case "answer":
                                bufferType = "defaultMessage";
                                handleChatflowAnswer?.(this.splitMessage(buffer.chatflowAnswer, {
                                    maxLength: this.MAX_MESSAGE_LENGTH,
                                }), files);
                                files = [];
                                buffer.chatflowAnswer = "";
                                break;
                            case "tool":
                                if (nodeFinished.data.title.includes("DALL-E") &&
                                    nodeFinished.data?.outputs?.files?.length > 0) {
                                    for (let file of nodeFinished.data.outputs.files) {
                                        files.push(file);
                                    }
                                }
                                break;
                        }
                    },
                    onCompleted: () => {
                        resolve({
                            messages: this.splitMessage([buffer.chatflowAnswer, buffer.defaultAnswer]
                                .filter(Boolean)
                                .join("\n\n"), {
                                maxLength: this.MAX_MESSAGE_LENGTH,
                            }),
                            files: files.map((file) => ({
                                ...file,
                                thought: fileGenerationThought.find((t) => file.id && t.message_files?.includes(file.id)),
                            })),
                        });
                    },
                    onPing,
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    getCacheKey(userId, channelId) {
        switch (this.HISTORY_MODE) {
            case "user":
                return userId || "";
            case "channel":
                return channelId || "";
            default:
                return "";
        }
    }
    getUserId(userId, serverId) {
        switch (this.HISTORY_MODE) {
            case "user":
                return userId || "";
            case "channel":
                return serverId || "";
            default:
                return "";
        }
    }
    splitMessage(message, options = {}) {
        const { maxLength = 2000, char = "\n", prepend = "", append = "", } = options;
        if (message.length <= maxLength)
            return [message];
        const splitText = message.split(char);
        if (splitText.some((part) => part.length > maxLength))
            throw new RangeError("SPLIT_MAX_LEN");
        const messages = [""];
        for (let part of splitText) {
            if (messages[messages.length - 1].length + part.length + 1 > maxLength) {
                messages[messages.length - 1] += append;
                messages.push(prepend);
            }
            messages[messages.length - 1] +=
                (messages[messages.length - 1].length > 0 &&
                    messages[messages.length - 1] !== prepend
                    ? char
                    : "") + part;
        }
        return messages;
    }
}
exports.default = DiscordBot;
