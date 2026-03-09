

const THEME_KEY = "app-marketplace-master-theme";

const themeInitScript = `(function(){
  try {
    var t = localStorage.getItem("${THEME_KEY}") || "system";
    var d = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", d);
  } catch (e) {}
})();`;

export function ThemeScript() {
  return <script id="theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} />;
}
