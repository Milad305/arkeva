// خوانندهٔ کوچک XML برای MSPDI (msp-integration.md ۴؛ `[پیش‌فرض فنی]` بی وابستگی تازه). فقط عنصر، متن، CDATA و ارجاع‌های
// نویسه‌ای استاندارد؛ DOCTYPE و ENTITY رد می‌شوند تا ارجاع موجودیت بیرونی (XXE) و انفجار موجودیت ممکن نباشد. پیشوند
// فضای نام از نام عنصر برداشته و صفت‌ها نادیده گرفته می‌شوند (MSPDI داده را در عنصر می‌گذارد).

export class XmlError extends Error {}

export interface XmlElement {
  readonly name: string;
  readonly children: XmlElement[];
  text: string;
}

const NAMED: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

function decode(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, entity: string) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    const named = NAMED[entity];
    if (named === undefined) throw new XmlError(`ارجاع ناشناختهٔ ${whole}`);
    return named;
  });
}

const localName = (raw: string) => {
  const name = raw.trim();
  const colon = name.indexOf(':');
  return colon >= 0 ? name.slice(colon + 1) : name;
};

interface ParseState {
  readonly stack: XmlElement[];
  root: XmlElement | null;
}

/** برچسب باز یا بسته (`body` بی `<` و `>`). */
function tag(state: ParseState, body: string): void {
  const { stack } = state;
  if (body.startsWith('/')) {
    const name = localName(body.slice(1));
    const current = stack.pop();
    if (!current || current.name !== name) throw new XmlError(`برچسب بستهٔ نابه‌جا: ${name}`);
    if (stack.length === 0) state.root = current;
    return;
  }
  const selfClosing = body.endsWith('/');
  const name = localName((selfClosing ? body.slice(0, -1) : body).split(/\s/, 1)[0] ?? '');
  if (name === '') throw new XmlError('نام عنصر خالی است');
  const element: XmlElement = { name, children: [], text: '' };
  const parent = stack.at(-1);
  if (parent) parent.children.push(element);
  else if (state.root) throw new XmlError('بیش از یک ریشه');
  if (!selfClosing) stack.push(element);
  else if (!parent) state.root = element;
  if (stack.length > 64) throw new XmlError('عمق عنصرها بیش از اندازه است');
}

/** پایان بخش ویژه‌ای که از `open` شروع شده؛ CDATA به متن عنصر جاری افزوده می‌شود. */
function special(state: ParseState, text: string, open: number): number | null {
  const closeOf = (marker: string, from: number, label: string) => {
    const end = text.indexOf(marker, from);
    if (end < 0) throw new XmlError(`${label} بسته نشده`);
    return end;
  };
  if (text.startsWith('<!--', open)) return closeOf('-->', open + 4, 'توضیح') + 3;
  if (text.startsWith('<![CDATA[', open)) {
    const end = closeOf(']]>', open + 9, 'CDATA');
    const current = state.stack.at(-1);
    if (current) current.text += text.slice(open + 9, end);
    return end + 3;
  }
  if (text.startsWith('<?', open)) return closeOf('?>', open + 2, 'دستور پردازش') + 2;
  if (text.startsWith('<!', open)) throw new XmlError('DOCTYPE و ENTITY پذیرفته نمی‌شوند');
  return null;
}

/** متن XML ← درخت عنصرها؛ ریشه را برمی‌گرداند. */
export function parseXml(source: string): XmlElement {
  const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  const state: ParseState = { stack: [], root: null };
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf('<', index);
    const chunk = open < 0 ? text.slice(index) : text.slice(index, open);
    const current = state.stack.at(-1);
    if (current) current.text += decode(chunk);
    else if (chunk.trim() !== '') throw new XmlError('متن بیرون از عنصر ریشه');
    if (open < 0) break;
    const after = special(state, text, open);
    if (after !== null) {
      index = after;
      continue;
    }
    const end = text.indexOf('>', open + 1);
    if (end < 0) throw new XmlError('برچسب بسته نشده');
    tag(state, text.slice(open + 1, end));
    index = end + 1;
  }
  if (state.stack.length > 0 || !state.root) throw new XmlError('سند ناتمام است');
  return state.root;
}

export const child = (element: XmlElement, name: string): XmlElement | undefined => element.children.find((entry) => entry.name === name);
export const childText = (element: XmlElement, name: string): string | null => {
  const found = child(element, name);
  return found ? found.text.trim() : null;
};
export const childrenNamed = (element: XmlElement, name: string): XmlElement[] => element.children.filter((entry) => entry.name === name);
