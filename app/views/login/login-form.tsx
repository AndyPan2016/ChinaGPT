/**
 * 登录表单
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年7月1日00:19:52 - 创建
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, Radio, Checkbox } from "antd";
import { Path } from "../../constant";
import { useMobileScreen, countDown } from "../../utils";
import { useAppConfig, Theme, useUserInfo } from "../../store";
import { Icon } from "../../components/tools";
import { toastSuccess, toastFail } from "../../components/ui-lib";
import { GPTWindowHeader } from "../../components/home";
import styles from "./index.module.scss";
import { apiFetch } from "../../api/api.fetch";
import { GPTModal } from "../../components/gpt-modal";

export interface ILoginForm {
  currentLoginType?: string;
  onForgetPassword?: () => void;
}

export const LoginForm = ({
  currentLoginType,
  onForgetPassword,
}: ILoginForm) => {
  const navigate = useNavigate();
  const config = useAppConfig();
  const theme = config.theme;
  const [form] = Form.useForm();
  const [sendStatus, setSendStatus] = useState<boolean>(false);
  const [sendText, setSendText] = useState<string>("发送验证码");
  // 发送验证码后，禁用手机输入框
  const [disabledMobile, setDisabledMobile] = useState<boolean>(false);
  // 登录按钮状态
  const [loginStatus, setLoginStatus] = useState<boolean>(false);
  // 验证方式(MOBILE|EMAIL)
  // const [verifyType, setVerifyType] = useState<any>("MOBILE");
  // 验证码token
  const [captchaToken, setCaptchaToken] = useState<any>("");

  // 发送验证码
  const sendCode = () => {
    if (sendStatus) {
      setSendStatus(false);
      setDisabledMobile(true);
      toastSuccess({ content: "发送成功" });
      apiFetch({
        url: "/portal/customer/captchaSend",
        params: {
          sendType: currentLoginType,
          businessType: "LOGIN",
          sendTo:
            currentLoginType == "MOBILE"
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
              setSendStatus(true);
              setDisabledMobile(false);
              setSendText("发送验证码");
            },
          });
          // setCDResult(theCD)
        }
      });
    }
  };

  // 登录后，获取用户信息
  const queryInfo = (callBack?: any) => {
    apiFetch({
      url: "/portal/customer/queryInfo",
      method: "get",
    })
      .then((res) => {
        if (res.success) {
          // 查询用户信息
          let entity = res.entity || {};
          // 保存用户信息
          useUserInfo.set({ ...entity });
          // 进入聊天界面
          navigate(Path.Chat);
          // 查询当前用户所有会话列表
          // queryChatList()
          callBack && callBack();
        } else {
          setLoginStatus(false);
        }
      })
      .catch(() => {
        setLoginStatus(false);
      });
  };

  // // 列出当前用户所有会话
  // const queryChatList = (callBack?: any) => {
  //   apiFetch({
  //     url: '/portal/session/list',
  //     params: {
  //       pageNo: 1,
  //       pageSize: 100
  //     }
  //   }).then(res => {
  //     if (res.success) {
  //       let rows = res.rows || []
  //       if (rows.length) {
  //         // 有数据，打开第一条聊天

  //       } else {
  //         // 没得数据，就创建一条
  //       }
  //       callBack && callBack()
  //     } else {
  //       setLoginStatus(false)
  //     }
  //   }).catch(() => {
  //     setLoginStatus(false)
  //   })
  // }

  // 登录
  const onLogin = () => {
    form.validateFields().then(async (res: any) => {
      setLoginStatus(true);
      console.info(res);
      let params = {
        userName: res.mobile || res.email || res.userName,
        loginType: currentLoginType,
        loginPassword: res.loginPassword,
        captchaToken,
        captchaValue: res.captchaValue,
      };
      apiFetch({
        url: "/portal/customer/login",
        params,
      })
        .then((res) => {
          if (res.success) {
            // 登录成功后，查询用户信息，并缓存
            queryInfo();
          } else {
            setLoginStatus(false);
          }
        })
        .catch(() => {
          setLoginStatus(false);
        });
    });
  };

  return (
    <Form form={form} requiredMark={false} layout="horizontal">
      {/* 短信登录 - 手机号 */}
      {currentLoginType === "MOBILE" ? (
        <Form.Item
          hasFeedback
          name="mobile"
          rules={[
            (forms: any) => ({
              validator: (_: any, value: any) => {
                // 不允许发送验证码
                setSendStatus(false);
                if (value) {
                  let status = new RegExp(/^1\d{10}$/).test(value);
                  if (status) {
                    // 允许发送验证码
                    setSendStatus(true);
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
            disabled={disabledMobile}
            style={{
              fontSize: 14,
              maxWidth: "initial",
              textAlign: "left",
            }}
          />
        </Form.Item>
      ) : null}
      {/* 邮箱登录 - 邮箱 */}
      {currentLoginType === "EMAIL" ? (
        <Form.Item
          hasFeedback
          name="email"
          rules={[
            (forms: any) => ({
              validator: (_: any, value: any) => {
                // 不允许发送验证码
                setSendStatus(false);
                if (value) {
                  let status = new RegExp(
                    /^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/,
                  ).test(value);
                  if (status) {
                    // 允许发送验证码
                    setSendStatus(true);
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
      ) : null}
      {!currentLoginType ? (
        <>
          <Form.Item
            hasFeedback
            name="userName"
            rules={[
              (forms: any) => ({
                validator: (_: any, value: any) => {
                  if (value) {
                    return Promise.resolve();
                  }
                  return Promise.reject("请输入用户账号");
                },
              }),
            ]}
          >
            <Input
              placeholder="请输入用户账号"
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
                minWidth: "300px",
                maxWidth: "initial",
                textAlign: "left",
              }}
            />
          </Form.Item>
          <Form.Item
            hasFeedback
            name="loginPassword"
            rules={[
              (forms: any) => ({
                validator: (_: any, value: any) => {
                  if (value) {
                    if (value.length < 8 || value.length > 14) {
                      return Promise.reject("密码长度为8-14位");
                    }
                    return Promise.resolve();
                  }
                  return Promise.reject("请输入登录密码");
                },
              }),
            ]}
          >
            <Input.Password
              placeholder="请输入登录密码"
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
                minWidth: "300px",
                maxWidth: "initial",
                textAlign: "left",
              }}
            />
          </Form.Item>
        </>
      ) : null}
      {/* 验证码 */}
      {currentLoginType === "MOBILE" || currentLoginType === "EMAIL" ? (
        <Form.Item
          className={styles["login-form"]}
          hasFeedback
          name="captchaValue"
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
      ) : null}
      <div
        className={
          styles["customer-form-item"] + (" " + styles["customer-form-shadow"])
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
      {currentLoginType !== "MOBILE" && currentLoginType !== "EMAIL" ? (
        <div
          className={
            styles["customer-form-item"] + (" " + styles["content-right"])
          }
        >
          <span
            className={styles["forget-password"]}
            onClick={() => {
              onForgetPassword && onForgetPassword();
            }}
          >
            忘记密码
          </span>
        </div>
      ) : null}
    </Form>
  );
};
