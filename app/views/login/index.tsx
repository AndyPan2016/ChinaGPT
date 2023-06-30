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
import { useAppConfig, Theme, useUserInfo } from "../../store";
import { Icon } from "../../components/tools";
import { toastSuccess, toastFail } from "../../components/ui-lib";
import { GPTWindowHeader } from "../../components/home";
import styles from "./index.module.scss";
import { apiFetch } from "../../api/api.fetch";
import { GPTModal } from "../../components/gpt-modal";

export const Login = () => {
  const isMobileScreen = useMobileScreen();
  const config = useAppConfig();
  const navigate = useNavigate();
  const theme = config.theme;
  const [form] = Form.useForm();
  const [sendStatus, setSendStatus] = useState<boolean>(false);
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
  // 当前登录方式
  const [currentLoginType, setCurrentLoginType] = useState<string>("MOBILE");

  // 登录方式切换
  const loginTypeSwitch = (index: number) => {
    let tempType = loginType.slice();
    tempType.map((it: any, idx: number) => {
      it.active = idx == index;
      if (it.active) {
        setCurrentLoginType(it.type);
      }
    });
    setLoginType(tempType);
    form.resetFields();
  };

  // 发送验证码
  const sendCode = () => {
    if (sendStatus) {
      setSendStatus(false);
      setSendText("发送中");
      apiFetch({
        url: "/portal/customer/captchaSend",
        params: {
          sendType: verifyType,
          businessType: "LOGIN",
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
              setSendStatus(true);
              setSendText("发送验证码");
            },
          });
        }
      });
    }
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

  // 单选按钮的禁用状态
  const [radioStatus, setRadioStatus] = useState<boolean>(false);
  // (重置密码)验证方式(MOBILE|EMAIL)
  const [verifyTypeReset, setVerifyTypeReset] = useState<any>("MOBILE");
  // 短信验证码token
  const [mobileTokenReset, setMobileTokenReset] = useState<any>();

  let formDataMobile = [
    {
      label: "手机号",
      value: "",
      formItemType: "input",
      placeholder: "请输入注册手机号",
      rules: [
        (forms: any) => ({
          validator: (_: any, value: any) => {
            if (value) {
              let status = new RegExp(/^1\d{10}$/).test(value);
              if (status) {
                return Promise.resolve();
              }
              return Promise.reject("手机格式不正确");
            }
            return Promise.reject("请输入注册手机号");
          },
        }),
      ],
    },
    {
      label: "验证码",
      value: "",
      formItemType: "input",
      placeholder: "请输入验证码",
      sendCode: true,
      association: 0,
    },
  ];
  let formDataEMail = [
    {
      label: "邮箱",
      value: "",
      formItemType: "input",
      placeholder: "请输入注册邮箱地址",
      rules: [
        (forms: any) => ({
          validator: (_: any, value: any) => {
            if (value) {
              let status = new RegExp(
                /^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/,
              ).test(value);
              if (status) {
                return Promise.resolve();
              }
              return Promise.reject("邮箱格式不正确");
            }
            return Promise.reject("请输入注册邮箱地址");
          },
        }),
      ],
    },
    {
      label: "验证码",
      value: "",
      formItemType: "input",
      placeholder: "请输入验证码",
      sendCode: true,
      association: 0,
    },
  ];
  const [modifyPasswordFirst, setModifyPasswordFirst] = useState<any>({
    open: false,
    loading: false,
    formData: formDataMobile,
    cancelText: "取消",
    okText: "下一步",
  });
  const [modifyPasswordSecond, setModifyPasswordSecond] = useState<any>({
    open: false,
    loading: false,
    formData: [
      {
        label: "新密码",
        placeholder: "请输入新登录密码",
        value: "",
        formItemType: "password",
        rules: [
          (forms: any) => ({
            validator: (_: any, value: any) => {
              if (value) {
                let status = new RegExp(
                  /^(?![\d]+$)(?![a-zA-Z]+$)(?![^\da-zA-Z]+$).{8,14}$/,
                ).test(value);
                if (status) {
                  status = new RegExp(/^[a-zA-Z0-9_]{0,}$/).test(value);
                  if (status) {
                    // forms.validateFields([1, 'value'])
                    return Promise.resolve();
                  } else {
                    return Promise.reject("不能包含特殊字符或中文");
                  }
                } else {
                  return Promise.reject("密码格式不正确");
                }
              }
              return Promise.reject("请输入新登录密码");
            },
          }),
        ],
      },
      {
        label: "确认密码",
        placeholder: "请再次输入新登录密码",
        value: "",
        formItemType: "password",
        // dependencies: ['0', 'value'],
        rules: [
          ({ getFieldValue }: any) => ({
            validator: (_: any, value: any) => {
              if (value) {
                let status = new RegExp(
                  /^(?![\d]+$)(?![a-zA-Z]+$)(?![^\da-zA-Z]+$).{8,14}$/,
                ).test(value);
                if (status) {
                  status = new RegExp(/^[a-zA-Z0-9_]{0,}$/).test(value);
                  if (status) {
                    let value0 = getFieldValue([0, "value"]);
                    // let value0 = getFieldValue('password')
                    if (value0 !== value) {
                      return Promise.reject("两次密码输入不一致");
                    }
                    return Promise.resolve();
                  } else {
                    return Promise.reject("不能包含特殊字符或中文");
                  }
                } else {
                  return Promise.reject("密码格式不正确");
                }
              }
              return Promise.reject("请再次输入新登录密码");
            },
          }),
        ],
      },
      {
        value: (
          <span className={styles["value-text"]}>
            登录密码长度为8~14个字符，字母/数字2种，不允许有空格、中文、特殊字符（字母不区分大小写）
          </span>
        ),
        formItemType: "text",
      },
    ],
    cancelText: "上一步",
    okText: "确认",
  });
  // 修改密码 - 第一步
  const closeModifyPasswordFirst = () => {
    setModifyPasswordFirst({ ...modifyPasswordFirst, ...{ open: false } });
  };
  const cancelModifyPasswordFirst = () => {
    setModifyPasswordFirst({ ...modifyPasswordFirst, ...{ open: false } });
  };
  const sureModifyPasswordFirst = () => {
    setModifyPasswordFirst({
      ...modifyPasswordFirst,
      ...{ open: false, loading: false },
    });
    setModifyPasswordSecond({
      ...modifyPasswordSecond,
      ...{ open: true },
    });
  };
  // 发送验证码
  const sendModifyPasswordFirst = (callBack?: any) => {
    apiFetch({
      url: "/portal/customer/captchaSend",
      params: {
        businessType: "RESET_LOGIN_PASSWORD",
        sendType: verifyTypeReset,
        sendTo: modifyPasswordSecond.fomData[0].value,
      },
    }).then((res) => {
      if (res.success) {
        setMobileTokenReset(res?.entity?.captchaToken);
        callBack && callBack();
      }
    });
  };
  // 修改密码 - 第二步
  const closeModifyPasswordSecond = () => {
    setModifyPasswordSecond({ ...modifyPasswordSecond, ...{ open: false } });
  };
  const cancelModifyPasswordSecond = () => {
    setModifyPasswordSecond({ ...modifyPasswordSecond, ...{ open: false } });
    setModifyPasswordFirst({ ...modifyPasswordFirst, ...{ open: true } });
  };
  // 确认重置密码
  const sureModifyPasswordSecond = () => {
    setModifyPasswordSecond({ ...modifyPasswordSecond, ...{ loading: true } });
    apiFetch({
      url: "/portal/customer/resetLoginPwd",
      params: {
        resetType: verifyTypeReset,
        captchaToken: mobileTokenReset,
        captchaValue: modifyPasswordFirst.formData[1].value,
        userName: modifyPasswordFirst.formData[0].value,
        // 新密码
        loginPassword: modifyPasswordSecond.formData[0].value,
      },
    })
      .then((res) => {
        if (res.success) {
          toastSuccess({ content: "登录密码修改成功！" });
          setModifyPasswordSecond({
            ...modifyPasswordSecond,
            ...{ loading: false, open: false },
          });
        } else {
          setModifyPasswordSecond({
            ...modifyPasswordSecond,
            ...{ loading: false },
          });
        }
      })
      .catch(() => {
        setModifyPasswordSecond({
          ...modifyPasswordSecond,
          ...{ loading: false },
        });
      });
  };

  return (
    <div
      className={
        styles["register-wrap"] +
        (isMobileScreen ? " " + styles["register-wrap-mobile"] : "")
      }
    >
      {/* 忘记密码 - 第一步 */}
      <GPTModal
        title="忘记密码"
        className="text-form"
        open={modifyPasswordFirst.open}
        formData={modifyPasswordFirst.formData}
        btnSwitch={true}
        hasFeedback
        loading={modifyPasswordFirst.loading}
        okText={modifyPasswordFirst.okText}
        cancelText={modifyPasswordFirst.cancelText}
        onClose={closeModifyPasswordFirst}
        onCancel={cancelModifyPasswordFirst}
        onOk={sureModifyPasswordFirst}
        onSend={sendModifyPasswordFirst}
        children={{
          formFirst: (
            <div className={styles["customer-form-item"]}>
              <span className={styles["form-item-label"]}>验证方式</span>
              <Radio.Group
                className="regist-radio"
                onChange={(e) => {
                  let value = e.target.value;
                  setVerifyTypeReset(value);
                  if (value === "MOBILE") {
                    setModifyPasswordFirst({
                      ...modifyPasswordFirst,
                      ...{ formData: formDataMobile },
                    });
                  } else if (value === "EMAIL") {
                    setModifyPasswordFirst({
                      ...modifyPasswordFirst,
                      ...{ formData: formDataEMail },
                    });
                  }
                }}
                disabled={radioStatus}
                value={verifyTypeReset}
              >
                <Radio value="MOBILE">手机号</Radio>
                <Radio value="EMAIL">电子邮箱</Radio>
              </Radio.Group>
            </div>
          ),
        }}
      />
      {/* 忘记密码 - 第二步 */}
      <GPTModal
        title="忘记密码"
        className="text-form"
        open={modifyPasswordSecond.open}
        formData={modifyPasswordSecond.formData}
        btnSwitch={true}
        hasFeedback
        loading={modifyPasswordSecond.loading}
        okText={modifyPasswordSecond.okText}
        cancelText={modifyPasswordSecond.cancelText}
        onClose={closeModifyPasswordSecond}
        onCancel={cancelModifyPasswordSecond}
        onOk={sureModifyPasswordSecond}
      ></GPTModal>
      {!isMobileScreen ? (
        <div className={styles["register-thumb"]}></div>
      ) : (
        <div className={styles["gpt-login-head"]}>
          <span className={styles["gpt-login-head-wrap"]}>
            <GPTWindowHeader />
          </span>
        </div>
      )}
      <div className={styles["register-form-container"]}>
        <div className={styles["register-form-wrap"]}>
          <div className={styles["register-wrap-head"]}>
            <span className={styles["title"]}>登录</span>
          </div>
          <div className={styles["login-type"]}>
            {loginType.map((it: any, idx: number) => {
              return (
                <div
                  className={
                    styles["login-type-item"] +
                    (it.active ? " " + styles["login-type-item-active"] : "")
                  }
                  key={idx}
                  onClick={() => loginTypeSwitch(idx)}
                >
                  {it.text}
                </div>
              );
            })}
          </div>
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
            {currentLoginType === "" ? (
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
            {currentLoginType !== "MOBILE" && currentLoginType !== "EMAIL" ? (
              <div
                className={
                  styles["customer-form-item"] + (" " + styles["content-right"])
                }
              >
                <span
                  className={styles["forget-password"]}
                  onClick={() => {
                    setModifyPasswordFirst({
                      ...modifyPasswordFirst,
                      ...{ open: true },
                    });
                  }}
                >
                  忘记密码
                </span>
              </div>
            ) : null}
          </Form>
          <div className={styles["to-register"]}>
            <Link className={styles["to-register-text"]} to={Path.Register}>
              免费注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
