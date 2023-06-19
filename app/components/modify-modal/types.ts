/**
 * 修改内容弹窗相关类型 TS
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年6月18日22:56:32 - 创建
 */

export interface IModifyModal {
  // 标题
  title?: React.ReactNode;
  // open
  open: boolean;
  // 表单数据
  formData?: any;
  // placeholder
  placeholder?: string;
  // 确定事件
  onOk?: (data: any) => void;
  // 取消事件
  onCancel?: () => void;
}
