/**
 * 公共工具类 TSX
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年6月10日21:40:13 - 创建
 */
import dynamic from "next/dynamic";
import { IIcon, IIconWrap, IIconGroup } from "./types";
import styles from "./tools.module.scss";
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
  className,
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

  return (
    <img
      src={img}
      className={styles["icon-thumb"] + (className ? " " + className : "")}
      width={width}
      height={height}
      onClick={onClick}
    />
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
