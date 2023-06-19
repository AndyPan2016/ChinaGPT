/**
 * 修改内容弹窗 TSX
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年6月18日22:55:16 - 创建
 */

import { useEffect, useState } from "react";
import { Modal, Form, Input, Button } from "antd";
import { IModifyModal } from "./types";
import styles from "./index.module.scss";
import { Icon } from "../tools/index";

export const ModifyModal = ({
  title,
  open,
  formData,
  onOk,
  onCancel,
}: IModifyModal) => {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(formData);
  }, [formData]);

  const sureModify = () => {
    form.validateFields().then(async (res) => {
      onOk && onOk(res);
    });
  };

  const cancelModify = () => {
    onCancel && onCancel();
  };

  return (
    <Modal
      title={<span className={styles["modify-modal-title"]}>{title}</span>}
      centered
      open={open}
      onCancel={cancelModify}
      footer={[
        <Button key="modify" type="primary" onClick={sureModify}>
          修改
        </Button>,
        <Button key="cancel" onClick={cancelModify}>
          取消
        </Button>,
      ]}
    >
      <Form
        form={form}
        requiredMark={false}
        labelCol={{ span: 1 }}
        wrapperCol={{ span: 2 }}
      >
        <Form.Item
          name="name"
          label={<Icon name="icon-folder-primary.png" />}
          rules={[
            {
              required: true,
              message: "请输入类型名称",
            },
          ]}
        >
          <Input
            style={{ fontSize: 14, maxWidth: "initial", textAlign: "left" }}
            placeholder="请输入类型名称"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};