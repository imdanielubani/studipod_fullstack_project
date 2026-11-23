# @studipod/tsconfig

Shared TypeScript configurations. Workspaces extend one of these instead of copying compiler options.

| File          | Use for                                                       |
| ------------- | ------------------------------------------------------------- |
| `base.json`   | Strict defaults shared by every workspace                     |
| `node.json`   | Plain Node.js 22 packages and scripts (ES modules)            |
| `nestjs.json` | NestJS services (CommonJS via `nodenext`, decorator metadata) |

Example: `{ "extends": "@studipod/tsconfig/nestjs.json" }`
