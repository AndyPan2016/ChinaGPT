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
import { useAppConfig, Theme, useUserInfoStore } from "../../store";
import { Icon } from "../../components/tools";
import { toastSuccess, toastFail } from "../../components/ui-lib";
import { GPTWindowHeader } from "../../components/home";
import styles from "./index.module.scss";
import { apiFetch } from "../../api/api.fetch";
import { GPTModal } from "../../components/gpt-modal";
import { LoginForm } from "./login-form";

export const Login = () => {
  const isMobileScreen = useMobileScreen();
  const useUserInfo = useUserInfoStore();
  const config = useAppConfig();
  const navigate = useNavigate();
  const theme = config.theme;
  // 登录方式
  const [loginType, setLoginType] = useState<Array<any>>([
    { text: "短信登录", type: "MOBILE", active: true },
    { text: "邮箱登录", type: "EMAIL", active: false },
    { text: "账号密码登录", type: "", active: false },
  ]);
  // 当前登录方式
  const [currentLoginType, setCurrentLoginType] = useState<string>("MOBILE");
  // 清空倒计时
  const [cdResult, setCDResult] = useState<any>();

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
    // form.resetFields();
    // // 每次切换，清空倒计时
    // cdResult?.clear && cdResult?.clear()
    // setSendText("发送验证码");
    // setDisabledMobile(false);
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
          {/* 手机登录 */}
          <div
            style={{
              display: currentLoginType === "MOBILE" ? "block" : "none",
            }}
          >
            <LoginForm currentLoginType="MOBILE" />
          </div>
          {/* 邮箱登录 */}
          <div
            style={{ display: currentLoginType === "EMAIL" ? "block" : "none" }}
          >
            <LoginForm currentLoginType="EMAIL" />
          </div>
          {/* 密码登录 */}
          <div style={{ display: currentLoginType === "" ? "block" : "none" }}>
            <LoginForm
              onForgetPassword={() => {
                setModifyPasswordFirst({
                  ...modifyPasswordFirst,
                  ...{ open: true },
                });
              }}
            />
          </div>
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
