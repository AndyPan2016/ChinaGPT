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

export function QuoteItem(props: any) {
  const { quote, isDragging, isGroupedOver, provided, style, isClone, index } =
    props;
  return (
    // <a
    //   className={listStyles["quote-item-wrap"]}
    //   ref={provided.innerRef}
    //   {...provided.draggableProps}
    //   {...provided.dragHandleProps}
    //   {...provided.draggableProps.style}
    //   data-is-dragging={isDragging}
    //   data-testid={quote.id}
    //   data-index={index}
    //   aria-label={`${quote.author.name} quote ${quote.content}`}
    // >
    //   <div className={listStyles["quote-content"]}>
    //     <div className={listStyles["block-quote"]}>{quote.content}</div>
    //   </div>
    // </a>
    <a
      className={listStyles["quote-item-wrap"]}
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      data-is-dragging={isDragging}
      data-testid={quote.id}
      data-index={index}
      aria-label={`${quote.id} quote ${quote.topic}`}
    >
      <div className={listStyles["quote-content"]}>
        <div className={listStyles["block-quote"]}>{quote.topic}</div>
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
            <QuoteItem
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

export function QuoteList(props: any) {
  const {
    ignoreContainerClipping,
    internalScroll,
    scrollContainerStyle,
    isDropDisabled,
    isCombineEnabled,
    listId,
    listType,
    style,
    quotes,
    title,
    useClone
  } = props;
  return (
    <Droppable
      droppableId={listId || "LIST"}
      type={listType}
      ignoreContainerClipping={ignoreContainerClipping}
      isDropDisabled={isDropDisabled}
      isCombineEnabled={isCombineEnabled}
      renderClone={
        useClone
          ? (provided, snapshot, descriptor) => (
              <QuoteItem
                quote={quotes[descriptor.source.index]}
                provided={provided}
                isDragging={snapshot.isDragging}
                isClone
              />
            )
          : undefined
      }>
      {(dropProvided, dropSnapshot) => (
        <div
          className={
            listStyles["div-wrapper"] +
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
          {...dropProvided.droppableProps}>
          {internalScroll ? (
            <div
              className={listStyles["scroll-container"]}
              style={scrollContainerStyle}
            >
              <InnerList
                quotes={quotes}
                title={title}
                dropProvided={dropProvided}
              />
            </div>
          ) : (
            <InnerList
              quotes={quotes}
              title={title}
              dropProvided={dropProvided}
            />
          )}
        </div>
      )}
    </Droppable>
  );
}

let columnsData: any = {
  "Jake": [{
      "id": "2",
      "content": "Sucking at something is the first step towards being sorta good at something.",
      "author": {
          "id": "1",
          "name": "Jake",
          "url": "http://adventuretime.wikia.com/wiki/Jake",
          "avatarUrl": "static/media/stories/static/media/jake-min.png",
          "colors": {
              "soft": "#FFFAE6",
              "hard": "rgba(9, 30, 66, 0.71)"
          }
      }
  },
  {
      "id": "3",
      "content": "You got to focus on what's real, man",
      "author": {
          "id": "1",
          "name": "Jake",
          "url": "http://adventuretime.wikia.com/wiki/Jake",
          "avatarUrl": "static/media/stories/static/media/jake-min.png",
          "colors": {
              "soft": "#FFFAE6",
              "hard": "rgba(9, 30, 66, 0.71)"
          }
      }
  }],
  "BMO": [{
      "id": "1",
      "content": "Sometimes life is scary and dark",
      "author": {
          "id": "2",
          "name": "BMO",
          "url": "http://adventuretime.wikia.com/wiki/BMO",
          "avatarUrl": "static/media/stories/static/media/bmo-min.png",
          "colors": {
              "soft": "#E3FCEF",
              "hard": "rgba(9, 30, 66, 0.71)"
          }
      }
  }],
  "Finn": [{
      "id": "4",
      "content": "Is that where creativity comes from? From sad biz?",
      "author": {
          "id": "3",
          "name": "Finn",
          "url": "http://adventuretime.wikia.com/wiki/Finn",
          "avatarUrl": "static/media/stories/static/media/finn-min.png",
          "colors": {
              "soft": "#DEEBFF",
              "hard": "rgba(9, 30, 66, 0.71)"
          }
      }
  },
  {
      "id": "5",
      "content": "Homies help homies. Always",
      "author": {
          "id": "3",
          "name": "Finn",
          "url": "http://adventuretime.wikia.com/wiki/Finn",
          "avatarUrl": "static/media/stories/static/media/finn-min.png",
          "colors": {
              "soft": "#DEEBFF",
              "hard": "rgba(9, 30, 66, 0.71)"
          }
      }
  },
  {
      "id": "8",
      "content": "People make mistakes. It's all a part of growing up and you never really stop growing",
      "author": {
          "id": "3",
          "name": "Finn",
          "url": "http://adventuretime.wikia.com/wiki/Finn",
          "avatarUrl": "static/media/stories/static/media/finn-min.png",
          "colors": {
              "soft": "#DEEBFF",
              "hard": "rgba(9, 30, 66, 0.71)"
          }
      }
  },
  {
      "id": "9",
      "content": "Don't you always call sweatpants 'give up on life pants,' Jake?",
      "author": {
          "id": "3",
          "name": "Finn",
          "url": "http://adventuretime.wikia.com/wiki/Finn",
          "avatarUrl": "static/media/stories/static/media/finn-min.png",
          "colors": {
              "soft": "#DEEBFF",
              "hard": "rgba(9, 30, 66, 0.71)"
          }
      }
  }],
  "Princess bubblegum": [{
      "id": "6",
      "content": "Responsibility demands sacrifice",
      "author": {
          "id": "4",
          "name": "Princess bubblegum",
          "url": "http://adventuretime.wikia.com/wiki/Princess_Bubblegum",
          "avatarUrl": "static/media/stories/static/media/princess-min.png",
          "colors": {
              "soft": "#EAE6FF",
              "hard": "rgba(9, 30, 66, 0.71)"
          }
      }
  },
  {
      "id": "7",
      "content": "That's it! The answer was so simple, I was too smart to see it!",
      "author": {
          "id": "4",
          "name": "Princess bubblegum",
          "url": "http://adventuretime.wikia.com/wiki/Princess_Bubblegum",
          "avatarUrl": "static/media/stories/static/media/princess-min.png",
          "colors": {
              "soft": "#EAE6FF",
              "hard": "rgba(9, 30, 66, 0.71)"
          }
      }
  },
  {
      "id": "10",
      "content": "I should not have drunk that much tea!",
      "author": {
          "id": "4",
          "name": "Princess bubblegum",
          "url": "http://adventuretime.wikia.com/wiki/Princess_Bubblegum",
          "avatarUrl": "static/media/stories/static/media/princess-min.png",
          "colors": {
              "soft": "#EAE6FF",
              "hard": "rgba(9, 30, 66, 0.71)"
          }
      }
  },
  {
      "id": "11",
      "content": "Please! I need the real you!",
      "author": {
          "id": "4",
          "name": "Princess bubblegum",
          "url": "http://adventuretime.wikia.com/wiki/Princess_Bubblegum",
          "avatarUrl": "static/media/stories/static/media/princess-min.png",
          "colors": {
              "soft": "#EAE6FF",
              "hard": "rgba(9, 30, 66, 0.71)"
          }
      }
  },
  {
      "id": "12",
      "content": "Haven't slept for a solid 83 hours, but, yeah, I'm good.",
      "author": {
          "id": "4",
          "name": "Princess bubblegum",
          "url": "http://adventuretime.wikia.com/wiki/Princess_Bubblegum",
          "avatarUrl": "static/media/stories/static/media/princess-min.png",
          "colors": {
              "soft": "#EAE6FF",
              "hard": "rgba(9, 30, 66, 0.71)"
          }
      }
  }]
}
let orderedData = ["Jake","BMO","Finn","Princess bubblegum"]

export function ChatList() {

  let [folder, currentIndex, selectChat, moveChat, moveFolder] =
    useChatFolderStore((state: any) => [
      state.folder,
      state.currentIndex,
      state.selectChat,
      state.moveChat,
      state.moveFolder,
    ]);
  const chatStore = useChatFolderStore();

  // const [columns, setColumns] = useState<any>(columnsData)
  // const [ordered, setOrdered] = useState<any>(orderedData)
  const [columns, setColumns] = useState<any>({})
  const [ordered, setOrdered] = useState<any>([])
  
  useEffect(() => {
    let tempColumns: any = {}
    let tempOrdered: any = []
    folder.map((fit: any) => {
      tempColumns[fit.id] = fit.chat
      tempOrdered.push(fit)
    })
    setColumns(tempColumns)
    setOrdered(tempOrdered)

    console.info(tempColumns)
    console.info(tempOrdered)
  }, [folder])
  
  const onDragEnd = (result: any): void => {
    if (result.combine) {
      if (result.type === 'COLUMN') {
        const shallow: string[] = [ordered];
        shallow.splice(result.source.index, 1);
        setOrdered(shallow);
        return;
      }

      const column = columns[result.source.droppableId];
      const withQuoteRemoved = [...column];
      withQuoteRemoved.splice(result.source.index, 1);
      const tempColumns = {
        ...columns,
        [result.source.droppableId]: withQuoteRemoved,
      };
      setColumns(tempColumns);
      return;
    }

    // dropped nowhere
    if (!result.destination) {
      return;
    }

    const source = result.source;
    const destination = result.destination;

    // did not move anywhere - can bail early
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // reordering column
    if (result.type === 'COLUMN') {
      const tempOrdered: string[] = reorder(
        ordered,
        source.index,
        destination.index,
      );

      setOrdered(tempOrdered);

      return;
    }

    const data = reorderQuoteMap({
      quoteMap: columns,
      source,
      destination,
    });

    setColumns(data);
  };

  return (
    <DragDropContext
      onDragEnd={onDragEnd}>
      <Droppable
        droppableId="board"
        type="COLUMN"
        direction="vertical"
      >
        {(provided) => (
          <div
            className={listStyles['drop-container']}
            ref={provided.innerRef}
            {...provided.droppableProps}>
            {ordered.map((oit: any, index: number) => (
              <Column
                key={oit.id}
                index={index}
                folder={oit}
                quotes={columns[oit.id]}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}

export function Column (props: any) {
  const { quotes, index, folder } = props;
  return (
    <Draggable draggableId={folder.id} index={index}>
      {(provided, snapshot) => (
        <div
          className={listStyles['drag-container'] + (folder.type == 'chat' ? (' ' + listStyles['chat-folder']) : '')}
          ref={provided.innerRef}
          {...provided.draggableProps}>
          <div
            className={listStyles['drag-header'] + (snapshot.isDragging ? (' ' + listStyles['is-dragging']) : '')}>
            <h4
              className={listStyles['list-title']}
              {...provided.dragHandleProps}
              aria-label={`${folder.id} quote list`}>
              {folder.name}
            </h4>
          </div>
          <QuoteList
            listId={folder.id}
            listType="QUOTE"
            style={{
              backgroundColor: snapshot.isDragging ? '#E3FCEF' : undefined,
            }}
            quotes={quotes}
          />
        </div>
      )}
    </Draggable>
  );
}

