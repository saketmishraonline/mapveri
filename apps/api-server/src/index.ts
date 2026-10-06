import app from "./app";
import { logger } from "./lib/logger";
import { seedMapveri } from "./lib/mapveri";

const rawPort = process.env["PORT"] || "5000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

seedMapveri()
  .then(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Unable to seed MapVeri database");
    app.listen(port, () => logger.info({ port }, "Server listening without seed"));
  });
