import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...classValue: ClassValue[]) => {
  return twMerge(clsx(classValue));
};
