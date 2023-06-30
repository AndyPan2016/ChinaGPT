import { useState, useEffect, useMemo, HTMLProps, useRef } from "react";

import styles from "./settings.module.scss";

import ResetIcon from "../icons/reload.svg";
import AddIcon from "../icons/add.svg";
import CloseIcon from "../icons/close.svg";
import CopyIcon from "../icons/copy.svg";
import ClearIcon from "../icons/clear.svg";
import LoadingIcon from "../icons/three-dots.svg";
import EditIcon from "../icons/edit.svg";
import EyeIcon from "../icons/eye.svg";
import {
  Input,
  List,
  ListItem,
  Modal,
  PasswordInput,
  Popover,
  Select,
  toastSuccess,
} from "./ui-lib";
import { ModelConfigList } from "./model-config";

import { IconButton } from "./button";
import { Button, Form, Input as InputAT } from "antd";
import {
  SubmitKey,
  useChatStore,
  Theme,
  useUpdateStore,
  useAccessStore,
  useAppConfig,
} from "../store";

import Locale, {
  AllLangs,
  ALL_LANG_OPTIONS,
  changeLang,
  getLang,
} from "../locales";
import {
  copyToClipboard,
  countDown,
  useMobileScreen,
  stringEncryption,
} from "../utils";
import { Icon } from "./tools";
import Link from "next/link";
import { Path, UPDATE_URL } from "../constant";
import { Prompt, SearchService, usePromptStore } from "../store/prompt";
import { ErrorBoundary } from "./error";
import { InputRange } from "./input-range";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarPicker } from "./emoji";
import { GPTModal } from "./gpt-modal";
import { apiFetch } from "../api/api.fetch";

function EditPromptModal(props: { id: number; onClose: () => void }) {
  const promptStore = usePromptStore();
  const prompt = promptStore.get(props.id);

  return prompt ? (
    <div className="modal-mask">
      <Modal
        title={Locale.Settings.Prompt.EditModal.Title}
        onClose={props.onClose}
        actions={[
          <IconButton
            key=""
            onClick={props.onClose}
            text={Locale.UI.Confirm}
            bordered
          />,
        ]}
      >
        <div className={styles["edit-prompt-modal"]}>
          <input
            type="text"
            value={prompt.title}
            readOnly={!prompt.isUser}
            className={styles["edit-prompt-title"]}
            onInput={(e) =>
              promptStore.update(
                props.id,
                (prompt) => (prompt.title = e.currentTarget.value),
              )
            }
          ></input>
          <Input
            value={prompt.content}
            readOnly={!prompt.isUser}
            className={styles["edit-prompt-content"]}
            rows={10}
            onInput={(e) =>
              promptStore.update(
                props.id,
                (prompt) => (prompt.content = e.currentTarget.value),
              )
            }
          ></Input>
        </div>
      </Modal>
    </div>
  ) : null;
}

function UserPromptModal(props: { onClose?: () => void }) {
  const promptStore = usePromptStore();
  const userPrompts = promptStore.getUserPrompts();
  const builtinPrompts = SearchService.builtinPrompts;
  const allPrompts = userPrompts.concat(builtinPrompts);
  const [searchInput, setSearchInput] = useState("");
  const [searchPrompts, setSearchPrompts] = useState<Prompt[]>([]);
  const prompts = searchInput.length > 0 ? searchPrompts : allPrompts;

  const [editingPromptId, setEditingPromptId] = useState<number>();

  useEffect(() => {
    if (searchInput.length > 0) {
      const searchResult = SearchService.search(searchInput);
      setSearchPrompts(searchResult);
    } else {
      setSearchPrompts([]);
    }
  }, [searchInput]);

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Settings.Prompt.Modal.Title}
        onClose={() => props.onClose?.()}
        actions={[
          <IconButton
            key="add"
            onClick={() =>
              promptStore.add({
                title: "Empty Prompt",
                content: "Empty Prompt Content",
              })
            }
            icon={<AddIcon />}
            bordered
            text={Locale.Settings.Prompt.Modal.Add}
          />,
        ]}
      >
        <div className={styles["user-prompt-modal"]}>
          <input
            type="text"
            className={styles["user-prompt-search"]}
            placeholder={Locale.Settings.Prompt.Modal.Search}
            value={searchInput}
            onInput={(e) => setSearchInput(e.currentTarget.value)}
          ></input>

          <div className={styles["user-prompt-list"]}>
            {prompts.map((v, _) => (
              <div className={styles["user-prompt-item"]} key={v.id ?? v.title}>
                <div className={styles["user-prompt-header"]}>
                  <div className={styles["user-prompt-title"]}>{v.title}</div>
                  <div className={styles["user-prompt-content"] + " one-line"}>
                    {v.content}
                  </div>
                </div>

                <div className={styles["user-prompt-buttons"]}>
                  {v.isUser && (
                    <IconButton
                      icon={<ClearIcon />}
                      className={styles["user-prompt-button"]}
                      onClick={() => promptStore.remove(v.id!)}
                    />
                  )}
                  {v.isUser ? (
                    <IconButton
                      icon={<EditIcon />}
                      className={styles["user-prompt-button"]}
                      onClick={() => setEditingPromptId(v.id)}
                    />
                  ) : (
                    <IconButton
                      icon={<EyeIcon />}
                      className={styles["user-prompt-button"]}
                      onClick={() => setEditingPromptId(v.id)}
                    />
                  )}
                  <IconButton
                    icon={<CopyIcon />}
                    className={styles["user-prompt-button"]}
                    onClick={() => copyToClipboard(v.content)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {editingPromptId !== undefined && (
        <EditPromptModal
          id={editingPromptId!}
          onClose={() => setEditingPromptId(undefined)}
        />
      )}
    </div>
  );
}

function formatVersionDate(t: string) {
  const d = new Date(+t);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  return [
    year.toString(),
    month.toString().padStart(2, "0"),
    day.toString().padStart(2, "0"),
  ].join("");
}

export function Settings() {
  const isMobileScreen = useMobileScreen();
  const navigate = useNavigate();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const config = useAppConfig();
  const theme = config.theme;
  const updateConfig = config.update;
  const resetConfig = config.reset;
  const chatStore = useChatStore();

  const updateStore = useUpdateStore();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const currentVersion = formatVersionDate(updateStore.version);
  const remoteId = formatVersionDate(updateStore.remoteVersion);
  const hasNewVersion = currentVersion !== remoteId;

  function checkUpdate(force = false) {
    setCheckingUpdate(true);
    updateStore.getLatestVersion(force).then(() => {
      setCheckingUpdate(false);
    });

    console.log(
      "[Update] local version ",
      new Date(+updateStore.version).toLocaleString(),
    );
    console.log(
      "[Update] remote version ",
      new Date(+updateStore.remoteVersion).toLocaleString(),
    );
  }

  const usage = {
    used: updateStore.used,
    subscription: updateStore.subscription,
  };
  const [loadingUsage, setLoadingUsage] = useState(false);
  function checkUsage(force = false) {
    setLoadingUsage(true);
    updateStore.updateUsage(force).finally(() => {
      setLoadingUsage(false);
    });
  }

  const accessStore = useAccessStore();
  const enabledAccessControl = useMemo(
    () => accessStore.enabledAccessControl(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const promptStore = usePromptStore();
  const builtinCount = SearchService.count.builtin;
  const customCount = promptStore.getUserPrompts().length ?? 0;
  const [shouldShowPromptModal, setShowPromptModal] = useState(false);
  // 用户信息
  const [userInfo, setUserInfo] = useState<any>({});
  // 手机号(省略)
  const [userMobileOmit, setUserMobileOmit] = useState<string>("");
  // 邮箱(省略)
  const [userEMailOmit, setUserEMailOmit] = useState<string>("");

  // 查询用户信息
  const queryUserInfo = () => {
    apiFetch({
      url: "/portal/customer/queryInfo",
      method: "get",
    }).then((res) => {
      if (res.success) {
        let entity = res.entity || {};
        setUserInfo(entity);
      }
    });
  };

  useEffect(() => {
    if (userInfo?.customerNo) {
      // 手机号掩码
      let mobileOmit =
        userInfo?.mobile?.indexOf("*") > -1
          ? userInfo.mobile
          : stringEncryption({ str: userInfo?.mobile });
      setUserMobileOmit(mobileOmit);
      // 邮箱掩码
      let emailOmit =
        userInfo.email.indexOf("*") > -1
          ? userInfo.email
          : stringEncryption({ str: userInfo.email });
      setUserEMailOmit(emailOmit);
    }
  }, [userInfo]);

  const showUsage = accessStore.isAuthorized();
  useEffect(() => {
    // checks per minutes
    // checkUpdate();
    // showUsage && checkUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // queryUserInfo();
  }, []);

  useEffect(() => {
    const keydownEvent = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        navigate(Path.Home);
      }
    };
    document.addEventListener("keydown", keydownEvent);
    return () => {
      document.removeEventListener("keydown", keydownEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [modifyPasswordFirst, setModifyPasswordFirst] = useState<any>({
    open: false,
    loading: false,
    formData: [
      {
        label: "原密码",
        placeholder: "请输入原密码",
        value: "",
        formItemType: "password",
      },
    ],
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
    okText: "修改登录密码",
  });
  // 修改密码 - 第一步
  const closeModifyPasswordFirst = () => {
    setModifyPasswordFirst({ ...modifyPasswordFirst, ...{ open: false } });
  };
  const cancelModifyPasswordFirst = () => {
    setModifyPasswordFirst({ ...modifyPasswordFirst, ...{ open: false } });
  };
  const sureModifyPasswordFirst = () => {
    setModifyPasswordFirst({ ...modifyPasswordFirst, ...{ loading: true } });
    // 检测原始密码
    apiFetch({
      url: "/portal/customer/checkPassword",
      params: {
        // 原始密码
        password: modifyPasswordFirst.formData[0].value,
      },
    })
      .then((res) => {
        if (res.success) {
          setModifyPasswordFirst({
            ...modifyPasswordFirst,
            ...{ open: false, loading: false },
          });
          setModifyPasswordSecond({
            ...modifyPasswordSecond,
            ...{ open: true },
          });
        } else {
          setModifyPasswordFirst({
            ...modifyPasswordFirst,
            ...{ loading: false },
          });
        }
      })
      .catch(() => {
        setModifyPasswordFirst({
          ...modifyPasswordFirst,
          ...{ loading: false },
        });
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
  const sureModifyPasswordSecond = () => {
    setModifyPasswordSecond({ ...modifyPasswordSecond, ...{ loading: true } });
    apiFetch({
      url: "/portal/customer/changePassword",
      params: {
        // 原始密码
        password: modifyPasswordFirst.formData[0].value,
        // 新密码
        newPassword: modifyPasswordSecond.formData[0].value,
      },
    })
      .then((res) => {
        if (res.success) {
          toastSuccess({ content: "修改成功" });
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

  const [bindPhoneFirst, setBindPhoneFirst] = useState<any>({
    open: false,
    loading: false,
    formData: [
      {
        label: "手机号",
        value: "",
        formItemType: "text",
      },
      {
        label: "验证码",
        value: "",
        formItemType: "input",
        placeholder: "请输入验证码",
        sendCode: true,
      },
    ],
    cancelText: "取消",
    okText: "下一步",
  });
  const [mobileTokenFirst, setMobileTokenFirst] = useState<any>();
  const [bindPhoneSecond, setBindPhoneSecond] = useState<any>({
    open: false,
    loading: false,
    formData: [
      {
        label: "新手机",
        value: "",
        // fieldName: 'phone',
        formItemType: "input",
        placeholder: "请输入新手机号",
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
              return Promise.reject("请输入新手机号");
            },
          }),
        ],
      },
      {
        label: "验证码",
        value: "",
        // fieldName: 'phoneCode',
        formItemType: "input",
        placeholder: "请输入验证码",
        sendCode: true,
        association: 0,
      },
    ],
    cancelText: "上一步",
    okText: "确认",
  });
  const [mobileTokenSecond, setMobileTokenSecond] = useState<any>();
  // 绑定修改手机号 - 第一步
  const closeBindPhoneFirst = () => {
    setBindPhoneFirst({ ...bindPhoneFirst, ...{ open: false } });
  };
  const cancelBindPhoneFirst = () => {
    setBindPhoneFirst({ ...bindPhoneFirst, ...{ open: false } });
  };
  const sureBindPhoneFirst = () => {
    // 设置加载中
    setBindPhoneFirst({ ...bindPhoneFirst, ...{ loading: true } });
    // 验证短信
    apiFetch({
      url: "/portal/customer/captchaCheck",
      params: {
        businessType: "MODIFY_MOBILE",
        sendType: "MOBILE",
        captchaToken: mobileTokenFirst,
        captchaValue: bindPhoneFirst.formData[1].value,
      },
    })
      .then((res) => {
        if (res.success) {
          // 关闭第一步，去下一步
          setBindPhoneFirst({
            ...bindPhoneFirst,
            ...{ loading: false, open: false },
          });
          setBindPhoneSecond({ ...bindPhoneSecond, ...{ open: true } });
        } else {
          setBindPhoneFirst({ ...bindPhoneFirst, ...{ loading: false } });
        }
      })
      .catch(() => {
        setBindPhoneFirst({ ...bindPhoneFirst, ...{ loading: false } });
      });
  };
  // 发送验证码
  const sendPhoneCode = (callBack?: any) => {
    apiFetch({
      url: "/portal/customer/captchaSend",
      params: {
        businessType: "MODIFY_MOBILE",
        sendType: "MOBILE",
        sendTo: userInfo.mobile,
      },
    }).then((res) => {
      if (res.success) {
        setMobileTokenFirst(res?.entity?.captchaToken);
        callBack && callBack();
      }
    });
  };
  // 绑定新手机，发送验证
  const sendPhoneCodeNew = (callBack?: any) => {
    apiFetch({
      url: "/portal/customer/captchaSend",
      params: {
        businessType: "MODIFY_MOBILE",
        sendType: "MOBILE",
        sendTo: bindPhoneSecond.formData[0].value,
      },
    }).then((res) => {
      if (res.success) {
        setMobileTokenSecond(res?.entity?.captchaToken);
        callBack && callBack();
      }
    });
  };
  // 绑定修改手机号 - 第二步
  const closeBindPhoneSecond = () => {
    setBindPhoneSecond({ ...bindPhoneSecond, ...{ open: false } });
  };
  const cancelBindPhoneSecond = () => {
    setBindPhoneSecond({ ...bindPhoneSecond, ...{ open: false } });
    setBindPhoneFirst({ ...bindPhoneFirst, ...{ open: true } });
  };
  const sureBindPhoneSecond = () => {
    setBindPhoneSecond({ ...bindPhoneSecond, ...{ loading: true } });
    apiFetch({
      url: "/portal/customer/modifyInfo",
      params: {
        modifyType: "MOBILE",
        captchaToken: mobileTokenSecond,
        modifyValue: bindPhoneSecond.formData[0].value,
        captchaValue: bindPhoneSecond.formData[1].value,
      },
    })
      .then((res) => {
        if (res.success) {
          toastSuccess({ content: "修改成功" });
          setBindPhoneSecond({
            ...bindPhoneSecond,
            ...{ loading: false, open: false },
          });
        } else {
          setBindPhoneSecond({ ...bindPhoneSecond, ...{ loading: false } });
        }
      })
      .catch(() => {
        setBindPhoneSecond({ ...bindPhoneSecond, ...{ loading: false } });
      });
  };

  const [bindEMailFirst, setBindEMailFirst] = useState<any>({
    open: false,
    loading: false,
    formData: [
      {
        label: "邮箱",
        value: "test@qq.com",
        formItemType: "text",
      },
      {
        label: "验证码",
        value: "",
        formItemType: "input",
        placeholder: "请输入验证码",
        sendCode: true,
      },
    ],
    cancelText: "取消",
    okText: "下一步",
  });
  const [tokenEMailFirst, setTokenEMailFirst] = useState<any>();
  const [bindEMailSecond, setBindEMailSecond] = useState<any>({
    open: false,
    loading: false,
    formData: [
      {
        label: "新邮箱",
        value: "",
        formItemType: "input",
        placeholder: "请输入新邮箱",
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
              return Promise.reject("请输入新邮箱");
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
    ],
    cancelText: "上一步",
    okText: "确认",
  });
  const [tokenEMailSecond, setTokenEMailSecond] = useState<any>();
  // 绑定修改邮箱 - 第一步
  const closeBindEMailFirst = () => {
    setBindEMailFirst({ ...bindEMailFirst, ...{ open: false } });
  };
  const cancelBindEMailFirst = () => {
    setBindEMailFirst({ ...bindEMailFirst, ...{ open: false } });
  };
  const sureBindEMailFirst = () => {
    // 设置加载中
    setBindPhoneFirst({ ...bindEMailFirst, ...{ loading: true } });
    // 验证短信
    apiFetch({
      url: "/portal/customer/captchaCheck",
      params: {
        businessType: "MODIFY_EMAIL",
        sendType: "EMAIL",
        captchaToken: tokenEMailFirst,
        captchaValue: bindEMailFirst.formData[1].value,
      },
    })
      .then((res) => {
        if (res.success) {
          // 关闭第一步，去下一步
          setBindEMailFirst({
            ...bindEMailFirst,
            ...{ loading: false, open: false },
          });
          setBindEMailSecond({ ...bindEMailSecond, ...{ open: true } });
        } else {
          setBindEMailSecond({ ...bindEMailSecond, ...{ loading: false } });
        }
      })
      .catch(() => {
        setBindEMailSecond({ ...bindEMailSecond, ...{ loading: false } });
      });
  };
  // 发送验证码
  const sendEMailCode = (callBack?: any) => {
    apiFetch({
      url: "/portal/customer/captchaSend",
      params: {
        businessType: "MODIFY_EMAIL",
        sendType: "EMAIL",
        sendTo: userInfo.email,
      },
    }).then((res) => {
      if (res.success) {
        setTokenEMailFirst(res?.entity?.captchaToken);
        callBack && callBack();
      }
    });
  };
  // 绑定邮箱，发送验证
  const sendEMailCodeNew = (callBack?: any) => {
    apiFetch({
      url: "/portal/customer/captchaSend",
      params: {
        businessType: "MODIFY_EMAIL",
        sendType: "EMAIL",
        sendTo: bindEMailSecond.formData[0].value,
      },
    }).then((res) => {
      if (res.success) {
        setTokenEMailSecond(res?.entity?.captchaToken);
        callBack && callBack();
      }
    });
  };
  // 绑定修改邮箱 - 第二步
  const closeBindEMailSecond = () => {
    setBindEMailSecond({ ...bindEMailSecond, ...{ open: false } });
  };
  const cancelBindEMailSecond = () => {
    setBindEMailSecond({ ...bindEMailSecond, ...{ open: false } });
    setBindEMailFirst({ ...bindEMailFirst, ...{ open: true } });
  };
  const sureBindEMailSecond = () => {
    setBindPhoneSecond({ ...bindEMailSecond, ...{ loading: true } });
    apiFetch({
      url: "/portal/customer/modifyInfo",
      params: {
        modifyType: "EMAIL",
        captchaToken: tokenEMailSecond,
        modifyValue: bindEMailSecond.formData[0].value,
        captchaValue: bindEMailSecond.formData[1].value,
      },
    })
      .then((res) => {
        if (res.success) {
          toastSuccess({ content: "修改成功" });
          setBindEMailSecond({
            ...bindEMailSecond,
            ...{ loading: false, open: false },
          });
        } else {
          setBindPhoneSecond({ ...bindEMailSecond, ...{ loading: false } });
        }
      })
      .catch(() => {
        setBindPhoneSecond({ ...bindEMailSecond, ...{ loading: false } });
      });
  };

  return (
    <ErrorBoundary>
      <div className="window-header">
        <div className="window-header-title">
          <div className="window-header-main-title header-main-title">
            {Locale.Settings.Title}
          </div>
          <div className="window-header-sub-title header-sub-title">
            {Locale.Settings.SubTitle}
          </div>
        </div>
        <div className="window-actions">
          {/* <div className="window-action-button">
            <IconButton
              icon={<ClearIcon />}
              onClick={() => {
                if (confirm(Locale.Settings.Actions.ConfirmClearAll)) {
                  chatStore.clearAllData();
                }
              }}
              bordered
              title={Locale.Settings.Actions.ClearAll}
            />
          </div>
          <div className="window-action-button">
            <IconButton
              icon={<ResetIcon />}
              onClick={() => {
                if (confirm(Locale.Settings.Actions.ConfirmResetAll)) {
                  resetConfig();
                }
              }}
              bordered
              title={Locale.Settings.Actions.ResetAll}
            />
          </div>
          <div className="window-action-button">
            <IconButton
              icon={<CloseIcon />}
              onClick={() => navigate(Path.Home)}
              bordered
              title={Locale.Settings.Actions.Close}
            />
          </div> */}
          <div
            className="window-action-button clickable"
            onClick={() => navigate(Path.Home)}
          >
            <Icon classNames={["icon-customer", "icon-close"]} />
          </div>
          {!isMobileScreen && (
            <div
              className="window-action-button clickable"
              onClick={() => {
                config.update(
                  (config) => (config.tightBorder = !config.tightBorder),
                );
              }}
            >
              {config.tightBorder ? (
                <Icon classNames={["icon-customer", "icon-narrow"]} />
              ) : (
                <Icon classNames={["icon-customer", "icon-enlarge"]} />
              )}
            </div>
          )}
        </div>
      </div>
      <div
        className={
          styles["settings"] +
          (isMobileScreen ? " " + styles["settings-mobile"] : "")
        }
      >
        {/* 修改登录密码 - 第一步 */}
        <GPTModal
          title="修改登录密码"
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
        ></GPTModal>
        {/* 修改登录密码 - 第二步 */}
        <GPTModal
          title="修改登录密码"
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
        {/* 修改绑定手机号 - 第一步 */}
        <GPTModal
          title="修改绑定手机号"
          className="text-form"
          open={bindPhoneFirst.open}
          formData={bindPhoneFirst.formData}
          btnSwitch={true}
          hasFeedback
          loading={bindPhoneFirst.loading}
          okText={bindPhoneFirst.okText}
          cancelText={bindPhoneFirst.cancelText}
          onClose={closeBindPhoneFirst}
          onCancel={cancelBindPhoneFirst}
          onOk={sureBindPhoneFirst}
          onSend={sendPhoneCode}
        ></GPTModal>
        {/* 修改绑定手机号 - 第二步 */}
        <GPTModal
          title="修改绑定手机号"
          className="text-form"
          open={bindPhoneSecond.open}
          formData={bindPhoneSecond.formData}
          btnSwitch={true}
          hasFeedback
          loading={bindPhoneSecond.loading}
          okText={bindPhoneSecond.okText}
          cancelText={bindPhoneSecond.cancelText}
          onClose={closeBindPhoneSecond}
          onCancel={cancelBindPhoneSecond}
          onOk={sureBindPhoneSecond}
          onSend={sendPhoneCodeNew}
        ></GPTModal>
        {/* 修改绑定邮箱 - 第一步 */}
        <GPTModal
          title="修改绑定邮箱"
          className="text-form"
          open={bindEMailFirst.open}
          formData={bindEMailFirst.formData}
          btnSwitch={true}
          hasFeedback
          loading={bindEMailFirst.loading}
          okText={bindEMailFirst.okText}
          cancelText={bindEMailFirst.cancelText}
          onClose={closeBindEMailFirst}
          onCancel={cancelBindEMailFirst}
          onOk={sureBindEMailFirst}
          onSend={sendEMailCode}
        ></GPTModal>
        {/* 修改绑定邮箱 - 第二步 */}
        <GPTModal
          title="修改绑定邮箱"
          className="text-form"
          open={bindEMailSecond.open}
          formData={bindEMailSecond.formData}
          btnSwitch={true}
          hasFeedback
          loading={bindEMailSecond.loading}
          okText={bindEMailSecond.okText}
          cancelText={bindEMailSecond.cancelText}
          onClose={closeBindEMailSecond}
          onCancel={cancelBindEMailSecond}
          onOk={sureBindEMailSecond}
          onSend={sendEMailCodeNew}
        ></GPTModal>
        <List>
          <ListItem
            title="会员昵称"
            icon={
              <Icon
                name={
                  theme === Theme.Dark
                    ? "icon-nickname-white.png"
                    : "icon-nickname-primary.png"
                }
              />
            }
          >
            {userInfo.nickName || ""}
          </ListItem>
          <ListItem
            title="绑定手机号"
            icon={
              <Icon
                name={
                  theme === Theme.Dark
                    ? "icon-phone-white.png"
                    : "icon-phone-primary.png"
                }
              />
            }
          >
            <span className={styles["setting-list-item-text"]}>
              {userMobileOmit}
              <span
                className={styles["item-text-icon"]}
                onClick={() => {
                  let tempBindPhoneFirst = JSON.parse(
                    JSON.stringify(bindPhoneFirst),
                  );
                  tempBindPhoneFirst.open = true;
                  tempBindPhoneFirst.formData[0].value = userMobileOmit;
                  setBindPhoneFirst(tempBindPhoneFirst);
                }}
              >
                <Icon
                  name={
                    theme === Theme.Dark
                      ? "icon-edit-folder-white.png"
                      : "icon-edit-folder-primary.png"
                  }
                />
              </span>
            </span>
          </ListItem>
          <ListItem
            title="绑定邮箱"
            icon={
              <Icon
                name={
                  theme === Theme.Dark
                    ? "icon-email-white.png"
                    : "icon-email-primary.png"
                }
              />
            }
          >
            <span className={styles["setting-list-item-text"]}>
              {userEMailOmit}
              <span
                className={styles["item-text-icon"]}
                onClick={() => {
                  setBindEMailFirst({ ...bindEMailFirst, ...{ open: true } });
                }}
              >
                <Icon
                  name={
                    theme === Theme.Dark
                      ? "icon-edit-folder-white.png"
                      : "icon-edit-folder-primary.png"
                  }
                />
              </span>
            </span>
          </ListItem>
          <ListItem
            title="登录密码"
            icon={
              <Icon
                name={
                  theme === Theme.Dark
                    ? "icon-password-white.png"
                    : "icon-password-primary.png"
                }
              />
            }
          >
            <Button
              key="sure"
              type="primary"
              onClick={() => {
                // setModifyLoginPwd({ ...modifyLoginPwd, ...{ open: true } });
                setModifyPasswordFirst({
                  ...modifyPasswordFirst,
                  ...{ open: true },
                });
              }}
            >
              修改
            </Button>
          </ListItem>
        </List>

        {/* <List>
          <ListItem title={Locale.Settings.Avatar}>
            <Popover
              onClose={() => setShowEmojiPicker(false)}
              content={
                <AvatarPicker
                  onEmojiClick={(avatar: string) => {
                    updateConfig((config) => (config.avatar = avatar));
                    setShowEmojiPicker(false);
                  }}
                />
              }
              open={showEmojiPicker}
            >
              <div
                className={styles.avatar}
                onClick={() => setShowEmojiPicker(true)}
              >
                <Avatar avatar={config.avatar} />
              </div>
            </Popover>
          </ListItem>

          <ListItem
            title={Locale.Settings.Update.Version(currentVersion ?? "unknown")}
            subTitle={
              checkingUpdate
                ? Locale.Settings.Update.IsChecking
                : hasNewVersion
                ? Locale.Settings.Update.FoundUpdate(remoteId ?? "ERROR")
                : Locale.Settings.Update.IsLatest
            }
          >
            {checkingUpdate ? (
              <LoadingIcon />
            ) : hasNewVersion ? (
              <Link href={UPDATE_URL} target="_blank" className="link">
                {Locale.Settings.Update.GoToUpdate}
              </Link>
            ) : (
              <IconButton
                icon={<ResetIcon></ResetIcon>}
                text={Locale.Settings.Update.CheckUpdate}
                onClick={() => checkUpdate(true)}
              />
            )}
          </ListItem>

          <ListItem title={Locale.Settings.SendKey}>
            <Select
              value={config.submitKey}
              onChange={(e) => {
                updateConfig(
                  (config) =>
                    (config.submitKey = e.target.value as any as SubmitKey),
                );
              }}
            >
              {Object.values(SubmitKey).map((v) => (
                <option value={v} key={v}>
                  {v}
                </option>
              ))}
            </Select>
          </ListItem>

          <ListItem title={Locale.Settings.Theme}>
            <Select
              value={config.theme}
              onChange={(e) => {
                updateConfig(
                  (config) => (config.theme = e.target.value as any as Theme),
                );
              }}
            >
              {Object.values(Theme).map((v) => (
                <option value={v} key={v}>
                  {v}
                </option>
              ))}
            </Select>
          </ListItem>

          <ListItem title={Locale.Settings.Lang.Name}>
            <Select
              value={getLang()}
              onChange={(e) => {
                changeLang(e.target.value as any);
              }}
            >
              {AllLangs.map((lang) => (
                <option value={lang} key={lang}>
                  {ALL_LANG_OPTIONS[lang]}
                </option>
              ))}
            </Select>
          </ListItem>

          <ListItem
            title={Locale.Settings.FontSize.Title}
            subTitle={Locale.Settings.FontSize.SubTitle}
          >
            <InputRange
              title={`${config.fontSize ?? 14}px`}
              value={config.fontSize}
              min="12"
              max="18"
              step="1"
              onChange={(e) =>
                updateConfig(
                  (config) =>
                    (config.fontSize = Number.parseInt(e.currentTarget.value)),
                )
              }
            ></InputRange>
          </ListItem>

          <ListItem
            title={Locale.Settings.SendPreviewBubble.Title}
            subTitle={Locale.Settings.SendPreviewBubble.SubTitle}
          >
            <input
              type="checkbox"
              checked={config.sendPreviewBubble}
              onChange={(e) =>
                updateConfig(
                  (config) =>
                    (config.sendPreviewBubble = e.currentTarget.checked),
                )
              }
            ></input>
          </ListItem>

          <ListItem
            title={Locale.Settings.Mask.Title}
            subTitle={Locale.Settings.Mask.SubTitle}
          >
            <input
              type="checkbox"
              checked={!config.dontShowMaskSplashScreen}
              onChange={(e) =>
                updateConfig(
                  (config) =>
                    (config.dontShowMaskSplashScreen =
                      !e.currentTarget.checked),
                )
              }
            ></input>
          </ListItem>
        </List>

        <List>
          {enabledAccessControl ? (
            <ListItem
              title={Locale.Settings.AccessCode.Title}
              subTitle={Locale.Settings.AccessCode.SubTitle}
            >
              <PasswordInput
                value={accessStore.accessCode}
                type="text"
                placeholder={Locale.Settings.AccessCode.Placeholder}
                onChange={(e) => {
                  accessStore.updateCode(e.currentTarget.value);
                }}
              />
            </ListItem>
          ) : (
            <></>
          )}

          {!accessStore.hideUserApiKey ? (
            <ListItem
              title={Locale.Settings.Token.Title}
              subTitle={Locale.Settings.Token.SubTitle}
            >
              <PasswordInput
                value={accessStore.token}
                type="text"
                placeholder={Locale.Settings.Token.Placeholder}
                onChange={(e) => {
                  accessStore.updateToken(e.currentTarget.value);
                }}
              />
            </ListItem>
          ) : null}

          <ListItem
            title={Locale.Settings.Usage.Title}
            subTitle={
              showUsage
                ? loadingUsage
                  ? Locale.Settings.Usage.IsChecking
                  : Locale.Settings.Usage.SubTitle(
                      usage?.used ?? "[?]",
                      usage?.subscription ?? "[?]",
                    )
                : Locale.Settings.Usage.NoAccess
            }
          >
            {!showUsage || loadingUsage ? (
              <div />
            ) : (
              <IconButton
                icon={<ResetIcon></ResetIcon>}
                text={Locale.Settings.Usage.Check}
                onClick={() => checkUsage(true)}
              />
            )}
          </ListItem>
        </List>

        <List>
          <ListItem
            title={Locale.Settings.Prompt.Disable.Title}
            subTitle={Locale.Settings.Prompt.Disable.SubTitle}
          >
            <input
              type="checkbox"
              checked={config.disablePromptHint}
              onChange={(e) =>
                updateConfig(
                  (config) =>
                    (config.disablePromptHint = e.currentTarget.checked),
                )
              }
            ></input>
          </ListItem>

          <ListItem
            title={Locale.Settings.Prompt.List}
            subTitle={Locale.Settings.Prompt.ListCount(
              builtinCount,
              customCount,
            )}
          >
            <IconButton
              icon={<EditIcon />}
              text={Locale.Settings.Prompt.Edit}
              onClick={() => setShowPromptModal(true)}
            />
          </ListItem>
        </List>

        <List>
          <ModelConfigList
            modelConfig={config.modelConfig}
            updateConfig={(updater) => {
              const modelConfig = { ...config.modelConfig };
              updater(modelConfig);
              config.update((config) => (config.modelConfig = modelConfig));
            }}
          />
        </List>

        {shouldShowPromptModal && (
          <UserPromptModal onClose={() => setShowPromptModal(false)} />
        )} */}
      </div>
    </ErrorBoundary>
  );
}
