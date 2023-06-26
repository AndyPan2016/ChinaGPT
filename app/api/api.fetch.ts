import { showModalGPT, showToastGPT } from "../components/ui-lib";

export interface IAPI {
  url: string;
  method?: string;
  params?: any;
  headers?: any;
}

export const apiFetch = (options: IAPI) => {
  return fetch(options.url, {
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
