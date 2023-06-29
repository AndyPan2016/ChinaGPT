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
  // 自定义表单验证规则
  rules?: any;
  // (Form.Item的)依赖字段
  dependencies?: any;
  // 字段名
  fieldName?: string;
  // form.item后缀
  suffix?: React.ReactNode;
  // 是否需要发送验证码按钮
  sendCode?: boolean;
  // 发送验证码按钮关联的其他item项，用于判断按钮是否可用
  association?: any;
}

// 弹窗类型
export interface IGPTModal {
  // 弹窗loading状态
  loading?: boolean;
  // 表单项验证状态图标
  hasFeedback?: boolean;
  // 自定义弹窗类名
  className?: string;
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
  // 按钮位置切换
  btnSwitch?: boolean;
  // 确认按钮文本
  okText?: string;
  // 取消按钮文本
  cancelText?: string;
  // 确定事件
  onOk?: (data?: any) => void;
  // 取消事件
  onCancel?: () => void;
  // 关闭事件
  onClose?: () => void;
  children?: React.ReactNode | any;
  // 是否显示取消按钮
  showCancel?: boolean;
  // 发送验证码
  onSend?: (callBack: any) => void;
}
