import { useDebouncedCallback } from "use-debounce";
import { useState, useRef, useEffect, useLayoutEffect } from "react";

import SendWhiteIcon from "../icons/send-white.svg";
import BrainIcon from "../icons/brain.svg";
import RenameIcon from "../icons/rename.svg";
import ExportIcon from "../icons/share.svg";
import ReturnIcon from "../icons/return.svg";
import CopyIcon from "../icons/copy.svg";
import LoadingIcon from "../icons/three-dots.svg";
import PromptIcon from "../icons/prompt.svg";
import MaskIcon from "../icons/mask.svg";
import MaxIcon from "../icons/max.svg";
import MinIcon from "../icons/min.svg";
import ResetIcon from "../icons/reload.svg";
import BreakIcon from "../icons/break.svg";
import SettingsIcon from "../icons/chat-settings.svg";

import LightIcon from "../icons/light.svg";
import DarkIcon from "../icons/dark.svg";
import AutoIcon from "../icons/auto.svg";
import BottomIcon from "../icons/bottom.svg";
import StopIcon from "../icons/pause.svg";

import {
  ChatMessage,
  SubmitKey,
  ChatSession,
  useChatStore,
  useChatFolderStore,
  BOT_HELLO,
  createMessage,
  useAccessStore,
  Theme,
  useAppConfig,
  DEFAULT_TOPIC,
} from "../store";

import {
  copyToClipboard,
  downloadAs,
  selectOrCopy,
  autoGrowTextArea,
  useMobileScreen,
} from "../utils";

import { Icon, IconWrap, IconGroup } from "./tools";

import dynamic from "next/dynamic";

import { ChatControllerPool } from "../client/controller";
import { Prompt, usePromptStore } from "../store/prompt";
import Locale from "../locales";

import { IconButton } from "./button";
import styles from "./home.module.scss";
import chatStyle from "./chat.module.scss";

import { ListItem, Modal } from "./ui-lib";
import { useLocation, useNavigate } from "react-router-dom";
import { LAST_INPUT_KEY, Path, REQUEST_TIMEOUT_MS } from "../constant";
import { Avatar } from "./emoji";
import { MaskAvatar, MaskConfig } from "./mask";
import { useMaskStore } from "../store/mask";
import { useCommand } from "../command";
import { prettyObject } from "../utils/format";
import { ExportMessageModal } from "./exporter";
import { ModifyModal } from "./modify-modal";

const Markdown = dynamic(async () => (await import("./markdown")).Markdown, {
  loading: () => <LoadingIcon />,
});

export function SessionConfigModel(props: { onClose: () => void }) {
  // const chatStore = useChatStore();
  const chatFolderStore = useChatFolderStore();
  const chat = chatFolderStore.currentChat();
  const maskStore = useMaskStore();
  const navigate = useNavigate();

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Context.Edit}
        onClose={() => props.onClose()}
        actions={[
          <IconButton
            key="reset"
            icon={<ResetIcon />}
            bordered
            text={Locale.Chat.Config.Reset}
            onClick={() => {
              if (confirm(Locale.Memory.ResetConfirm)) {
                chatFolderStore.updateCurrentChat(
                  (chat: ChatSession) => (chat.memoryPrompt = ""),
                );
              }
            }}
          />,
          <IconButton
            key="copy"
            icon={<CopyIcon />}
            bordered
            text={Locale.Chat.Config.SaveAs}
            onClick={() => {
              navigate(Path.Masks);
              setTimeout(() => {
                maskStore.create(chat.mask);
              }, 500);
            }}
          />,
        ]}
      >
        <MaskConfig
          mask={chat.mask}
          updateMask={(updater) => {
            const mask = { ...chat.mask };
            updater(mask);
            chatFolderStore.updateCurrentSession(
              (chat: ChatSession) => (chat.mask = mask),
            );
          }}
          shouldSyncFromGlobal
          extraListItems={
            chat.mask.modelConfig.sendMemory ? (
              <ListItem
                title={`${Locale.Memory.Title} (${chat.lastSummarizeIndex} of ${chat.messages.length})`}
                subTitle={chat.memoryPrompt || Locale.Memory.EmptyContent}
              ></ListItem>
            ) : (
              <></>
            )
          }
        ></MaskConfig>
      </Modal>
    </div>
  );
}

function PromptToast(props: {
  showToast?: boolean;
  showModal?: boolean;
  setShowModal: (_: boolean) => void;
}) {
  // const chatStore = useChatStore();
  const chatFolderStore = useChatFolderStore();
  const chat = chatFolderStore.currentChat();
  const context = chat?.mask?.context;

  return (
    <div className={chatStyle["prompt-toast"]} key="prompt-toast">
      {props.showToast && (
        <div
          className={chatStyle["prompt-toast-inner"] + " clickable"}
          role="button"
          onClick={() => props.setShowModal(true)}
        >
          <BrainIcon />
          <span className={chatStyle["prompt-toast-content"]}>
            {Locale.Context.Toast(context.length)}
          </span>
        </div>
      )}
      {props.showModal && (
        <SessionConfigModel onClose={() => props.setShowModal(false)} />
      )}
    </div>
  );
}

function useSubmitHandler() {
  const config = useAppConfig();
  const submitKey = config.submitKey;

  const shouldSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return false;
    if (e.key === "Enter" && e.nativeEvent.isComposing) return false;
    return (
      (config.submitKey === SubmitKey.AltEnter && e.altKey) ||
      (config.submitKey === SubmitKey.CtrlEnter && e.ctrlKey) ||
      (config.submitKey === SubmitKey.ShiftEnter && e.shiftKey) ||
      (config.submitKey === SubmitKey.MetaEnter && e.metaKey) ||
      (config.submitKey === SubmitKey.Enter &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.metaKey)
    );
  };

  return {
    submitKey,
    shouldSubmit,
  };
}

export function PromptHints(props: {
  prompts: Prompt[];
  onPromptSelect: (prompt: Prompt) => void;
}) {
  const noPrompts = props.prompts.length === 0;
  const [selectIndex, setSelectIndex] = useState(0);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectIndex(0);
  }, [props.prompts.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (noPrompts) return;
      if (e.metaKey || e.altKey || e.ctrlKey) {
        return;
      }
      // arrow up / down to select prompt
      const changeIndex = (delta: number) => {
        e.stopPropagation();
        e.preventDefault();
        const nextIndex = Math.max(
          0,
          Math.min(props.prompts.length - 1, selectIndex + delta),
        );
        setSelectIndex(nextIndex);
        selectedRef.current?.scrollIntoView({
          block: "center",
        });
      };

      if (e.key === "ArrowUp") {
        changeIndex(1);
      } else if (e.key === "ArrowDown") {
        changeIndex(-1);
      } else if (e.key === "Enter") {
        const selectedPrompt = props.prompts.at(selectIndex);
        if (selectedPrompt) {
          props.onPromptSelect(selectedPrompt);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.prompts.length, selectIndex]);

  if (noPrompts) return null;
  return (
    <div className={styles["prompt-hints"]}>
      {props.prompts.map((prompt, i) => (
        <div
          ref={i === selectIndex ? selectedRef : null}
          className={
            styles["prompt-hint"] +
            ` ${i === selectIndex ? styles["prompt-hint-selected"] : ""}`
          }
          key={prompt.title + i.toString()}
          onClick={() => props.onPromptSelect(prompt)}
          onMouseEnter={() => setSelectIndex(i)}
        >
          <div className={styles["hint-title"]}>{prompt.title}</div>
          <div className={styles["hint-content"]}>{prompt.content}</div>
        </div>
      ))}
    </div>
  );
}

function ClearContextDivider() {
  // const chatStore = useChatStore();
  const chatFolderStore = useChatFolderStore();

  return (
    <div
      className={chatStyle["clear-context"]}
      onClick={() =>
        chatFolderStore.updateCurrentChat(
          (chat: ChatSession) => (chat.clearContextIndex = undefined),
        )
      }
    >
      <div className={chatStyle["clear-context-tips"]}>
        {Locale.Context.Clear}
      </div>
      <div className={chatStyle["clear-context-revert-btn"]}>
        {Locale.Context.Revert}
      </div>
    </div>
  );
}

function useScrollToBottom() {
  // for auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollToBottom = () => {
    const dom = scrollRef.current;
    if (dom) {
      setTimeout(() => (dom.scrollTop = dom.scrollHeight), 1);
    }
  };

  // auto scroll
  useLayoutEffect(() => {
    autoScroll && scrollToBottom();
  });

  return {
    scrollRef,
    autoScroll,
    setAutoScroll,
    scrollToBottom,
  };
}

export function ChatActions(props: {
  showPromptModal: () => void;
  scrollToBottom: () => void;
  showPromptHints: () => void;
  onResend?: () => void;
  hitBottom: boolean;
}) {
  const config = useAppConfig();
  const navigate = useNavigate();
  // const chatStore = useChatStore();
  const chatFolderStore = useChatFolderStore();
  const isMobileScreen = useMobileScreen();

  // switch themes
  const theme = config.theme;
  function nextTheme() {
    // const themes = [Theme.Auto, Theme.Light, Theme.Dark];
    const themes = [Theme.Light, Theme.Dark];
    const themeIndex = themes.indexOf(theme);
    const nextIndex = (themeIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    config.update((config) => (config.theme = nextTheme));
  }

  // stop all responses
  const couldStop = ChatControllerPool.hasPending();
  const stopAll = () => ChatControllerPool.stopAll();

  return (
    <div
      className={
        chatStyle["chat-input-actions"] +
        (isMobileScreen ? " " + chatStyle["chat-input-actions-mobile"] : "")
      }
    >
      {/* GPT版本 */}
      <div className={chatStyle["chat-input-action"] + " clickable"}>
        <Icon name="icon-version-default.png" />
        <span className={chatStyle["chat-action-text"]}>GTP-3.5</span>
        <span className={chatStyle["chat-action-primarytext"]}>(20次)</span>
      </div>
      {/* 预设角色 */}
      <div className={chatStyle["chat-input-action"] + " clickable"}>
        <Icon name="icon-role-default.png" />
        <span className={chatStyle["chat-action-text"]}>预设角色</span>
      </div>
      {/* 黑暗模式 */}
      <div
        className={
          chatStyle["chat-input-action"] +
          " clickable" +
          (theme === Theme.Dark ? " " + chatStyle["active"] : "")
        }
        onClick={nextTheme}
      >
        {theme === Theme.Light ? (
          <Icon name="icon-mode-default.png" />
        ) : (
          <Icon name="icon-mode-primary.png" />
        )}
        <span className={chatStyle["chat-action-text"]}>黑暗模式</span>
      </div>
      {couldStop ? (
        // 停止
        <div className={chatStyle["chat-input-action"] + " clickable"}>
          <Icon name="icon-message-stop-default.png" />
          <span className={chatStyle["chat-action-text"]}>停止</span>
        </div>
      ) : (
        // 刷新
        <div
          className={chatStyle["chat-input-action"] + " clickable"}
          onClick={() => {
            props.onResend && props.onResend();
          }}
        >
          <Icon name="icon-refresh-default.png" />
          <span className={chatStyle["chat-action-text"]}>刷新</span>
        </div>
      )}

      {/* {couldStop && (
        <div
          className={`${chatStyle["chat-input-action"]} clickable`}
          onClick={stopAll}
        >
          <StopIcon />
        </div>
      )}
      {!props.hitBottom && (
        <div
          className={`${chatStyle["chat-input-action"]} clickable`}
          onClick={props.scrollToBottom}
        >
          <BottomIcon />
        </div>
      )}
      {props.hitBottom && (
        <div
          className={`${chatStyle["chat-input-action"]} clickable`}
          onClick={props.showPromptModal}
        >
          <SettingsIcon />
        </div>
      )}

      <div
        className={`${chatStyle["chat-input-action"]} clickable`}
        onClick={nextTheme}
      >
        {theme === Theme.Auto ? (
          <AutoIcon />
        ) : theme === Theme.Light ? (
          <LightIcon />
        ) : theme === Theme.Dark ? (
          <DarkIcon />
        ) : null}
      </div>

      <div
        className={`${chatStyle["chat-input-action"]} clickable`}
        onClick={props.showPromptHints}
      >
        <PromptIcon />
      </div>

      <div
        className={`${chatStyle["chat-input-action"]} clickable`}
        onClick={() => {
          navigate(Path.Masks);
        }}
      >
        <MaskIcon />
      </div>

      <div
        className={`${chatStyle["chat-input-action"]} clickable`}
        onClick={() => {
          chatFolderStore.updateCurrentChat((chat: ChatSession) => {
            if (chat.clearContextIndex === chat.messages.length) {
              chat.clearContextIndex = undefined;
            } else {
              chat.clearContextIndex = chat.messages.length;
              chat.memoryPrompt = ""; // will clear memory
            }
          });
        }}
      >
        <BreakIcon />
      </div> */}
    </div>
  );
}

export function Chat() {
  type RenderMessage = ChatMessage & { preview?: boolean };

  // const chatStore = useChatStore();
  // const [session, sessionIndex] = useChatStore((state) => [
  //   state.currentSession(),
  //   state.currentSessionIndex,
  // ]);
  const chatFolderStore = useChatFolderStore();
  const [currentChat, currentIndex] = useChatFolderStore((state) => [
    state.currentChat(),
    state.currentIndex,
  ]);

  const config = useAppConfig();
  const fontSize = config.fontSize;

  const [showExport, setShowExport] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { submitKey, shouldSubmit } = useSubmitHandler();
  const { scrollRef, setAutoScroll, scrollToBottom } = useScrollToBottom();
  const [hitBottom, setHitBottom] = useState(true);
  const [modifyOpen, setModifyOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>({});
  const isMobileScreen = useMobileScreen();
  const navigate = useNavigate();

  const onChatBodyScroll = (e: HTMLElement) => {
    const isTouchBottom = e.scrollTop + e.clientHeight >= e.scrollHeight - 100;
    setHitBottom(isTouchBottom);
  };

  // prompt hints
  const promptStore = usePromptStore();
  const [promptHints, setPromptHints] = useState<Prompt[]>([]);
  const onSearch = useDebouncedCallback(
    (text: string) => {
      setPromptHints(promptStore.search(text));
    },
    100,
    { leading: true, trailing: true },
  );

  const onPromptSelect = (prompt: Prompt) => {
    setPromptHints([]);
    inputRef.current?.focus();
    setTimeout(() => setUserInput(prompt.content), 60);
  };

  // auto grow input
  const [inputRows, setInputRows] = useState(2);
  const measure = useDebouncedCallback(
    () => {
      const rows = inputRef.current ? autoGrowTextArea(inputRef.current) : 1;
      const inputRows = Math.min(
        20,
        Math.max(2 + Number(!isMobileScreen), rows),
      );
      setInputRows(inputRows);
    },
    100,
    {
      leading: true,
      trailing: true,
    },
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(measure, [userInput]);

  // only search prompts when user input is short
  const SEARCH_TEXT_LIMIT = 30;
  const onInput = (text: string) => {
    setUserInput(text);
    const n = text.trim().length;

    // clear search results
    if (n === 0) {
      setPromptHints([]);
    } else if (!config.disablePromptHint && n < SEARCH_TEXT_LIMIT) {
      // check if need to trigger auto completion
      if (text.startsWith("/")) {
        let searchText = text.slice(1);
        onSearch(searchText);
      }
    }
  };

  const doSubmit = (userInput: string) => {
    if (userInput.trim() === "") return;
    setIsLoading(true);
    chatFolderStore.onUserInput(userInput).then(() => setIsLoading(false));
    localStorage.setItem(LAST_INPUT_KEY, userInput);
    setUserInput("");
    setPromptHints([]);
    if (!isMobileScreen) inputRef.current?.focus();
    setAutoScroll(true);
  };

  // stop response
  const onUserStop = (messageId: number) => {
    ChatControllerPool.stop(currentIndex, messageId);
  };

  useEffect(() => {
    chatFolderStore.updateCurrentChat((chat: ChatSession) => {
      const stopTiming = Date.now() - REQUEST_TIMEOUT_MS;
      chat?.messages?.forEach((msg: any) => {
        // check if should stop all stale messages
        if (msg.isError || new Date(msg.date).getTime() < stopTiming) {
          if (msg.streaming) {
            msg.streaming = false;
          }

          if (msg.content.length === 0) {
            msg.isError = true;
            msg.content = prettyObject({
              error: true,
              message: "empty response",
            });
          }
        }
      });

      // auto sync mask config from global config
      if (chat?.mask?.syncGlobalConfig) {
        console.log("[Mask] syncing from global, name = ", chat.mask.name);
        chat.mask.modelConfig = { ...config.modelConfig };
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // check if should send message
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // if ArrowUp and no userInput, fill with last input
    if (
      e.key === "ArrowUp" &&
      userInput.length <= 0 &&
      !(e.metaKey || e.altKey || e.ctrlKey)
    ) {
      setUserInput(localStorage.getItem(LAST_INPUT_KEY) ?? "");
      e.preventDefault();
      return;
    }
    if (shouldSubmit(e) && promptHints.length === 0) {
      doSubmit(userInput);
      e.preventDefault();
    }
  };
  const onRightClick = (e: any, message: ChatMessage) => {
    // copy to clipboard
    if (selectOrCopy(e.currentTarget, message.content)) {
      e.preventDefault();
    }
  };

  const findLastUserIndex = (messageId: number) => {
    // find last user input message and resend
    let lastUserMessageIndex: number | null = null;
    for (let i = 0; i < currentChat.messages.length; i += 1) {
      const message = currentChat.messages[i];
      if (message.id === messageId) {
        break;
      }
      if (message.role === "user") {
        lastUserMessageIndex = i;
      }
    }

    return lastUserMessageIndex;
  };

  const deleteMessage = (userIndex: number) => {
    chatFolderStore.updateCurrentChat((chat: ChatSession) =>
      chat.messages.splice(userIndex, 2),
    );
  };

  const onDelete = (botMessageId: number) => {
    const userIndex = findLastUserIndex(botMessageId);
    if (userIndex === null) return;
    deleteMessage(userIndex);
  };

  const onResend = (botMessageId?: number) => {
    let messages = currentChat.messages;
    let len = messages.length;
    let msgId = botMessageId ?? messages[len - 1].id;
    // find last user input message and resend
    const userIndex = findLastUserIndex(msgId);
    if (userIndex === null) return;

    setIsLoading(true);
    const content = messages[userIndex].content;
    deleteMessage(userIndex);
    chatFolderStore.onUserInput(content).then(() => setIsLoading(false));
    inputRef.current?.focus();
  };

  const context: RenderMessage[] = currentChat?.mask?.hideContext
    ? []
    : currentChat?.mask?.context?.slice();

  const accessStore = useAccessStore();

  if (
    context?.length === 0 &&
    currentChat?.messages?.at(0)?.content !== BOT_HELLO.content
  ) {
    const copiedHello = Object.assign({}, BOT_HELLO);
    if (!accessStore.isAuthorized()) {
      copiedHello.content = Locale.Error.Unauthorized;
    }
    context.push(copiedHello);
  }

  // clear context index = context length + index in messages
  const clearContextIndex =
    (currentChat?.clearContextIndex ?? -1) >= 0
      ? currentChat?.clearContextIndex! + context?.length
      : -1;

  // preview messages
  const messages = context
    ?.concat(currentChat?.messages as RenderMessage[])
    .concat(
      isLoading
        ? [
            {
              ...createMessage({
                role: "assistant",
                content: "……",
              }),
              preview: true,
            },
          ]
        : [],
    )
    .concat(
      userInput.length > 0 && config.sendPreviewBubble
        ? [
            {
              ...createMessage({
                role: "user",
                content: userInput,
              }),
              preview: true,
            },
          ]
        : [],
    );

  const [showPromptModal, setShowPromptModal] = useState(false);

  const renameSession = () => {
    const newTopic = prompt(Locale.Chat.Rename, currentChat.topic);
    if (newTopic && newTopic !== currentChat.topic) {
      chatFolderStore.updateCurrentChat(
        (chat: ChatSession) => (chat.topic = newTopic!),
      );
    }
  };

  const sureModify = (data: any) => {
    chatFolderStore.updateCurrentChat((chat: ChatSession) => {
      chat.topic = data?.name;
      // chat.mask?.name = data?.name
    });
    setModifyOpen(false);
  };

  const location = useLocation();
  const isChat = location.pathname === Path.Chat;
  const autoFocus = !isMobileScreen || isChat; // only focus in chat page

  useCommand({
    fill: setUserInput,
    submit: (text) => {
      doSubmit(text);
    },
  });

  return (
    <div className={styles.chat} key={currentChat?.id}>
      <div className="window-header">
        <div className="window-header-title">
          <div
            className={`window-header-main-title " ${styles["chat-body-title"]}`}
            onClickCapture={renameSession}
          >
            {!currentChat?.topic ? DEFAULT_TOPIC : currentChat?.topic}
          </div>
          <div className="window-header-sub-title">
            {Locale.Chat.SubTitle(currentChat?.messages?.length)}
          </div>
        </div>
        <div className="window-actions">
          {/* 修改分类弹窗 */}
          <ModifyModal
            title="修改会话名称"
            placeholder="请输入会话名称"
            formData={formData}
            open={modifyOpen}
            onCancel={() => {
              setModifyOpen(false);
            }}
            onOk={sureModify}
          />
          <div
            className={"window-action-button clickable" + " " + styles.mobile}
            title={Locale.Chat.Actions.ChatList}
            onClick={() => navigate(Path.Home)}
          >
            {/* <IconButton
              icon={<ReturnIcon />}
              bordered
              title={Locale.Chat.Actions.ChatList}
              onClick={() => navigate(Path.Home)}
            /> */}
            <IconWrap className="icon-wrap-52">
              <Icon name="icon-arrow-back-primary.png" />
            </IconWrap>
          </div>
          <div
            className="window-action-button clickable"
            onClick={() => {
              setFormData({ name: currentChat?.topic });
              setModifyOpen(true);
            }}
          >
            {/* <IconButton
              icon={<RenameIcon />}
              bordered
              onClick={renameSession}
            /> */}
            <IconWrap className="icon-wrap-52">
              <Icon name="icon-edit-folder-primary.png" />
            </IconWrap>
          </div>
          <div
            className="window-action-button clickable"
            onClick={() => {
              setShowExport(true);
            }}
          >
            {/* <IconButton
              icon={<ExportIcon />}
              bordered
              title={Locale.Chat.Actions.Export}
              onClick={() => {
                setShowExport(true);
              }}
            /> */}
            <IconWrap className="icon-wrap-52">
              <Icon name="icon-export-primary.png" />
            </IconWrap>
          </div>
          {!isMobileScreen && (
            <div
              className="window-action-button clickable"
              onClick={() => {
                config.update(
                  (config) => (config.tightBorder = !config.tightBorder),
                );
              }}
            >
              {/* <IconButton
                icon={config.tightBorder ? <MinIcon /> : <MaxIcon />}
                bordered
                onClick={() => {
                  config.update(
                    (config) => (config.tightBorder = !config.tightBorder),
                  );
                }}
              /> */}
              <IconWrap className="icon-wrap-52">
                {config.tightBorder ? (
                  <Icon name="icon-narrow-primary.png" />
                ) : (
                  <Icon name="icon-enlarge-primary.png" />
                )}
              </IconWrap>
            </div>
          )}
        </div>

        {/* <PromptToast
          showToast={!hitBottom}
          showModal={showPromptModal}
          setShowModal={setShowPromptModal}
        /> */}
      </div>

      <div
        className={styles["chat-body"]}
        ref={scrollRef}
        onScroll={(e) => onChatBodyScroll(e.currentTarget)}
        onMouseDown={() => inputRef.current?.blur()}
        onWheel={(e) => setAutoScroll(hitBottom && e.deltaY > 0)}
        onTouchStart={() => {
          inputRef.current?.blur();
          setAutoScroll(false);
        }}
      >
        {messages?.map((message, i) => {
          const isUser = message.role === "user";
          const showActions =
            !isUser &&
            i > 0 &&
            !(message.preview || message.content.length === 0);
          const showTyping = message.preview || message.streaming;

          const shouldShowClearContextDivider = i === clearContextIndex - 1;

          return (
            <>
              <div
                key={i}
                className={
                  isUser ? styles["chat-message-user"] : styles["chat-message"]
                }
              >
                <div className={styles["chat-message-container"]}>
                  <div className={chatStyle["chat-message-wrap"]}>
                    <div className={styles["chat-message-avatar"]}>
                      {message.role === "user" ? null : ( // <Avatar avatar={config.avatar} />
                        <MaskAvatar mask={currentChat.mask} />
                      )}
                    </div>
                    <div className={styles["chat-message-item"]}>
                      {/* {showActions && (
                        <div className={styles["chat-message-top-actions"]}>
                          {message.streaming ? (
                            <div
                              className={styles["chat-message-top-action"]}
                              onClick={() => onUserStop(message.id ?? i)}
                            >
                              {Locale.Chat.Actions.Stop}
                            </div>
                          ) : (
                            <>
                              <div
                                className={styles["chat-message-top-action"]}
                                onClick={() => onDelete(message.id ?? i)}
                              >
                                {Locale.Chat.Actions.Delete}
                              </div>
                              <div
                                className={styles["chat-message-top-action"]}
                                onClick={() => onResend(message.id ?? i)}
                              >
                                {Locale.Chat.Actions.Retry}
                              </div>
                            </>
                          )}

                          <div
                            className={styles["chat-message-top-action"]}
                            onClick={() => copyToClipboard(message.content)}
                          >
                            {Locale.Chat.Actions.Copy}
                          </div>
                        </div>
                      )} */}
                      <Markdown
                        className={
                          isUser ? "chat-message-md-user" : "chat-message-md"
                        }
                        fontSize="16"
                        followParent={true}
                        followColor={isUser ? "rgba(183, 189, 203, 1)" : "#FFF"}
                        content={message.content}
                        loading={
                          (message.preview || message.content.length === 0) &&
                          !isUser
                        }
                        onContextMenu={(e) => onRightClick(e, message)}
                        onDoubleClickCapture={() => {
                          if (!isMobileScreen) return;
                          setUserInput(message.content);
                        }}
                        parentRef={scrollRef}
                        defaultShow={i >= messages.length - 10}
                      />
                    </div>
                  </div>
                  {showTyping && (
                    <div className={styles["chat-message-status"]}>
                      {Locale.Chat.Typing}
                    </div>
                  )}
                  {!message.preview && (
                    <div className={styles["chat-message-actions"]}>
                      <div className={styles["chat-message-action-date"]}>
                        {message.date.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {shouldShowClearContextDivider && <ClearContextDivider />}
            </>
          );
        })}
      </div>

      <div className={styles["chat-input-panel"]}>
        <PromptHints prompts={promptHints} onPromptSelect={onPromptSelect} />

        <ChatActions
          showPromptModal={() => setShowPromptModal(true)}
          scrollToBottom={scrollToBottom}
          hitBottom={hitBottom}
          onResend={onResend}
          showPromptHints={() => {
            // Click again to close
            if (promptHints.length > 0) {
              setPromptHints([]);
              return;
            }

            inputRef.current?.focus();
            setUserInput("/");
            onSearch("");
          }}
        />
        <div className={styles["chat-input-panel-inner"]}>
          <textarea
            ref={inputRef}
            className={styles["chat-input"]}
            placeholder={Locale.Chat.Input(submitKey)}
            onInput={(e) => onInput(e.currentTarget.value)}
            value={userInput}
            onKeyDown={onInputKeyDown}
            onFocus={() => setAutoScroll(true)}
            onBlur={() => setAutoScroll(false)}
            rows={inputRows}
            autoFocus={autoFocus}
          />
          <IconButton
            icon={<SendWhiteIcon />}
            text={Locale.Chat.Send}
            className={styles["chat-input-send"]}
            type="primary"
            onClick={() => doSubmit(userInput)}
          />
        </div>
      </div>

      {showExport && (
        <ExportMessageModal onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}
