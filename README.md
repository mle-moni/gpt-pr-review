# GPT Pull request review

On a new pull request, check all the changes made to files, and check the code
using GPT api. Note that it is only a support for lead developer to improve pull
request reading efficiency, and detect minor errors for the developer.

## Features

- Check the patch file of every modification.
- Send it to GPT and ask for a review with the context of a lead developer
  reading it.

## Requirements

- You must have a GPT Api key.

## Setup

Example workflow setup:

```yaml
name: GPT Review

on:
  pull_request:
    branches:
      - dev
jobs:
  gpt-review:
    runs-on: ubuntu-latest
    steps:
      - uses: MaxLmqr/gpt-pr-review@1.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          gpt-api-key: ${{ secrets.GPT_API_KEY }}
```
