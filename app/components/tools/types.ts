import { string } from "prop-types";

/**
 * 公共工具类相关类型 TS
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年6月10日21:46:06 - 创建
 */

export interface IIcon {
  // 名称，从icons/png去取存在的文件名称，名称|src|icon只传其一
  name?: string;
  // src，自定义文件全路径，名称|src|icon只传其一
  src?: string;
  // icon，自定义文件对象，名称|src|icon只传其一
  icon?: any;
  // 宽度
  width?: string | number;
  // 高度
  height?: string | number;
  // 自定义类名
  className?: string;
  // 点击事件
  onClick?: (e: any) => void;
}

export interface IIconWrap {
  children?: React.ReactNode;
  className?: string;
}

export interface IIconGroup extends IIconWrap {}
