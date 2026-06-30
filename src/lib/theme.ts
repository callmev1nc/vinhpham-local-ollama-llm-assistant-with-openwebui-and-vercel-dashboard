// Client-only theme helpers shared by ThemeToggle and CommandPalette.

export const THEME_EVENT = "vaultchat-theme-change"

/** Apply a theme: update the <html> class, persist, and notify subscribers. */
export function setTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark)
  try {
    localStorage.setItem("vaultchat-theme", dark ? "dark" : "light")
  } catch {
    // localStorage may be unavailable (private mode); class toggle still applies.
  }
  window.dispatchEvent(new Event(THEME_EVENT))
}
