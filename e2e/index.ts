import type { MatchedRoute } from "bun";

const PORT = process.env.SERVER_PORT || 8080;
const router = new Bun.FileSystemRouter({
  style: "nextjs",
  dir: "./dist/",
});

Bun.serve({
  fetch(req) {
    const match = router.match(req) as MatchedRoute;
    const page = require(match.filePath);
    return new page(req, match.query, match.params);
  },
  port: PORT,
});
