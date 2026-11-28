# App shell

The frame around every console page, built from the Layout Patterns (App Shell) designs.

| Part                  | Code                                                                             |
| --------------------- | -------------------------------------------------------------------------------- |
| Shell assembly        | `src/components/layout/app-shell.tsx`                                            |
| Signed-in bridge      | `src/features/authentication/components/console-shell.tsx`                       |
| Navigation model      | `src/config/navigation.ts`                                                       |
| Sidebar               | `src/components/navigation/sidebar.tsx`, `collapsed-sidebar.tsx`, `nav-list.tsx` |
| Mobile top bar/drawer | `src/components/navigation/mobile-navigation.tsx`                                |
| Page header           | `src/components/layout/page-header.tsx`                                          |
| Account menu          | `src/components/layout/account-menu.tsx`                                         |
| Notifications         | `src/components/layout/notifications.tsx`, `use-admin-notifications.ts`          |
| Search and shortcuts  | `src/components/layout/search-command.tsx`, `keyboard-shortcuts.tsx`             |
| Shell state           | `src/components/layout/shell-store.ts`                                           |

## Layout and breakpoints

| Width          | Navigation                                             | Utilities (search, bell, account) |
| -------------- | ------------------------------------------------------ | --------------------------------- |
| < 768px        | Top bar with menu button; sidebar is a slide-in drawer | Top bar                           |
| 768px – 1279px | Collapsed sidebar (72px) by default                    | Page header                       |
| ≥ 1280px       | Expanded sidebar (264px) by default                    | Page header                       |

The sidebar toggle overrides the default; the choice is remembered in this browser only
(`localStorage`, key `studipod-admin:shell`, no personal data).

## Building a page

```tsx
<PageHeader
  title="All users"
  breadcrumb={[{ label: 'Users', href: '/users' }, { label: 'All users' }]}
  description="…"
  badge={<Badge tone="success" showDot>Live data</Badge>}
  stats={[{ label: 'Active', value: '9,812' }]}
  actions={<Button variant="secondary">Export CSV</Button>}
/>
<PageContent>
  <ContentCard>{/* table, list–detail, form or dashboard cards */}</ContentCard>
</PageContent>
```

- `PageContent` overlaps the header by 56px on desktop, as designed.
- Use `ContentLoading` and `ContentEmpty` for the loading and empty states; they replace
  only the content slot.
- Pages opened from a list pass `back={{ href, label }}`; on phones the top bar then shows a
  back arrow and the page title (Mobile Top Bar, Type=Detail).

## Navigation and permissions

- `NAVIGATION` lists 4 sections, 13 groups and 37 pages. Each page names the permission key
  (from the Roles & Permissions matrix) needed to see it; groups with no visible pages are
  hidden. This is presentation only: the backend authorises every request.
- One group is open at a time. Navigating opens the current page's group.
- The collapsed sidebar shows group icons; hovering or clicking one opens a flyout of its
  pages (Enter opens it from the keyboard and focuses the first page; Escape closes it).

## Routing

- `app/(dashboard)/[...slug]/page.tsx` serves every navigation page and the account pages
  (`/profile`, `/profile/security`) that do not have a dedicated screen yet. It shows the page
  header and a "not available yet" state, or a "no access" state naming the missing permission.
- These addresses are generated at build time (`generateStaticParams` with
  `dynamicParams = false`), so any other address is a real `404`.
- When you build a dedicated screen (for example `app/(dashboard)/users/page.tsx`), set
  `hasDedicatedPage: true` on its entry in `src/config/navigation.ts` so the catch-all route
  stops generating that address.
- There is no app-wide `loading.tsx`: a streaming fallback would fix the response status at
  `200` before a page could return `404`. The session gate shows its own loading state.

## Session expiry

When the 24-hour inactivity limit is reached, the session ends and the "Your session has
expired" dialog opens over the console, which stays visible but inert behind it (as designed).
The console is drawn from a snapshot of who was signed in; it is never used for authorisation,
the query cache is already cleared, and keyboard shortcuts are off until the user signs in again.

## Search and keyboard shortcuts

| Keys                | Action                  |
| ------------------- | ----------------------- |
| Ctrl K (⌘ K on Mac) | Search the console      |
| G then P            | My profile              |
| G then S            | My security settings    |
| ?                   | Keyboard shortcuts      |
| Esc                 | Close menus and dialogs |

Search currently jumps to any page the administrator may open. Searching records (users,
tickets, payments) needs a backend search endpoint and is not built yet.

## Waiting on backend data

These parts of the design are built and tested with sample data, but show their empty
state until the backend provides the data. No values are invented in the meantime.

| Design element                        | Needs                                                     |
| ------------------------------------- | --------------------------------------------------------- |
| Notification panel items and bell dot | Administrator notifications endpoint and WebSocket events |
| Coral counts on sidebar groups/pages  | Counts of items needing action per area                   |
| "Signed in today at … · …" line       | `currentSignIn` in the session (see the auth contract)    |
| Help centre link in the account menu  | `NEXT_PUBLIC_ADMIN_HELP_URL`                              |
