import app from "./server";

const appServer = app;
const PORT = 3000;
const server = appServer.listen(PORT, "127.0.0.1");

const gracefulShutdown = () => {
  console.log("Server is closing...");
  server.close(() => {
    console.log("Server closed.");
    process.exit();
  });

  setTimeout(() => process.exit(), 3000);
};

process.on("SIGINT", () => gracefulShutdown());
process.on("SIGTERM", () => gracefulShutdown());

console.log("Server listen on port ", PORT);
