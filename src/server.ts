import { createServer } from "@tanstack/react-start/server";
import start from "./start";

const server = createServer(start);
server.listen(3005);
