// alterchrome.js — Просто берём логику markdown-viewer и добавляем ACS-1 + UTF-8

(function() {
    'use strict';

    // --- 0. Проверка: заканчивается ли URL на .md, .markdown и т.д. ---
    const url = window.location.href.toLowerCase();
    const supportedExtensions = ['.md', '.markdown', '.mdown', '.mdwn', '.mkd', '.mkdn'];
    const isSupportedUrl = supportedExtensions.some(ext => url.endsWith(ext));

    if (!isSupportedUrl) {
        //console.log("AlterChrome: URL does not end with a supported extension. Exiting.");
        return;
    }

    // --- 1. Проверка: является ли это plain-text документом?
    // Если в body есть <pre>, значит, браузер уже отобразил как текст — это наш случай.
    if (!document.querySelector('body > pre')) {
        //console.log("AlterChrome: Body does not contain a top-level <pre> tag. Likely a web interface. Exiting.");
        return;
    }

    // --- 2. Принудительно читаем содержимое файла в UTF-8 через fetch
    fetch(window.location.href)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text(); // ← Это гарантирует UTF-8
        })
        .then(text => {
            // --- 3. Об ACS-1 из первой строки
            const lines = text.split('\n');
            let acsDirective = null;
            let markdownBody = text;

            if (lines.length > 0 && lines[0].trimStart().startsWith('<!-- ACS:')) {
                acsDirective = lines[0].trimStart();
                markdownBody = lines.slice(1).join('\n');
            }

            // Парсим параметры
            const colors = { bg: '', text: '', link: '' };
            if (acsDirective) { // <-- ИСПРАВЛЕНО: добавлены скобки (acsDirective)
                const match = acsDirective.match(/<!--\s*ACS:\s*(.*?)\s*-->/i);
                if (match) {
                    const params = {};
                    match[1].split(';').forEach(p => {
                        const [k, v] = p.trim().split('=').map(s => s.trim());
                        if (k && v) params[k.toLowerCase()] = v;
                    });
                    colors.bg = params.bg || '';
                    colors.text = params.text || '';
                    colors.link = params.link || '';
                }
            }

            // --- 4. Генерируем CSS для ACS-1
            const style = document.createElement('style');
            // Следуем спецификации ACS-1: body { bg, text }, a { link }
            let cssRules = '';
            if (colors.bg) cssRules += `body { background-color: ${colors.bg} !important; }\n`;
            if (colors.text) cssRules += `body { color: ${colors.text} !important; }\n`;
            if (colors.link) cssRules += `a { color: ${colors.link} !important; }\n`;
            style.textContent = cssRules;
            document.head.appendChild(style);

            // --- 5. Рендерим Markdown (используем showdown)
            if (typeof showdown !== 'undefined' && showdown.Converter) {
                const converter = new showdown.Converter({
                    simplifiedAutoLink: true,
                    strikethrough: true,
                    tables: true,
                    ghCodeBlocks: true,
                    tasklists: true,
                    emoji: true,
                    underline: true,
                    completeHTMLDocument: false
                });
                const html = converter.makeHtml(markdownBody);

                // --- 6. Заменяем содержимое body
                document.body.innerHTML = html;
            } else {
                document.body.innerHTML = `<pre>Ошибка: Showdown не загружен.</pre>`;
            }
        })
        .catch(err => {
            console.error('AlterChrome error:', err);
            // Не заменяем body, если ошибка fetch
            // document.body.innerHTML = `<pre>AlterChrome failed: ${err.message}</pre>`;
        });
})();
