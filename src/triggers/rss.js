const Parser = require("rss-parser");
const log = require("../log");
module.exports = class {
  async run({ helpers, options }) {
    const type = options.type || "new_item";
    const url = options.url;
    const updateInterval = options.every || 5;
    const maxItemsCount = options.max_items_count;
    const skipFirst = options.skip_first || false;
    let urls = [];

    if (type === "new_item_in_multiple_feeds") {
      let urlsParam = options.urls;
      if (!urlsParam) {
        throw new Error("Miss param urls");
      }
      if (typeof urlsParam === "string") {
        urls = [urlsParam];
      } else if (Array.isArray(urlsParam)) {
        urls = urlsParam;
      } else {
        throw new Error("Param urls is invalid!");
      }
    } else {
      if (!url) {
        throw new Error("Miss required param url");
      }
      urls = [url];
    }
    let results = [];

    for (let index = 0; index < urls.length; index++) {
      const feedUrl = urls[index];
      // get updates
      const parser = new Parser();

      let feed;
      try {
        feed = await parser.parseURL(feedUrl);
      } catch (e) {
        if (e.code === "ECONNREFUSED") {
          throw new Error(
            `It was not possible to connect to the URL. Please make sure the URL "${url}" it is valid!`
          );
        }

        log.error("fetch rss feed error: ", e);
      }
      // For now we just take the items and ignore everything else
      if (feed && feed.items) {
        feed.items.forEach((item) => {
          // @ts-ignore
          results.push(item);
        });
      }
    }

    const getItemKey = (item) => {
      // TODO adapt every cases
      if (item.guid) return item.guid;
      if (item.id) return item.id;
      return helpers.createContentDigest(item);
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
