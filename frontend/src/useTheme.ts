import { useEffect, useState } from "react";

type Theme = "default" | "pink" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("default");

  // load
  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme;
    if (saved) setTheme(saved);
  }, []);

  // apply
  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove("theme-pink", "theme-dark");

    if (theme === "pink") root.classList.add("theme-pink");
    if (theme === "dark") root.classList.add("theme-dark");

    localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, setTheme };
}