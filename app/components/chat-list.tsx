import DeleteIcon from "../icons/delete.svg";
import BotIcon from "../icons/bot.svg";

import styles from "./home.module.scss";
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
  folder: ChatFolder[],
  children?: React.ReactNode
}) {
  
  // const [folder, setFolder] = useState<Array<any>>([
  //   { name: '文件夹1', id: 'folder0', open: false },
  //   { name: '文件夹2', id: 'folder1', open: false },
  //   { name: '文件夹3', id: 'folder2', open: false }
  // ])

  return (
    <>
      {
        props.folder.map((fit: any, fidx: number) => {
          return (
            <Draggable draggableId={fit.id} index={fidx} key={fidx}>
              {
                (provided) => {
                  return (
                    <div
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}>
                      <div
                        ref={provided.innerRef}>{fit.name}</div>
                        {props.children}
                    </div>
                  )
                }
              }
            </Draggable>
          )
        })
      }
      
    </>
  )
}

// 会话列表
export function ChatList(props: { narrow?: boolean }) {
  const [folder, currentIndex, selectChat, moveChat, moveFolder] = useChatFolderStore(
    (state) => [
      state.folder,
      state.currentIndex,
      state.selectChat,
      state.moveChat,
      state.moveFolder
    ],
  );
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
  }

  return (
    <DragDropContext onDragEnd={onDragEndFolder}>
      {/* folder */}
      <Droppable droppableId="chat-list">
        {
          (provided) => (
            <div
              className={styles["chat-list"]}
              ref={provided.innerRef}
              {...provided.droppableProps}>
              {
                folder.map((fit: ChatFolder, fidx: number) => {
                  return (
                    <Draggable
                      draggableId={fit.id + ''}
                      index={fidx}
                      key={fidx}>
                      {
                        (provided) => {
                          return (
                            <div
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}>
                              <div
                                ref={provided.innerRef}>{fit.name}</div>
                                {/* chat */}
                                <DragDropContext onDragEnd={onDragEnd}>
                                  <Droppable droppableId="chat-list-child">
                                    {
                                      (provided) => (
                                        <div
                                          className={styles["chat-list"]}
                                          ref={provided.innerRef}
                                          {...provided.droppableProps}>
                                          {
                                            fit.chat?.map((cit: ChatSession, cidx: number) => (
                                              <ChatItem
                                                title={cit.topic}
                                                time={new Date(cit.lastUpdate).toLocaleString()}
                                                count={cit.messages.length}
                                                key={cit.id}
                                                id={cit.id}
                                                index={cidx}
                                                selected={fidx == currentIndex[0] && cidx === currentIndex[1]}
                                                onClick={() => {
                                                  navigate(Path.Chat);
                                                  selectChat(fidx, cidx);
                                                }}
                                                onDelete={() => {
                                                  if (!props.narrow || confirm(Locale.Home.DeleteChat)) {
                                                    chatStore.deleteChat(fidx, cidx);
                                                  }
                                                }}
                                                narrow={props.narrow}
                                                mask={cit.mask}
                                              />
                                            ))
                                          }
                                        </div>
                                      )
                                    }
                                    
                                  </Droppable>
                                </DragDropContext>
                            </div>
                          )
                        }
                      }
                    </Draggable>
                  )
                })
              }
              {provided.placeholder}
            </div>
          )
        }
      </Droppable>
    </DragDropContext>
  );
}
