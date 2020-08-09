const triggers = require("./triggers");
const helpers = require("./helpers");
const log = require("./log");
const { createContentDigest, getCache } = helpers;
const MAX_CACHE_KEYS_COUNT = 1000;
const run = async (event = {}) => {
  log.debug("event:", event);
  const finalResult = {
    results: [],
  };
  if (triggers[event.event_name]) {
    // get unique id
    let eventId = "";
    if (event.options && event.options.id) {
      eventId = event.options.id;
    } else {
      eventId = createContentDigest(event);
    }
    finalResult.id = eventId;
    const triggerHelpers = {
      ...helpers,
      cache: getCache(`event-${eventId}`),
    };
    const triggerOptions = {
      helpers: triggerHelpers,
      options: event.options,
    };
    const Trigger = triggers[event.event_name];
    const triggerInstance = new Trigger();

    let {
      results,
      shouldDeduplicate,
      getItemKey,
      updateInterval,
    } = await triggerInstance.run(triggerOptions);

    const maxItemsCount = event.options.max_items_count;
    const skipFirst = event.options.skip_first || false;

    if (!results || results.length === 0) {
      return finalResult;
    }
    // updateInterval
    const lastUpdatedAt =
      (await triggerHelpers.cache.get("lastUpdatedAt")) || 0;
    log.debug("lastUpdatedAt: ", lastUpdatedAt);
    if (skipFirst && lastUpdatedAt === 0) {
      return finalResult;
    }
    if (updateInterval) {
      // check if should update
      // unit minutes
      // get latest update time
      const shouldUpdateUtil = lastUpdatedAt + updateInterval * 60 * 1000;
      const now = Date.now();
      const shouldUpdate = shouldUpdateUtil - now <= 0;
      log.debug("shouldUpdate:", shouldUpdate);
      // write to cache
      await triggerHelpers.cache.set("lastUpdatedAt", now);
      if (!shouldUpdate) {
        return finalResult;
      }
    }
    // duplicate
    if (shouldDeduplicate === true || shouldDeduplicate === undefined) {
      // duplicate
      getItemKey =
        getItemKey ||
        ((item) => {
          if (item.guid) return item.guid;
          if (item.id) return item.id;
          return createContentDigest(item);
        });

      // deduplicate
      // get cache
      let deduplicationKeys =
        (await triggerHelpers.cache.get("deduplicationKeys")) || [];
      const resultsKeyMaps = new Map();
      results.forEach((item, index) => {
        resultsKeyMaps.set(getItemKey(item), item);
      });
      results = [...resultsKeyMaps.values()];

      results = results.filter((result) => {
        const key = getItemKey(result);
        if (deduplicationKeys.includes(key)) {
          return false;
        } else {
          return true;
        }
      });

      if (maxItemsCount) {
        results = results.slice(0, maxItemsCount);
      }
      deduplicationKeys = deduplicationKeys.concat(
        results.map((item) => getItemKey(item))
      );
      deduplicationKeys = deduplicationKeys.slice(-MAX_CACHE_KEYS_COUNT);

      // set cache
      await triggerHelpers.cache.set("deduplicationKeys", deduplicationKeys);
    }
    finalResult.results = results;
  }
  return finalResult;
};

module.exports = {
  run,
};
