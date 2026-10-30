import app, { pruneUploads, usesDefaultUploadDir } from "./server";

const appServer = app;
const PORT = 3000;
const server = appServer.listen(PORT, "127.0.0.1");

// 기본 업로드 폴더는 시작 시와 1시간마다 24시간이 지난 업로드를 정리한다
if (usesDefaultUploadDir) {
  pruneUploads();
  setInterval(() => pruneUploads(), 60 * 60 * 1000).unref();
}

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
