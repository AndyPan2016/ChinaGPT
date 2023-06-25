/**
 * 修改内容弹窗 TSX
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年6月18日22:55:16 - 创建
 */

import { useEffect, useState } from "react";
// import { Modal, Form, Input, Button } from "antd";
import { Form, Input, Button } from "antd";
import { Modal, toastSuccess } from "../ui-lib";
const { TextArea } = Input;
import { IGPTModal, IGPTModalFormData } from "./types";
import styles from "./index.module.scss";
import { Icon } from "../tools/index";
import { useMobileScreen, countDown } from "../../utils";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";

export const GPTModal = ({
  loading,
  className,
  title,
  titleIcon = "icon-wran-min.png",
  // inputType,
  open,
  // placeholder,
  formData,
  // labelIconName,
  btnSwitch,
  hasFeedback,
  okText = "确认",
  cancelText = "取消",
  onOk,
  onCancel,
  onClose,
  children,
  showCancel = true,
}: IGPTModal) => {
  const isMobileScreen = useMobileScreen();
  const [form] = Form.useForm();
  const [cancelAttr, setCancelAttr] = useState<any>({});
  const [okAttr, setOkAttr] = useState<any>({});
  const [sendStatus, setSendStatus] = useState<boolean>(false);
  const [sendText, setSendText] = useState<string>("发送验证码");

  useEffect(() => {
    form.setFieldsValue(formData);
    renderSendStatus();
  }, [formData]);

  useEffect(() => {
    if (btnSwitch) {
      setOkAttr({ disabled: !!loading });
      setCancelAttr({ loading });
    } else {
      setOkAttr({ loading });
      setCancelAttr({ disabled: !!loading });
    }
  }, [loading]);

  const renderSendStatus = () => {
    let association: any;
    formData?.map((fd: any, fdidx: number) => {
      if (fd.association !== undefined && fd.sendCode) {
        association = fd.association;
      }
    });

    let formItem = (formData || [])[association];
    if (formItem) {
      formItem.rules[0](form)
        .validator(null, formItem.value)
        .then((res: any) => {
          // console.info(res)
          setSendStatus(false);
        })
        .catch((err: any) => {
          // console.info(err)
          setSendStatus(true);
        });
    }
  };

  const sureModify = () => {
    if (form) {
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
    } else {
      onOk && onOk();
    }
  };

  const cancelModify = () => {
    onCancel && onCancel();
  };

  const closeModal = () => {
    if (onClose) {
      onClose();
    } else if (onCancel) {
      onCancel();
    }
  };

  return (
    <>
      {open ? (
        <div className={"modal-mask " + (className || "")}>
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
            close={!loading}
            onClose={closeModal}
            actions={[
              <Button
                key={btnSwitch ? "cancel" : "sure"}
                type={btnSwitch ? "default" : "primary"}
                onClick={btnSwitch ? cancelModify : sureModify}
                style={
                  isMobileScreen
                    ? { width: "100%", height: "46px", borderRadius: "30px" }
                    : {}
                }
                {...okAttr}
              >
                {btnSwitch ? cancelText : okText}
              </Button>,
              showCancel ? (
                <Button
                  key={btnSwitch ? "sure" : "cancel"}
                  type={btnSwitch ? "primary" : "default"}
                  onClick={btnSwitch ? sureModify : cancelModify}
                  style={
                    isMobileScreen
                      ? { width: "100%", height: "46px", borderRadius: "30px" }
                      : {}
                  }
                  {...cancelAttr}
                >
                  {btnSwitch ? okText : cancelText}
                </Button>
              ) : (
                <></>
              ),
            ]}
          >
            {children?.form ? (
              children?.form
            ) : (
              <Form
                form={form}
                // key={Date.now()}
                requiredMark={false}
                labelCol={{ span: 1 }}
                wrapperCol={{ span: 2 }}
              >
                {formData?.map((fit: IGPTModalFormData, fidx: number) => {
                  let dependencies = fit.dependencies
                    ? { dependencies: fit.dependencies }
                    : {};
                  return (
                    <>
                      <Form.Item
                        className={fit.sendCode ? "send-code-space" : ""}
                        name={
                          fit.fieldName
                            ? [fidx, fit.fieldName]
                            : [fidx, "value"]
                        }
                        label={fit.label}
                        key={fidx}
                        hasFeedback={hasFeedback}
                        rules={
                          fit.rules || [
                            {
                              required: true,
                              message: fit.placeholder ?? "请输入",
                            },
                          ]
                        }
                        {...dependencies}
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
                            disabled={loading}
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
                            // value={fit[fit?.fieldName || 'value']}
                            value={fit.value}
                            disabled={loading}
                            onChange={(e) => {
                              let association;
                              formData.map((fd: any, fdidx: number) => {
                                if (
                                  fd.association !== undefined &&
                                  fd.sendCode
                                ) {
                                  association = fd.association;
                                }
                              });
                              if (fidx == association) {
                                // let fieldsValue = form.isFieldValidating()
                                // let fValue = fieldsValue[association].value
                                // console.info(fieldsValue)
                                formData[association].rules[0](form)
                                  .validator(null, e.target.value)
                                  .then((res: any) => {
                                    // console.info(res)
                                    setSendStatus(false);
                                  })
                                  .catch((err: any) => {
                                    // console.info(err)
                                    setSendStatus(true);
                                  });
                              }
                            }}
                          />
                        ) : null}
                        {fit.formItemType === "password" ? (
                          <Input.Password
                            style={{
                              fontSize: 14,
                              maxWidth: "initial",
                              textAlign: "left",
                            }}
                            placeholder={fit.placeholder}
                            value={fit.value}
                            disabled={loading}
                          />
                        ) : null}
                        {fit.formItemType === "text" ? fit.value : null}
                      </Form.Item>
                      {fit.suffix}
                      {fit.sendCode ? (
                        <span
                          className={
                            styles["send-code"] +
                            (sendStatus ? " " + styles["disabled"] : "")
                          }
                          onClick={() => {
                            if (!sendStatus) {
                              setSendStatus(true);
                              setSendText("发送中");
                              setTimeout(() => {
                                toastSuccess({ content: "发送成功" });
                                countDown({
                                  timer: 10,
                                  fn(timer: any) {
                                    setSendText(timer + "s后重发");
                                  },
                                  callBack() {
                                    setSendStatus(false);
                                    setSendText("发送验证码");
                                  },
                                });
                              }, 1000);
                            }
                          }}
                        >
                          {sendText}
                        </span>
                      ) : null}
                    </>
                  );
                })}
                {children?.formItem}
              </Form>
            )}
            {children?.other ? children?.other : null}
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