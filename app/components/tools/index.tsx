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
import { useAppConfig, Theme } from "../../store";
import { Empty } from "antd";

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
  transTheme,
  onClick,
}: IIcon) => {
  const config = useAppConfig();
  const theme = config.theme;
  let img;
  if (name) {
    if (transTheme) {
      if (Theme.Dark === theme) {
        if (name.indexOf("primary")) {
          let tempName = name.replace("primary", "white");
          try {
            require("../../icons/png/" + tempName).default.src;
            name = tempName;
          } catch (error) {}
        }
      } else {
        if (name.indexOf("white")) {
          let tempName = name.replace("white", "primary");
          try {
            require("../../icons/png/" + tempName).default.src;
            name = tempName;
          } catch (error) {}
        }
      }
    }
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
    let tempDataList = JSON.parse(JSON.stringify(dataList));
    let theSelect: Array<ISelectItem> = [];
    let renderActive = () => {
      tempDataList.map((it: ISelectItem, idx: number) => {
        if (type === "multiple") {
          // 多选
          it.active = !!it.active;
        } else {
          // 单选
          it.active = index == idx;
        }
        if (it.active) {
          theSelect.push(it);
        }
      });
      // tempDataList.map((it: ISelectItem, idx: number) => {
      //   if (it.active) {
      //     theSelect.push(it);
      //   }
      // });
    };
    if (onSelect) {
      renderActive();
      onSelect(theSelect, () => {
        setDataList(tempDataList);
      });
    } else {
      renderActive();
      setDataList(tempDataList);
    }
    // onSelect && onSelect(theSelect);
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
      ) : <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无数据" />}
      {children}
    </div>
  );
}
