/**
 * 公共工具类 TSX
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年6月10日21:40:13 - 创建
 */
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  IIcon,
  IIconWrap,
  IIconGroup,
  IActionSelectList,
  ISelectItem,
} from "./types";
import styles from "./tools.module.scss";
import "./tools.scss";
import { useMobileScreen } from "../../utils";
import { useAppConfig } from "../../store";

// 图标
export const Icon = ({
  // width,height默认24px
  name,
  src,
  icon,
  width = "24px",
  height = "24px",
  parentClassName,
  className,
  classNames,
  style,
  onClick,
}: IIcon) => {
  let img;
  if (name) {
    img = require("../../icons/png/" + name).default.src;
  } else if (src) {
    img = import(src);
  } else if (icon) {
    img = icon;
  }

  const [clas, setClas] = useState<any>();
  if (classNames) {
    let a = classNames.map((it: any) => {
      return " " + styles[it];
    });
  }

  return img ? (
    <img
      src={img}
      style={style ? { ...style } : {}}
      className={styles["icon-thumb"] + (className ? " " + className : "")}
      width={width}
      height={height}
      onClick={onClick}
    />
  ) : (
    <span
      className={
        (className ? styles[className] : "") +
        (parentClassName ? " " + parentClassName : "") +
        (classNames ? " " + classNames.join(" ") : "")
      }
    ></span>
  );
};

export const IconWrap = ({ children, className }: IIconWrap) => {
  const isMobileScreen = useMobileScreen();
  const config = useAppConfig();
  return (
    <span
      className={
        styles["icon-wrap"] +
        (" " + styles["tools-item-pc"]) +
        (className ? " " + styles[className] : "")
      }
    >
      {children}
    </span>
  );
};

export const IconGroup = ({ children }: IIconGroup) => {
  return <div className={styles["icon-group"]}>{children}</div>;
};

// 列表
export function ActionSelectList({
  children,
  className,
  classNames,
  data,
  type = "radio",
  onSelect,
}: IActionSelectList) {
  let [dataList, setDataList] = useState<Array<ISelectItem>>([]);

  useEffect(() => {
    if (data) {
      setDataList(data);
    }
  }, [data]);

  const onSelectItem = (item: ISelectItem, index: number) => {
    let tempDataList = dataList.slice();
    tempDataList.map((it: ISelectItem, idx: number) => {
      if (type === "multiple") {
        // 多选
        it.active = !!it.active;
      } else {
        // 单选
        it.active = index == idx;
      }
    });
    setDataList(tempDataList);
    let theSelect: Array<ISelectItem> = [];
    tempDataList.map((it: ISelectItem, idx: number) => {
      if (it.active) {
        theSelect.push(it);
      }
    });
    onSelect && onSelect(theSelect);
  };

  return (
    <div className={styles["action-select-list"]}>
      {dataList && dataList.length ? (
        <div className={styles["select-list-wrap"]}>
          {dataList.map((it: ISelectItem, idx: number) => {
            return (
              <div
                className={
                  styles["select-list-item"] +
                  (it.active ? " " + styles["select-item-active"] : "")
                }
                key={idx}
                onClick={() => {
                  onSelectItem(it, idx);
                }}
                title={it.text}
              >
                <span className={styles["select-item-wrap"]}>{it.text}</span>
              </div>
            );
          })}
        </div>
      ) : null}
      {children}
    </div>
  );
}
