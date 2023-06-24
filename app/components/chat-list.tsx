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

// a little function to help us with reordering the result
function reorder<TItem>(
  list: TItem[],
  startIndex: number,
  endIndex: number,
): TItem[] {
  const result = [...list];
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
}

const reorderQuoteMap = (props: any) => {
  const { quoteMap, source, destination } = props;
  const current = [...quoteMap[source.droppableId]];
  const next = [...quoteMap[destination.droppableId]];
  const target = current[source.index];

  // moving to same list
  if (source.droppableId === destination.droppableId) {
    const reordered = reorder(current, source.index, destination.index);
    const result = {
      ...quoteMap,
      [source.droppableId]: reordered,
    };
    return result;
  }

  // moving to different list

  // remove from original
  current.splice(source.index, 1);
  // insert into next
  next.splice(destination.index, 0, target);

  const result = {
    ...quoteMap,
    [source.droppableId]: current,
    [destination.droppableId]: next,
  };

  return result;
};
// let lastChatType: any;
export function QuoteItem(props: any) {
  // 删除会话确认弹窗打开|关闭
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  // 删除会话数据
  const [deleteFormData, setDeleteFormData] = useState<Array<any>>([]);
  const navigate = useNavigate();
  const { quote, isDragging, isGroupedOver, provided, folderIndex, chatIndex } =
    props;
  const chatFolderStore = useChatFolderStore();
  const currentIndex = chatFolderStore.currentIndex;
  const config = useAppConfig();

  // 确认删除会话
  const sureDeleteChat = (res: any) => {
    chatFolderStore.deleteChat(res[0].folderIndex, res[0].chatIndex);
    setDeleteOpen(false);
  };

  return (
    <>
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
      <a
        className={
          listStyles["chat-item-wrap"] +
          (folderIndex == currentIndex[0] && chatIndex == currentIndex[1]
            ? " " + listStyles["current"]
            : "")
        }
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        data-is-dragging={isDragging}
        data-testid={quote.id}
        data-index={chatIndex}
        aria-label={`${quote.id} chat ${quote.topic}`}
      >
        <div
          className={listStyles["chat-item"]}
          onClickCapture={() => {
            chatFolderStore.selectChat(folderIndex, chatIndex);
            navigate(Path.Chat);
          }}
        >
          <div className={listStyles["chat-item-title"]}>{quote.topic}</div>
          <div className={listStyles["chat-item-info"]}>
            <div className={listStyles["chat-item-count"]}>
              {quote.messages.length}条会话
            </div>
            <div className={listStyles["chat-item-date"]}>
              {new Date(quote.lastUpdate).toLocaleString()}
            </div>
          </div>
        </div>
        <div
          className={listStyles["chat-item-delete"]}
          onClickCapture={() => {
            // chatFolderStore.deleteChat(folderIndex, chatIndex);
            let folder = chatFolderStore.folder;
            let chatName = folder[folderIndex].chat[chatIndex].topic;
            setDeleteFormData([
              {
                label: <Icon name="icon-version-primary.png" />,
                // value: '是否删除会话<span>' + chatName + '</span>？删除后将不可恢复',
                value: (
                  <span className={listStyles["delete-confirm-text"]}>
                    是否删除会话
                    <span className={listStyles["text-name"]}>{chatName}</span>
                    ？删除后将不可恢复
                  </span>
                ),
                folderIndex,
                chatIndex,
                formItemType: "text",
              },
            ]);
            setDeleteOpen(true);
          }}
        >
          {folderIndex == currentIndex[0] && chatIndex == currentIndex[1] ? (
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
    </>
  );
}

export function InnerList(props: any) {
  const { quotes, folderIndex, dropProvided } = props;
  const title = props.title ? (
    <h4 className={listStyles["list-title"]}>{props.title}</h4>
  ) : null;

  return (
    <>
      {title}
      <div className={listStyles["drop-zone"]} ref={dropProvided.innerRef}>
        <InnerQuoteList quotes={quotes} folderIndex={folderIndex} />
        {dropProvided.placeholder}
      </div>
    </>
  );
}

export function InnerQuoteList(props: any) {
  const { quotes, folderIndex } = props;
  return (
    <>
      {quotes?.map((quote: any, index: number) => (
        <Draggable key={quote.id} draggableId={quote.id} index={index}>
          {(dragProvided, dragSnapshot) => (
            <QuoteItem
              key={quote.id}
              quote={quote}
              folderIndex={folderIndex}
              chatIndex={index}
              isDragging={dragSnapshot.isDragging}
              isGroupedOver={Boolean(dragSnapshot.combineTargetFor)}
              provided={dragProvided}
            />
          )}
        </Draggable>
      ))}
    </>
  );
}

export function QuoteList(props: any) {
  const {
    ignoreContainerClipping,
    internalScroll,
    scrollContainerStyle,
    isDropDisabled,
    isCombineEnabled,
    folderIndex,
    listId,
    folderType,
    listType,
    style,
    quotes,
    title,
  } = props;
  return (
    <Droppable
      droppableId={listId || "LIST"}
      type={listType}
      ignoreContainerClipping={ignoreContainerClipping}
      isDropDisabled={isDropDisabled}
      isCombineEnabled={isCombineEnabled}
    >
      {(dropProvided, dropSnapshot) => (
        <div
          className={
            listStyles["div-wrapper"] +
            // (folderType == 'chat' && !quotes.length ? (' ' + listStyles['last-placeholder']) : '') +
            (dropSnapshot.isDraggingOver
              ? " " + listStyles["is-dragging-over"]
              : "") +
            (Boolean(isDropDisabled)
              ? " " + listStyles["is-drop-disabled"]
              : "") +
            (Boolean(dropSnapshot.draggingFromThisWith)
              ? " " + listStyles["is-dragging-from"]
              : "")
          }
          style={style}
          {...dropProvided.droppableProps}
        >
          {internalScroll ? (
            <div
              className={listStyles["scroll-container"]}
              style={scrollContainerStyle}
            >
              <InnerList
                quotes={quotes}
                title={title}
                folderIndex={folderIndex}
                dropProvided={dropProvided}
              />
            </div>
          ) : (
            <InnerList
              quotes={quotes}
              title={title}
              folderIndex={folderIndex}
              dropProvided={dropProvided}
            />
          )}
        </div>
      )}
    </Droppable>
  );
}

export function ChatList() {
  let [folder, currentIndex] = useChatFolderStore((state: any) => [
    state.folder,
    state.currentIndex,
  ]);
  const chatFolderStore = useChatFolderStore();

  const [groups, setGroups] = useState<any>({});
  const [groupChats, setGroupChats] = useState<Array<any>>([]);
  const [modifyOpen, setModifyOpen] = useState<boolean>(false);
  const [modifyIdx, setModifyIdx] = useState<number>(0);
  const [formData, setFormData] = useState<Array<any>>([]);

  // 初始化数据
  useEffect(() => {
    let tempGroups: any = {};
    let tempGroupChats: any = [];
    folder.map((fit: any) => {
      tempGroups[fit.id] = fit.chat;
      tempGroupChats.push(fit);
    });
    setGroups(tempGroups);
    setGroupChats(tempGroupChats);

    // console.info(tempGroups);
    // console.info(tempGroupChats);
  }, [folder, currentIndex]);

  /**
   * 拖拽结束
   * @param result void
   */
  const onDragEnd = (result: any) => {
    // console.info(result)
    if (result.destination) {
      // 从哪个位置
      let chatIndexFrom = result.source.index;
      let sourceDroppableId = result.source.droppableId;
      let folderIndexFrom = groupChats.findIndex(
        (it: any) => it.id == sourceDroppableId,
      );
      // 到的位置
      let chatIndex = result.destination.index;
      let droppableId = result.destination.droppableId;
      let folderIndex = groupChats.findIndex((it: any) => it.id == droppableId);
      if (sourceDroppableId == "board" && droppableId == "board") {
        // folder移动
        chatFolderStore.moveFolder(chatIndexFrom, chatIndex);
      } else {
        // chat移动
        chatFolderStore.moveChat(
          [folderIndexFrom, chatIndexFrom],
          [folderIndex, chatIndex],
        );
      }
    } else {
      // 拖出范围
    }
  };

  const sureModify = (data: any) => {
    chatFolderStore.updateFolderName(modifyIdx, data[0].value);
    setModifyOpen(false);
  };

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" type="COLUMN" direction="vertical">
          {(provided) => (
            <div
              className={listStyles["drop-container"]}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {groupChats.map((oit: any, index: number) => (
                <Groups
                  key={oit.id}
                  folderIndex={index}
                  folder={oit}
                  quotes={groups[oit.id]}
                  onModifyModel={(folderIdx: number) => {
                    setFormData([
                      {
                        value: folder[folderIdx].name,
                        placeholder: "请输入类型名称",
                        label: <Icon name="icon-folder-primary.png" />,
                        formItemType: "input",
                      },
                    ]);
                    setModifyIdx(folderIdx);
                    setModifyOpen(true);
                  }}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      {/* 修改分类弹窗 */}
      <GPTModal
        title="修改分类名称"
        // placeholder="请输入类型名称"
        formData={formData}
        open={modifyOpen}
        okText="修改"
        onCancel={() => {
          setModifyOpen(false);
        }}
        onOk={sureModify}
      />
    </>
  );
}

export function Groups(props: any) {
  const { quotes, folderIndex, folder, onModifyModel } = props;
  // 删除目录确认弹窗打开|关闭
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  // 删除目录数据
  const [deleteFormData, setDeleteFormData] = useState<Array<any>>([]);
  const chatFolderStore = useChatFolderStore();

  // 确认删除目录
  const sureDeleteFolder = (res: any) => {
    chatFolderStore.deleteFolder(res[0].folderIndex);
    setDeleteOpen(false);
  };

  return (
    <>
      <GPTModal
        open={deleteOpen}
        title="删除分类"
        titleIcon="icon-status-error.png"
        formData={deleteFormData}
        okText="删除"
        onCancel={() => {
          setDeleteOpen(false);
        }}
        onOk={sureDeleteFolder}
      />
      <Draggable draggableId={folder.id} index={folderIndex}>
        {(provided, snapshot) => (
          <div
            className={
              listStyles["drag-container"] +
              (folder.type == "chat" ? " " + listStyles["chat-folder"] : "") +
              (folder.expand ? " " + listStyles["folder-expand"] : "")
              // (folder.type == 'chat' && !quotes.length ? (' ' + listStyles['chat-folder-last']) : '')
            }
            ref={provided.innerRef}
            {...provided.draggableProps}
          >
            <div
              className={
                listStyles["drag-header"] +
                (snapshot.isDragging ? " " + listStyles["is-dragging"] : "")
              }
            >
              <h4
                className={listStyles["list-title"]}
                {...provided.dragHandleProps}
                aria-label={`${folder.id} quote list`}
              >
                <div className={listStyles["title-text-wrap"]}>
                  <span className={listStyles["title-text"]}>
                    <Icon
                      name="icon-folder-white.png"
                      className={listStyles["icon-folder"]}
                    />
                    {folder.name}
                  </span>
                  {folder.expand ? (
                    <span className={listStyles["title-chat-count"]}>
                      {folder.chat.length}个会话
                    </span>
                  ) : null}
                </div>
                <span className={listStyles["title-handle"]}>
                  {folder.type !== "static" ? (
                    <>
                      {/* 编辑Folder */}
                      <Icon
                        name="icon-edit-folder-white.png"
                        className={listStyles["icon-title-handle"]}
                        onClick={() => {
                          onModifyModel && onModifyModel(folderIndex);
                        }}
                      />
                      {/* 删除Folder */}
                      <Icon
                        name="icon-delete-white.png"
                        className={listStyles["icon-title-handle"]}
                        onClick={() => {
                          // if (confirm(Locale.Home.DeleteFolder)) {
                          //   chatFolderStore.deleteFolder(folderIndex);
                          // }
                          let folder = chatFolderStore.folder;
                          let folderName = folder[folderIndex].name;
                          setDeleteFormData([
                            {
                              label: <Icon name="icon-version-primary.png" />,
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
                              folderIndex,
                              formItemType: "text",
                            },
                          ]);
                          setDeleteOpen(true);
                        }}
                      />
                    </>
                  ) : null}
                  {/* 折叠Folder */}
                  {folder.expand ? (
                    <Icon
                      name="icon-arrow-up-white.png"
                      className={listStyles["icon-title-handle"]}
                      onClick={() => {
                        chatFolderStore.folderExpand(folderIndex);
                      }}
                    />
                  ) : (
                    <Icon
                      name="icon-arrow-down-white.png"
                      className={listStyles["icon-title-handle"]}
                      onClick={() => {
                        chatFolderStore.folderExpand(folderIndex);
                      }}
                    />
                  )}
                </span>
              </h4>
            </div>
            <QuoteList
              folderIndex={folderIndex}
              listId={folder.id}
              folderType={folder.type}
              listType="QUOTE"
              quotes={quotes}
            />
          </div>
        )}
      </Draggable>
    </>
  );
}
