// Index the actual source bytes, including compact objects and repeated keys.
// JSON.parse validates the document before its bounded token stream is read.
export function indexPresetSource(document) {
  JSON.parse(document);
  const tokens = [...document.matchAll(/"(?:\\.|[^"\\])*"|[{}[\]:,]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g)];
  /** @type {Record<string, {line: number, excerpt: string, value: unknown}>} */
  const mappings = {};
  const lines = document.split("\n");
  let cursor = 0;
  function value(path, keyToken) {
    const token = tokens[cursor++];
    if (token[0] === "{") {
      while (tokens[cursor][0] !== "}") {
        const key = tokens[cursor++];
        cursor++; // colon
        value([...path, JSON.parse(key[0])], key);
        if (tokens[cursor][0] === ",") cursor++;
      }
      cursor++;
    } else if (token[0] === "[") {
      let index = 0;
      while (tokens[cursor][0] !== "]") {
        value([...path, String(index++)], tokens[cursor]);
        if (tokens[cursor][0] === ",") cursor++;
      }
      cursor++;
    } else if (keyToken) {
      const line = document.slice(0, keyToken.index).split("\n").length;
      mappings[path.join(".")] = { line, excerpt: lines[line - 1], value: JSON.parse(token[0]) };
    }
  }
  value([], null);
  return mappings;
}
