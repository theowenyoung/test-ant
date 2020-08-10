const log = require("../log");
const axios = require("axios");
const clonedeep = require("lodash.clonedeep");
const get = require("lodash.get");

module.exports = class {
  async run({ helpers, options }) {
    const {
      url,
      results_path,
      deduplication_key,
      every,
      max_items_count,
      skip_first,
      ...requestOptions
    } = options;
    const updateInterval = every || 5;

    if (!url) {
      throw new Error("Miss param url!");
    }
    let results = [];
    const config = {
      ...requestOptions,
      url: url,
    };

    // get updates
    let requestResult;
    try {
      requestResult = await axios(config);
    } catch (e) {
      if (e.code === "ECONNREFUSED") {
        throw new Error(
          `It was not possible to connect to the URL. Please make sure the URL "${url}" it is valid!`
        );
      }

      log.error(`fetch ${url} error: `, e);
    }
    // For now we just take the items and ignore everything else
    if (requestResult && requestResult.data) {
      const resultsArray = results_path
        ? get(requestResult.data, results_path)
        : requestResult.data;
      const deepClonedData = clonedeep(resultsArray);
      resultsArray.forEach((item) => {
        // @ts-ignore
        item._rawBody = deepClonedData;
        results.push(item);
      });
    }

    const getItemKey = (item) => {
      // TODO adapt every cases
      if (deduplication_key) {
        return item[deduplication_key];
      }
      if (item.id) return item.id;
      if (item.guid) return item.guid;
      if (item.key) return item.key;
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
