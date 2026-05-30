import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { AppLanguage } from "../i18n";

type LanguageAwareShellProps = {
  language: AppLanguage;
  children: ReactNode;
  className?: string;
};

export function LanguageAwareShell({ language, children, className = "" }: LanguageAwareShellProps) {
  const { i18n } = useTranslation();

  useEffect(() => {
    i18n.changeLanguage(language);

    const direction = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    document.body.dir = direction;
    document.body.lang = language;
  }, [i18n, language]);

  return (
    <div dir={language === "ar" ? "rtl" : "ltr"} lang={language} className={className}>
      {children}
    </div>
  );
}