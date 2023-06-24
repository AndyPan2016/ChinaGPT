/**
 * GPT弹窗相关类型 TS
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年6月18日22:56:32 - 创建
 */

// 表单数据类型
export interface IGPTModalFormData {
  // 值
  value: any;
  // placeholder
  placeholder?: string;
  // 表单label
  label?: React.ReactNode;
  // 表单item类型(input.输入框 textarea.文本域 text.纯文本)
  formItemType: string;
}

// 弹窗类型
export interface IGPTModal {
  // 标题
  title?: React.ReactNode;
  titleIcon?: string;
  // open
  open: boolean;
  // 输入框类型
  // inputType?: string;
  // 表单数据
  formData?: Array<IGPTModalFormData>;
  // 自定义label图标名称
  // labelIconName?: string;
  // placeholder
  // placeholder?: string;
  // 确认按钮文本
  okText?: string;
  // 取消按钮文本
  cancelText?: string;
  // 确定事件
  onOk?: (data: any) => void;
  // 取消事件
  onCancel?: () => void;
}
