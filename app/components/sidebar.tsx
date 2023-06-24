import { useEffect, useRef, useState } from "react";

import styles from "./home.module.scss";

import { Icon } from "./tools/index";

import Locale from "../locales";

import { useAppConfig, useChatFolderStore } from "../store";

import {
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  NARROW_SIDEBAR_WIDTH,
  Path,
  REPO_URL,
} from "../constant";

import { Link, useNavigate } from "react-router-dom";
import { useMobileScreen } from "../utils";
import dynamic from "next/dynamic";
import { showToast } from "./ui-lib";
import { GPTModal } from "./gpt-modal";

const ChatList = dynamic(async () => (await import("./chat-list")).ChatList, {
  loading: () => null,
});

function useHotKey() {
  // const chatStore = useChatFolderStore();
  // useEffect(() => {
  //   const onKeyDown = (e: KeyboardEvent) => {
  //     if (e.metaKey || e.altKey || e.ctrlKey) {
  //       const n = chatStore.sessions.length;
  //       const limit = (x: number) => (x + n) % n;
  //       const i = chatStore.currentSessionIndex;
  //       if (e.key === "ArrowUp") {
  //         chatStore.selectSession(limit(i - 1));
  //       } else if (e.key === "ArrowDown") {
  //         chatStore.selectSession(limit(i + 1));
  //       }
  //     }
  //   };
  //   window.addEventListener("keydown", onKeyDown);
  //   return () => window.removeEventListener("keydown", onKeyDown);
  // });
}

function useDragSideBar() {
  const limit = (x: number) => Math.min(MAX_SIDEBAR_WIDTH, x);

  const config = useAppConfig();
  const startX = useRef(0);
  const startDragWidth = useRef(config.sidebarWidth ?? 300);
  const lastUpdateTime = useRef(Date.now());

  const handleMouseMove = useRef((e: MouseEvent) => {
    if (Date.now() < lastUpdateTime.current + 50) {
      return;
    }
    lastUpdateTime.current = Date.now();
    const d = e.clientX - startX.current;
    const nextWidth = limit(startDragWidth.current + d);
    config.update((config) => (config.sidebarWidth = nextWidth));
  });

  const handleMouseUp = useRef(() => {
    startDragWidth.current = config.sidebarWidth ?? 300;
    window.removeEventListener("mousemove", handleMouseMove.current);
    window.removeEventListener("mouseup", handleMouseUp.current);
  });

  const onDragMouseDown = (e: MouseEvent) => {
    startX.current = e.clientX;

    window.addEventListener("mousemove", handleMouseMove.current);
    window.addEventListener("mouseup", handleMouseUp.current);
  };
  const isMobileScreen = useMobileScreen();
  const shouldNarrow =
    !isMobileScreen && config.sidebarWidth < MIN_SIDEBAR_WIDTH;

  useEffect(() => {
    const barWidth = shouldNarrow
      ? NARROW_SIDEBAR_WIDTH
      : limit(config.sidebarWidth ?? 300);
    const sideBarWidth = isMobileScreen ? "100vw" : `${barWidth}px`;
    document.documentElement.style.setProperty("--sidebar-width", sideBarWidth);
  }, [config.sidebarWidth, isMobileScreen, shouldNarrow]);

  return {
    onDragMouseDown,
    shouldNarrow,
  };
}

export function SideBar(props: { className?: string }) {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState<Array<any>>([]);
  const [modalOpenClear, setModalOpenClear] = useState<boolean>(false);
  const [formDataClear, setFormDataClear] = useState<Array<any>>([]);
  const chatStore = useChatFolderStore();

  // drag side bar
  const { onDragMouseDown, shouldNarrow } = useDragSideBar();
  const navigate = useNavigate();
  const config = useAppConfig();
  const isMobileScreen = useMobileScreen();

  // useHotKey();
  // 确认新增分类
  const sureAddFolder = (res: any) => {
    chatStore.newFolder({ name: res[0].value });
    setModalOpen(false);
  };

  // 清空会话
  const sureClear = (res: any) => {
    chatStore.clearFolder();
    setModalOpenClear(false);
  };

  return (
    <div
      className={`${styles.sidebar} ${props.className} ${
        shouldNarrow && styles["narrow-sidebar"]
      }`}
    >
      {/* 新增分类弹窗 */}
      <GPTModal
        title="新增分类"
        formData={formData}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
        }}
        onOk={sureAddFolder}
      />
      {/* 清空会话 */}
      <GPTModal
        title="清空会话"
        titleIcon="icon-status-error.png"
        formData={formDataClear}
        open={modalOpenClear}
        onCancel={() => {
          setModalOpenClear(false);
        }}
        onOk={sureClear}
      />
      <div className={styles["sidebar-header"]}>
        <div className={styles["sidebar-header-wrap"]}>
          <div className={styles["sidebar-title"]}>
            历史会话
            {!isMobileScreen ? (
              <div className={styles["sidebar-title-remark"]}>
                Your AI assistant list
              </div>
            ) : null}
          </div>
          <div className={styles["sidebar-tools"]}>
            {isMobileScreen ? (
              <>
                {/* 设置 */}
                <Link className={styles["tools-item"]} to={Path.Settings}>
                  {/* <IconSetWhite /> */}
                  <Icon name="icon-set-white.png" />
                </Link>
                {/* 清空 */}
                <span
                  className={styles["tools-item"]}
                  onClick={() => {
                    // if (confirm(Locale.Home.DeleteChat)) {
                    //   chatStore.deleteChat(
                    //     chatStore.currentIndex[0],
                    //     chatStore.currentIndex[1],
                    //   );
                    // }
                    setFormData([
                      {
                        value: "是否清空当前所有会话？清空后将不可恢复！",
                        label: <Icon name="icon-delete-primary.png" />,
                        formItemType: "text",
                      },
                    ]);
                    setModalOpenClear(true);
                  }}
                >
                  {/* <IconDelWhite /> */}
                  <Icon name="icon-delete-white.png" />
                </span>
                {/* 新建文件夹 */}
                <span
                  className={styles["tools-item"]}
                  onClick={() => {
                    // chatStore.newFolder({ name: "新分类" });
                    setFormDataClear([
                      {
                        // value: folder[folderIdx].name,
                        placeholder: "请输入新建分类目录名称",
                        label: <Icon name="icon-folder-primary.png" />,
                        formItemType: "input",
                      },
                    ]);
                    setModalOpen(true);
                  }}
                >
                  {/* <IconAddWhite /> */}
                  <Icon name="icon-add-white.png" />
                </span>
              </>
            ) : (
              // PC端
              // <span className={styles['tools-item'] + ' ' + styles['tools-item-pc']}
              //   onClick={() => {
              //     chatStore.newFolder({ name: '新分类' })
              //   }}>
              //     <Icon name="icon-add-primary.png" />
              // </span>
              <span
                onClick={() => {
                  // chatStore.newFolder({ name: "新分类" });
                  setFormData([
                    {
                      // value: folder[folderIdx].name,
                      placeholder: "请输入新建分类目录名称",
                      label: <Icon name="icon-folder-primary.png" />,
                      formItemType: "input",
                    },
                  ]);
                  setModalOpen(true);
                }}
              >
                <Icon classNames={["icon-customer icon-add"]} />
              </span>
            )}
          </div>
        </div>
        <div className={styles["sidebar-btn-new"]}>
          <span
            className={styles["sidebar-btn-text"]}
            onClick={() => {
              // 新建会话，直接开始
              chatStore.newChat();
              navigate(Path.Chat);
              // if (config.dontShowMaskSplashScreen) {
              //   chatStore.newSession();
              //   navigate(Path.Chat);
              // } else {
              //   navigate(Path.NewChat);
              // }
            }}
          >
            <Icon name="icon-add-white.png" />
            &nbsp;{shouldNarrow ? undefined : Locale.Home.NewChat}
          </span>
        </div>
        {/* <div className={styles["sidebar-sub-title"]}>
          Build your own AI assistant.
        </div>
        <div className={styles["sidebar-logo"] + " no-dark"}>
          <ChatGptIcon />
        </div> */}
      </div>

      {/* <div className={styles["sidebar-header-bar"]}>
        <IconButton
          icon={<MaskIcon />}
          text={shouldNarrow ? undefined : Locale.Mask.Name}
          className={styles["sidebar-bar-button"]}
          onClick={() => navigate(Path.NewChat, { state: { fromHome: true } })}
          shadow
        />
        <IconButton
          icon={<PluginIcon />}
          text={shouldNarrow ? undefined : Locale.Plugin.Name}
          className={styles["sidebar-bar-button"]}
          onClick={() => showToast(Locale.WIP)}
          shadow
        />
      </div> */}

      <div
        className={styles["sidebar-body"]}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            navigate(Path.Home);
          }
        }}
      >
        {/* <ChatList narrow={shouldNarrow} /> */}
        <ChatList />
      </div>

      {/* PC才显示 */}
      {!isMobileScreen ? (
        <div className={styles["sidebar-tail"]}>
          <div
            className={
              styles["sidebar-actions"] + " " + styles["sidebar-tools"]
            }
          >
            {/* 设置 */}
            <Link className={styles["tools-item"]} to={Path.Settings}>
              {/* <IconSetWhite /> */}
              <Icon name="icon-set-white.png" />
            </Link>
            {/* 清空 */}
            <span
              className={styles["tools-item"]}
              onClick={() => {
                // if (confirm(Locale.Home.DeleteChat)) {
                //   chatStore.deleteChat(
                //     chatStore.currentIndex[0],
                //     chatStore.currentIndex[1],
                //   );
                // }
                setFormDataClear([
                  {
                    value: "是否清空当前所有会话？清空后将不可恢复！",
                    label: <Icon name="icon-delete-primary.png" />,
                    formItemType: "text",
                  },
                ]);
                setModalOpenClear(true);
              }}
            >
              {/* <IconDelWhite /> */}
              <Icon name="icon-delete-white.png" />
            </span>
          </div>
        </div>
      ) : null}
      {/* <div className={styles["sidebar-tail"]}>
        <div className={styles["sidebar-actions"]}>
          <div className={styles["sidebar-action"] + " " + styles.mobile}>
            <IconButton
              icon={<CloseIcon />}
              onClick={() => {
                if (confirm(Locale.Home.DeleteChat)) {
                  chatStore.deleteSession(chatStore.currentSessionIndex);
                }
              }}
            />
          </div>
          <div className={styles["sidebar-action"]}>
            <Link to={Path.Settings}>
              <IconButton icon={<SettingsIcon />} shadow />
            </Link>
          </div>
          <div className={styles["sidebar-action"]}>
            <a href={REPO_URL} target="_blank">
              <IconButton icon={<GithubIcon />} shadow />
            </a>
          </div>
        </div>
        <div>
          <IconButton
            icon={<AddIcon />}
            text={shouldNarrow ? undefined : Locale.Home.NewChat}
            onClick={() => {
              if (config.dontShowMaskSplashScreen) {
                chatStore.newSession();
                navigate(Path.Chat);
              } else {
                navigate(Path.NewChat);
              }
            }}
            shadow
          />
        </div>
      </div> */}

      <div
        className={styles["sidebar-drag"]}
        onMouseDown={(e) => onDragMouseDown(e as any)}
      ></div>
    </div>
  );
}
