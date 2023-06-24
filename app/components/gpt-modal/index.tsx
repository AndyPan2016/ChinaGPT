/**
 * 修改内容弹窗 TSX
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年6月18日22:55:16 - 创建
 */

import { useEffect, useState } from "react";
// import { Modal, Form, Input, Button } from "antd";
import { Form, Input, Button } from "antd";
import { Modal } from "../ui-lib";
const { TextArea } = Input;
import { IGPTModal, IGPTModalFormData } from "./types";
import styles from "./index.module.scss";
import { Icon } from "../tools/index";
import { useMobileScreen } from "../../utils";

export const GPTModal = ({
  title,
  titleIcon = "icon-wran-min.png",
  // inputType,
  open,
  // placeholder,
  formData,
  // labelIconName,
  okText = "确认",
  cancelText = "取消",
  onOk,
  onCancel,
}: IGPTModal) => {
  const isMobileScreen = useMobileScreen();
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(formData);
  }, [formData]);

  const sureModify = () => {
    form.validateFields().then(async (res) => {
      let tempFormData = formData?.slice();
      tempFormData?.map((fit: any, idx: number) => {
        // fit = { ...fit, ...res[idx] }
        for (let key in res[idx]) {
          fit[key] = res[idx][key];
        }
      });
      onOk && onOk(tempFormData);
    });
  };

  const cancelModify = () => {
    onCancel && onCancel();
  };

  return (
    <>
      {open ? (
        <div className="modal-mask">
          <Modal
            title={
              <>
                <Icon
                  name={titleIcon}
                  width={18}
                  height={18}
                  style={{ marginRight: "5px" }}
                />
                {title}
              </>
            }
            onClose={cancelModify}
            actions={[
              <Button
                key="sure"
                type="primary"
                onClick={sureModify}
                style={
                  isMobileScreen
                    ? { width: "100%", height: "46px", borderRadius: "30px" }
                    : {}
                }
              >
                {okText}
              </Button>,
              <Button
                key="cancel"
                onClick={cancelModify}
                style={
                  isMobileScreen
                    ? { width: "100%", height: "46px", borderRadius: "30px" }
                    : {}
                }
              >
                {cancelText}
              </Button>,
            ]}
          >
            <Form
              form={form}
              requiredMark={false}
              labelCol={{ span: 1 }}
              wrapperCol={{ span: 2 }}
            >
              {formData?.map((fit: IGPTModalFormData, fidx: number) => {
                return (
                  <Form.Item
                    name={[fidx, "value"]}
                    label={fit.label}
                    key={fidx}
                    rules={[
                      {
                        required: true,
                        message: fit.placeholder ?? "请输入",
                      },
                    ]}
                  >
                    {fit.formItemType === "textarea" ? (
                      <TextArea
                        style={{
                          fontSize: 14,
                          maxWidth: "initial",
                          textAlign: "left",
                          height: 90,
                          resize: "none",
                        }}
                        value={fit.value}
                        placeholder={fit.placeholder}
                      />
                    ) : null}
                    {fit.formItemType === "input" ? (
                      <Input
                        style={{
                          fontSize: 14,
                          maxWidth: "initial",
                          textAlign: "left",
                        }}
                        placeholder={fit.placeholder}
                        value={fit.value}
                      />
                    ) : null}
                    {fit.formItemType === "text" ? fit.value : null}
                  </Form.Item>
                );
              })}
            </Form>
          </Modal>
        </div>
      ) : null}
    </>
  );

  // return (
  //   <Modal
  //     title={<span className={styles["modify-modal-title"]}>{title}</span>}
  //     centered
  //     open={open}
  //     onCancel={cancelModify}
  //     footer={[
  //       <Button key="modify" type="primary" onClick={sureModify}>
  //         修改
  //       </Button>,
  //       <Button key="cancel" onClick={cancelModify}>
  //         取消
  //       </Button>,
  //     ]}
  //   >
  //     <Form
  //       form={form}
  //       requiredMark={false}
  //       labelCol={{ span: 1 }}
  //       wrapperCol={{ span: 2 }}
  //     >
  //       <Form.Item
  //         name="name"
  //         label={<Icon name={labelIconName || "icon-folder-primary.png"} />}
  //         rules={[
  //           {
  //             required: true,
  //             message: placeholder,
  //           },
  //         ]}
  //       >
  //         {inputType === "textarea" ? (
  //           <TextArea
  //             style={{
  //               fontSize: 14,
  //               maxWidth: "initial",
  //               textAlign: "left",
  //               height: 90,
  //             }}
  //             placeholder={placeholder}
  //           />
  //         ) : (
  //           <Input
  //             style={{ fontSize: 14, maxWidth: "initial", textAlign: "left" }}
  //             placeholder={placeholder}
  //           />
  //         )}
  //       </Form.Item>
  //     </Form>
  //   </Modal>
  // );
};
