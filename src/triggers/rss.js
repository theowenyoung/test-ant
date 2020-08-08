module.exports = class {
  async run({ helpers, options }) {
    const feedUrl = options.url;
    const updateInterval = options.every;
    // get updates
    const results = [
      {
        title: "rss title",
        guid: "https://test.com",
      },
      {
        title: "rss title 2",
        guid: "https://test.com",
      },
    ];
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
