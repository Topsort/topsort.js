import { file } from "bun";

const PORT = process.env.SERVER_PORT || 8080;

Bun.serve({
  fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = `./dist${pathname}`;

    try {
      return new Response(file(filePath));
    } catch (e) {
      return new Response("Not Found", { status: 404 });
    }
  },
  port: PORT,
});
