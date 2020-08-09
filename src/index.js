const dotenv = require("dotenv");
dotenv.config();
const run = require("./run");

run({
  logLevel: "trace",
}).catch((e) => {
  console.error("e", e);
});
