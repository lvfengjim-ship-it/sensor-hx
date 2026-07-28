/**
 * 中英双语支持（轻量方案）
 * - useLang() 返回 { lang, setLang, t, pick }
 * - t(zh, en)：行内双语文本，按当前语言返回
 * - pick({ zh, en })：用于数据文件中的结构化双语文本
 * - 语言选择持久化到 localStorage，并同步 <html lang>
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "zh" | "en";
export type LText = { zh: string; en: string };

type LangCtx = { lang: Lang; setLang: (l: Lang) => void };

const LangContext = createContext<LangCtx>({
  lang: "zh",
  setLang: () => {},
});

const STORAGE_KEY = "hx-lang";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s === "en" || s === "zh") return s;
      // 首次访问：按浏览器语言
      return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
    } catch {
      return "zh";
    }
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  /** 行内双语：t("中文", "English") */
  const t = (zh: string, en: string): string => (ctx.lang === "zh" ? zh : en);
  /** 结构化双语数据：pick({ zh, en }) */
  const pick = (o: LText | undefined | null): string =>
    o ? (ctx.lang === "zh" ? o.zh : o.en) : "";
  return { lang: ctx.lang, setLang: ctx.setLang, t, pick };
}

/** 非组件环境（如数据文件）下的静态选择 */
export function pickLang(lang: Lang, o: LText | undefined | null): string {
  if (!o) return "";
  return lang === "zh" ? o.zh : o.en;
}
