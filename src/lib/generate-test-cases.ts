import { extractJSDocComments } from "./extract-comments";

interface TestCase {
	code: string;
	expected: unknown;
}

// Helper function to manually parse the output
function parseExpectedOutput(output: string): unknown {
	try {
		return JSON.parse(output);
	} catch (error) {
		console.error("Failed to parse expected output:", output, error);
		throw error;
	}
}

// Helper function to clean up extracted code by removing leading '*' characters
function cleanCode(code: string): string {
	return code.split('\n').map(line => line.replace(/^\s*\*/, '').trim()).join('\n');
}

export async function generateTestCases(filePath: string): Promise<TestCase[]> {
	const comments = await extractJSDocComments(filePath);
	const testCases: TestCase[] = [];

	for (const comment of comments) {
		const exampleMatch = comment.match(/@example\s+\*?\s*```js([\s\S]*?)\s*\*?\s*```/);
		if (exampleMatch) {
			const exampleCode = cleanCode(exampleMatch[1].trim());
			const expectedMatch = exampleCode.match(/console\.log\((.*)\);\s*\/\/\s*(.*)/);
			if (expectedMatch) {
				try {
					const expectedOutput = parseExpectedOutput(expectedMatch[2].trim());
					testCases.push({
						code: exampleCode.replace(/console\.log\(.*\);/, ""),
						expected: expectedOutput,
					});
				} catch (error) {
					console.error("Failed to parse expected output:", expectedMatch[2].trim(), error);
				}
			}
		}
	}

	return testCases;
}