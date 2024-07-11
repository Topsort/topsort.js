export async function extractJSDocComments(filePath: string): Promise<string[]> {
  const content = await Bun.file(filePath).text();
  const comments = [];
  const regex = /\/\*\*([\s\S]*?)\*\//g;
  let match = regex.exec(content);
  while (match !== null) {
    comments.push(match[1].trim());
    match = regex.exec(content);
  }
  return comments;
}
