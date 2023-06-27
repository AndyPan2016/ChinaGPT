import { IconButton } from "./button";
import { ErrorBoundary } from "./error";

import styles from "./role.module.scss";

import DownloadIcon from "../icons/download.svg";
import UploadIcon from "../icons/upload.svg";
import EditIcon from "../icons/edit.svg";
import AddIcon from "../icons/add.svg";
import CloseIcon from "../icons/close.svg";
import DeleteIcon from "../icons/delete.svg";
import EyeIcon from "../icons/eye.svg";
import CopyIcon from "../icons/copy.svg";

import { DEFAULT_MASK_AVATAR, Mask, useMaskStore } from "../store/mask";
import {
  ChatMessage,
  ModelConfig,
  useAppConfig,
  useChatStore,
  Theme,
} from "../store";
import { ROLES } from "../client/api";
import { Input, List, ListItem, Modal, Popover, Select } from "./ui-lib";
import { Avatar, AvatarPicker } from "./emoji";
import Locale, { AllLangs, ALL_LANG_OPTIONS, Lang } from "../locales";
import { useNavigate } from "react-router-dom";

import chatStyle from "./chat.module.scss";
import { useEffect, useState } from "react";
import { downloadAs, readFromFile, useMobileScreen } from "../utils";
import { Updater } from "../typing";
import { ModelConfigList } from "./model-config";
import { FileName, Path } from "../constant";
import { BUILTIN_MASK_STORE } from "../masks";
import { Icon, IconGroup } from "./tools";
import { GPTModal } from "./gpt-modal";
import { apiFetch } from "../api/api.fetch";

export function MaskAvatar(props: { mask: Mask }) {
  return props.mask.avatar !== DEFAULT_MASK_AVATAR ? (
    <Avatar avatar={props.mask.avatar} />
  ) : (
    <Avatar model={props.mask.modelConfig.model} />
  );
}

export function MaskConfig(props: {
  mask: Mask;
  updateMask: Updater<Mask>;
  extraListItems?: JSX.Element;
  readonly?: boolean;
  shouldSyncFromGlobal?: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const updateConfig = (updater: (config: ModelConfig) => void) => {
    if (props.readonly) return;

    const config = { ...props.mask.modelConfig };
    updater(config);
    props.updateMask((mask) => {
      mask.modelConfig = config;
      // if user changed current session mask, it will disable auto sync
      mask.syncGlobalConfig = false;
    });
  };

  const globalConfig = useAppConfig();

  return (
    <>
      <ContextPrompts
        context={props.mask.context}
        updateContext={(updater) => {
          const context = props.mask.context.slice();
          updater(context);
          props.updateMask((mask) => (mask.context = context));
        }}
      />

      <List>
        <ListItem title={Locale.Mask.Config.Avatar}>
          <Popover
            content={
              <AvatarPicker
                onEmojiClick={(emoji) => {
                  props.updateMask((mask) => (mask.avatar = emoji));
                  setShowPicker(false);
                }}
              ></AvatarPicker>
            }
            open={showPicker}
            onClose={() => setShowPicker(false)}
          >
            <div
              onClick={() => setShowPicker(true)}
              style={{ cursor: "pointer" }}
            >
              <MaskAvatar mask={props.mask} />
            </div>
          </Popover>
        </ListItem>
        <ListItem title={Locale.Mask.Config.Name}>
          <input
            type="text"
            value={props.mask.name}
            onInput={(e) =>
              props.updateMask((mask) => {
                mask.name = e.currentTarget.value;
              })
            }
          ></input>
        </ListItem>
        <ListItem
          title={Locale.Mask.Config.HideContext.Title}
          subTitle={Locale.Mask.Config.HideContext.SubTitle}
        >
          <input
            type="checkbox"
            checked={props.mask.hideContext}
            onChange={(e) => {
              props.updateMask((mask) => {
                mask.hideContext = e.currentTarget.checked;
              });
            }}
          ></input>
        </ListItem>
        {props.shouldSyncFromGlobal ? (
          <ListItem
            title={Locale.Mask.Config.Sync.Title}
            subTitle={Locale.Mask.Config.Sync.SubTitle}
          >
            <input
              type="checkbox"
              checked={props.mask.syncGlobalConfig}
              onChange={(e) => {
                if (
                  e.currentTarget.checked &&
                  confirm(Locale.Mask.Config.Sync.Confirm)
                ) {
                  props.updateMask((mask) => {
                    mask.syncGlobalConfig = e.currentTarget.checked;
                    mask.modelConfig = { ...globalConfig.modelConfig };
                  });
                }
              }}
            ></input>
          </ListItem>
        ) : null}
      </List>

      <List>
        <ModelConfigList
          modelConfig={{ ...props.mask.modelConfig }}
          updateConfig={updateConfig}
        />
        {props.extraListItems}
      </List>
    </>
  );
}

function ContextPromptItem(props: {
  prompt: ChatMessage;
  update: (prompt: ChatMessage) => void;
  remove: () => void;
}) {
  const [focusingInput, setFocusingInput] = useState(false);

  return (
    <div className={chatStyle["context-prompt-row"]}>
      {!focusingInput && (
        <Select
          value={props.prompt.role}
          className={chatStyle["context-role"]}
          onChange={(e) =>
            props.update({
              ...props.prompt,
              role: e.target.value as any,
            })
          }
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      )}
      <Input
        value={props.prompt.content}
        type="text"
        className={chatStyle["context-content"]}
        rows={focusingInput ? 5 : 1}
        onFocus={() => setFocusingInput(true)}
        onBlur={() => setFocusingInput(false)}
        onInput={(e) =>
          props.update({
            ...props.prompt,
            content: e.currentTarget.value as any,
          })
        }
      />
      {!focusingInput && (
        <IconButton
          icon={<DeleteIcon />}
          className={chatStyle["context-delete-button"]}
          onClick={() => props.remove()}
          bordered
        />
      )}
    </div>
  );
}

export function ContextPrompts(props: {
  context: ChatMessage[];
  updateContext: (updater: (context: ChatMessage[]) => void) => void;
}) {
  const context = props.context;

  const addContextPrompt = (prompt: ChatMessage) => {
    props.updateContext((context) => context.push(prompt));
  };

  const removeContextPrompt = (i: number) => {
    props.updateContext((context) => context.splice(i, 1));
  };

  const updateContextPrompt = (i: number, prompt: ChatMessage) => {
    props.updateContext((context) => (context[i] = prompt));
  };

  return (
    <>
      <div className={chatStyle["context-prompt"]} style={{ marginBottom: 20 }}>
        {context.map((c, i) => (
          <ContextPromptItem
            key={i}
            prompt={c}
            update={(prompt) => updateContextPrompt(i, prompt)}
            remove={() => removeContextPrompt(i)}
          />
        ))}

        <div className={chatStyle["context-prompt-row"]}>
          <IconButton
            icon={<AddIcon />}
            text={Locale.Context.Add}
            bordered
            className={chatStyle["context-prompt-button"]}
            onClick={() =>
              addContextPrompt({
                role: "user",
                content: "",
                date: "",
              })
            }
          />
        </div>
      </div>
    </>
  );
}

export function MaskPage() {
  const isMobileScreen = useMobileScreen();
  const config = useAppConfig();
  const theme = config.theme;
  const navigate = useNavigate();

  const maskStore = useMaskStore();
  const chatStore = useChatStore();

  const [filterLang, setFilterLang] = useState<Lang>();

  const allMasks = maskStore
    .getAll()
    .filter((m) => !filterLang || m.lang === filterLang);

  const [searchMasks, setSearchMasks] = useState<Mask[]>([]);
  const [searchText, setSearchText] = useState("");
  const masks = searchText.length > 0 ? searchMasks : allMasks;

  // simple search, will refactor later
  const onSearch = (text: string) => {
    setSearchText(text);
    if (text.length > 0) {
      const result = allMasks.filter((m) => m.name.includes(text));
      setSearchMasks(result);
    } else {
      setSearchMasks(allMasks);
    }
  };

  const [editingMaskId, setEditingMaskId] = useState<number | undefined>();
  const editingMask =
    maskStore.get(editingMaskId) ?? BUILTIN_MASK_STORE.get(editingMaskId);
  const closeMaskModal = () => setEditingMaskId(undefined);

  const downloadAll = () => {
    downloadAs(JSON.stringify(masks), FileName.Masks);
  };

  const importFromFile = () => {
    readFromFile().then((content) => {
      try {
        const importMasks = JSON.parse(content);
        if (Array.isArray(importMasks)) {
          for (const mask of importMasks) {
            if (mask.name) {
              maskStore.create(mask);
            }
          }
          return;
        }
        //if the content is a single mask.
        if (importMasks.name) {
          maskStore.create(importMasks);
        }
      } catch {}
    });
  };

  // 删除会话确认弹窗打开|关闭
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  // 删除会话数据
  const [deleteFormData, setDeleteFormData] = useState<Array<any>>([]);
  // 确认删除会话
  const sureDelete = (res: any) => {
    // maskStore.deleteMask(res[0].id);
    setDeleteOpen(false);
  };

  const [modifyOpen, setModifyOpen] = useState<boolean>(false);
  const [modifyFormData, setModifyFormData] = useState<Array<any>>([]);
  const sureModify = (res: any) => {
    console.info(res);
    setModifyOpen(false);
  };

  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [addFormData, setAddFormData] = useState<Array<any>>([]);
  const sureAdd = (res: any) => {
    console.info(res);
    setAddOpen(false);
    let params = { role: "system", title: res[0].value, content: res[1].value };
    apiFetch({ url: "/portal/prompt/save", params }).then((res: any) => {
      console.info(res);
    });
  };
  // console.info(process)

  return (
    <ErrorBoundary>
      <div
        className={
          styles["mask-page"] +
          (isMobileScreen ? " " + styles["mask-page-mobile"] : "")
        }
      >
        <div className="window-header">
          <div className="window-header-title">
            <div className="window-header-main-title header-main-title">
              自定义预设角色
            </div>
            <div className="window-header-sub-title header-sub-title">
              您有 {allMasks.length}个 自定义角色
            </div>
          </div>

          <div className="window-actions">
            {/* <div className="window-action-button">
              <IconButton
                icon={<DownloadIcon />}
                bordered
                onClick={downloadAll}
              />
            </div>
            <div className="window-action-button">
              <IconButton
                icon={<UploadIcon />}
                bordered
                onClick={() => importFromFile()}
              />
            </div>
            <div className="window-action-button">
              <IconButton
                icon={<CloseIcon />}
                bordered
                onClick={() => navigate(-1)}
              />
            </div> */}
            <div
              className="window-action-button clickable"
              onClick={() => navigate(-1)}
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

        <div className={styles["mask-page-body"]}>
          {/* <div className={styles["mask-filter"]}>
            <input
              type="text"
              className={styles["search-bar"]}
              placeholder={Locale.Mask.Page.Search}
              autoFocus
              onInput={(e) => onSearch(e.currentTarget.value)}
            />
            <Select
              className={styles["mask-filter-lang"]}
              value={filterLang ?? Locale.Settings.Lang.All}
              onChange={(e) => {
                const value = e.currentTarget.value;
                if (value === Locale.Settings.Lang.All) {
                  setFilterLang(undefined);
                } else {
                  setFilterLang(value as Lang);
                }
              }}
            >
              <option key="all" value={Locale.Settings.Lang.All}>
                {Locale.Settings.Lang.All}
              </option>
              {AllLangs.map((lang) => (
                <option value={lang} key={lang}>
                  {ALL_LANG_OPTIONS[lang]}
                </option>
              ))}
            </Select>

            <IconButton
              className={styles["mask-create"]}
              icon={<AddIcon />}
              text={Locale.Mask.Page.Create}
              bordered
              onClick={() => {
                const createdMask = maskStore.create();
                setEditingMaskId(createdMask.id);
              }}
            />
          </div> */}
          <GPTModal
            open={deleteOpen}
            title="删除会话"
            titleIcon="icon-status-error.png"
            formData={deleteFormData}
            okText="删除"
            onCancel={() => {
              setDeleteOpen(false);
            }}
            onOk={sureDelete}
          />
          <GPTModal
            open={modifyOpen}
            title="修改自定义预设角色"
            formData={modifyFormData}
            okText="修改"
            onCancel={() => {
              setModifyOpen(false);
            }}
            onOk={sureModify}
          />
          <GPTModal
            open={addOpen}
            title="添加自定义预设角色"
            formData={addFormData}
            onCancel={() => {
              setAddOpen(false);
            }}
            onOk={sureAdd}
          />
          <div>
            {masks.map((m: any, idx: number) => (
              <div className={styles["mask-item"]} key={m.id}>
                <div className={styles["mask-header"]}>
                  <div className={styles["mask-icon"]}>
                    {/* <MaskAvatar mask={m} /> */}
                    <Icon
                      name={
                        theme === Theme.Dark
                          ? "icon-nickname-white.png"
                          : "icon-nickname-primary.png"
                      }
                    />
                  </div>
                  <div className={styles["mask-title"]}>
                    <div className={styles["mask-name"]}>{m.name}</div>
                    {/* <div className={styles["mask-info"] + " one-line"}>
                      {`${Locale.Mask.Item.Info(m.context.length)} / ${
                        ALL_LANG_OPTIONS[m.lang]
                      } / ${m.modelConfig.model}`}
                    </div> */}
                  </div>
                </div>
                <div className={styles["mask-actions"]}>
                  <span
                    className={styles["icon-wrap"]}
                    onClick={() => {
                      setModifyFormData([
                        {
                          id: m.id,
                          label: (
                            <Icon
                              name="icon-role-primary.png"
                              transTheme={true}
                            />
                          ),
                          value: m.name,
                          placeholder: "请输入预设角色名称",
                          formItemType: "input",
                        },
                        {
                          id: m.id,
                          label: (
                            <Icon
                              name="icon-edit-folder-primary.png"
                              transTheme={true}
                            />
                          ),
                          value: m.context[0].content,
                          placeholder:
                            "请对预设角色进行详细描述 如：我想让你扮演医生的角色，想出创造性的治疗方法来治疗疾病。您应该能够推荐常规药物、草药和其他天然替代品。",
                          formItemType: "textarea",
                        },
                      ]);
                      setModifyOpen(true);
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
                  <span
                    className={styles["icon-wrap"]}
                    onClick={() => {
                      setDeleteFormData([
                        {
                          label: (
                            <Icon
                              name="icon-version-primary.png"
                              transTheme={true}
                            />
                          ),
                          value:
                            "是否删除预设角色？删除预设角色后，不会影响历史会话内容，但后续不可在使用该预设角色。",
                          formItemType: "text",
                          id: m.id,
                        },
                      ]);
                      setDeleteOpen(true);
                    }}
                  >
                    <Icon
                      name={
                        theme === Theme.Dark
                          ? "icon-delete-white.png"
                          : "icon-delete-primary.png"
                      }
                    />
                  </span>
                  {/* <IconButton
                    icon={<AddIcon />}
                    text={Locale.Mask.Item.Chat}
                    onClick={() => {
                      chatStore.newSession(m);
                      navigate(Path.Chat);
                    }}
                  />
                  {m.builtin ? (
                    <IconButton
                      icon={<EyeIcon />}
                      text={Locale.Mask.Item.View}
                      onClick={() => setEditingMaskId(m.id)}
                    />
                  ) : (
                    <IconButton
                      icon={<EditIcon />}
                      text={Locale.Mask.Item.Edit}
                      onClick={() => setEditingMaskId(m.id)}
                    />
                  )}
                  {!m.builtin && (
                    <IconButton
                      icon={<DeleteIcon />}
                      text={Locale.Mask.Item.Delete}
                      onClick={() => {
                        if (confirm(Locale.Mask.Item.DeleteConfirm)) {
                          maskStore.delete(m.id);
                        }
                      }}
                    />
                  )} */}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles["mask-footer"]}>
          <div
            className={styles["sidebar-btn-new"]}
            onClick={() => {
              setAddFormData([
                {
                  label: (
                    <Icon name="icon-role-primary.png" transTheme={true} />
                  ),
                  value: "",
                  placeholder: "请输入预设角色名称",
                  formItemType: "input",
                },
                {
                  label: (
                    <Icon
                      name="icon-edit-folder-primary.png"
                      transTheme={true}
                    />
                  ),
                  value: "",
                  placeholder:
                    "请对预设角色进行详细描述 如：我想让你扮演医生的角色，想出创造性的治疗方法来治疗疾病。您应该能够推荐常规药物、草药和其他天然替代品。",
                  formItemType: "textarea",
                },
              ]);
              setAddOpen(true);
            }}
          >
            <span className={styles["sidebar-btn-text"]} onClick={() => {}}>
              <Icon name="icon-add-white.png" />
              &nbsp;添加预设角色
            </span>
          </div>
        </div>
      </div>

      {editingMask && (
        <div className="modal-mask">
          <Modal
            title={Locale.Mask.EditModal.Title(editingMask?.builtin)}
            onClose={closeMaskModal}
            actions={[
              <IconButton
                icon={<DownloadIcon />}
                text={Locale.Mask.EditModal.Download}
                key="export"
                bordered
                onClick={() =>
                  downloadAs(
                    JSON.stringify(editingMask),
                    `${editingMask.name}.json`,
                  )
                }
              />,
              <IconButton
                key="copy"
                icon={<CopyIcon />}
                bordered
                text={Locale.Mask.EditModal.Clone}
                onClick={() => {
                  navigate(Path.Masks);
                  maskStore.create(editingMask);
                  setEditingMaskId(undefined);
                }}
              />,
            ]}
          >
            <MaskConfig
              mask={editingMask}
              updateMask={(updater) =>
                maskStore.update(editingMaskId!, updater)
              }
              readonly={editingMask.builtin}
            />
          </Modal>
        </div>
      )}
    </ErrorBoundary>
  );
}
