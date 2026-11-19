import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? " compact" : ""}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === "dark"}
    >
      <Sun size={13} aria-hidden="true" />
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb" />
      </span>
      <Moon size={13} aria-hidden="true" />
      {!compact && <span className="theme-toggle-label">{theme === "light" ? "Light" : "Dark"}</span>}
    </button>
  );
}
