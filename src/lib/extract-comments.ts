import * as fs from "fs";

export function extractJSDocComments(filePath: string): string[] {
    const content = fs.readFileSync(filePath, "utf-8");
    const comments = [];
    const regex = /\/\*\*([\s\S]*?)\*\//g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        console.log("JSDoc Comment:", match[1]); // Log each extracted JSDoc comment
        comments.push(match[1].trim());
    }
    return comments;
}