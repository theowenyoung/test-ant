# Poll

## Events

### New Message in telegram bot

```yaml
on:
  telegram_bot:
    events:
      - photo
      - text
    token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
jobs:
  ifttt:
    name: Make a Request to IFTTT
    runs-on: ubuntu-latest
    steps:
      - uses: alfredosalzillo/ifttt-webhook-action@v1
        with:
          event: test
          key: ${{ secrets.IFTTT_KEY }}
          value1: ${{ toJson(on.telegram_bot.outputs) }}
```

## Options

| Param           | Type    | Required | Examples                                   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Default |
| --------------- | ------- | -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| token           | string  | true     | 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11, | telegram bot token                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| events          | array   | false    | ["text","photo"]                           | telegram message type,if not provided, all message will trigger an action, allowed types: `text`,`animation`,`audio`,`channel_chat_created`,`contact`,`delete_chat_photo`,`dice`,`document`,`game`,`group_chat_created`,`invoice`,`left_chat_member`,`location`,`migrate_from_chat_id`,`migrate_to_chat_id`,`new_chat_members`,`new_chat_photo`,`new_chat_title`,`passport_data`,`photo`,`pinned_message`,`poll`,`sticker`,`successful_payment`,`supergroup_chat_created`,`video`,`video_note`,`voice` |         |
| event           | string  | false    | text                                       | telegram message type,if not provided, all message will trigger an action, allowed types: `text`,`animation`,`audio`,`channel_chat_created`,`contact`,`delete_chat_photo`,`dice`,`document`,`game`,`group_chat_created`,`invoice`,`left_chat_member`,`location`,`migrate_from_chat_id`,`migrate_to_chat_id`,`new_chat_members`,`new_chat_photo`,`new_chat_title`,`passport_data`,`photo`,`pinned_message`,`poll`,`sticker`,`successful_payment`,`supergroup_chat_created`,`video`,`video_note`,`voice` |         |
| every           | number  | false    | 5                                          | rss fetch interval, unit: minutes                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 5       |
| max_items_count | number  | false    | 15                                         | The items max length, default is none, it will response all feed items                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| skip_first      | boolean | false    | true                                       | If should skip first fetch items                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | false   |

And, We use [Axios](https://github.com/axios/axios) for poll data, so your can pass all params that axios supported.

## Outputs

The item of the telegram message, see [here](https://core.telegram.org/bots/api#message)
