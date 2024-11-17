import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

let pathModulePromise: Promise<typeof import("@tauri-apps/api/path")>;

export const getPathModule = () => {
  if (!pathModulePromise) {
    pathModulePromise = import("@tauri-apps/api/path");
  }
  return pathModulePromise;
};


export const getAppDataDir = async () => {
  const pathModule = await getPathModule();
  return pathModule.appDataDir();
};