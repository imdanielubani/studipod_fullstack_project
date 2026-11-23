# @studipod/eslint-config

Shared ESLint flat configurations.

```js
// eslint.config.mjs
import { nodeConfig } from '@studipod/eslint-config/node';
export default nodeConfig({ tsconfigRootDir: import.meta.dirname });
```

The webapp and admin dashboard can add a `react` entry point here when they join the workspace.
