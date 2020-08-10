# Webhook

## Events

### New Webhook Event

```yaml
on:
  webhook:
    event: test
jobs:
  ifttt:
    name: Make a Request to IFTTT
    runs-on: ubuntu-latest
    steps:
      - uses: alfredosalzillo/ifttt-webhook-action@v1
        with:
          event: test
          key: ${{ secrets.IFTTT_KEY }}
          value1: ${{ on.webhook.outputs.event }}
          value2: ${{ toJson(on.webhook.outputs.payload) }}
          value3: ${{ toJson(on.webhook.outputs.body) }}
```

### Trigger webhook

We use github `repository_dispatch` event as webhook event, So you need to make a `POST` request to `https://<github-user-name>:<github-personal-token>@api.github.com/repos/<github-user-name>/<github-repo-name>/dispatches`, with headers `Content-Type: application/json`, with json body:

```json
{
  "event_type": "test",
  "client_payload": {
    "value1": "xxx",
    "key": "value"
  }
}
```

### Curl example

```bash
curl --location --request POST 'https://<github-user-name>:<github-personal-token>@api.github.com/repos/<github-user-name>/<github-repo-name>/dispatches' \
--header 'Content-Type: application/json' \
--data-raw '{
  "event_type": "test",
  "client_payload": {
    "value1": "xxx",
    "key": "value"
  }
}'
```

### Nodejs Axios example

```javascript
var axios = require("axios");
var data = JSON.stringify({
  event_type: "test",
  client_payload: { value1: "xxx", key: "value" },
});

var config = {
  method: "post",
  url:
    "https://<github-user-name>:<github-personal-token>@api.github.com/repos/<github-user-name>/<github-repo-name>/dispatches",
  headers: {
    "Content-Type": "application/json",
  },
  data: data,
};

axios(config)
  .then(function (response) {
    console.log(JSON.stringify(response.data));
  })
  .catch(function (error) {
    console.log(error);
  });
```

### IFTTT Webhook Request example

> !!Note, for some reason, ifttt can not post github api directly, always response 403 status code, I don't know the reason yet, I suspect it's a github api problem, but I'm not sure. if you know why, please let me know!

So, I create a webhook relay api for forward ifttt request to other service. So you can use it like this:

You can use ifttt webhook as a `then` action to trigger the webhook, here is an example

- URL: `https://<github-user-name>:<github-personal-token>@eno9s1l2xztg49j.m.pipedream.net/https://api.github.com/repos/<github-user-name>/<github-repo-name>/dispatches`
- Method: `POST`
- Content Type: `application/json`
- Body

```json
{
  "event_type": "test",
  "client_payload": {
    "value1": "<<<{{Text}}>>>",
    "key": "<<<{{AuthorName}}>>>"
  }
}
```

> Tips: if your field content need to be escaped, you should surround it with "<<<>>>"

## Options

| Param | Type   | Required | Examples    | Description                                                                                                       | Default |
| ----- | ------ | -------- | ----------- | ----------------------------------------------------------------------------------------------------------------- | ------- |
| event | string | false    | test1,test2 | will be triigerd when post body `event_type` === `event`,if not providered, all events will trigger this workflow |         |

## Outputs

| Field   | Type   | Examples                                                                    | Description                              |     |
| ------- | ------ | --------------------------------------------------------------------------- | ---------------------------------------- | --- |
| event   | string | test                                                                        | will be post body `event_type` value     |
| payload | object | `{"event_type": "test","client_payload": {"value1": "xxx","key": "value"}}` | will be post body `client_payload` value |
| body    | object | `{"event_type":"test","client_payload":{"value1":"xxx","key":"value"}}`     | the body you posted                      |
