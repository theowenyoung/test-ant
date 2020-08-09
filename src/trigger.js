const triggers = require("./triggers");
const helpers = require("./helpers");
const log = require("loglevel");
const { createContentDigest, cache } = helpers;
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
      cache: {
        get: (key) => {
          return cache.get(`event:${eventId}:${key}`);
        },
        set: (key, value) => {
          return cache.set(`event:${eventId}:${key}`);
        },
      },
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

    if (!results || results.length === 0) {
      return finalResult;
    }
    // updateInterval
    if (updateInterval) {
      // check if should update
      // unit minutes
      // get latest update time
      const lastUpdatedAt =
        (await triggerHelpers.cache.get("lastUpdatedAt")) || 0;
      log.debug("lastUpdatedAt: ", lastUpdatedAt);
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
      const deduplicationKeys =
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
    }
    finalResult.results = results;
  }
  return finalResult;
};

module.exports = {
  run,
};
