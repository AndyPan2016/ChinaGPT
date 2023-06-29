import { useEffect, useState } from "react";
import { showToast, showToastGPT } from "./components/ui-lib";
import Locale from "./locales";

export function trimTopic(topic: string) {
  return topic.replace(/[，。！？”“"、,.!?]*$/, "");
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    showToastGPT({ content: Locale.Copy.Success, type: "success" });
  } catch (error) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      showToastGPT({ content: Locale.Copy.Success, type: "success" });
    } catch (error) {
      showToastGPT({ content: Locale.Copy.Failed, type: "fail" });
    }
    document.body.removeChild(textArea);
  }
}

export function downloadAs(text: string, filename: string) {
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text),
  );
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

export function readFromFile() {
  return new Promise<string>((res, rej) => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/json";

    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      const fileReader = new FileReader();
      fileReader.onload = (e: any) => {
        res(e.target.result);
      };
      fileReader.onerror = (e) => rej(e);
      fileReader.readAsText(file);
    };

    fileInput.click();
  });
}

export function isIOS() {
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

export function useWindowSize() {
  try {
    const [size, setSize] = useState({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    useEffect(() => {
      const onResize = () => {
        setSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };

      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
      };
    }, []);

    return size;
  } catch (e: any) {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
}

export const MOBILE_MAX_WIDTH = 600;
export function useMobileScreen() {
  const { width } = useWindowSize();

  return width <= MOBILE_MAX_WIDTH;
}

export function isFirefox() {
  return (
    typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent)
  );
}

export function selectOrCopy(el: HTMLElement, content: string) {
  const currentSelection = window.getSelection();

  if (currentSelection?.type === "Range") {
    return false;
  }

  copyToClipboard(content);

  return true;
}

function getDomContentWidth(dom: HTMLElement) {
  const style = window.getComputedStyle(dom);
  const paddingWidth =
    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const width = dom.clientWidth - paddingWidth;
  return width;
}

function getOrCreateMeasureDom(id: string, init?: (dom: HTMLElement) => void) {
  let dom = document.getElementById(id);

  if (!dom) {
    dom = document.createElement("span");
    dom.style.position = "absolute";
    dom.style.wordBreak = "break-word";
    dom.style.fontSize = "14px";
    dom.style.transform = "translateY(-200vh)";
    dom.style.pointerEvents = "none";
    dom.style.opacity = "0";
    dom.id = id;
    document.body.appendChild(dom);
    init?.(dom);
  }

  return dom!;
}

export function autoGrowTextArea(dom: HTMLTextAreaElement) {
  const measureDom = getOrCreateMeasureDom("__measure");
  const singleLineDom = getOrCreateMeasureDom("__single_measure", (dom) => {
    dom.innerText = "TEXT_FOR_MEASURE";
  });

  const width = getDomContentWidth(dom);
  measureDom.style.width = width + "px";
  measureDom.innerText = dom.value !== "" ? dom.value : "1";
  const endWithEmptyLine = dom.value.endsWith("\n");
  const height = parseFloat(window.getComputedStyle(measureDom).height);
  const singleLineHeight = parseFloat(
    window.getComputedStyle(singleLineDom).height,
  );

  const rows =
    Math.round(height / singleLineHeight) + (endWithEmptyLine ? 1 : 0);

  return rows;
}

export function getCSSVar(varName: string) {
  return getComputedStyle(document.body).getPropertyValue(varName).trim();
}

/**
 * 倒计时
 * @param {Object} options 参数选项
 */
export function countDown(options: any) {
  let defaults = {
    // 倒计时秒数
    timer: options?.timer || 10,
    // 倒计时函数
    fn: options?.fn,
    // 倒计时完成回调函数
    callBack: options?.callBack,
  };
  let stop = false;

  let down = function () {
    if (defaults.fn) {
      defaults.fn(defaults.timer);
    }
    setTimeout(function () {
      if (stop) {
        return false;
      }
      defaults.timer--;
      if (defaults.timer === 0) {
        if (defaults.callBack) {
          defaults.callBack(defaults.timer);
        }
      } else {
        if (defaults.fn) {
          defaults.fn(defaults.timer);
        }
        down();
      }
    }, 1000);
  };
  down();

  return {
    clear() {
      stop = true;
    },
  };
}

// 获取字符长度
export function getByteLength(str: string | number) {
  str = str.toString();
  let strLen = str.length;
  let len = 0;
  for (let i = 0; i < strLen; i++) {
    len += str.charCodeAt(i) < 256 ? 1 : 2;
  }

  return len;
}

// 获取字节数
export const strByteSize = (str: string) => {
  if (!str) {
    return 0;
  }
  return new Blob([str]).size;
};

/**
 * 字符串隐藏中间位数
 * @param {String} str 字符串
 */
export const stringEncryption = (options: any) => {
  options = options || {};
  let str: any;
  if (typeof options === "string" || typeof options === "number") {
    str = options;
    options = {};
  } else {
    str = options.str;
  }
  let defaults = {
    begin: options.begin || 4,
    end: options.end || 4,
    placeholder: options.placeholder || "*",
    phLength: options.phLength || 4,
    // 多少个字符加一个splitString字符，以作为分隔
    split: options.split || false,
    splitStr: options.splitStr || " ",
  };

  let result: any;
  if (str) {
    str = str + "";
    result =
      str.substr(0, defaults.begin) +
      " " +
      Array(defaults.phLength + 1).join(defaults.placeholder) +
      " " +
      str.substr(str.length - defaults.end, str.length);
  }
  if (defaults.split) {
    let temp = "";
    let count = 0;
    for (let i = 0, len = result.length; i < len; i++) {
      if (result[i] !== " ") {
        temp += result[i];
        count++;
        if (count === defaults.split) {
          count = 0;
          temp += defaults.splitStr;
        }
      }
    }
    result = temp;
  }

  return result;
};
