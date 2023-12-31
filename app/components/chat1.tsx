import { useDebouncedCallback } from "use-debounce";
import { useState, useRef, useEffect, useLayoutEffect } from "react";

import ResetIcon from "../icons/reload.svg";
import BrainIcon from "../icons/brain.svg";
import CopyIcon from "../icons/copy.svg";
import LoadingParentIcon from "../icons/three-dots-parent.svg";

// import SendWhiteIcon from "../icons/send-white.svg";
// import RenameIcon from "../icons/rename.svg";
// import ExportIcon from "../icons/share.svg";
// import ReturnIcon from "../icons/return.svg";
// import LoadingIcon from "../icons/three-dots.svg";
// import PromptIcon from "../icons/prompt.svg";
// import MaskIcon from "../icons/mask.svg";
// import MaxIcon from "../icons/max.svg";
// import MinIcon from "../icons/min.svg";
// import BreakIcon from "../icons/break.svg";
// import SettingsIcon from "../icons/chat-settings.svg";
// import LightIcon from "../icons/light.svg";
// import DarkIcon from "../icons/dark.svg";
// import AutoIcon from "../icons/auto.svg";
// import BottomIcon from "../icons/bottom.svg";
// import StopIcon from "../icons/pause.svg";

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
  useUserInfoStore
} from "../store";

import {
  copyToClipboard,
  downloadAs,
  selectOrCopy,
  autoGrowTextArea,
  useMobileScreen,
  hasLoginRedirect,
} from "../utils";

import { Icon, IconWrap, IconGroup, ActionSelectList } from "./tools";
import { ISelectItem } from "./tools/types";

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
import { GPTModal } from "./gpt-modal";
import { Popover, Empty } from "antd";
import { apiFetch, apiSocket } from "../api/api.fetch";
// import { Markdown, Markdown as MarkdownUser } from './markdown'

const Markdown = dynamic(
  async () => {
    const md = await import("./markdown");
    // setMDState(true)
    return md.Markdown;
  },
  {
    loading: () => (
      <span style={{ color: "#FFF" }}>
        <LoadingParentIcon />
      </span>
    ),
  },
);
const MarkdownUser = dynamic(
  async () => {
    const mdUser = (await import("./markdown")).Markdown;
    // setMDUserState(true)
    return mdUser;
  },
  {
    loading: () => (
      <span style={{ color: "rgba(183, 189, 203, 1)" }}>
        <LoadingParentIcon />
      </span>
    ),
  },
);

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
  onStop?: () => void;
  hitBottom: boolean;
  // refresh.显示刷新按钮 stop.显示停止按钮 其他.都不显示
  actionStatus?: string;
}) {
  const config = useAppConfig();
  const navigate = useNavigate();
  // const chatStore = useChatStore();
  const chatFolderStore = useChatFolderStore();
  const [currentChat] = useChatFolderStore((state: any) => [
    state.currentChat(),
  ]);
  const isMobileScreen = useMobileScreen();
  let [dataList, setDataList] = useState<Array<ISelectItem>>([
    { text: "GPT-4.0（0次）", value: 1, active: true },
    { text: "GPT-3.5（20次）", value: 2 },
    { text: "GPT-3.0（无限制）", value: 3 },
  ]);
  let [gptVersionP, setGPTVersionP] = useState<boolean>(false);
  let [currentGPT, setCurrentGPT] = useState<any>(dataList[0]);

  let [roleList, setRoleList] = useState<Array<ISelectItem>>([
    // { text: "大学生", value: 1, active: true },
    // { text: "建筑工人", value: 2 },
    // { text: "证券分析师", value: 3 },
  ]);
  let [roleP, setRoleP] = useState<boolean>(false);
  let [currentRole, setCurrentRole] = useState<any>({});
  // 刷新纪录最后一条message，停止时还原
  let [lastMessage, setLastMessage] = useState<any>()

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

  const handleGPTVisibleChange = (visible: any) => {
    setGPTVersionP(visible);
  };
  const handleRolePChange = (visible: any) => {
    setRoleP(visible);
  };

  const [lackOpen, setLackOpen] = useState<boolean>(false);
  const lackFormData = [
    {
      label: <Icon name="icon-version-primary.png" transTheme={true} />,
      value: "当前GPT-4.0 剩余配额不足，请明天再试",
      formItemType: "text",
    },
  ];

  // 获取角色列表
  const getRoleList = () => {
    apiFetch({
      url: '/portal/prompt/list',
      params: {
        pageNo: 1,
        pageSize: 50
      }
    }).then(res => {
      if (res.success) {
        let rows = res.rows || []
        if (rows.length) {
          let roleList: any = []
          rows.map((it: any) => {
            roleList.push({ text: it.title, value: it.id, role: it.role, active: false })
          })
          setCurrentRole(roleList[0])
          setRoleList(roleList)
        }
      }
    })
  }

  useEffect(() => {
    getRoleList()
  }, [])

  return (
    <div
      className={
        chatStyle["chat-input-actions"] +
        (isMobileScreen ? " " + chatStyle["chat-input-actions-mobile"] : "")
      }
    >
      <GPTModal
        open={lackOpen}
        title="配额不足"
        titleIcon="icon-status-error.png"
        formData={lackFormData}
        showCancel={false}
        onClose={() => {
          setLackOpen(false);
        }}
        onOk={() => {
          setLackOpen(false);
        }}
      />
      {/* GPT版本 */}
      <Popover
        content={
          <ActionSelectList
            data={dataList}
            onSelect={(item: ISelectItem[], callBack: any) => {
              if (item[0].value == 1) {
                setGPTVersionP(false);
                setLackOpen(true);
              } else {
                setCurrentGPT(item[0]);
                setGPTVersionP(false);
                callBack && callBack();
              }
            }}
          />
        }
        trigger="click"
        visible={gptVersionP}
        onVisibleChange={handleGPTVisibleChange}
      >
        <div
          className={
            chatStyle["chat-input-action"] +
            (gptVersionP ? " " + chatStyle["focus"] : "")
          }
        >
          <Icon
            name={
              gptVersionP
                ? "icon-version-white.png"
                : "icon-version-default.png"
            }
          />
          <span className={chatStyle["chat-action-text"]}>
            {currentGPT?.text}
          </span>
          {/* <span className={chatStyle["chat-action-primarytext"]}>(20次)</span> */}
        </div>
      </Popover>
      {/* 预设角色 */}
      <Popover
        content={
          <ActionSelectList
            data={roleList}
            onSelect={(item: ISelectItem[], callBack: any) => {
              setCurrentRole(item[0]);
              setRoleP(false);
              callBack && callBack();
            }}
          >
            <div
              className={chatStyle["customer-role"]}
              onClick={() => {
                navigate(Path.Role);
              }}
            >
              <Icon
                name="icon-add-primary.png"
                width="14px"
                height="14px"
                style={{ marginRight: "5px" }}
              />
              自定义角色
            </div>
          </ActionSelectList>
        }
        trigger="click"
        visible={roleP}
        onVisibleChange={handleRolePChange}
      >
        <div
          className={
            chatStyle["chat-input-action"] +
            (roleP ? " " + chatStyle["focus"] : "")
          }
        >
          <Icon
            name={roleP ? "icon-role-white.png" : "icon-role-default.png"}
          />
          <span className={chatStyle["chat-action-text"]}>
            {currentRole?.text}
          </span>
        </div>
      </Popover>
      {/* 黑暗模式 */}
      <div
        className={
          chatStyle["chat-input-action"] +
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
      {
        props.actionStatus === 'refresh' ? (
            currentChat?.messages && currentChat?.messages.length ? (
              <div
                className={chatStyle["chat-input-action"]}
                onClick={() => {
                  let lastMsg = currentChat?.messages[currentChat?.messages.length - 1]
                  if (lastMsg && lastMsg.role !== 'user') {
                    setLastMessage(lastMsg)
                  }
                  props.onResend && props.onResend();
                }}
              >
                <Icon name="icon-refresh-default.png" />
                <span className={chatStyle["chat-action-text"]}>刷新</span>
              </div>
          ) : null
        ) : null
      }
      {
        props.actionStatus === 'stop' ? (
          <div className={chatStyle["chat-input-action"]} onClick={() => {
            // stopAll()
            props.onStop && props.onStop();
          }}>
            <Icon name="icon-message-stop-default.png" />
            <span className={chatStyle["chat-action-text"]}>停止</span>
          </div>
        ) : null
      }
      {/* {couldStop ? (
        // 停止
        <div className={chatStyle["chat-input-action"]} onClick={() => {
          // let currentIndex = chatFolderStore.currentIndex.slice()
          // let lastMessageIdx = currentChat?.messages.length - 1
          // if (lastMessage) {
          //   chatFolderStore.updateMessage(currentIndex, (messages: any) => {
          //     messages[lastMessageIdx] = lastMessage
          //   })
          //   setLastMessage(null)
          // } else {
          //   chatFolderStore.updateMessage(currentIndex, (messages: any) => {
          //     // console.info(messages)
          //     let last = messages[lastMessageIdx]
          //     // if (last.role !== 'user') {
          //     //   messages.splice(lastMessageIdx, 1)
          //     // }
          //     console.info(last)
          //   })
          // }
          stopAll()
        }}>
          <Icon name="icon-message-stop-default.png" />
          <span className={chatStyle["chat-action-text"]}>停止</span>
        </div>
      ) : // 刷新
      currentChat?.messages && currentChat?.messages.length ? (
        <div
          className={chatStyle["chat-input-action"]}
          onClick={() => {
            let lastMsg = currentChat?.messages[currentChat?.messages.length - 1]
            if (lastMsg && lastMsg.role !== 'user') {
              setLastMessage(lastMsg)
            }
            props.onResend && props.onResend();
          }}
        >
          <Icon name="icon-refresh-default.png" />
          <span className={chatStyle["chat-action-text"]}>刷新</span>
        </div>
      ) : null} */}

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
  const useUserInfo = useUserInfoStore()
  const navigate = useNavigate();
  hasLoginRedirect({ useUserInfo, navigate })

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
  const [formData, setFormData] = useState<any>([]);
  const [modifyContOpen, setModifyContOpen] = useState<boolean>(false);
  const [formDataCont, setFormDataCont] = useState<any>([]);
  const [mdState, setMDState] = useState<boolean>(false);
  const [mdUserState, setMDUserState] = useState<boolean>(false);
  const isMobileScreen = useMobileScreen();
  const couldStop = ChatControllerPool.hasPending();
  // 当前socket对象
  let [socket, setSocket] = useState<any>({})
  // 当前socket返回的角色
  let [socketRole, setSocketRole] = useState<string>()
  // socket接收消息状态
  let [socketStatus, setSocketStatus] = useState<string>('')
  // 停止显示回复消息
  let [socketStop, setSocketStop] = useState<boolean>(false)

  // 初始化socket
  const installSocket = () => {
    if (currentChat) {
      let theSocket = apiSocket({
        sessionNo: currentChat.sessionNo || '230701223741001E0001',
        onMessage: (res: any) => {
          if (res.error) {
            // 错误
            renderChatMessage(res.error)
            setSocketStop(false)
          } else if (res.message) {
            // 有消息
            let role = res.message.role
            if (role) {
              setSocketRole(role)
            }
            let content = res.message.content || ''
            renderChatMessage(content)
            // 设置显示停止按钮
            setSocketStatus('stop')
          } else {
            // 结束
            setIsLoading(false);
            // 设置显示刷新按钮
            setSocketStatus('refresh')
            setSocketStop(false)
          }
        }
      })
      setSocket(theSocket)
    }
  }

  // 读取当前会话下的消息
  const readChatMessage = () => {
    apiFetch({
      url: '/portal/chat/listMessage',
      params: { sessionId: '230701223741001E0001' }
    }).then(res => {
      if (res.success) {
      }
    })
  }

  useEffect(() => {
    installSocket()
    // readChatMessage()
  }, [currentChat])

  // 显示当前回复消息内容
  const renderChatMessage = (content: string, isFinish?: boolean) => {
    if (!socketStop) {
      let chat = chatFolderStore.currentChat()
      let messages = chat.messages
      messages[messages.length - 1].content += content
    }
  }

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
    if (userInput.trim() === "" || couldStop) return;
    // 设置隐藏刷新按钮、显示停止按钮
    setSocketStatus('stop')
    setIsLoading(true);
    socket.send(userInput)
    // chatFolderStore.onUserInput(userInput, () => {
    //   socket.send(userInput)
    // })
    // chatFolderStore.onUserInput(userInput).then(() => setIsLoading(false));
    // localStorage.setItem(LAST_INPUT_KEY, userInput);
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

  // 刷新，重新发送最后一条
  const onResend = (botMessageId?: number) => {
    let messages = currentChat.messages;
    let len = messages.length;
    if (len) {
      let msgId = botMessageId ?? messages[len - 1].id;
      // find last user input message and resend
      const userIndex = findLastUserIndex(msgId);
      if (userIndex === null) return;
      // 设置隐藏刷新、停止按钮
      setSocketStatus('')
      setIsLoading(true);
      const content = messages[userIndex].content;
      deleteMessage(userIndex);
      // chatFolderStore.onUserInput(content).then(() => setIsLoading(false));
      chatFolderStore.onUserInput(content, () => {
        socket.send(content)
      })
      inputRef.current?.focus();
    }
  };
  
  // 停止渲染消息
  const onStop = () => {
    socket.close()
    setSocketStop(true)
    setSocketStatus('refresh')
    setTimeout(() => {
      installSocket()
    }, 200)
  }

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
  // 找到最后一条用户信息index，设置可重新编辑
  let lastUserMsgIdx: number | null = null;
  for (let i = 0; i < currentChat?.messages?.length; i += 1) {
    const message = currentChat.messages[i];
    if (message.role === "user") {
      lastUserMsgIdx = i + 1;
    }
  }

  const [showPromptModal, setShowPromptModal] = useState(false);

  const renameSession = () => {
    const newTopic = prompt(Locale.Chat.Rename, currentChat.topic);
    if (newTopic && newTopic !== currentChat.topic) {
      chatFolderStore.updateCurrentChat(
        (chat: ChatSession) => (chat.topic = newTopic!),
      );
    }
  };

  // 确认修改分类
  const sureModify = (data: any) => {
    chatFolderStore.updateCurrentChat((chat: ChatSession) => {
      chat.topic = data[0].value;
      // chat.mask?.name = data?.name
    });
    setModifyOpen(false);
  };

  // 确认修改会话内容
  const sureModifyCont = (data: any) => {
    let currentIndex = chatFolderStore.currentIndex.slice();
    currentIndex.push(data[0].index);
    chatFolderStore.updateMessage(currentIndex, (message: any) => {
      message.content = data[0].value;
    });
    setModifyContOpen(false);
    onResend();
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
    <>
      {currentChat ? (
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
                {Locale.Chat.SubTitle(currentChat?.charCount || 0)}
              </div>
            </div>
            <div className="window-actions">
              {/* 修改分类弹窗 */}
              <GPTModal
                title="修改会话名称"
                // placeholder="请输入会话名称"
                formData={formData}
                open={modifyOpen}
                okText="修改"
                onCancel={() => {
                  setModifyOpen(false);
                }}
                onOk={sureModify}
              />
              {/* 修改会话内容 */}
              <GPTModal
                title="修改会话内容"
                // placeholder="请输入会话内容"
                // labelIconName="icon-edit-folder-primary.png"
                // inputType="textarea"
                formData={formDataCont}
                open={modifyContOpen}
                okText="修改"
                onCancel={() => {
                  setModifyContOpen(false);
                }}
                onOk={sureModifyCont}
              />
              {/* 返回首页 */}
              <div
                className={
                  "window-action-button clickable" + " " + styles.mobile
                }
                title={Locale.Chat.Actions.ChatList}
                onClick={() => navigate(Path.Home)}
              >
                {/* <IconButton
                    icon={<ReturnIcon />}
                    bordered
                    title={Locale.Chat.Actions.ChatList}
                    onClick={() => navigate(Path.Home)}
                  /> */}
                {/* <IconWrap className="icon-wrap-52">
                    <Icon name="icon-arrow-back-primary.png" />
                  </IconWrap> */}
                <Icon classNames={["icon-customer", "icon-arrow-back"]} />
              </div>
              {/* 修改会话名称 */}
              <div
                className="window-action-button clickable"
                onClick={() => {
                  setFormData([
                    {
                      value: currentChat?.topic,
                      placeholder: "请输入会话名称",
                      label: (
                        <Icon
                          name="icon-edit-folder-primary.png"
                          transTheme={true}
                        />
                      ),
                      formItemType: "input",
                    },
                  ]);
                  setModifyOpen(true);
                }}
              >
                {/* <IconButton
                    icon={<RenameIcon />}
                    bordered
                    onClick={renameSession}
                  /> */}
                {/* <IconWrap className="icon-wrap-52">
                    <Icon name="icon-edit-folder-primary.png" />
                  </IconWrap> */}
                <Icon classNames={["icon-customer", "icon-edit"]} />
              </div>
              {/* 导出 */}
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
                {/* <IconWrap className="icon-wrap-52">
                    <Icon name="icon-export-primary.png" />
                  </IconWrap> */}
                <Icon classNames={["icon-customer", "icon-export"]} />
              </div>
              {/* PC端放大缩小Chat */}
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
                  {/* <IconWrap className="icon-wrap-52">
                      {config.tightBorder ? (
                        <Icon name="icon-narrow-primary.png" />
                      ) : (
                        <Icon name="icon-enlarge-primary.png" />
                      )}
                    </IconWrap> */}
                  {config.tightBorder ? (
                    <Icon classNames={["icon-customer", "icon-narrow"]} />
                  ) : (
                    <Icon classNames={["icon-customer", "icon-enlarge"]} />
                  )}
                </div>
              )}
            </div>
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
                i > 0 && !(message.preview || message.content.length === 0);
              const showTyping = message.preview || message.streaming;

              const shouldShowClearContextDivider = i === clearContextIndex - 1;

              return (
                <>
                  <div
                    key={i}
                    className={
                      isUser
                        ? styles["chat-message-user"]
                        : styles["chat-message"]
                    }
                  >
                    <div className={styles["chat-message-container"]}>
                      <div className={chatStyle["chat-message-wrap"]}>
                        <div className={styles["chat-message-avatar"]}>
                          {message.role === "user" ? null : ( // <Avatar avatar={config.avatar} />
                            <MaskAvatar mask={currentChat.mask} />
                          )}
                        </div>
                        {mdState}
                        <div
                          className={
                            styles["chat-message-item"] +
                            (isUser &&
                            mdUserState &&
                            showActions &&
                            lastUserMsgIdx == i
                              ? " " + styles["user-edit"]
                              : "") +
                            (!isUser && mdState && showActions
                              ? " " + styles["system-copy"]
                              : "")
                          }
                        >
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

                          {isUser ? (
                            <MarkdownUser
                              className="chat-message-md-user"
                              fontSize="16"
                              followParent={true}
                              followColor="rgba(183, 189, 203, 1)"
                              content={message.content}
                              loading={
                                (message.preview ||
                                  message.content.length === 0) &&
                                !isUser
                              }
                              renderBack={() => {
                                if (!mdUserState) {
                                  setMDUserState(true);
                                }
                              }}
                              onContextMenu={(e) => onRightClick(e, message)}
                              onDoubleClickCapture={() => {
                                if (!isMobileScreen) return;
                                setUserInput(message.content);
                              }}
                              parentRef={scrollRef}
                              defaultShow={i >= messages.length - 10}
                            />
                          ) : (
                            <Markdown
                              className="chat-message-md"
                              fontSize="16"
                              followParent={true}
                              followColor="#FFF"
                              content={message.content}
                              loading={
                                (message.preview ||
                                  message.content.length === 0) &&
                                !isUser
                              }
                              renderBack={() => {
                                if (!mdState) {
                                  setMDState(true);
                                }
                              }}
                              onContextMenu={(e) => onRightClick(e, message)}
                              onDoubleClickCapture={() => {
                                if (!isMobileScreen) return;
                                setUserInput(message.content);
                              }}
                              parentRef={scrollRef}
                              defaultShow={i >= messages.length - 10}
                            />
                          )}
                          {showActions && mdState && !isUser ? (
                            <span className={styles["chat-message-handle"]}>
                              <Icon
                                name="icon-copy-white.png"
                                onClick={() =>
                                  copyToClipboard(
                                    message.content,
                                    // "对话复制成功！",
                                  )
                                }
                              />
                            </span>
                          ) : null}
                          {showActions &&
                          mdUserState &&
                          isUser &&
                          lastUserMsgIdx == i ? (
                            <span
                              className={styles["chat-message-handle"]}
                              onClick={() => {
                                setFormDataCont([
                                  {
                                    value: message.content,
                                    index: i - 1,
                                    placeholder: "请输入会话内容",
                                    label: (
                                      <Icon
                                        name="icon-edit-folder-primary.png"
                                        transTheme={true}
                                      />
                                    ),
                                    formItemType: "textarea",
                                  },
                                ]);
                                setModifyContOpen(true);
                              }}
                            >
                              <Icon name="icon-edit-folder-primary.png" />
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {!message.preview || isLoading && (
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

          <div
            className={
              styles["chat-input-panel"] +
              (isMobileScreen ? " " + styles["chat-input-panel-mobile"] : "")
            }
          >
            <PromptHints
              prompts={promptHints}
              onPromptSelect={onPromptSelect}
            />

            <ChatActions
              actionStatus={socketStatus}
              showPromptModal={() => setShowPromptModal(true)}
              scrollToBottom={scrollToBottom}
              hitBottom={hitBottom}
              onResend={onResend}
              onStop={onStop}
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
              <div
                className={
                  styles["chat-input-send"] +
                  (userInput.trim() && !couldStop ? "" : " " + styles["send-disabled"])
                }
                onClick={() => doSubmit(userInput)}
              ></div>
              {/* <IconButton
                  icon={<SendWhiteIcon />}
                  text={Locale.Chat.Send}
                  className={styles["chat-input-send"]}
                  type="primary"
                  onClick={() => doSubmit(userInput)}
                /> */}
            </div>
          </div>

          {showExport && (
            <ExportMessageModal onClose={() => setShowExport(false)} />
          )}
        </div>
      ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无聊天" />
          </div>
        )
      }
    </>
  );
}
