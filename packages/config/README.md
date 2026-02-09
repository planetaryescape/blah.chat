# @blah-chat/config

Shared, publishable configuration artifacts for the blah.chat monorepo (primarily TypeScript `tsconfig` bases).

## Install

```bash
bun add -d @blah-chat/config
```

## Usage

In a package `tsconfig.json`:

```json
{
  "extends": "@blah-chat/config/tsconfig.base.json"
}
```

