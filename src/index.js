const dotenv = require("dotenv");
dotenv.config();
const run = require("./run");
const log = require("./log");
run({
  logLevel: "trace",
}).catch((e) => {
  log.error("e", e);
  throw e;
});
