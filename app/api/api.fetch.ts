import { showModalGPT, showToastGPT } from "../components/ui-lib";
import { getServerSideConfig } from "../config/server";
const serverConfig = getServerSideConfig();

export interface IAPI {
  url: string;
  method?: string;
  params?: any;
  headers?: any;
}

const renderBaseUrl = (url: string) => {
  const baseUrl =
    serverConfig.nodeEnv === "development" ? "/acooly/" : serverConfig.baseUrl;
  // baseUrl最后是否是/
  let baseUrlHasSlash =
    baseUrl?.lastIndexOf("/") === (baseUrl?.length || 0) - 1;
  // url开始是否是/
  let urlHasSlash = url ? url[0] === "/" : false;
  let theUrl: string = "";
  if (baseUrlHasSlash && urlHasSlash) {
    // 都有斜杠
    theUrl = baseUrl + url.substring(1, url.length);
  } else if (!baseUrlHasSlash && !urlHasSlash) {
    // 都没得斜杠
    theUrl = baseUrl + "/" + url;
  } else {
    // 其中一个有斜杠
    theUrl = baseUrl + url;
  }
  return theUrl;
};

export const apiFetch = (options: IAPI) => {
  return fetch(renderBaseUrl(options.url), {
    method: options.method || "post",
    body: JSON.stringify(options.params || {}),
    headers: {
      "Content-Type": "application/json",
      "x-requested-with": "XMLHttpRequest",
      ...options.headers,
    },
  })
    .then((res: any) => res.json())
    .then((res: any) => {
      if (!res.success) {
        showToastGPT({
          content: res.message || "请求失败",
        });
      }
      return res;
    });
};
