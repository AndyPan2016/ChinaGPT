/**
 * chat-folder
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年6月11日15:41:51 - 创建
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { trimTopic } from "../utils";

import Locale from "../locales";
import { showToast } from "../components/ui-lib";
import { ModelType } from "./config";
import { createEmptyMask, Mask } from "./mask";
import { StoreKey } from "../constant";
import { api, RequestMessage } from "../client/api";
import { ChatControllerPool } from "../client/controller";
import { prettyObject } from "../utils/format";

export type ChatMessage = RequestMessage & {
  date: string;
  streaming?: boolean;
  isError?: boolean;
  id?: number;
  model?: ModelType;
};

/**
 * 创建消息
 * @param override 重写数据
 * @returns 消息对象
 */
export function createMessage(override: Partial<ChatMessage>): ChatMessage {
  return {
    id: Date.now(),
    date: new Date().toLocaleString(),
    role: "user",
    content: "",
    ...override,
  };
}

export interface ChatStat {
  tokenCount: number;
  wordCount: number;
  charCount: number;
}

export interface ChatSession {
  id: number | string;
  topic: string;

  memoryPrompt: string;
  messages: ChatMessage[];
  stat: ChatStat;
  lastUpdate: number;
  lastSummarizeIndex: number;
  clearContextIndex?: number;

  mask: Mask;
}

export const DEFAULT_TOPIC = Locale.Store.DefaultTopic;
export const BOT_HELLO: ChatMessage = createMessage({
  role: "assistant",
  content: Locale.Store.BotHello,
});

/**
 * 创建一个空的消息
 * @returns
 */
function createEmptySession(): ChatSession {
  return {
    id: Date.now() + Math.random(),
    topic: DEFAULT_TOPIC,
    memoryPrompt: "",
    messages: [],
    stat: {
      tokenCount: 0,
      wordCount: 0,
      charCount: 0,
    },
    lastUpdate: Date.now(),
    lastSummarizeIndex: 0,

    mask: createEmptyMask(),
  };
}

// chat
interface ChatStore {
  sessions: ChatSession[];
  currentSessionIndex: number;
  globalId: number;
  clearSessions: () => void;
  moveSession: (from: number, to: number) => void;
  selectSession: (index: number) => void;
  newSession: (mask?: Mask) => void;
  deleteSession: (index: number) => void;
  currentSession: () => ChatSession;
  onNewMessage: (message: ChatMessage) => void;
  onUserInput: (content: string) => Promise<void>;
  summarizeSession: () => void;
  updateStat: (message: ChatMessage) => void;
  updateCurrentSession: (updater: (session: ChatSession) => void) => void;
  updateMessage: (
    sessionIndex: number,
    messageIndex: number,
    updater: (message?: ChatMessage) => void,
  ) => void;
  resetSession: () => void;
  getMessagesWithMemory: () => ChatMessage[];
  getMemoryPrompt: () => ChatMessage;

  clearAllData: () => void;
}

function countMessages(msgs: ChatMessage[]) {
  return msgs.reduce((pre, cur) => pre + cur.content.length, 0);
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [createEmptySession()],
      currentSessionIndex: 0,
      globalId: 0,

      clearSessions() {
        set(() => ({
          sessions: [createEmptySession()],
          currentSessionIndex: 0,
        }));
      },

      selectSession(index: number) {
        set({
          currentSessionIndex: index,
        });
      },

      moveSession(from: number, to: number) {
        set((state) => {
          const { sessions, currentSessionIndex: oldIndex } = state;

          // move the session
          const newSessions = [...sessions];
          const session = newSessions[from];
          newSessions.splice(from, 1);
          newSessions.splice(to, 0, session);

          // modify current session id
          let newIndex = oldIndex === from ? to : oldIndex;
          if (oldIndex > from && oldIndex <= to) {
            newIndex -= 1;
          } else if (oldIndex < from && oldIndex >= to) {
            newIndex += 1;
          }

          return {
            currentSessionIndex: newIndex,
            sessions: newSessions,
          };
        });
      },

      newSession(mask) {
        const session = createEmptySession();

        set(() => ({ globalId: get().globalId + 1 }));
        session.id = get().globalId;

        if (mask) {
          session.mask = { ...mask };
          session.topic = mask.name;
        }

        set((state) => ({
          currentSessionIndex: 0,
          sessions: [session].concat(state.sessions),
        }));
      },

      deleteSession(index) {
        const deletingLastSession = get().sessions.length === 1;
        const deletedSession = get().sessions.at(index);

        if (!deletedSession) return;

        const sessions = get().sessions.slice();
        sessions.splice(index, 1);

        const currentIndex = get().currentSessionIndex;
        let nextIndex = Math.min(
          currentIndex - Number(index < currentIndex),
          sessions.length - 1,
        );

        if (deletingLastSession) {
          nextIndex = 0;
          sessions.push(createEmptySession());
        }

        // for undo delete action
        const restoreState = {
          currentSessionIndex: get().currentSessionIndex,
          sessions: get().sessions.slice(),
        };

        set(() => ({
          currentSessionIndex: nextIndex,
          sessions,
        }));

        showToast(
          Locale.Home.DeleteToast,
          {
            text: Locale.Home.Revert,
            onClick() {
              set(() => restoreState);
            },
          },
          5000,
        );
      },

      currentSession() {
        let index = get().currentSessionIndex;
        const sessions = get().sessions;

        if (index < 0 || index >= sessions.length) {
          index = Math.min(sessions.length - 1, Math.max(0, index));
          set(() => ({ currentSessionIndex: index }));
        }

        const session = sessions[index];

        return session;
      },

      onNewMessage(message) {
        get().updateCurrentSession((session) => {
          session.lastUpdate = Date.now();
        });
        get().updateStat(message);
        get().summarizeSession();
      },

      async onUserInput(content) {
        const session = get().currentSession();
        const modelConfig = session.mask.modelConfig;

        const userMessage: ChatMessage = createMessage({
          role: "user",
          content,
        });

        const botMessage: ChatMessage = createMessage({
          role: "assistant",
          streaming: true,
          id: userMessage.id! + 1,
          model: modelConfig.model,
        });

        const systemInfo = createMessage({
          role: "system",
          content: `IMPORTANT: You are a virtual assistant powered by the ${
            modelConfig.model
          } model, now time is ${new Date().toLocaleString()}}`,
          id: botMessage.id! + 1,
        });

        // get recent messages
        const systemMessages = [];
        // if user define a mask with context prompts, wont send system info
        if (session.mask.context.length === 0) {
          systemMessages.push(systemInfo);
        }

        const recentMessages = get().getMessagesWithMemory();
        const sendMessages = systemMessages.concat(
          recentMessages.concat(userMessage),
        );
        const sessionIndex = [get().currentSessionIndex];
        const messageIndex = get().currentSession().messages.length + 1;

        // save user's and bot's message
        get().updateCurrentSession((session) => {
          session.messages.push(userMessage);
          session.messages.push(botMessage);
        });

        // make request
        console.log("[User Input] ", sendMessages);
        api.llm.chat({
          messages: sendMessages,
          config: { ...modelConfig, stream: true },
          onUpdate(message) {
            botMessage.streaming = true;
            if (message) {
              botMessage.content = message;
            }
            set(() => ({}));
          },
          onFinish(message) {
            botMessage.streaming = false;
            if (message) {
              botMessage.content = message;
              get().onNewMessage(botMessage);
            }
            ChatControllerPool.remove(
              sessionIndex,
              botMessage.id ?? messageIndex,
            );
            set(() => ({}));
          },
          onError(error) {
            const isAborted = error.message.includes("aborted");
            botMessage.content =
              "\n\n" +
              prettyObject({
                error: true,
                message: error.message,
              });
            botMessage.streaming = false;
            userMessage.isError = !isAborted;
            botMessage.isError = !isAborted;

            set(() => ({}));
            ChatControllerPool.remove(
              sessionIndex,
              botMessage.id ?? messageIndex,
            );

            console.error("[Chat] failed ", error);
          },
          onController(controller) {
            // collect controller for stop/retry
            ChatControllerPool.addController(
              sessionIndex,
              botMessage.id ?? messageIndex,
              controller,
            );
          },
        });
      },

      getMemoryPrompt() {
        const session = get().currentSession();

        return {
          role: "system",
          content:
            session.memoryPrompt.length > 0
              ? Locale.Store.Prompt.History(session.memoryPrompt)
              : "",
          date: "",
        } as ChatMessage;
      },

      getMessagesWithMemory() {
        const session = get().currentSession();
        const modelConfig = session.mask.modelConfig;

        // wont send cleared context messages
        const clearedContextMessages = session.messages.slice(
          session.clearContextIndex ?? 0,
        );
        const messages = clearedContextMessages.filter((msg) => !msg.isError);
        const n = messages.length;

        const context = session.mask.context.slice();

        // long term memory
        if (
          modelConfig.sendMemory &&
          session.memoryPrompt &&
          session.memoryPrompt.length > 0
        ) {
          const memoryPrompt = get().getMemoryPrompt();
          context.push(memoryPrompt);
        }

        // get short term and unmemoried long term memory
        const shortTermMemoryMessageIndex = Math.max(
          0,
          n - modelConfig.historyMessageCount,
        );
        const longTermMemoryMessageIndex = session.lastSummarizeIndex;
        const mostRecentIndex = Math.max(
          shortTermMemoryMessageIndex,
          longTermMemoryMessageIndex,
        );
        const threshold = modelConfig.compressMessageLengthThreshold * 2;

        // get recent messages as many as possible
        const reversedRecentMessages = [];
        for (
          let i = n - 1, count = 0;
          i >= mostRecentIndex && count < threshold;
          i -= 1
        ) {
          const msg = messages[i];
          if (!msg || msg.isError) continue;
          count += msg.content.length;
          reversedRecentMessages.push(msg);
        }

        // concat
        const recentMessages = context.concat(reversedRecentMessages.reverse());

        return recentMessages;
      },

      updateMessage(
        sessionIndex: number,
        messageIndex: number,
        updater: (message?: ChatMessage) => void,
      ) {
        const sessions = get().sessions;
        const session = sessions.at(sessionIndex);
        const messages = session?.messages;
        updater(messages?.at(messageIndex));
        set(() => ({ sessions }));
      },

      resetSession() {
        get().updateCurrentSession((session) => {
          session.messages = [];
          session.memoryPrompt = "";
        });
      },

      summarizeSession() {
        const session = get().currentSession();

        // remove error messages if any
        const messages = session.messages;

        // should summarize topic after chating more than 50 words
        const SUMMARIZE_MIN_LEN = 50;
        if (
          session.topic === DEFAULT_TOPIC &&
          countMessages(messages) >= SUMMARIZE_MIN_LEN
        ) {
          const topicMessages = messages.concat(
            createMessage({
              role: "user",
              content: Locale.Store.Prompt.Topic,
            }),
          );
          api.llm.chat({
            messages: topicMessages,
            config: {
              model: "gpt-3.5-turbo",
            },
            onFinish(message) {
              get().updateCurrentSession(
                (session) =>
                  (session.topic =
                    message.length > 0 ? trimTopic(message) : DEFAULT_TOPIC),
              );
            },
          });
        }

        const modelConfig = session.mask.modelConfig;
        const summarizeIndex = Math.max(
          session.lastSummarizeIndex,
          session.clearContextIndex ?? 0,
        );
        let toBeSummarizedMsgs = messages
          .filter((msg) => !msg.isError)
          .slice(summarizeIndex);

        const historyMsgLength = countMessages(toBeSummarizedMsgs);

        if (historyMsgLength > modelConfig?.max_tokens ?? 4000) {
          const n = toBeSummarizedMsgs.length;
          toBeSummarizedMsgs = toBeSummarizedMsgs.slice(
            Math.max(0, n - modelConfig.historyMessageCount),
          );
        }

        // add memory prompt
        toBeSummarizedMsgs.unshift(get().getMemoryPrompt());

        const lastSummarizeIndex = session.messages.length;

        console.log(
          "[Chat History] ",
          toBeSummarizedMsgs,
          historyMsgLength,
          modelConfig.compressMessageLengthThreshold,
        );

        if (
          historyMsgLength > modelConfig.compressMessageLengthThreshold &&
          modelConfig.sendMemory
        ) {
          api.llm.chat({
            messages: toBeSummarizedMsgs.concat({
              role: "system",
              content: Locale.Store.Prompt.Summarize,
              date: "",
            }),
            config: { ...modelConfig, stream: true },
            onUpdate(message) {
              session.memoryPrompt = message;
            },
            onFinish(message) {
              console.log("[Memory] ", message);
              session.lastSummarizeIndex = lastSummarizeIndex;
            },
            onError(err) {
              console.error("[Summarize] ", err);
            },
          });
        }
      },

      updateStat(message) {
        get().updateCurrentSession((session) => {
          session.stat.charCount += message.content.length;
          // TODO: should update chat count and word count
        });
      },

      updateCurrentSession(updater) {
        const sessions = get().sessions;
        const index = get().currentSessionIndex;
        updater(sessions[index]);
        set(() => ({ sessions }));
      },

      clearAllData() {
        localStorage.clear();
        location.reload();
      },
    }),
    {
      name: StoreKey.Chat,
      version: 2,
      migrate(persistedState, version) {
        const state = persistedState as any;
        const newState = JSON.parse(JSON.stringify(state)) as ChatStore;

        if (version < 2) {
          newState.globalId = 0;
          newState.sessions = [];

          const oldSessions = state.sessions;
          for (const oldSession of oldSessions) {
            const newSession = createEmptySession();
            newSession.topic = oldSession.topic;
            newSession.messages = [...oldSession.messages];
            newSession.mask.modelConfig.sendMemory = true;
            newSession.mask.modelConfig.historyMessageCount = 4;
            newSession.mask.modelConfig.compressMessageLengthThreshold = 1000;
            newState.sessions.push(newSession);
          }
        }

        return newState;
      },
    },
  ),
);

// 文件夹类型
export interface ChatFolder {
  // 类型(folder.文件夹 chat.chat项)
  type?: string;
  // id
  id?: number | string;
  // 文件夹名称
  name?: string;
  // 文件夹ID
  folderId?: string;
  // chat数量
  chatCount?: number;
  // 是否展开
  expand?: boolean;
  // chat
  chat?: Array<ChatSession>;
}

export interface ChatFolderStore {
  // 当前选中的[folder, chat]index
  currentIndex: Array<number>;
  // 当前选中的[folder, chat]id
  currentId: Array<any>;
  // 全局FolderId
  globalFolderId: number;
  // 全局ChatId
  globalChatId: number;
  // 文件夹内容
  folder: ChatFolder[];
  // 文件个数
  folderCount?: number;
  // 重置Folder
  resetFolder: (newFolder: ChatFolder[]) => void;
  // 删除chat
  deleteChat: (folderIdx: number, chatIdx: number) => void;
  // 选中
  selectChat: (folderIdx: number, chatIdx: number) => void;
  // 移动
  moveChat: (from: Array<number>, to: Array<number>) => void;
  // 当前chat
  currentChat: () => any;
  // 更新当前chat
  updateCurrentChat: (updater: any) => void;
  getMemoryPrompt: () => ChatMessage;
  getMessagesWithMemory: () => any;
  // 更新chat message
  updateMessage: (
    index: Array<number>,
    updater: (message?: ChatMessage) => void,
  ) => void;
  summarizeChat: () => void;
  updateStat: (message: ChatMessage) => void;
  // 获取当前选中的数据ID
  getCurrentId: () => Array<any>;
  // 根据当前选中的数据ID，查找数据所在位置
  findCurrentIndex: () => Array<any>;
  // 重置chat信息
  resetChat: () => void;
  onNewMessage: (message: ChatMessage) => void;
  onUserInput: (content: string) => Promise<void>;
  // 新建chat
  newChat: (mask?: any) => void;
  // 新建folder
  newFolder: (folder: any) => void;
  // 移动Folder
  moveFolder: (from: number, to: number) => void;
  // 清除folder的chat
  clearFolderChat: (index: number) => void;
  // 清空Folder
  clearFolder: () => void;
  // 清除所有
  clearAllData: () => void;
}

const createEmptyFolder = (folder?: ChatFolder) => {
  let emptyFolder: ChatFolder = {
    // 类型
    type: "folder",
    // 文件夹名称
    name: "新分类",
    // chat数量
    chatCount: 0,
    // 是否展开
    expand: false,
    // chat
    chat: [createEmptySession()],
    ...folder,
  };
  return emptyFolder;
};

export const useChatFolderStore = create<any>()(
  persist(
    (set, get) => ({
      currentIndex: [0, 0],
      currentId: ["folder1", "chat1"],
      globalFolderId: 0,
      globalChatId: 0,
      folder: [
        // () => {
        //     let id = get().globalFolderId
        //     set({ globalFolderId: id + 1 })
        //     return createEmptyFolder({
        //         id,
        //         folderId: 'folder-' + id
        //     })
        // }
      ],
      // folderCount: 0,
      // 重置Folder
      resetFolder (newFolder: ChatFolder[]) {
        set({ folder: newFolder })
      },
      // 删除chat项
      deleteChat(folderIdx: number, chatIdx: number) {
        let folder = get().folder;
        let folderChat = folder[folderIdx].chat || [];

        const deletingLastSession = folderChat?.length === 1;
        const deletedSession = folderChat?.at(chatIdx);

        if (!deletedSession) return;

        const chat = folderChat?.slice();
        chat?.splice(chatIdx, 1);

        const currentIndex = get().currentIndex;
        const chatIndex = currentIndex[1];
        let nextIndex = Math.min(
          chatIndex - Number(chatIdx < chatIndex),
          chat?.length - 1,
        );

        if (deletingLastSession) {
          nextIndex = 0;
          chat.push(createEmptySession());
        }

        // for undo delete action
        const restoreState = {
          currentIndex: get().currentIndex,
          folder: folderChat.slice(),
        };

        set(() => ({
          currentIndex: [currentIndex[0], nextIndex],
          folder: chat,
        }));

        showToast(
          Locale.Home.DeleteToast,
          {
            text: Locale.Home.Revert,
            onClick() {
              set(() => restoreState);
            },
          },
          5000,
        );
      },
      // 选中chat项
      selectChat(folderIdx: number, chatIdx: number) {
        set({
          currentIndex: [folderIdx, chatIdx],
        });
      },
      // 移动chat项
      moveChat(from: Array<number>, to: Array<number>) {
        set((state: any) => {
          const { folder, currentIndex: oldIndex } = state;
          let oldItem = (folder[oldIndex[0]].chat || [])[oldIndex[1]];
          oldItem = JSON.parse(JSON.stringify(oldItem));

          const newFolder = [...folder];
          if (from[0] == to[0]) {
            // 同文件夹移动
            const chat = newFolder[from[0]].chat || [];
            let moveItem = chat[from[1]];
            chat?.splice(from[1], 1);
            chat?.splice(to[1], 0, moveItem);
            newFolder[from[0]].chat = chat;
          } else {
            // 不同文件夹移动
            const chat = newFolder[from[0]].chat || [];
            let moveItem = chat[from[1]];
            chat?.splice(from[1], 1);
            newFolder[from[0]].chat = chat;
            newFolder[from[0]].chatCount = chat.length;

            const chatTo = newFolder[to[0]].chat || [];
            chatTo?.splice(to[1], 0, moveItem);
            newFolder[to[0]].chat = chatTo;
            newFolder[to[0]].chatCount = chatTo.length;
          }
          let newIndex = oldIndex;
          let tempNewFolder: Array<any> = []
          // 1.先排除空位
          newFolder.map((it: any, idx: number) => {
            if (!it.chat.length && it.type === "chat") {
              // 如果为空，且为chat类型，就是删除
            } else {
              tempNewFolder.push(it)
            }
          });
          // 2.再计算新的index(选中的坐标)
          tempNewFolder.map((it: any, idx: number) => {
            it.chat.map((cit: any, cidx: number) => {
              if (cit.id == oldItem.id) {
                newIndex = [idx, cidx];
              }
            })
          })

          return {
            currentIndex: newIndex,
            folder: tempNewFolder
          };
        });
      },
      // 当前chat
      currentChat() {
        let currentIndex = get().currentIndex;
        const chat = get().folder[currentIndex[0]].chat || [];

        if (currentIndex[1] < 0 || currentIndex[1] >= chat.length) {
          currentIndex[1] = Math.min(
            chat.length - 1,
            Math.max(0, currentIndex[1]),
          );
          set(() => ({ currentIndex }));
        }

        return chat[currentIndex[1]];
      },
      // 更新当前chat
      updateCurrentChat(updater: any) {
        const currentIndex = get().currentIndex;

        const folder = get().folder;
        const chat = folder[currentIndex[0]].chat || [];
        updater(chat[currentIndex[1]]);
        folder[currentIndex[0]].chat = chat;

        set({ folder });
      },
      // 重置chat信息
      resetChat() {
        get().updateCurrentChat((chat: any) => {
          chat.messages = [];
          chat.memoryPrompt = "";
        });
      },
      onNewMessage(message: any) {
        get().updateCurrentChat((chat: any) => {
          chat.lastUpdate = Date.now();
        });
        get().updateStat(message);
        get().summarizeChat();
      },
      async onUserInput(content: any) {
        const chat = get().currentChat();
        const modelConfig = chat.mask.modelConfig;

        const userMessage: ChatMessage = createMessage({
          role: "user",
          content,
        });

        const botMessage: ChatMessage = createMessage({
          role: "assistant",
          streaming: true,
          id: userMessage.id! + 1,
          model: modelConfig.model,
        });

        const systemInfo = createMessage({
          role: "system",
          content: `IMPORTANT: You are a virtual assistant powered by the ${
            modelConfig.model
          } model, now time is ${new Date().toLocaleString()}}`,
          id: botMessage.id! + 1,
        });

        // get recent messages
        const systemMessages = [];
        // if user define a mask with context prompts, wont send system info
        if (chat.mask.context.length === 0) {
          systemMessages.push(systemInfo);
        }

        const recentMessages = get().getMessagesWithMemory();
        const sendMessages = systemMessages.concat(
          recentMessages.concat(userMessage),
        );
        const currentIndex = get().currentIndex;
        const messageIndex = get().currentChat().messages.length + 1;

        // save user's and bot's message
        get().updateCurrentChat((chat: any) => {
          chat.messages.push(userMessage);
          chat.messages.push(botMessage);
        });

        // make request
        console.log("[User Input] ", sendMessages);
        api.llm.chat({
          messages: sendMessages,
          config: { ...modelConfig, stream: true },
          onUpdate(message) {
            botMessage.streaming = true;
            if (message) {
              botMessage.content = message;
            }
            set(() => ({}));
          },
          onFinish(message) {
            botMessage.streaming = false;
            if (message) {
              botMessage.content = message;
              get().onNewMessage(botMessage);
            }
            ChatControllerPool.remove(currentIndex, botMessage.id ?? messageIndex);
            set(() => ({}));
          },
          onError(error) {
            const isAborted = error.message.includes("aborted");
            botMessage.content =
              "\n\n" +
              prettyObject({
                error: true,
                message: error.message,
              });
            botMessage.streaming = false;
            userMessage.isError = !isAborted;
            botMessage.isError = !isAborted;

            set(() => ({}));
            ChatControllerPool.remove(currentIndex, botMessage.id ?? messageIndex);

            console.error("[Chat] failed ", error);
          },
          onController(controller) {
            // collect controller for stop/retry
            ChatControllerPool.addController(
              currentIndex,
              botMessage.id ?? messageIndex,
              controller,
            );
          },
        });
      },
      getMemoryPrompt() {
        const chat = get().currentChat();

        return {
          role: "system",
          content:
            chat.memoryPrompt.length > 0
              ? Locale.Store.Prompt.History(chat.memoryPrompt)
              : "",
          date: "",
        } as ChatMessage;
      },
      getMessagesWithMemory() {
        const chat = get().currentChat();
        const modelConfig = chat.mask.modelConfig;

        // wont send cleared context messages
        const clearedContextMessages = chat.messages.slice(
          chat.clearContextIndex ?? 0,
        );
        const messages = clearedContextMessages.filter(
          (msg: any) => !msg.isError,
        );
        const n = messages.length;

        const context = chat.mask.context.slice();

        // long term memory
        if (
          modelConfig.sendMemory &&
          chat.memoryPrompt &&
          chat.memoryPrompt.length > 0
        ) {
          const memoryPrompt = get().getMemoryPrompt();
          context.push(memoryPrompt);
        }

        // get short term and unmemoried long term memory
        const shortTermMemoryMessageIndex = Math.max(
          0,
          n - modelConfig.historyMessageCount,
        );
        const longTermMemoryMessageIndex = chat.lastSummarizeIndex;
        const mostRecentIndex = Math.max(
          shortTermMemoryMessageIndex,
          longTermMemoryMessageIndex,
        );
        const threshold = modelConfig.compressMessageLengthThreshold * 2;

        // get recent messages as many as possible
        const reversedRecentMessages = [];
        for (
          let i = n - 1, count = 0;
          i >= mostRecentIndex && count < threshold;
          i -= 1
        ) {
          const msg = messages[i];
          if (!msg || msg.isError) continue;
          count += msg.content.length;
          reversedRecentMessages.push(msg);
        }

        // concat
        const recentMessages = context.concat(reversedRecentMessages.reverse());

        return recentMessages;
      },
      // 更新chat message(index:[folderIndex: number, chatIndex: number, messageIndex: number])
      updateMessage(index: Array<number>, updater: (message?: ChatMessage) => void) {
        let folder = get().folder;
        let chats = folder[index[0]].chat || [];
        let messages = chats[index[1]]?.messages;
        updater && updater(messages[index[2]]);

        chats[index[1]].messages = messages;
        folder[index[0]].chat = chats;
        set({ folder });
      },
      summarizeChat() {
        const chat = get().currentChat();

        // remove error messages if any
        const messages = chat.messages;

        // should summarize topic after chating more than 50 words
        const SUMMARIZE_MIN_LEN = 50;
        if (
          chat.topic === DEFAULT_TOPIC &&
          countMessages(messages) >= SUMMARIZE_MIN_LEN
        ) {
          const topicMessages = messages.concat(
            createMessage({
              role: "user",
              content: Locale.Store.Prompt.Topic,
            }),
          );
          api.llm.chat({
            messages: topicMessages,
            config: {
              model: "gpt-3.5-turbo",
            },
            onFinish(message) {
              get().updateCurrentChat(
                (chat: any) =>
                  (chat.topic =
                    message.length > 0 ? trimTopic(message) : DEFAULT_TOPIC),
              );
            },
          });
        }

        const modelConfig = chat.mask.modelConfig;
        const summarizeIndex = Math.max(
          chat.lastSummarizeIndex,
          chat.clearContextIndex ?? 0,
        );
        let toBeSummarizedMsgs = messages
          .filter((msg: any) => !msg.isError)
          .slice(summarizeIndex);

        const historyMsgLength = countMessages(toBeSummarizedMsgs);

        if (historyMsgLength > modelConfig?.max_tokens ?? 4000) {
          const n = toBeSummarizedMsgs.length;
          toBeSummarizedMsgs = toBeSummarizedMsgs.slice(
            Math.max(0, n - modelConfig.historyMessageCount),
          );
        }

        // add memory prompt
        toBeSummarizedMsgs.unshift(get().getMemoryPrompt());

        const lastSummarizeIndex = chat.messages.length;

        console.log(
          "[Chat History] ",
          toBeSummarizedMsgs,
          historyMsgLength,
          modelConfig.compressMessageLengthThreshold,
        );

        if (
          historyMsgLength > modelConfig.compressMessageLengthThreshold &&
          modelConfig.sendMemory
        ) {
          api.llm.chat({
            messages: toBeSummarizedMsgs.concat({
              role: "system",
              content: Locale.Store.Prompt.Summarize,
              date: "",
            }),
            config: { ...modelConfig, stream: true },
            onUpdate(message) {
              chat.memoryPrompt = message;
            },
            onFinish(message) {
              console.log("[Memory] ", message);
              chat.lastSummarizeIndex = lastSummarizeIndex;
            },
            onError(err) {
              console.error("[Summarize] ", err);
            },
          });
        }
      },
      updateStat(message: any) {
        get().updateCurrentChat((session: any) => {
          session.stat.charCount += message.content.length;
          // TODO: should update chat count and word count
        });
      },
      /**
       * 获取当前选中的数据ID
       */
      getCurrentId () {
        let folder = get().folder
        let currentIndex = get().currentIndex
        // 获取当前选中的folder
        let currentFolder = folder[currentIndex[0]];
        // 获取当前选中的folder id
        let currentFolderId = currentFolder.id;
        // 获取当前选中的chat id
        let currentChatId = (currentFolder?.chat || [])[currentIndex[1]].id;
        return [currentFolderId, currentChatId]
      },
      /**
       * 根据当前选中的数据ID，查找数据所在位置
       */
      findCurrentIndex (currentId: any) {
        let folder = get().folder
        let currentIndex = get().currentIndex
        currentId = currentId || get().getCurrentId()
        // 当前选中的新的chat坐标
        let newFolderIndex = currentIndex[0];
        let newChatIndex = currentIndex[1];
        folder.map((git: any, gidx: number) => {
          // if (git.id == currentId[0]) {
          git.chat.map((cit: any, cidx: number) => {
            if (cit.id == currentId[1]) {
              newChatIndex = cidx;
              newFolderIndex = gidx;
            }
          });
          // }
        });
        set({ currentIndex: [newFolderIndex, newChatIndex] });
        return [newFolderIndex, newChatIndex]
      },
      // 新建chat
      newChat(mask?: any) {
        const chat = createEmptySession();

        set(() => ({
          globalChatId: get().globalChatId + 1,
          globalFolderId: get().globalFolderId + 1,
        }));
        chat.id = "chat" + get().globalChatId;

        if (mask) {
          chat.mask = { ...mask };
          chat.topic = mask.name;
        }

        const folder = createEmptyFolder();
        folder.id = "folder" + get().globalFolderId;
        folder.type = "chat";
        folder.chat = [chat];
        folder.chatCount = 1;

        set((state: any) => ({
          currentIndex: [0, 0],
          folder: [folder].concat(state.folder),
        }));
      },
      // 新建folder
      newFolder(folder: any) {
        set({ globalFolderId: get().globalFolderId + 1 });
        let currentId = get().getCurrentId()
        let newFolder = createEmptyFolder({
          id: "folder" + get().globalFolderId,
          type: "folder",
          chat: [],
          chatCount: 0,
          ...folder,
        });
        set((state: any) => ({ folder: [newFolder].concat(state.folder) }));
        get().findCurrentIndex(currentId)
      },
      moveFolder(from: number, to: number) {
        set((state: any) => {
          const { folder, currentIndex: oldIndex } = state;

          // move the folder
          const newFolder = [...folder];
          const folderFrom = newFolder[from];
          newFolder.splice(from, 1);
          newFolder.splice(to, 0, folderFrom);

          // modify current session id
          let newIndex = oldIndex[0] === from ? to : oldIndex[0];
          if (oldIndex[0] > from && oldIndex[0] <= to) {
            newIndex -= 1;
          } else if (oldIndex[0] < from && oldIndex[0] >= to) {
            newIndex += 1;
          }

          return {
            currentIndex: [newIndex, oldIndex[1]],
            folder: newFolder,
          };
        });
      },
      // 清除folder的chat
      clearFolderChat(index: number) {
        let folder = get().folder;
        folder[index].chat = [];
        set({ folder });
      },
      // 清空Folder
      clearFolder() {
        set({
          folder: [],
          folderCount: 0,
        });
      },
      // 清除所有缓存
      clearAllData() {
        localStorage.clear();
        location.reload();
      },
    }),
    {
      name: StoreKey.ChatFolder,
      version: 1,
      // migrate (persistedState, version) {
      //     const state = persistedState as any;
      //     const newState = JSON.parse(JSON.stringify(state)) as ChatFolder;
      //     return newState
      // }
    },
  ),
);
