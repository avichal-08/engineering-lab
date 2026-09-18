import { codeToHtml } from "shiki";

export async function highlightCode(code: string, lang: string): Promise<string> {
  // Map language aliases if needed
  const languageMap: Record<string, string> = {
    go: "go",
    typescript: "typescript",
    ts: "typescript",
    python: "python",
    py: "python",
    java: "java",
  };

  const shikiLang = languageMap[lang.toLowerCase()] || "text";

  try {
    return await codeToHtml(code, {
      lang: shikiLang,
      theme: "github-dark",
    });
  } catch (err) {
    console.error("Shiki highlight error:", err);
    // Fallback escaped pre
    return `<pre class="shiki github-dark"><code>${escapeHtml(code)}</code></pre>`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
