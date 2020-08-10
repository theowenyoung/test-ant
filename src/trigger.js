const triggers = require("./triggers");
const helpers = require("./helpers");
const log = require("./log");
const { createContentDigest, getCache } = helpers;
const MAX_CACHE_KEYS_COUNT = 1000;
const run = async ({ trigger, context } = {}) => {
  log.debug("trigger:", trigger);
  const finalResult = {
    results: [],
  };
  if (triggers[trigger.trigger_name]) {
    // get unique id
    let triggerId = "";
    if (trigger.options && trigger.options.id) {
      triggerId = trigger.options.id;
    } else {
      triggerId = createContentDigest(trigger);
    }
    finalResult.id = triggerId;
    const triggerHelpers = {
      ...helpers,
      cache: getCache(`trigger-${triggerId}`),
    };
    const triggerOptions = {
      helpers: triggerHelpers,
      options: trigger.options,
      context: context,
    };
    const Trigger = triggers[trigger.trigger_name];
    const triggerInstance = new Trigger();

    let {
      results,
      shouldDeduplicate,
      getItemKey,
      updateInterval,
    } = await triggerInstance.run(triggerOptions);

    const maxItemsCount = trigger.options.max_items_count;
    const skipFirst = trigger.options.skip_first || false;

    if (!results || results.length === 0) {
      return finalResult;
    }
    // updateInterval
    const lastUpdatedAt =
      (await triggerHelpers.cache.get("lastUpdatedAt")) || 0;
    log.debug("lastUpdatedAt: ", lastUpdatedAt);

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
    if (shouldDeduplicate === true) {
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
      log.debug("deduplicationKeys cached", deduplicationKeys);
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

    if (skipFirst && lastUpdatedAt === 0) {
      return finalResult;
    }
    finalResult.results = results;
  }
  return finalResult;
};

module.exports = {
  run,
};
