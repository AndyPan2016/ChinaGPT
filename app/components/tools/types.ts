import { string } from "prop-types";

/**
 * 公共工具类相关类型 TS
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年6月10日21:46:06 - 创建
 */

export interface IProps {
  // 子集
  children?: React.ReactNode;
  // 父级类名
  parentClassName?: any;
  // 类名
  className?: string;
  // 类名集合
  classNames?: Array<string>;
  // classNames?: string;
  // 自定义style
  style?: object;
}

export interface IIcon extends IProps {
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
  // 点击事件
  onClick?: (e: any) => void;
}

export interface IIconWrap extends IProps {}

export interface IIconGroup extends IProps {}

// 选项列表
export interface IActionSelectList extends IProps {
  // 数据
  data?: Array<ISelectItem>;
  // 选项类型(radio.单选 multiple.多选)
  type?: string;
  // 选中事件
  onSelect?: (item: Array<ISelectItem>) => void;
}

// 列表选项
export interface ISelectItem {
  // 文本
  text: string;
  // 选中状态
  active?: boolean;
  // 值
  value?: any;
}
