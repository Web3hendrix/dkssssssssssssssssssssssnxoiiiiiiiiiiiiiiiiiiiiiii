"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const helpers_1 = require("./helpers");
dotenv.config();
class DifyChatClient {
    constructor() {
        const apiKey = process.env.DIFY_API_KEY;
        const apiBaseUrl = process.env.DIFY_API_BASE_URL;
        if (!apiKey || !apiBaseUrl) {
            throw new Error("API_KEY and API_BASE_URL must be provided in the .env file");
        }
        this.API_KEY = apiKey;
        this.API_BASE_URL = apiBaseUrl;
        this.axiosInstance = axios_1.default.create({
            baseURL: this.API_BASE_URL,
            headers: {
                Authorization: `Bearer ${this.API_KEY}`,
            },
        });
    }
    ssePost(url, fetchOptions, { onData, onCompleted, onThought, onFile, onMessageEnd, onWorkflowStarted, onWorkflowFinished, onNodeStarted, onNodeFinished, onMessageReplace, onError, getAbortController, onPing, }) {
        const abortController = new AbortController();
        const baseOptions = {
            method: "GET",
            mode: "cors",
            credentials: "include", // always send cookies、HTTP Basic authentication.
            headers: new Headers({
                "Content-Type": "application/json",
            }),
            redirect: "follow",
        };
        const options = Object.assign({}, baseOptions, {
            method: "POST",
            signal: abortController.signal,
        }, fetchOptions);
        const contentType = options.headers.get("Content-Type");
        if (!contentType)
            options.headers.set("Content-Type", "application/json");
        getAbortController?.(abortController);
        const urlWithPrefix = url;
        const { body } = options;
        if (body)
            options.body = JSON.stringify(body);
        globalThis
            .fetch(urlWithPrefix, options)
            .then((res) => {
            if (!/^(2|3)\d{2}$/.test(String(res.status))) {
                res.json().then((data) => {
                    console.error({
                        type: "error",
                        message: data.message || "Server Error",
                    });
                });
                onError?.(`Server Error. Status Code: ${res.status}`);
                return;
            }
            return this.handleStream(res, (str, isFirstMessage, moreInfo) => {
                if (moreInfo.errorMessage) {
                    onError?.(moreInfo.errorMessage, moreInfo.errorCode);
                    if (moreInfo.errorMessage !==
                        "AbortError: The user aborted a request.")
                        console.error(moreInfo.errorMessag);
                    return;
                }
                onData?.(str, isFirstMessage, moreInfo);
            }, onCompleted, onThought, onMessageEnd, onMessageReplace, onWorkflowStarted, onWorkflowFinished, onNodeStarted, onNodeFinished, onFile, onPing);
        })
            .catch((e) => {
            if (e.toString() !== "AbortError: The user aborted a request.")
                console.error(e);
            onError?.(e);
        });
    }
    handleStream(response, onData, onCompleted, onThought, onMessageEnd, onMessageReplace, onWorkflowStarted, onWorkflowFinished, onNodeStarted, onNodeFinished, onFile, onPing) {
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const reader = response.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let bufferObj;
        let isFirstMessage = true;
        function read() {
            let hasError = false;
            reader?.read().then((result) => {
                if (result.done) {
                    onCompleted && onCompleted();
                    return;
                }
                buffer += decoder.decode(result.value, { stream: true });
                const lines = buffer.split("\n");
                try {
                    lines.forEach((message) => {
                        try {
                            if (message.length === 0)
                                return;
                            if (message.endsWith("ping")) {
                                return onPing?.();
                            }
                            if (message.startsWith("data: ")) {
                                bufferObj = JSON.parse(message.substring(6));
                            }
                            else {
                                bufferObj = JSON.parse(message);
                            }
                        }
                        catch (e) {
                            // line is not yet complete; buffer it and wait for the next chunk
                            onData("", isFirstMessage, {
                                conversationId: bufferObj?.conversation_id,
                                messageId: bufferObj?.message_id,
                            });
                            return;
                        }
                        if (bufferObj.status === 400 || !bufferObj.event) {
                            onData("", false, {
                                conversationId: undefined,
                                messageId: "",
                                errorMessage: bufferObj?.message,
                                errorCode: bufferObj?.code,
                            });
                            hasError = true;
                            onCompleted?.(true);
                            return;
                        }
                        if (bufferObj.event === "message" ||
                            bufferObj.event === "agent_message") {
                            onData((0, helpers_1.unicodeToChar)(bufferObj.answer), isFirstMessage, {
                                conversationId: bufferObj.conversation_id,
                                taskId: bufferObj.task_id,
                                messageId: bufferObj.id,
                            });
                            isFirstMessage = false;
                        }
                        else if (bufferObj.event === "agent_thought") {
                            onThought?.(bufferObj);
                        }
                        else if (bufferObj.event === "message_file") {
                            onFile?.(bufferObj);
                        }
                        else if (bufferObj.event === "message_end") {
                            onMessageEnd?.(bufferObj);
                        }
                        else if (bufferObj.event === "message_replace") {
                            onMessageReplace?.(bufferObj);
                        }
                        else if (bufferObj.event === "workflow_started") {
                            onWorkflowStarted?.(bufferObj);
                        }
                        else if (bufferObj.event === "workflow_finished") {
                            onWorkflowFinished?.(bufferObj);
                        }
                        else if (bufferObj.event === "node_started") {
                            onNodeStarted?.(bufferObj);
                        }
                        else if (bufferObj.event === "node_finished") {
                            onNodeFinished?.(bufferObj);
                        }
                    });
                    buffer = lines[lines.length - 1];
                }
                catch (e) {
                    console.error(e);
                    onData("", false, {
                        conversationId: undefined,
                        messageId: "",
                        errorMessage: `${e}`,
                    });
                    hasError = true;
                    onCompleted?.(true);
                    return;
                }
                if (!hasError)
                    read();
            });
        }
        read();
    }
    async streamChatMessage(body, { onMessage, onCompleted, onFile, onPing, onThought, onWorkflowStarted, onWorkflowFinished, onNodeStarted, onNodeFinished, }) {
        this.ssePost(`${this.API_BASE_URL}/chat-messages`, {
            method: "POST",
            body,
            headers: new Headers({
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.API_KEY}`,
            }),
        }, {
            onData: (text, isFirstMessage, moreInfo) => {
                onMessage(text, isFirstMessage, moreInfo);
            },
            onCompleted: () => {
                onCompleted?.();
            },
            onError: (error) => {
                console.error(error);
            },
            onFile,
            onPing,
            onThought,
            onWorkflowStarted,
            onWorkflowFinished,
            onNodeStarted,
            onNodeFinished,
        });
    }
    async sendFeedback(message_id, request) {
        const response = await this.axiosInstance.post(`/messages/${message_id}/feedbacks`, request);
        return response.data;
    }
    async getSuggestedQuestions(message_id) {
        const response = await this.axiosInstance.get(`/messages/${message_id}/suggested`);
        return response.data;
    }
    async getChatHistory(request) {
        const response = await this.axiosInstance.get("/messages", {
            params: request,
        });
        return response.data;
    }
    async getConversationList(user, last_id, limit = 20) {
        const response = await this.axiosInstance.get("/conversations", {
            params: { user, last_id, limit },
        });
        return response.data;
    }
    async renameConversation(conversation_id, request) {
        const response = await this.axiosInstance.post(`/conversations/${conversation_id}/name`, request);
        return response.data;
    }
    async deleteConversation(conversation_id, request) {
        const response = await this.axiosInstance.delete(`/conversations/${conversation_id}`, { data: request });
        return response.data;
    }
    async getAppParameters(user) {
        const response = await this.axiosInstance.get("/parameters", {
            params: { user },
        });
        return response.data;
    }
}
exports.default = DifyChatClient;
