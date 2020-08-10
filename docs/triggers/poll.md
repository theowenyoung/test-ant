# Poll

## Events

### New Item in json api

```yaml
on:
  poll:
    url: https://jsonplaceholder.typicode.com/posts
jobs:
  ifttt:
    name: Make a Request to IFTTT
    runs-on: ubuntu-latest
    steps:
      - uses: alfredosalzillo/ifttt-webhook-action@v1
        with:
          event: test
          key: ${{ secrets.IFTTT_KEY }}
          value1: ${{ on.poll.outputs.id }}
          value2: ${{ toJson(on.poll.outputs) }}
```

## Options

| Param             | Type    | Required | Examples                                   | Description                                                                                                                                                                                                                                                                                     | Default                     |
| ----------------- | ------- | -------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| url               | string  | true     | https://jsonplaceholder.typicode.com/posts | Rest api url                                                                                                                                                                                                                                                                                    |                             |
| results_path      | string  | false    | data                                       | If the returned JSON is not a list and is instead an object (maybe paginated), enter the key that contains the results. Example: "results", "items", "objects", etc... (children via dot syntax supported)                                                                                      |                             |
| deduplication_key | string  | false    | id                                         | Poll trigger deduplicates the array we see each poll against the id key. If the id key does not exist, you should specify an alternative unique key to deduplicate off of. If neither are supplied, we fallback to looking for the shortest key with id in it otherwise we will raise an error. | id/guid/key/itemContenthash |
| every             | number  | false    | 5                                          | rss fetch interval, unit: minutes                                                                                                                                                                                                                                                               | 5                           |
| max_items_count   | number  | false    | 15                                         | The feed items max length, default is none, it will response all feed items                                                                                                                                                                                                                     |
| skip_first        | boolean | false    | true                                       | If should skip first fetch items                                                                                                                                                                                                                                                                | false                       |

And, We use [Axios](https://github.com/axios/axios) for poll data, so your can pass all params that axios supported.

## Outputs

The item of the api results, and `raw__body` for the whole raw body
