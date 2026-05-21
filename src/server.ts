import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";

// createStartHandler returns a callable handler. Wrap it as `{ fetch }`
// so platforms like Vercel that expect a Web-style `fetch` export pick it up.
const handler = createStartHandler({
  handler: defaultStreamHandler,
});

export default {
  fetch: (request: Request) => handler(request),
};
