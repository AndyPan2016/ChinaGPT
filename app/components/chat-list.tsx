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

import { useChatFolderStore, ChatFolder, ChatSession } from "../store";

import Locale from "../locales";
import { Link, useNavigate } from "react-router-dom";
import { Path } from "../constant";
import { MaskAvatar } from "./mask";
import { Mask } from "../store/mask";
import { useRef, useEffect, useState, use } from "react";

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
  const navigate = useNavigate();
  const { quote, isDragging, isGroupedOver, provided, folderIndex, chatIndex } =
    props;
  const chatFolderStore = useChatFolderStore();
  const currentIndex = chatFolderStore.currentIndex;

  return (
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
            {quote.messages.length}个会话
          </div>
          <div className={listStyles["chat-item-date"]}>
            {new Date(quote.lastUpdate).toLocaleString()}
          </div>
        </div>
      </div>
      <div
        className={listStyles["chat-item-delete"]}
        onClickCapture={() => {
          chatFolderStore.deleteChat(folderIndex, chatIndex);
        }}
      >
        <DeleteIcon />
      </div>
    </a>
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
      {quotes.map((quote: any, index: number) => (
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
    state.currentIndex
  ]);
  const chatFolderStore = useChatFolderStore();

  const [groups, setGroups] = useState<any>({});
  const [groupChats, setGroupChats] = useState<Array<any>>([]);
  // 当前选中的chatID
  const [currentId, setCurrentId] = useState<Array<any>>([]);

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

    console.info(tempGroups);
    console.info(tempGroupChats);
  }, [folder]);

  /**
   * 拖拽结束
   * @param result void
   */
  const onDragEnd1 = (result: any): void => {
    // 获取当前选中的folder
    let currentFolder = groupChats[currentIndex[0]];
    // 获取当前选中的folder id
    let currentFolderId = currentFolder.id;
    // 获取当前选中的chat id
    let currentChatId = currentFolder.chat[currentIndex[1]].id;
    setCurrentId([currentFolderId, currentChatId])
    if (result.combine) {
      if (result.type === "COLUMN") {
        const shallow = [groupChats];
        shallow.splice(result.source.index, 1);
        setGroupChats(shallow);
        return;
      }

      const group = groups[result.source.droppableId];
      const withQuoteRemoved = [...group];
      withQuoteRemoved.splice(result.source.index, 1);
      const tempGroups = {
        ...groups,
        [result.source.droppableId]: withQuoteRemoved,
      };
      setGroups(tempGroups);
      return;
    }

    // dropped nowhere
    if (!result.destination) {
      return;
    }

    const source = result.source;
    const destination = result.destination;

    // did not move anywhere - can bail early
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // reordering column
    if (result.type === "COLUMN") {
      const tempGroupChats: string[] = reorder(
        groupChats,
        source.index,
        destination.index,
      );

      resetCurrentIndex(result, tempGroupChats);
      setGroupChats(tempGroupChats);
      return;
    }

    const data = reorderQuoteMap({
      quoteMap: groups,
      source,
      destination,
    });
    // 重置数据
    resetGroups(data, result);
  };

  /**
   * 拖拽结束
   * @param result void
   */
  const onDragEnd = (result: any) => {
    // console.info(result)
    if (result.destination) {
      // 从哪个位置
      let chatIndexFrom = result.source.index
      let sourceDroppableId = result.source.droppableId
      let folderIndexFrom = groupChats.findIndex((it: any) => it.id == sourceDroppableId)
      // 到的位置
      let chatIndex = result.destination.index
      let droppableId = result.destination.droppableId
      let folderIndex = groupChats.findIndex((it: any) => it.id == droppableId)
      if (sourceDroppableId == 'board' && droppableId == 'board') {
        // folder移动
        chatFolderStore.moveFolder(chatIndexFrom, chatIndex)
      } else {
        // chat移动
        chatFolderStore.moveChat([folderIndexFrom, chatIndexFrom], [folderIndex, chatIndex])
      }
    } else {
      // 拖出范围
    }
  }

  /**
   * 重置当前选中的chat坐标
   */
  const resetCurrentIndex = (result: any, tempGroupChats: any) => {
    // 当前选中的新的chat坐标
    let newFolderId = currentIndex[0];
    let newChatId = currentIndex[1];
    tempGroupChats.map((git: any, gidx: number) => {
      // if (git.id == currentId[0]) {
      git.chat.map((cit: any, cidx: number) => {
        if (cit.id == currentId[1]) {
          newChatId = cidx;
          newFolderId = gidx;
        }
      });
      // }
    });
    chatFolderStore.selectChat(newFolderId, newChatId);
  };

  /**
   * 重置数据
   * @param data 重置的数据
   */
  const resetGroups = (data: any, result: any) => {
    // let chatCount = 0
    // // let lastChatTypeTemp
    // groupChats.map((oit: any, oidx: number) => {
    //   if (oit.type === 'chat') {
    //     chatCount++
    //     // lastChatTypeTemp = oit
    //   }
    // })
    // if (chatCount > 1) {
    let tempGroups: any = {};
    let tempGroupChats: any = [];
    groupChats.map((oit: any, oidx: number) => {
      let hasDelete = false;
      if (!data[oit.id].length && oit.type === "chat") {
        // 如果为空，且为chat类型，就是删除
        hasDelete = true;
      } else {
        tempGroupChats.push(oit);
      }
      if (!hasDelete) {
        tempGroups[oit.id] = data[oit.id];
      }
    });
    // 同步groupChats的chat
    tempGroupChats.map((git: any, gidx: number) => {
      git.chat = data[git.id];
    });
    resetCurrentIndex(result, tempGroupChats);
    setGroupChats(tempGroupChats);
    setGroups(tempGroups);
    console.info(tempGroups)
    console.info(tempGroupChats)
    //   // lastChatType = undefined
    // } else {
    //   // lastChatType = lastChatTypeTemp
    //   setGroups(data)
    // }
  };

  return (
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
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

export function Groups(props: any) {
  const { quotes, folderIndex, folder } = props;
  return (
    <Draggable draggableId={folder.id} index={folderIndex}>
      {(provided, snapshot) => (
        <div
          className={
            listStyles["drag-container"] +
            (folder.type == "chat" ? " " + listStyles["chat-folder"] : "")
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
              {folder.name}
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
  );
}
