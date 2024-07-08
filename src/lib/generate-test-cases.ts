import { extractJSDocComments } from "./extract-comments";

interface TestCase {
	code: string;
	expected: any;
}

export async function generateTestCases(filePath: string): Promise<TestCase[]> {
	const comments = await extractJSDocComments(filePath);
	const testCases: TestCase[] = [];

	comments.forEach((comment) => {
		const exampleMatch = comment.match(
			/@example\s+\*?\s*```js([\s\S]*?)\s*\*?\s*```/,
		);
		if (exampleMatch) {
			const exampleCode = exampleMatch[1].trim();
			const expectedMatch = exampleCode.match(
				/console\.log\((.*)\);?\s*\/\/\s*(.*)/,
			);
			if (expectedMatch) {
				try {
					const expectedOutput = JSON.parse(expectedMatch[2].trim());
					testCases.push({
						code: exampleCode.replace(/console\.log\(.*\);/, ""),
						expected: expectedOutput,
					});
				} catch (error) {
					console.error(
						"Failed to parse expected output:",
						expectedMatch[2].trim(),
						error,
					);
				}
			}
		}
	});

	return testCases;
}
