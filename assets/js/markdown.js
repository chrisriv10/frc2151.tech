/* Small, safe Markdown renderer for trusted editor output.
 * It intentionally creates DOM nodes instead of assigning post content to innerHTML.
 */

function safeUrl(value, allowMailto = false) {
  try {
    const url = new URL(value, window.location.href);
    const allowed = url.protocol === 'https:' || url.protocol === 'http:' || (allowMailto && url.protocol === 'mailto:');
    return allowed ? url.href : null;
  } catch (_error) {
    return null;
  }
}

function appendInline(parent, value) {
  const tokenPattern = /(!\[([^\]]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)|\[([^\]]+)\]\(([^\s)]+)(?:\s+"[^"]*")?\)|\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`([^`]+)`)/g;
  let cursor = 0;
  let match;

  while ((match = tokenPattern.exec(value))) {
    if (match.index > cursor) parent.append(document.createTextNode(value.slice(cursor, match.index)));
    if (match[1]) {
      const imageUrl = safeUrl(match[3]);
      if (imageUrl) {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = match[2] || 'News image';
        image.loading = 'lazy';
        image.referrerPolicy = 'no-referrer';
        parent.append(image);
      } else {
        parent.append(document.createTextNode(match[0]));
      }
    } else if (match[4]) {
      const linkUrl = safeUrl(match[5], true);
      if (linkUrl) {
        const link = document.createElement('a');
        link.href = linkUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = match[4];
        parent.append(link);
      } else {
        parent.append(document.createTextNode(match[0]));
      }
    } else if (match[6] || match[7]) {
      const strong = document.createElement('strong');
      strong.textContent = match[6] || match[7];
      parent.append(strong);
    } else if (match[8] || match[9]) {
      const emphasis = document.createElement('em');
      emphasis.textContent = match[8] || match[9];
      parent.append(emphasis);
    } else if (match[10]) {
      const code = document.createElement('code');
      code.textContent = match[10];
      parent.append(code);
    }
    cursor = tokenPattern.lastIndex;
  }

  if (cursor < value.length) parent.append(document.createTextNode(value.slice(cursor)));
}

function appendParagraph(container, lines) {
  const paragraph = document.createElement('p');
  lines.forEach((line, index) => {
    if (index) paragraph.append(document.createElement('br'));
    appendInline(paragraph, line);
  });
  container.append(paragraph);
}

export function renderMarkdown(container, markdown = '') {
  container.replaceChildren();
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

    if (/^```/.test(line.trim())) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) codeLines.push(lines[index++]);
      index += 1;
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = codeLines.join('\n');
      pre.append(code);
      container.append(pre);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const element = document.createElement(`h${Math.min(4, heading[1].length + 1)}`);
      appendInline(element, heading[2].trim());
      container.append(element);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) quoteLines.push(lines[index++].replace(/^>\s?/, ''));
      const quote = document.createElement('blockquote');
      appendParagraph(quote, quoteLines);
      container.append(quote);
      continue;
    }

    const listMatch = line.match(/^\s*([-*+])\s+(.+)$/) || line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (listMatch) {
      const ordered = /^\s*\d+[.)]/.test(line);
      const list = document.createElement(ordered ? 'ol' : 'ul');
      while (index < lines.length) {
        const itemMatch = ordered ? lines[index].match(/^\s*\d+[.)]\s+(.+)$/) : lines[index].match(/^\s*[-*+]\s+(.+)$/);
        if (!itemMatch) break;
        const item = document.createElement('li');
        appendInline(item, itemMatch[ordered ? 1 : 2]);
        list.append(item);
        index += 1;
      }
      container.append(list);
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() &&
      !/^(#{1,3})\s+/.test(lines[index]) && !/^>\s?/.test(lines[index]) &&
      !/^\s*([-*+])\s+/.test(lines[index]) && !/^\s*\d+[.)]\s+/.test(lines[index]) &&
      !/^```/.test(lines[index].trim())) {
      paragraphLines.push(lines[index++]);
    }
    appendParagraph(container, paragraphLines);
  }
}

export function safeImageUrl(value) {
  return value ? safeUrl(value) : null;
}
