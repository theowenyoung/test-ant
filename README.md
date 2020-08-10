# Actions Plus

Make github actions great again!

So easy for get rss update!

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

## Features

- manual get rss/json api updates
- support webhooks
- support telegram bot updates
- support almost all github actions

## Supported Triggers

- [rss](/docs/triggers/rss.md) polling a rss for updates
- [poll](/docs/triggers/poll.md) polling a json api for updates
- [webhook](/docs/triggers/webhook.md) receive a webhook
- [telegram bot](/docs/triggers/telegram_bot.md) polling telegram bot updates

## Supported Actions

We use [act](https://github.com/nektos/act) for jobs build, so you can use almost all [Github Actions](https://github.com/marketplace?type=actions) for the action
