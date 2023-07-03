import DeleteIcon from "../icons/delete.svg";
import BotIcon from "../icons/bot.svg";

import styles from "./home.module.scss";
import listStyles from "./chat-list.module.scss";
import {
  DragDropContext,
  Droppable,
  Draggable,
  OnDragEndResponder,
} from "@hello-pangea/dnd";
import { Modal } from "antd";

import {
  useChatFolderStore,
  ChatFolder,
  ChatSession,
  Theme,
  useAppConfig,
} from "../store";
import { Icon } from "./tools/index";

import Locale from "../locales";
import { Link, useNavigate } from "react-router-dom";
import { Path } from "../constant";
import { MaskAvatar } from "./mask";
import { Mask } from "../store/mask";
import { useRef, useEffect, useState, use } from "react";
import { GPTModal } from "./gpt-modal";
import { Empty } from "antd";


export function ChatList(props: any) {

  const {
    onDeleteChat,
    onModifyModel
  } = props;

  let [folder, currentIndex] = useChatFolderStore((state: any) => [
    state.folder,
    state.currentIndex,
  ]);
  const chatFolderStore = useChatFolderStore();
  const navigate = useNavigate();
  const config = useAppConfig();
  // 删除会话确认弹窗打开|关闭
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  // 删除会话数据
  const [deleteFormData, setDeleteFormData] = useState<Array<any>>([]);

  const [modifyOpen, setModifyOpen] = useState<boolean>(false);

  const [modifyFormData, setModifyFormData] = useState<Array<any>>([]);
  // 删除目录确认弹窗打开|关闭
  const [deleteFolderOpen, setDeleteFolderOpen] = useState<boolean>(false);
  // 删除目录数据
  const [deleteFolderFormData, setDeleteFolderFormData] = useState<Array<any>>([]);

  // 确认删除目录
  const sureDeleteFolder = (res: any) => {
    chatFolderStore.deleteFolder(res[0].folderIndex);
    setDeleteFolderOpen(false);
  };

  const sureModify = (data: any) => {
    // chatFolderStore.updateFolderName(modifyIdx, data[0].value);
    // setModifyOpen(false);

    onModifyModel && onModifyModel(data);
    setModifyOpen(false)
  };

  // 确认删除会话
  const sureDeleteChat = (res: any) => {
    // chatFolderStore.deleteChat(res[0].folderIndex, res[0].chatIndex);
    // setDeleteOpen(false);

    onDeleteChat && onDeleteChat(res[0].sessionNo)
  };

  return (
    <>
      {
        folder?.length ? (
          <>
            {
              folder.map((fit: any, fidx: number) => {
                return (
                  <div
                    className={
                      listStyles["drag-container"] +
                      (fit.type == "chat" ? " " + listStyles["chat-folder"] : "") +
                      (fit.expand ? " " + listStyles["folder-expand"] : "")
                    }>
                    {/* 文件夹，暂时不用 */}
                    {/* <div className={listStyles["drag-header"]}>
                      <h4 className={listStyles["list-title"]}>
                        <div className={listStyles["title-text-wrap"]}>
                          <span className={listStyles["title-text"]}>
                            <Icon
                              name="icon-folder-white.png"
                              className={listStyles["icon-folder"]}
                            />
                            {fit.name}
                          </span>
                          {fit.expand ? (
                            <span className={listStyles["title-chat-count"]}>
                              {fit.chat?.length || 0}个会话
                            </span>
                          ) : null}
                        </div>
                        <span className={listStyles["title-handle"]}>
                          {fit.type !== "static" ? (
                            <>
                              <Icon
                                name="icon-edit-folder-white.png"
                                className={listStyles["icon-title-handle"]}
                                onClick={() => {
                                  setModifyFormData([
                                    {
                                      value: fit.topic,
                                      placeholder: "请输入类型名称",
                                      label: (
                                        <Icon
                                          name="icon-folder-primary.png"
                                          transTheme={true}
                                        />
                                      ),
                                      formItemType: "input",
                                    },
                                  ]);
                                  setModifyOpen(true);
                                }}
                              />
                              <Icon
                                name="icon-delete-white.png"
                                className={listStyles["icon-title-handle"]}
                                onClick={() => {
                                  let folder = chatFolderStore.folder;
                                  let folderName = folder[fidx].name;
                                  setDeleteFolderFormData([
                                    {
                                      label: (
                                        <Icon
                                          name="icon-version-primary.png"
                                          transTheme={true}
                                        />
                                      ),
                                      value: (
                                        <span
                                          className={listStyles["delete-confirm-text"]}
                                        >
                                          是否删除分类
                                          <span className={listStyles["text-name"]}>
                                            {folderName}
                                          </span>
                                          ？删除后将不可恢复
                                        </span>
                                      ),
                                      fidx,
                                      fit,
                                      formItemType: "text",
                                    },
                                  ]);
                                  setDeleteFolderOpen(true);
                                }}
                              />
                            </>
                          ) : null}
                          {fit.expand ? (
                            <Icon
                              name="icon-arrow-up-white.png"
                              className={listStyles["icon-title-handle"]}
                              onClick={() => {
                                chatFolderStore.folderExpand(fidx);
                              }}
                            />
                          ) : (
                            <Icon
                              name="icon-arrow-down-white.png"
                              className={listStyles["icon-title-handle"]}
                              onClick={() => {
                                chatFolderStore.folderExpand(fidx);
                              }}
                            />
                          )}
                        </span>
                      </h4>
                    </div> */}
                    {/* 列表 */}
                    {/* <div className={listStyles["div-wrapper"]}> */}
                      <div className={listStyles["scroll-container"]}>
                        {
                          fit?.chat?.map((cit: any, cidx: number) => {
                            return (
                              <a className={
                                  listStyles["chat-item-wrap"] +
                                  (fidx == currentIndex[0] && cidx == currentIndex[1]
                                    ? " " + listStyles["current"]
                                    : "")
                                }>
                                <div
                                  className={listStyles["chat-item"]}
                                  onClickCapture={() => {
                                    chatFolderStore.selectChat(fidx, cidx, cit.sessionNo);
                                    navigate(Path.Chat);
                                  }}
                                >
                                  <div className={listStyles["chat-item-title"]}>{cit.topic}</div>
                                  <div className={listStyles["chat-item-info"]}>
                                    <div className={listStyles["chat-item-count"]}>
                                      {cit.charCount || 0}条会话
                                    </div>
                                    <div className={listStyles["chat-item-date"]}>
                                      {cit.createTime ? (new Date(cit.createTime).toLocaleString()) : ''}
                                    </div>
                                  </div>
                                </div>
                                <div
                                  className={listStyles["chat-item-delete"]}
                                  onClickCapture={() => {
                                    let folder = chatFolderStore.folder;
                                    let chat = folder[fidx].chat[cidx]
                                    let chatName = chat.topic;
                                    setDeleteFormData([
                                      {
                                        label: (
                                          <Icon name="icon-version-primary.png" transTheme={true} />
                                        ),
                                        // value: '是否删除会话<span>' + chatName + '</span>？删除后将不可恢复',
                                        value: (
                                          <span className={listStyles["delete-confirm-text"]}>
                                            是否删除会话
                                            <span className={listStyles["text-name"]}>{chatName}</span>
                                            ？删除后将不可恢复
                                          </span>
                                        ),
                                        fidx,
                                        cidx,
                                        sessionNo: chat.sessionNo,
                                        formItemType: "text",
                                      },
                                    ]);
                                    setDeleteOpen(true);
                                  }}
                                >
                                  {fidx == currentIndex[0] && cidx == currentIndex[1] ? (
                                    config.theme === "dark" ? (
                                      <Icon name="icon-delete-white.png" />
                                    ) : (
                                      <Icon name="icon-delete-primary.png" />
                                    )
                                  ) : (
                                    <Icon name="icon-delete-default.png" />
                                  )}
                                </div>
                              </a>
                            )
                          })
                        }
                      </div>
                    {/* </div> */}
                  </div>
                )
              })
            }
          </>
          
        ) : <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无会话" />
      }
      
      {/* 修改分类弹窗 */}
      <GPTModal
        title="修改分类名称"
        // placeholder="请输入类型名称"
        formData={modifyFormData}
        open={modifyOpen}
        okText="修改"
        onCancel={() => {
          setModifyOpen(false);
        }}
        onOk={sureModify}
      />
      {/* 删除chat弹窗 */}
      <GPTModal
        open={deleteOpen}
        title="删除会话"
        titleIcon="icon-status-error.png"
        formData={deleteFormData}
        okText="删除"
        onCancel={() => {
          setDeleteOpen(false);
        }}
        onOk={sureDeleteChat}
      />
      {/* 删除分类 */}
      <GPTModal
        open={deleteFolderOpen}
        title="删除分类"
        titleIcon="icon-status-error.png"
        formData={deleteFolderFormData}
        okText="删除"
        onCancel={() => {
          setDeleteOpen(false);
        }}
        onOk={sureDeleteFolder}
      />
    </>
  );
}

