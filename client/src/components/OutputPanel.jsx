import { useEffect, useMemo, useState } from 'react'
import { getLanguageLabel } from '../lib/languages'

const createJavaScriptSrcDoc = (code) => `
<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <script>
      const send = (type, values) => {
        parent.postMessage({
          source: 'code-colaborator-preview',
          type,
          values: values.map((value) => {
            if (typeof value === 'string') return value
            try { return JSON.stringify(value) } catch { return String(value) }
          })
        }, '*')
      }

      console.log = (...values) => send('log', values)
      console.warn = (...values) => send('warn', values)
      console.error = (...values) => send('error', values)
      window.onerror = (message, source, lineno, colno) => {
        send('error', [message + ' at ' + lineno + ':' + colno])
      }

      try {
        ${code}
      } catch (error) {
        send('error', [error && error.stack ? error.stack : String(error)])
      }
    </script>
  </body>
</html>
`

const createHtmlSrcDoc = ({ html = '', css = '', javascript = '' }) => {
  const styleTag = `<style>\n${css}\n</style>`
  const scriptTag = `<script>\n${javascript.replace(/<\/script/gi, '<\\/script')}\n</script>`

  let srcDoc = html
    .replace(/<link\b[^>]*href=["']?\.?\/?style\.css["']?[^>]*>/gi, '')
    .replace(/<script\b[^>]*src=["']?\.?\/?script\.js["']?[^>]*>\s*<\/script>/gi, '')

  if (/<\/head>/i.test(srcDoc)) {
    srcDoc = srcDoc.replace(/<\/head>/i, `${styleTag}\n</head>`)
  } else {
    srcDoc = `${styleTag}\n${srcDoc}`
  }

  if (/<\/body>/i.test(srcDoc)) {
    srcDoc = srcDoc.replace(/<\/body>/i, `${scriptTag}\n</body>`)
  } else {
    srcDoc = `${srcDoc}\n${scriptTag}`
  }

  return srcDoc
}

function OutputPanel({ language, code, files = {} }) {
  const [consoleState, setConsoleState] = useState({ key: '', lines: [] })
  const languageLabel = getLanguageLabel(language)
  const javascriptSrcDoc = useMemo(() => createJavaScriptSrcDoc(code), [code])
  const htmlSrcDoc = useMemo(
    () =>
      createHtmlSrcDoc({
        html: files.html || code,
        css: files.css || '',
        javascript: files.javascript || '',
      }),
    [code, files.css, files.html, files.javascript],
  )
  const consoleLines = consoleState.key === javascriptSrcDoc ? consoleState.lines : []

  useEffect(() => {
    if (language !== 'javascript') {
      return undefined
    }

    const handleMessage = (event) => {
      if (event.data?.source !== 'code-colaborator-preview') {
        return
      }

      setConsoleState((currentState) => {
        const currentLines = currentState.key === javascriptSrcDoc ? currentState.lines : []

        return {
          key: javascriptSrcDoc,
          lines: [
            ...currentLines,
            {
              type: event.data.type,
              text: event.data.values.join(' '),
            },
          ],
        }
      })
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [language, javascriptSrcDoc])

  return (
    <aside className="flex min-h-0 flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
        <h2 className="text-sm font-semibold text-zinc-100">Output</h2>
        <span className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300">{languageLabel}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-zinc-950">
        {language === 'html' ? (
          <iframe
            className="h-full min-h-[320px] w-full bg-white"
            sandbox="allow-scripts"
            srcDoc={htmlSrcDoc}
            title="HTML preview"
          />
        ) : null}

        {language === 'javascript' ? (
          <div className="h-full min-h-[320px] bg-black p-4 font-mono text-sm text-zinc-100">
            <iframe className="hidden" sandbox="allow-scripts" srcDoc={javascriptSrcDoc} title="JavaScript runner" />
            {consoleLines.length > 0 ? (
              <div className="space-y-2">
                {consoleLines.map((line, index) => (
                  <pre
                    className={`whitespace-pre-wrap ${
                      line.type === 'error'
                        ? 'text-rose-300'
                        : line.type === 'warn'
                          ? 'text-amber-300'
                          : 'text-emerald-200'
                    }`}
                    key={`${line.type}-${index}`}
                  >
                    {line.text}
                  </pre>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500">No console output.</p>
            )}
          </div>
        ) : null}

      </div>
    </aside>
  )
}

export default OutputPanel
