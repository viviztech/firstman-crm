/**
 * Shared accent palette for dashboard cards (StatCard, SectionCard) across every role's
 * dashboard — one place to keep the color-to-meaning mapping consistent (e.g. red always reads
 * as "needs attention", green always reads as "money in / done").
 */
export type StatColor =
  | "blue"
  | "red"
  | "green"
  | "orange"
  | "purple"
  | "pink"
  | "teal"
  | "amber"
  | "slate";

export const STAT_COLOR_CLASSES: Record<StatColor, { border: string; chip: string }> = {
  blue: {
    border: "border-l-blue-500",
    chip: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  red: {
    border: "border-l-red-500",
    chip: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  green: {
    border: "border-l-green-500",
    chip: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  orange: {
    border: "border-l-orange-500",
    chip: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  purple: {
    border: "border-l-purple-500",
    chip: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
  pink: {
    border: "border-l-pink-500",
    chip: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  },
  teal: {
    border: "border-l-teal-500",
    chip: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  },
  amber: {
    border: "border-l-amber-500",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  slate: {
    border: "border-l-slate-400",
    chip: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};
