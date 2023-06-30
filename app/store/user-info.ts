/**
 * 用户信息
 * @authors AndyPan (pye-mail@163.com)
 * @remark 无
 * @log 2023年6月30日14:48:49 - 创建
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { InfoKey } from "../constant";

export interface UserInfoStore {
  // 用户编号
  customerNo: string;
  // 用户状态(enable, pause, disable)
  customerStatus: string;
  // 用户状态文本
  customerStatusText: string;
  // 邮箱
  email: string;
  // 手机
  mobile: string;
  // 昵称
  nickName: string;
  // 注册类型(MOBILE, EMAIL)
  registerType: string;
  // 注册类型文本
  registerTypeText: string;
}

export const useUserInfo = create<any>(
  persist(
    (set, get) => ({
      // 用户编号
      customerNo: null,
      // 用户状态(enable, pause, disable)
      customerStatus: null,
      // 用户状态文本
      customerStatusText: null,
      // 邮箱
      email: null,
      // 手机
      mobile: null,
      // 昵称
      nickName: null,
      // 注册类型(MOBILE, EMAIL)
      registerType: null,
      // 注册类型文本
      registerTypeText: null,
    }),
    {
      name: InfoKey.UserInfo,
      version: 1,
    },
  ),
);
