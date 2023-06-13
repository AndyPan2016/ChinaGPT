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
import { useRef, useEffect, useState } from "react";

// 会话Item项
export function ChatItem(props: {
  onClick?: () => void;
  onDelete?: () => void;
  title: string;
  count: number;
  time: string;
  selected: boolean;
  id: number;
  index: number;
  narrow?: boolean;
  mask: Mask;
}) {
  const draggableRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (props.selected && draggableRef.current) {
      draggableRef.current?.scrollIntoView({
        block: "center",
      });
    }
  }, [props.selected]);
  return (
    <Draggable draggableId={`${props.id}`} index={props.index}>
      {(provided) => (
        <div
          className={`${styles["chat-item"]} ${
            props.selected && styles["chat-item-selected"]
          }`}
          onClick={props.onClick}
          ref={(ele) => {
            draggableRef.current = ele;
            provided.innerRef(ele);
          }}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          title={`${props.title}\n${Locale.ChatItem.ChatItemCount(
            props.count,
          )}`}
        >
          {props.narrow ? (
            <div className={styles["chat-item-narrow"]}>
              <div className={styles["chat-item-avatar"] + " no-dark"}>
                <MaskAvatar mask={props.mask} />
              </div>
              <div className={styles["chat-item-narrow-count"]}>
                {props.count}
              </div>
            </div>
          ) : (
            <>
              <div className={styles["chat-item-title"]}>{props.title}</div>
              <div className={styles["chat-item-info"]}>
                <div className={styles["chat-item-count"]}>
                  {Locale.ChatItem.ChatItemCount(props.count)}
                </div>
                <div className={styles["chat-item-date"]}>
                  {new Date(props.time).toLocaleString()}
                </div>
              </div>
            </>
          )}

          <div
            className={styles["chat-item-delete"]}
            onClickCapture={props.onDelete}
          >
            <DeleteIcon />
          </div>
        </div>
      )}
    </Draggable>
  );
}

// 会话列表文件夹
export function ChatListFolder(props: {
  folder: ChatFolder[];
  children?: React.ReactNode;
}) {
  // const [folder, setFolder] = useState<Array<any>>([
  //   { name: '文件夹1', id: 'folder0', open: false },
  //   { name: '文件夹2', id: 'folder1', open: false },
  //   { name: '文件夹3', id: 'folder2', open: false }
  // ])

  return (
    <>
      {props.folder.map((fit: any, fidx: number) => {
        return (
          <Draggable draggableId={fit.id} index={fidx} key={fidx}>
            {(provided) => {
              return (
                <div {...provided.draggableProps} {...provided.dragHandleProps}>
                  <div ref={provided.innerRef}>{fit.name}</div>
                  {props.children}
                </div>
              );
            }}
          </Draggable>
        );
      })}
    </>
  );
}

// 会话列表
export function ChatList1(props: { narrow?: boolean }) {
  const [folder, currentIndex, selectChat, moveChat, moveFolder] =
    useChatFolderStore((state: any) => [
      state.folder,
      state.currentIndex,
      state.selectChat,
      state.moveChat,
      state.moveFolder,
    ]);
  const chatStore = useChatFolderStore();
  const navigate = useNavigate();

  const onDragEnd: OnDragEndResponder = (result) => {
    const { destination, source } = result;
    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    moveChat([source.index], [destination.index]);
  };

  const onDragEndFolder: OnDragEndResponder = (result) => {
    const { destination, source } = result;
    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    moveFolder(source.index, destination.index);
  };

  return (
    <DragDropContext onDragEnd={onDragEndFolder}>
      {/* folder */}
      <Droppable droppableId="chat-list">
        {(provided) => (
          <div
            className={styles["chat-list"]}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {folder.map((fit: ChatFolder, fidx: number) => {
              return (
                <Draggable draggableId={fit.id + ""} index={fidx} key={fidx}>
                  {(provided) => {
                    return (
                      <div
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <div ref={provided.innerRef}>{fit.name}</div>
                        {/* chat */}
                        <DragDropContext onDragEnd={onDragEnd}>
                          <Droppable droppableId="chat-list-child">
                            {(provided) => (
                              <div
                                className={styles["chat-list"]}
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                              >
                                {fit.chat?.map(
                                  (cit: ChatSession, cidx: number) => (
                                    <ChatItem
                                      title={cit.topic}
                                      time={new Date(
                                        cit.lastUpdate,
                                      ).toLocaleString()}
                                      count={cit.messages.length}
                                      key={cit.id}
                                      id={cit.id}
                                      index={cidx}
                                      selected={
                                        fidx == currentIndex[0] &&
                                        cidx === currentIndex[1]
                                      }
                                      onClick={() => {
                                        navigate(Path.Chat);
                                        selectChat(fidx, cidx);
                                      }}
                                      onDelete={() => {
                                        if (
                                          !props.narrow ||
                                          confirm(Locale.Home.DeleteChat)
                                        ) {
                                          chatStore.deleteChat(fidx, cidx);
                                        }
                                      }}
                                      narrow={props.narrow}
                                      mask={cit.mask}
                                    />
                                  ),
                                )}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      </div>
                    );
                  }}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
const quotes = [
  {
    id: "1",
    content: "Sometimes life is scary and dark",
    author: "BMO",
  },
  {
    id: "2",
    content:
      "Sucking at something is the first step towards being sorta good at something.",
    author: "jake",
  },
  {
    id: "3",
    content: "You got to focus on what's real, man",
    author: "jake",
  },
  {
    id: "4",
    content: "Is that where creativity comes from? From sad biz?",
    author: "finn",
  },
  {
    id: "5",
    content: "Homies help homies. Always",
    author: "finn",
  },
  {
    id: "6",
    content: "Responsibility demands sacrifice",
    author: "princess",
  },
  {
    id: "7",
    content: "That's it! The answer was so simple, I was too smart to see it!",
    author: "princess",
  },
  {
    id: "8",
    content:
      "People make mistakes. It's all a part of growing up and you never really stop growing",
    author: "finn",
  },
  {
    id: "9",
    content: "Don't you always call sweatpants 'give up on life pants,' Jake?",
    author: "finn",
  },
  {
    id: "10",
    content: "I should not have drunk that much tea!",
    author: "princess",
  },
  {
    id: "11",
    content: "Please! I need the real you!",
    author: "princess",
  },
  {
    id: "12",
    content: "Haven't slept for a solid 83 hours, but, yeah, I'm good.",
    author: "princess",
  },
];

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

export function ChatList2() {
  const initialList = {
    id: "first-level",
    title: "top level",
    children: [
      ...quotes.slice(0, 2),
      {
        id: "second-level1",
        title: "second level",
        children: quotes.slice(3, 5),
      },
      {
        id: "second-level2",
        title: "second level",
        children: quotes.slice(6, 8),
      },
      ...quotes.slice(9, 9),
    ],
  };

  const [list, setList] = useState<any>(initialList);

  const onDragEnd = (result: any): void => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    if (result.type === "first-level") {
      const children = reorder(
        list.children,
        result.source.index,
        result.destination.index,
      );

      const theList = {
        ...list,
        children,
      };

      setList(theList);

      return;
    }

    if (result.type === "second-level") {
      const nested = list.children.filter((item: any) =>
        Object.prototype.hasOwnProperty.call(item, "children"),
      )[0];

      const updated = {
        ...nested,
        children: reorder(
          nested.children,
          result.source.index,
          result.destination.index,
        ),
      };

      const nestedIndex = list.children.indexOf(nested);
      const children = [...list.children];
      children[nestedIndex] = updated;

      const theList = {
        ...list,
        children,
      };

      setList(theList);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={listStyles["dd-context-wrap"]}>
        <QuoteList list={list} />
      </div>
    </DragDropContext>
  );
}

export function QuoteList(props: { list: any; level?: number }) {
  return (
    <div>
      <Droppable
        droppableId={props.list.id}
        type={props.list.id}
        key={props.list.id}
      >
        {(dropProvided, dropSnapshot) => (
          <div
            className={
              listStyles["context-container"] +
              " " +
              (dropSnapshot.isDraggingOver ? listStyles["draggingover"] : "")
            }
            ref={dropProvided.innerRef}
            {...dropProvided.droppableProps}
          >
            <h4 className={listStyles["list-title"]}>{props.list.title}</h4>
            {props.list.children.map((item: any, index: number) =>
              !Object.prototype.hasOwnProperty.call(item, "children") ? (
                <QuoteItem quote={item} index={index} key={index} />
              ) : (
                <Draggable draggableId={item.id} key={item.id} index={index}>
                  {(dragProvided: any) => {
                    return (
                      <div
                        className={listStyles["nested-container"]}
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                      >
                        <QuoteList list={item} level={(props.level || 0) + 1} />
                      </div>
                    );
                  }}
                </Draggable>
              ),
            )}
            {dropProvided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export function QuoteItem(props: { quote: any; index: number }) {
  return (
    <Draggable
      key={props.quote.id}
      draggableId={props.quote.id}
      index={props.index}
    >
      {(provided, snapshot) => (
        // <QuoteItem
        //   quote={props.quote}
        //   isDragging={snapshot.isDragging}
        //   provided={provided}
        // />
        <a
          className={listStyles["quote-item-wrap"]}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          {...provided.draggableProps.style}
          data-is-dragging={snapshot.isDragging}
          data-testid={props.quote.id}
          data-index={props.index}
          aria-label={`${props.quote.author.name} quote ${props.quote.content}`}
        >
          <div className={listStyles["quote-content"]}>
            <div className={listStyles["block-quote"]}>
              {props.quote.content}
            </div>
          </div>
        </a>
      )}
    </Draggable>
  );
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

export function QuoteItem1(props: any) {
  const { quote, isDragging, isGroupedOver, provided, style, isClone, index } =
    props;
  return (
    <a
      className={listStyles["quote-item-wrap"]}
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      {...provided.draggableProps.style}
      data-is-dragging={isDragging}
      data-testid={quote.id}
      data-index={index}
      aria-label={`${quote.author.name} quote ${quote.content}`}
    >
      <div className={listStyles["quote-content"]}>
        <div className={listStyles["block-quote"]}>{quote.content}</div>
      </div>
    </a>
  );
}

export function InnerList(props: any) {
  const { quotes, dropProvided } = props;
  const title = props.title ? (
    <h4 className={listStyles["list-title"]}>{props.title}</h4>
  ) : null;

  return (
    <div>
      {title}
      <div className={listStyles["drop-zone"]} ref={dropProvided.innerRef}>
        <InnerQuoteList quotes={quotes} />
        {dropProvided.placeholder}
      </div>
    </div>
  );
}

export function InnerQuoteList(props: any) {
  return (
    <>
      {props.quotes.map((quote: any, index: number) => (
        <Draggable key={quote.id} draggableId={quote.id} index={index}>
          {(dragProvided, dragSnapshot) => (
            <QuoteItem1
              key={quote.id}
              quote={quote}
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

export function QuoteList1(props: {
  ignoreContainerClipping;
  internalScroll;
  scrollContainerStyle;
  isDropDisabled;
  isCombineEnabled;
  listId;
  listType;
  style;
  quotes;
  title;
  useClone;
}) {
  return (
    <Droppable
      droppableId={props.listId || "LIST"}
      type={props.listType}
      ignoreContainerClipping={props.ignoreContainerClipping}
      isDropDisabled={props.isDropDisabled}
      isCombineEnabled={props.isCombineEnabled}
      renderClone={
        props.useClone
          ? (provided, snapshot, descriptor) => (
              <QuoteItem1
                quote={props.quotes[descriptor.source.index]}
                provided={provided}
                isDragging={snapshot.isDragging}
                isClone
              />
            )
          : undefined
      }
    >
      {(dropProvided, dropSnapshot) => (
        <div
          className={
            listStyles["div-wrapper"] +
            (dropSnapshot.isDraggingOver
              ? " " + listStyles["is-dragging-over"]
              : "") +
            (Boolean(props.isDropDisabled)
              ? " " + listStyles["is-drop-disabled"]
              : "") +
            (Boolean(dropSnapshot.draggingFromThisWith)
              ? " " + listStyles["is-dragging-from"]
              : "")
          }
          style={props.style}
          {...dropProvided.droppableProps}
        >
          {props.internalScroll ? (
            <div
              className={listStyles["scroll-container"]}
              style={props.scrollContainerStyle}
            >
              <InnerList
                quotes={props.quotes}
                title={props.title}
                dropProvided={dropProvided}
              />
            </div>
          ) : (
            <InnerList
              quotes={props.quotes}
              title={props.title}
              dropProvided={dropProvided}
            />
          )}
        </div>
      )}
    </Droppable>
  );
}
export function ChatList() {
  const initialList = {
    delta: [...quotes.slice(0, 2)],
    epsilon: [...quotes.slice(3, 6)],
  };
  const [list, setList] = useState<any>(initialList);

  const onDragEnd = (result): void => {
    // dropped nowhere
    if (!result.destination) {
      return;
    }

    const source = result.source;
    const destination = result.destination;

    setList(
      reorderQuoteMap({
        quoteMap: list,
        source,
        destination,
      }),
    );
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={listStyles["dd-context-wrap"]}>
        <div className={listStyles["column"]}>
          <QuoteList1
            title="delta"
            listId="delta"
            listType="card"
            isDropDisabled={false}
            quotes={list.delta}
          />
          <QuoteList1
            title="epsilon"
            listId="epsilon"
            listType="card"
            isDropDisabled={false}
            quotes={list.epsilon}
          />
        </div>
      </div>
    </DragDropContext>
  );
}
