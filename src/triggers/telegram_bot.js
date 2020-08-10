const log = require("../log");
const axios = require("axios");

module.exports = class {
  async run({ helpers, options }) {
    const _messageTypes = [
      "text",
      "animation",
      "audio",
      "channel_chat_created",
      "contact",
      "delete_chat_photo",
      "dice",
      "document",
      "game",
      "group_chat_created",
      "invoice",
      "left_chat_member",
      "location",
      "migrate_from_chat_id",
      "migrate_to_chat_id",
      "new_chat_members",
      "new_chat_photo",
      "new_chat_title",
      "passport_data",
      "photo",
      "pinned_message",
      "poll",
      "sticker",
      "successful_payment",
      "supergroup_chat_created",
      "video",
      "video_note",
      "voice",
    ];
    let {
      token,
      every,
      event,
      events,
      max_items_count,
      skip_first,
      ...requestOptions
    } = options;
    const updateInterval = every || 5;

    if (!token) {
      throw new Error("Miss param token!");
    }
    if (!events && event) {
      events = [event];
    }
    let results = [];
    const url = `https://api.telegram.org/bot${token}/getUpdates`;
    const config = {
      ...requestOptions,
      url,
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
    if (
      requestResult &&
      requestResult.data &&
      Array.isArray(requestResult.data.result)
    ) {
      const resultsArray = requestResult.data.result;
      resultsArray.forEach((item) => {
        // @ts-ignore
        const message = item.message;
        const messageType = _messageTypes.find((messageType) => {
          return message[messageType];
        });

        if (events) {
          if (events.includes(messageType)) {
            results.push(message);
          }
        } else {
          results.push(message);
        }
      });
    }

    const getItemKey = (item) => {
      if (item.update_id) return item.update_id;

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
