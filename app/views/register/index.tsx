/**
 * 注册
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年6月10日16:43:18 - 创建
 */

import { Form } from "antd";
import styles from "./index.module.scss";

export const Register = () => {
  const [registForm] = Form.useForm();

  return (
    <div className={styles["regist-main"]}>
      <Form
        form={registForm}
        requiredMark={false}
        labelCol={{ span: 1 }}
        wrapperCol={{ span: 2 }}
      >
        <Form.Item name=""></Form.Item>
      </Form>
    </div>
  );
};
