import { format } from "prettier/standalone"
// ESM bundle exposes default; upstream html.d.ts only lists named `parsers` / `printers`.
// @ts-expect-error — default export exists at runtime (prettier/plugins/html.mjs)
import htmlPlugin from "prettier/plugins/html"

export type FormatHtmlResult = {
    formatted: string
    /** Set when Prettier throws (invalid HTML, etc.); `formatted` is the original input. */
    error?: string
}

/**
 * AI email HTML often uses style='...' with inner CSS strings like 'Segoe UI', which terminates
 * the HTML attribute early and breaks parsers. Convert those attributes to double-quoted style="..."
 * (escaping " inside the value).
 */
export function fixSingleQuotedStyleAttributes(html: string): string {
    const needle = "style='"
    let result = ""
    let i = 0
    while (i < html.length) {
        const start = html.indexOf(needle, i)
        if (start === -1) {
            result += html.slice(i)
            break
        }
        result += html.slice(i, start)
        const valueStart = start + needle.length
        let j = valueStart
        let inCssSingleQuotedString = false
        let closedAttribute = false
        while (j < html.length) {
            const c = html[j]
            if (c === "\\" && j + 1 < html.length) {
                j += 2
                continue
            }
            if (c === "'") {
                if (inCssSingleQuotedString) {
                    inCssSingleQuotedString = false
                    j++
                    continue
                }
                const after = html.slice(j + 1)
                const trimmedPeek = after.trimStart()
                const opensCssString =
                    trimmedPeek.length > 0 && /[A-Za-z_]/.test(trimmedPeek[0])
                if (opensCssString) {
                    inCssSingleQuotedString = true
                    j++
                    continue
                }
                const raw = html.slice(valueStart, j)
                result += `style="${raw.replace(/"/g, "&quot;")}"`
                j++
                i = j
                closedAttribute = true
                break
            }
            j++
        }
        if (!closedAttribute) {
            result += html.slice(start)
            break
        }
    }
    return result
}

/**
 * Format HTML with Prettier (bundled at build time so Vite resolves the HTML parser reliably).
 */
export async function formatHtmlPretty(source: string): Promise<FormatHtmlResult> {
    const trimmed = source.trim()
    if (!trimmed) {
        return { formatted: "" }
    }
    const normalized = fixSingleQuotedStyleAttributes(trimmed)
    try {
        const formatted = await format(normalized, {
            parser: "html",
            plugins: [htmlPlugin],
            printWidth: 100,
            tabWidth: 2,
            htmlWhitespaceSensitivity: "ignore",
            bracketSameLine: false,
        })
        return { formatted }
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        return {
            formatted: normalized !== trimmed ? normalized : source,
            error: message,
        }
    }
}
