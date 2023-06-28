/**
 * 注册
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年6月10日16:43:54 - 创建
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, Radio, Checkbox } from "antd";
import { Path } from "../../constant";
import { useMobileScreen, countDown } from "../../utils";
import { useAppConfig, Theme } from "../../store";
import { Icon } from "../../components/tools";
import { toastSuccess, toastFail } from "../../components/ui-lib";
import styles from "./index.module.scss";

export const Register = () => {
  const isMobileScreen = useMobileScreen();
  const config = useAppConfig();
  const theme = config.theme;
  const [form] = Form.useForm();
  const [sendStatus, setSendStatus] = useState<boolean>(false);
  const [radioStatus, setRadioStatus] = useState<boolean>(false);
  const [sendText, setSendText] = useState<string>("发送验证码");
  // 验证方式
  const [verifyType, setVerifyType] = useState<any>("phone");
  // 同意协议
  const [agreeWith, setAgreeWite] = useState<boolean>(false);

  // 获取字节数
  const strByteSize = (str: string) => {
    if (!str) {
      return 0;
    }
    return new Blob([str]).size;
  };

  // 注册提交
  const onRegister = () => {
    form.validateFields().then(async (res) => {
      if (agreeWith) {
        console.info(res);
      } else {
        toastFail({ content: "请阅读协议" });
      }
    });
  };

  // 发送验证码
  const sendCode = () => {
    if (sendStatus) {
      setRadioStatus(true);
      setSendStatus(true);
      setSendText("发送中");
      setTimeout(() => {
        toastSuccess({ content: "发送成功" });
        countDown({
          timer: 10,
          fn(timer: any) {
            setSendText("已发送 " + timer + "s");
          },
          callBack() {
            setRadioStatus(false);
            setSendStatus(false);
            setSendText("发送验证码");
          },
        });
      }, 1000);
    }
  };

  return (
    <div className={styles["register-wrap"]}>
      {!isMobileScreen ? (
        <div className={styles["register-thumb"]}></div>
      ) : null}
      <div className={styles["register-form-container"] + " register-form"}>
        <div className={styles["register-form-wrap"]}>
          <div className={styles["register-wrap-head"]}>
            <span className={styles["title"]}>注册</span>
            <span className={styles["title-remark"]}>
              已有账号？
              <Link className={styles["to-login"]} to={Path.Login}>
                登录
              </Link>
            </span>
          </div>
          <Form form={form} requiredMark={false} layout="horizontal">
            <div className={styles["form-text"]}>
              设置后不可更改，中英文均可，最长14英文或7个汉字
            </div>
            {/* 昵称 */}
            <Form.Item
              className={styles["regist-form"]}
              hasFeedback
              name="nickName"
              rules={[
                (forms: any) => ({
                  validator: (_: any, value: any) => {
                    if (value) {
                      let byte = strByteSize(value);
                      if (byte > 14) {
                        return Promise.reject("最长14英文或7个汉字");
                      }
                      return Promise.resolve();
                    }
                    return Promise.reject("请输入用户昵称");
                  },
                }),
              ]}
            >
              <Input
                placeholder="请输入用户昵称"
                prefix={
                  <Icon
                    name={
                      Theme.Dark === theme
                        ? "icon-nickname-white.png"
                        : "icon-nickname-primary.png"
                    }
                  />
                }
                style={{
                  fontSize: 14,
                  maxWidth: "initial",
                  textAlign: "left",
                }}
              />
            </Form.Item>
            {/* 手机号码 */}
            <Form.Item
              className={styles["regist-form"]}
              hasFeedback
              name="phone"
              rules={[
                (forms: any) => ({
                  validator: (_: any, value: any) => {
                    if (verifyType === "phone") {
                      // 不允许发送验证码
                      setSendStatus(false);
                    }
                    if (value) {
                      let status = new RegExp(/^1\d{10}$/).test(value);
                      if (status) {
                        if (verifyType === "phone") {
                          // 允许发送验证码
                          setSendStatus(true);
                        }
                        return Promise.resolve();
                      }
                      return Promise.reject("手机格式不正确");
                    }
                    return Promise.reject("请输入手机号码");
                  },
                }),
              ]}
            >
              <Input
                placeholder="请输入手机号码"
                prefix={
                  <Icon
                    name={
                      Theme.Dark === theme
                        ? "icon-phone-white.png"
                        : "icon-phone-primary.png"
                    }
                  />
                }
                style={{
                  fontSize: 14,
                  maxWidth: "initial",
                  textAlign: "left",
                }}
              />
            </Form.Item>
            {/* 邮箱地址 */}
            <Form.Item
              className={styles["regist-form"]}
              hasFeedback
              name="email"
              rules={[
                (forms: any) => ({
                  validator: (_: any, value: any) => {
                    if (verifyType === "email") {
                      // 不允许发送验证码
                      setSendStatus(false);
                    }
                    if (value) {
                      let status = new RegExp(
                        /^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/,
                      ).test(value);
                      if (status) {
                        if (verifyType === "email") {
                          // 允许发送验证码
                          setSendStatus(true);
                        }
                        return Promise.resolve();
                      }
                      return Promise.reject("邮箱格式不正确");
                    }
                    return Promise.reject("请输入邮箱地址");
                  },
                }),
              ]}
            >
              <Input
                placeholder="请输入邮箱地址"
                prefix={
                  <Icon
                    name={
                      Theme.Dark === theme
                        ? "icon-email-white.png"
                        : "icon-email-primary.png"
                    }
                  />
                }
                style={{
                  fontSize: 14,
                  maxWidth: "initial",
                  textAlign: "left",
                }}
              />
            </Form.Item>
            <div className={styles["form-text"]}>
              登录密码长度为8~14个字符，字母/数字2种，不允许有空格、中文、特殊字符（字母不区分大小写）
            </div>
            <Form.Item
              className={styles["regist-form"]}
              hasFeedback
              name="password"
              rules={[
                (forms: any) => ({
                  validator: (_: any, value: any) => {
                    if (value) {
                      let status = new RegExp(
                        /^(?![\d]+$)(?![a-zA-Z]+$)(?![^\da-zA-Z]+$).{8,14}$/,
                      ).test(value);
                      if (status) {
                        status = new RegExp(/^[a-zA-Z0-9_]{0,}$/).test(value);
                        if (status) {
                          return Promise.resolve();
                        } else {
                          return Promise.reject("不能包含特殊字符或中文");
                        }
                      } else {
                        return Promise.reject("密码格式不正确");
                      }
                    }
                    return Promise.reject("请设置登录密码");
                  },
                }),
              ]}
            >
              <Input.Password
                placeholder="请设置登录密码"
                prefix={
                  <Icon
                    name={
                      Theme.Dark === theme
                        ? "icon-password-white.png"
                        : "icon-password-primary.png"
                    }
                  />
                }
                style={{
                  fontSize: 14,
                  maxWidth: "initial",
                  textAlign: "left",
                }}
              />
            </Form.Item>
            <div className={styles["customer-form-item"]}>
              <span className={styles["form-item-label"]}>验证方式</span>
              <Radio.Group
                className="regist-radio"
                onChange={(e) => {
                  let value = e.target.value;
                  setVerifyType(value);
                  if (value === "phone") {
                    if (
                      form.getFieldError("phone").length ||
                      !form.getFieldValue("phone")
                    ) {
                      setSendStatus(false);
                    } else {
                      setSendStatus(true);
                    }
                  } else if (value === "email") {
                    if (
                      form.getFieldError("email").length ||
                      !form.getFieldValue("email")
                    ) {
                      setSendStatus(false);
                    } else {
                      setSendStatus(true);
                    }
                  }
                }}
                disabled={radioStatus}
                value={verifyType}
              >
                <Radio value="phone">手机号</Radio>
                <Radio value="email">电子邮箱</Radio>
              </Radio.Group>
            </div>
            <Form.Item
              className={styles["regist-form"]}
              hasFeedback
              name="code"
              rules={[
                {
                  required: true,
                  message: "请输入手机验证码",
                },
              ]}
            >
              <Input
                placeholder="请输入手机验证码"
                prefix={
                  <Icon
                    name={
                      Theme.Dark === theme
                        ? "icon-password-white.png"
                        : "icon-password-primary.png"
                    }
                  />
                }
                style={{
                  fontSize: 14,
                  maxWidth: "initial",
                  textAlign: "left",
                }}
                addonAfter={
                  <div
                    className={
                      styles["send-text"] +
                      (sendStatus ? "" : " " + styles["disabled"])
                    }
                    onClick={sendCode}
                  >
                    {sendText}
                  </div>
                }
              />
            </Form.Item>
            <div className={styles["customer-form-item"]}>
              <Button type="primary" block size="large" onClick={onRegister}>
                注册
              </Button>
            </div>
            <div className={styles["customer-form-item"]}>
              <Checkbox
                className="regist-checkbox"
                onChange={(e) => {
                  setAgreeWite(e.target.checked);
                }}
                checked={agreeWith}
              >
                阅读并同意
              </Checkbox>
              <span className={styles["regist-agreement"]}>
                <span className={styles["agreement-item"]}>《用户协议》</span>和
                <span className={styles["agreement-item"]}>《隐私协议》</span>
              </span>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};
