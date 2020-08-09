const Parser = require("rss-parser");
module.exports = class {
  async run({ helpers, options }) {
    const url = options.url;
    const updateInterval = options.every;
    // get updates
    const parser = new Parser();

    let feed;
    try {
      feed = await parser.parseURL(url);
    } catch (e) {
      if (e.code === "ECONNREFUSED") {
        throw new Error(
          `It was not possible to connect to the URL. Please make sure the URL "${url}" it is valid!`
        );
      }

      throw e;
    }

    const results = [];

    // For now we just take the items and ignore everything else
    if (feed.items) {
      feed.items.forEach((item) => {
        // @ts-ignore
        results.push(item);
      });
    }

    const getItemKey = (item) => {
      // TODO adapt every cases
      return item.guid;
    };
    // if need
    return {
      shouldDeduplicate: true,
      updateInterval: updateInterval,
      results,
      getItemKey,
    };
  }
};
