import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  changeAppLanguage,
  LANG_CODE_TO_NAME,
  normalizeLangCode,
  SUPPORTED_LANGUAGES,
  type AppLangCode,
} from "@/i18n";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type Props = {
  compact?: boolean;
  onChanged?: (langName: string, nativeLabel: string) => void;
};

export default function LanguageSwitcher({ compact = false, onChanged }: Props) {
  const { i18n, t } = useTranslation("common");
  const { user } = useAuth();
  const trpcUtils = trpc.useUtils();
  const setLangMut = trpc.auth.setLanguage.useMutation({
    onSuccess: (updated) => {
      if (updated) trpcUtils.auth.me.setData(undefined, updated);
    },
  });

  const currentCode: AppLangCode = normalizeLangCode(i18n.language);

  const handleChange = (nextCode: AppLangCode) => {
    void changeAppLanguage(nextCode);
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === nextCode);
    if (user) {
      setLangMut.mutate({ preferredLanguage: LANG_CODE_TO_NAME[nextCode] });
    }
    onChanged?.(LANG_CODE_TO_NAME[nextCode], langObj?.nativeLabel ?? nextCode);
  };

  return (
    <label className={`language-switcher ${compact ? "compact" : ""}`} aria-label={t("selectLanguage")}>
      <Languages size={16} aria-hidden="true" />
      <select
        value={currentCode}
        onChange={(e) => handleChange(e.target.value as AppLangCode)}
        aria-label={t("selectLanguage")}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeLabel} {currentCode === lang.code ? "✓" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
