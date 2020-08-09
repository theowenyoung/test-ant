const Parser = require("rss-parser");
const log = require("../log");
module.exports = class {
  async run({ helpers, options, context } = {}) {
    // if need
    let results = [];
    if (
      context &&
      context.github &&
      context.github.event_name === "repository_dispatch"
    ) {
      const item = {
        payload: context.github.event.client_payload,
        event: context.github.event.action,
        body: {
          event_type: context.github.event.action,
          client_payload: context.github.event.client_payload,
        },
      };
      results = [item];
    }
    return {
      results: results,
    };
  }
};
