const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'H2',
  'H3',
  'BLOCKQUOTE',
  'UL',
  'OL',
  'LI',
  'MARK',
  'DIV',
  'SPAN',
]);

export function sanitizeJournalHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  const cleanNode = (node: Node): void => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!ALLOWED_TAGS.has(el.tagName)) {
          if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'IFRAME') {
            el.remove();
            continue;
          }
          const text = doc.createTextNode(el.textContent || '');
          node.replaceChild(text, el);
          continue;
        }
        // Strip all attributes except safe inline style on span if needed; actually strip all attributes for safety
        while (el.attributes.length > 0) {
          el.removeAttribute(el.attributes[0].name);
        }
        cleanNode(el);
      }
    }
  };

  cleanNode(doc.body);
  return doc.body.innerHTML.trim();
}

export function extractPlainText(html: string): string {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

export function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}
