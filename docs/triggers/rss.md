# RSS

## Events

### New Item in Feed

```yaml
on:
  rss:
    url: https://hnrss.org/newest?points=300
jobs:
  ifttt:
    name: Make a Request to IFTTT
    runs-on: ubuntu-latest
    steps:
      - uses: alfredosalzillo/ifttt-webhook-action@v1
        with:
          event: test
          key: ${{ secrets.IFTTT_KEY }}
          value1: ${{on.rss.outputs.title}}
          value2: ${{on.rss.outputs.content}}
          value3: ${{on.rss.outputs.link}}
```

### New Item in Multiple Feeds

```yaml
on:
  rss:
    event: new_item_in_multiple_feeds
    urls:
      - https://hnrss.org/newest?points=300
      - https://www.buzzfeed.com/world.xml
    max_items_count: 15
jobs:
  ifttt:
    name: Make a Request to IFTTT
    runs-on: ubuntu-latest
    steps:
      - uses: alfredosalzillo/ifttt-webhook-action@v1
        with:
          event: test
          key: ${{ secrets.IFTTT_KEY }}
          value1: ${{on.rss.outputs.title}}
          value2: ${{on.rss.outputs.contentSnippet}}
          value3: ${{on.rss.outputs.link}}
```

## Options

| Param           | Type          | Required | Examples                                                                     | Description                                                                       | Default  |
| --------------- | ------------- | -------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------- |
| event           | string        | false    | new_item,new_item_in_multiple_feeds                                          | rss event type                                                                    | new_item |
| url             | string        | false    | https://hnrss.org/newest?points=300                                          | rss feed url,if `type` == "new_item", `url` param is required                     |          |
| urls            | array<string> | false    | ['https://hnrss.org/newest?points=300','https://www.buzzfeed.com/world.xml'] | rss feed urls,if `type` == "new_item_in_multiple_feeds", `urls` param is required |          |
| every           | number        | false    | 5                                                                            | rss fetch interval, unit: minutes                                                 | 5        |
| max_items_count | number        | false    | 15                                                                           | The feed items max length, default is none, it will response all feed items       |
| skip_first      | boolean       | false    | true                                                                         | If should skip first fetch items                                                  | false    |

## Outputs

See [rss-parser](https://github.com/rbren/rss-parser), The outputs will be the feed item
