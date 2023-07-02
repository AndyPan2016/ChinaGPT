import { showModalGPT, showToastGPT, toastFail } from "../components/ui-lib";
import { getServerSideConfig } from "../config/server";
import { assembleUrlParams } from "../utils";
const serverConfig = getServerSideConfig();

export interface IAPI {
  url: string;
  method?: string;
  params?: any;
  headers?: any;
}

const renderBaseUrl = (options: any) => {
  let url = options?.url
  let query = options?.query
  const baseUrl =
    serverConfig.nodeEnv === "development"
    ? (options.socket ? '/socket/' : "/acooly/")
    : (options.socket ? serverConfig.baseUrlSocket : serverConfig.baseUrl);
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
  if (query) {
    theUrl = assembleUrlParams({
      url: theUrl,
      params: {
        params: query
      }
    })
  }
  return theUrl;
};

// API请求
export const apiFetch = (options: IAPI) => {
  let method = (options.method || "post").toLocaleLowerCase()
  let fetchOptions: any = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-requested-with": "XMLHttpRequest",
      ...options.headers,
    },
  }
  // get方式，参数传url上
  let url = renderBaseUrl({url: options.url || '', query: (method === 'get' ? options.params : null)})
  // pos方式，参数传body
  if (fetchOptions.method.toLocaleLowerCase() === 'post') {
    fetchOptions.body = JSON.stringify(options.params || {})
  }
  return fetch(url, fetchOptions)
    .then((res: any) => res.json())
    .then((res: any) => {
      if (!res.success) {
        if (res.code === "LOGIN_TIMEOUT") {
          window.location.href = '/#/login'
        }
        toastFail({
          content: res.message || "请求失败",
        });
      }
      return res;
    }).catch((err) => {
      console.info(err)
      return err
    });
};

// WebSocket
export const apiSocket = (options: any) => {
  options = options || {}
  let TheSocket: any;
  if (!typeof(WebSocket)) {
    toastFail({content: "您的浏览器不支持WebSocket"});
  } else {
    // let baseUrl = renderBaseUrl({url: '/portal/chatSocket/' + options.sessionNo, socket: true})
    // console.info(baseUrl)
    // // 创建socket
    // TheSocket = new WebSocket(baseUrl)
    TheSocket = new WebSocket('ws://119.13.101.192:8680/portal/chatSocket/' + options.sessionNo)
    // 建立连接
    TheSocket.onopen = function () {
      console.info('socket 已建立连接')
    }
    // 接收消息
    TheSocket.onmessage = function (msg: any) {
      let msgData = msg.data
      let res: any = {}
      if (msgData.indexOf('[ERROR]') > -1) {
        res.error = msgData
      } else if (msgData === '[DONE]') {

      } else {
        res.message = JSON.parse(msgData)
      }
      options.onMessage && options.onMessage(res)
    };
    // 连接关闭
    TheSocket.onclose = function () {
      console.info('socket 连接已断开');
    };
    //发生了错误事件
    TheSocket.onerror = function (err: any) {
      console.info(err)
    }
    // 关闭连接
    window.unload = function () {
      TheSocket.close();
    };
  }
  return TheSocket
}
