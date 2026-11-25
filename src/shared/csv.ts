// RFC 4180: quoted fields may hold commas, newlines and doubled quotes.
export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let i = 0;
  while (i < input.length) {
    const [field, end] = readField(input, i);
    row.push(field);
    i = end + 1;
    if (input[end] === ",") {
      if (i === input.length) row.push("");
      continue;
    }
    if (input[end] === "\r" && input[i] === "\n") i++;
    rows.push(row);
    row = [];
  }
  if (row.length > 0) rows.push(row);
  return rows.filter((r) => r.some((cell) => cell !== ""));
}

// The field starting at `start`, and the index of the delimiter that ends it
// (input.length at the end of the text).
function readField(input: string, start: number): [string, number] {
  if (input[start] !== '"') {
    const end = nextDelimiter(input, start);
    return [input.slice(start, end), end];
  }
  let value = "";
  let i = start + 1;
  for (;;) {
    const close = input.indexOf('"', i);
    if (close === -1) return [value + input.slice(i), input.length];
    value += input.slice(i, close);
    if (input[close + 1] !== '"') {
      const end = nextDelimiter(input, close + 1);
      return [value + input.slice(close + 1, end), end];
    }
    value += '"';
    i = close + 2;
  }
}

const DELIMITER = /[,\r\n]/g;

function nextDelimiter(input: string, from: number): number {
  DELIMITER.lastIndex = from;
  return DELIMITER.exec(input)?.index ?? input.length;
}

// Rows keyed by the header line. A missing cell reads as "".
export function csvRecords(text: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const names = header.map((name) => name.trim());
  return rows.map((row) => Object.fromEntries(names.map((name, i) => [name, row[i] ?? ""])));
}
