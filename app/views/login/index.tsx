/**
 * 登录
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年6月10日16:26:45 - 创建
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
import { apiFetch } from "../../api/api.fetch";

export const Login = () => {
  const isMobileScreen = useMobileScreen();
  const config = useAppConfig();
  const navigate = useNavigate();
  const theme = config.theme;
  const [form] = Form.useForm();
  const [sendStatus, setSendStatus] = useState<boolean>(false);
  const [radioStatus, setRadioStatus] = useState<boolean>(false);
  const [sendText, setSendText] = useState<string>("发送验证码");
  // 登录按钮状态
  const [loginStatus, setLoginStatus] = useState<boolean>(false);
  // 验证方式(MOBILE|EMAIL)
  const [verifyType, setVerifyType] = useState<any>("MOBILE");
  // 验证码token
  const [captchaToken, setCaptchaToken] = useState<any>("");
  // 登录方式
  const [loginType, setLoginType] = useState<Array<any>>([
    { text: "短信登录", type: "MOBILE", active: true },
    { text: "邮箱登录", type: "EMAIL", active: false },
    { text: "账号密码登录", type: "", active: false },
  ]);

  // 发送验证码
  const sendCode = () => {
    if (sendStatus) {
      setRadioStatus(true);
      setSendStatus(true);
      setSendText("发送中");
      apiFetch({
        url: "/portal/customer/captchaSend",
        params: {
          sendType: verifyType,
          businessType: "REGISTER",
          sendTo:
            verifyType == "MOBILE"
              ? form.getFieldValue("mobile")
              : form.getFieldValue("email"),
        },
      }).then((res) => {
        if (res.success) {
          setCaptchaToken(res?.entity?.captchaToken);
          toastSuccess({ content: "发送成功" });
          countDown({
            timer: 59,
            fn(timer: any) {
              setSendText("已发送 " + timer + "s");
            },
            callBack() {
              setRadioStatus(false);
              setSendStatus(false);
              setSendText("发送验证码");
            },
          });
        }
      });
      //   setTimeout(() => {
      //     toastSuccess({ content: "发送成功" });
      //     countDown({
      //       timer: 10,
      //       fn(timer: any) {
      //         setSendText("已发送 " + timer + "s");
      //       },
      //       callBack() {
      //         setRadioStatus(false);
      //         setSendStatus(false);
      //         setSendText("发送验证码");
      //       },
      //     });
      //   }, 1000);
    }
  };

  // 登录
  const onLogin = () => {};

  return (
    <div className={styles["register-wrap"]}>
      {!isMobileScreen ? (
        <div className={styles["register-thumb"]}></div>
      ) : null}
      <div className={styles["register-form-container"] + " register-form"}>
        <div className={styles["register-form-wrap"]}>
          <div className={styles["register-wrap-head"]}>
            <span className={styles["title"]}>注册</span>
          </div>
          <div
            className={
              styles["login-type"] +
              (isMobileScreen ? " " + styles["login-type-mobile"] : "")
            }
          >
            {loginType.map((it: any, idx: number) => {
              return (
                <div
                  className={
                    styles["login-type-item"] +
                    (it.active ? " " + styles["login-type-item-active"] : "")
                  }
                  key={idx}
                >
                  {it.text}
                </div>
              );
            })}
          </div>
          <Form form={form} requiredMark={false} layout="horizontal">
            {/* 手机号码 */}
            <Form.Item
              className={styles["regist-form"]}
              hasFeedback
              name="mobile"
              rules={[
                (forms: any) => ({
                  validator: (_: any, value: any) => {
                    if (verifyType === "MOBILE") {
                      // 不允许发送验证码
                      setSendStatus(false);
                    }
                    if (value) {
                      let status = new RegExp(/^1\d{10}$/).test(value);
                      if (status) {
                        if (verifyType === "MOBILE") {
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
                    if (verifyType === "EMAIL") {
                      // 不允许发送验证码
                      setSendStatus(false);
                    }
                    if (value) {
                      let status = new RegExp(
                        /^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/,
                      ).test(value);
                      if (status) {
                        if (verifyType === "EMAIL") {
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
            {/* 登录密码 */}
            <Form.Item
              className={styles["regist-form"]}
              hasFeedback
              name="loginPassword"
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
                visibilityToggle={false}
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
            {/* 验证码 */}
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
            <div
              className={
                styles["customer-form-item"] +
                (" " + styles["customer-form-shadow"])
              }
            >
              <div className={styles["form-btn-wrap"]}>
                <Button
                  type="primary"
                  block
                  size="large"
                  onClick={onLogin}
                  loading={loginStatus}
                >
                  登录
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};
