import start from "./start";

export default {
  fetch(request: Request) {
    return start.fetch(request);
  },
};
