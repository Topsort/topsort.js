export async function extractJSDocComments(
	filePath: string,
): Promise<string[]> {
	const content = await Bun.file(filePath).text();
	const comments = [];
	const regex = /\/\*\*([\s\S]*?)\*\//g;
	let match;
	while ((match = regex.exec(content)) !== null) {
		comments.push(match[1].trim());
	}
	return comments;
}
