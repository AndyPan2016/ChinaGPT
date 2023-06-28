"use client";

require("../polyfill");

import { useState, useEffect } from "react";

import styles from "./home.module.scss";

import BotIcon from "../icons/bot.svg";
import LoadingIcon from "../icons/three-dots.svg";
import LogoIcon from "../icons/three-dots.svg";

import { getCSSVar, useMobileScreen } from "../utils";

import dynamic from "next/dynamic";
import { Path, SlotID } from "../constant";
import { ErrorBoundary } from "./error";

import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { SideBar } from "./sidebar";
import { useAppConfig } from "../store/config";
import { AuthPage } from "./auth";
import { Icon } from "./tools";

export function Loading(props: { noLogo?: boolean }) {
  return (
    <div className={styles["loading-content"] + " no-dark"}>
      {!props.noLogo && <BotIcon />}
      <LoadingIcon />
    </div>
  );
}

// 登录
const Login = dynamic(
  async () => (await import("../views/login/index")).Login,
  {
    loading: () => <Loading noLogo />,
  },
);

// 注册
const Register = dynamic(
  async () => (await import("../views/register/index")).Register,
  {
    loading: () => <Loading noLogo />,
  },
);

// 找回密码
const RetrievePassword = dynamic(
  async () =>
    (await import("../views/retrieve-password/index")).RetrievePassword,
  {
    loading: () => <Loading noLogo />,
  },
);

// 角色
const Role = dynamic(async () => (await import("./role")).MaskPage, {
  loading: () => <Loading noLogo />,
});

const Settings = dynamic(async () => (await import("./settings")).Settings, {
  loading: () => <Loading noLogo />,
});

const Chat = dynamic(async () => (await import("./chat")).Chat, {
  loading: () => <Loading noLogo />,
});

const NewChat = dynamic(async () => (await import("./new-chat")).NewChat, {
  loading: () => <Loading noLogo />,
});

const MaskPage = dynamic(async () => (await import("./mask")).MaskPage, {
  loading: () => <Loading noLogo />,
});

export function useSwitchTheme() {
  const config = useAppConfig();

  useEffect(() => {
    document.body.classList.remove("light");
    document.body.classList.remove("dark");

    if (config.theme === "dark") {
      document.body.classList.add("dark");
    } else if (config.theme === "light") {
      document.body.classList.add("light");
    }

    const metaDescriptionDark = document.querySelector(
      'meta[name="theme-color"][media*="dark"]',
    );
    const metaDescriptionLight = document.querySelector(
      'meta[name="theme-color"][media*="light"]',
    );

    if (config.theme === "auto") {
      metaDescriptionDark?.setAttribute("content", "#151515");
      metaDescriptionLight?.setAttribute("content", "#fafafa");
    } else {
      const themeColor = getCSSVar("--theme-color");
      metaDescriptionDark?.setAttribute("content", themeColor);
      metaDescriptionLight?.setAttribute("content", themeColor);
    }
  }, [config.theme]);
}

const useHasHydrated = () => {
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated;
};

const loadAsyncGoogleFont = () => {
  const linkEl = document.createElement("link");
  linkEl.rel = "stylesheet";
  linkEl.href =
    "/google-fonts/css2?family=Noto+Sans+SC:wght@300;400;700;900&display=swap";
  document.head.appendChild(linkEl);
};

/**
 * 头部
 */
const GPTWindowHeader = () => {
  const config = useAppConfig();
  const isMobileScreen = useMobileScreen();
  return (
    <div
      className={
        styles["gpt-window-header"] +
        (config.tightBorder && !isMobileScreen ? " " + styles["full"] : "")
      }
    >
      <div className={styles["gpt-header-wrap"]}>
        <Icon name="icon-role-primary.png" width="48px" height="48px" />
        <span className={styles["gpt-logp-text"]}>CHINAGPT</span>
      </div>
    </div>
  );
};

/**
 * 底部
 */
const GPTWindowFooter = () => {
  const config = useAppConfig();
  const isMobileScreen = useMobileScreen();
  return (
    <div
      className={
        styles["gpt-window-footer"] +
        (config.tightBorder && !isMobileScreen ? " " + styles["full"] : "")
      }
    >
      <a href="javascript:;" className={styles["footer-item"]}>
        京公网安备 110000002000001 号
      </a>
      <a href="javascript:;" className={styles["footer-item"]}>
        京ICP证 030173 号
      </a>
    </div>
  );
};

function Screen() {
  const config = useAppConfig();
  const location = useLocation();
  const isHome = location.pathname === Path.Home;
  const isAuth = location.pathname === Path.Auth;
  const isMobileScreen = useMobileScreen();
  const [isFullCont, setIsFullCont] = useState<boolean>(false);

  useEffect(() => {
    loadAsyncGoogleFont();
  }, []);
  useEffect(() => {
    setIsFullCont(
      ["/login", "/register", "/retrieve-password"].includes(location.pathname),
    );
  }, [location.pathname]);

  return (
    <>
      {/* 头部 */}
      <GPTWindowHeader />
      {/* chat 内容主容器 */}
      <div
        className={
          styles.container +
          (isFullCont ? " " + styles["full-cont"] : "") +
          ` ${
            config.tightBorder && !isMobileScreen
              ? styles["tight-container"]
              : styles.container
          }`
        }
      >
        {isAuth ? (
          <>
            <AuthPage />
          </>
        ) : (
          <>
            {!isFullCont ? (
              <SideBar className={isHome ? styles["sidebar-show"] : ""} />
            ) : null}
            <div
              className={
                styles["window-content"] +
                (isFullCont ? " " + styles["full"] : "")
              }
              id={SlotID.AppBody}
            >
              <Routes>
                {/* 登录 */}
                <Route path={Path.Login} element={<Login />} />
                {/* 注册 */}
                <Route path={Path.Register} element={<Register />} />
                {/* 找回密码 */}
                <Route
                  path={Path.RetrievePassword}
                  element={<RetrievePassword />}
                />
                <Route path={Path.Role} element={<Role />} />
                <Route path={Path.Home} element={<Chat />} />
                <Route path={Path.NewChat} element={<NewChat />} />
                <Route path={Path.Masks} element={<MaskPage />} />
                <Route path={Path.Chat} element={<Chat />} />
                <Route path={Path.Settings} element={<Settings />} />
              </Routes>
            </div>
          </>
        )}
      </div>
      {/* 底部 */}
      <GPTWindowFooter />
    </>
  );
}

export function Home() {
  useSwitchTheme();

  if (!useHasHydrated()) {
    return <Loading />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <Screen />
      </Router>
    </ErrorBoundary>
  );
}
