/**
 * 登录
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年6月10日16:26:45 - 创建
 */

import { Link, useNavigate } from "react-router-dom";
import { Path } from "../../constant";
import { useMobileScreen } from "../../utils";
import styles from "./index.module.scss";

export const Login = () => {
  const isMobileScreen = useMobileScreen();

  return (
    <div className={styles["login-wrap"]}>
      {!isMobileScreen ? <div className={styles["login-thumb"]}></div> : null}
      <div className={styles["login-form-container"]}>
        <div className={styles["login-form-wrap"]}>
          <div className={styles["login-wrap-head"]}>
            <span className={styles["title"]}>注册</span>
            <span className={styles["title-remark"]}>
              已有账号？
              <Link className={styles["to-login"]} to={Path.Login}>
                登录
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
