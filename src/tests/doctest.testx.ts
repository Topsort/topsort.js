// import * as path from "node:path";
// import { describe, it, expect, beforeAll, afterAll, afterEach } from "bun:test";
// import { generateTestCases } from "../lib/generate-test-cases";
// import { reportEvent } from "../functions/report-event";
// import { apis, baseURL } from "../constants/apis.constant";
// import APIClient from "../lib/api-client";
// import { setupServer } from "msw/node";
// import { handlers } from "../constants/handlers.constant";

// const server = setupServer(handlers.test);
// const filePath = path.resolve(__dirname, "../functions/report-event.ts");

// interface TestCaseInterface {
//     code: string;
//     expected: unknown;
// }

// let testCases: TestCaseInterface[] = [];

// beforeAll(async () => {
//     server.listen();
//     testCases = await generateTestCases(filePath);
//     console.log("Test cases:", testCases);
// });

// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());

// describe("doctest", () => {
//     console.log("Test cases:", testCases);
//     testCases = [
//         {
//             code: "const event = { eventType: \"test\", eventData: {} };\nconst config = { token: \"my-token\" };\nconst result = await reportEvent(event, config);\n // { \"ok\": true, \"retry\": false }",
//             expected: {
//                 ok: true,
//                 retry: false
//             }
//         }
//     ]

//     testCases.forEach((testCase, index) => {
//         it(`example ${index + 1}`, async () => {
//             const code = `
//                 (async () => {
//                     const event = { eventType: "test", eventData: {} };
//                     const config = { token: "my-token", apiKey: "test-api-key" };
//                     const result = await reportEvent(event, config);
//                     return result;
//                 })();
//             `;

//             const func = new Function("require", "exports", "module", "__filename", "__dirname", "reportEvent", "apis", "baseURL", "APIClient", code);
//             const exports: unknown = {};
//             const module = { exports };

//             // Mock require function
//             const customRequire = (moduleName: string): unknown => {
//                 if (moduleName === "../functions/report-event") {
//                     return { reportEvent };
//                 }
//                 if (moduleName === "../constants/apis.constant") {
//                     return { apis, baseURL };
//                 }
//                 if (moduleName === "../lib/api-client") {
//                     return APIClient;
//                 }
//                 throw new Error(`Module not found: ${moduleName}`);
//             };

//             const result = await func(customRequire, exports, module, __filename, __dirname, reportEvent, apis, baseURL, APIClient);

//             console.log("Result:", result); // Debugging line

//             expect(result).toBeDefined();
//             expect(result).toEqual(testCase.expected);
//         });
//     });
// });
