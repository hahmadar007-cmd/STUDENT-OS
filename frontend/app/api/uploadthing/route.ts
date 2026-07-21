import { createRouteHandler } from "uploadthing/server";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  config: {
    token: process.env.UPLOADTHING_TOKEN || 'eyJhcGlLZXkiOiJza19saXZlXzM5NGZmODczOWNkZWZhMTZkMjZjMDAwMTNmYjUxYTIxYzc3ZjlhODg1M2FiZmQxYTAwZjgxZWQ5ZWZhZTI1MTEiLCJhcHBJZCI6Ind1YzJkNjhrbDQiLCJyZWdpb25zIjpbInNlYTEiXX0=',
  },
});
