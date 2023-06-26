/**
 * 注册
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StoreKey } from "../constant";

export interface IRegisterStore {}

export const useRegisterStore = create<IRegisterStore>()(
  persist((set, get) => ({}), {
    name: StoreKey.Register,
    version: 1,
  }),
);
