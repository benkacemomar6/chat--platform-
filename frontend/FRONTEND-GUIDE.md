# Profile, authentication, conversations, and message history

## Run locally

Run the existing backend services and API Gateway first. The frontend defaults to
`http://localhost:3000` for API requests. To change that address, create
`frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:YOUR_GATEWAY_PORT`
and restart Next.js. The gateway must allow your frontend origin through CORS.

From `frontend`, run `npm run dev -- --port 3001` and open
`http://localhost:3001`. On PowerShell installations that block npm.ps1, use
`npm.cmd run dev -- --port 3001`.

## Structure and concepts

- `app/(protected)/layout.tsx` wraps `/profile` and `/chat` in a shared layout.
  Parentheses make a route group: `(protected)` is not part of the URL.
- `components/protected-shell.tsx` checks for stored authentication tokens, fetches
  `GET /api/users/me`, and only renders its children after that request succeeds.
  It keeps loading/error state and offers retry for temporary backend failures.
  A small React context shares the returned profile with the two pages.
- `app/(protected)/profile/page.tsx` displays the profile. Optional profile fields
  have fallbacks because gRPC can omit empty fields.
- `lib/axios.ts` adds the access JWT to requests. A protected request returning
  401 uses one shared refresh operation, stores the rotated token pair, and
  retries the original request once. Failed refresh clears both tokens and
  notifies the shared layout, which redirects to `/login` using
  `useRouter().replace`. Storage events also handle logout or account changes in
  another tab. The backend remains responsible for access control; the browser
  guard controls what the UI displays.
- `app/login/page.tsx` saves a successful login token pair and navigates to `/chat`.
  It displays failures and disables submission while the request is pending.
- `app/(protected)/chat/page.tsx` owns the selected conversation state and passes
  it through props to the sidebar and message history components.
- `components/chat/conversation-list.tsx` fetches conversations with `useEffect`.
  It handles loading, errors, retry, and an empty list. The API returns participant
  IDs rather than names, so those IDs label conversations.
- `components/chat/message-history.tsx` fetches messages when mounted. Its parent
  uses the conversation ID as a React key, so switching conversations resets all
  message state. Cleanup aborts outstanding requests to prevent stale responses.
  Messages whose `senderId` equals the profile's `userId` appear on the right.

## Cursor pagination

The first message request sends `limit=30`. The server returns the latest batch
in chronological order, with `nextCursor` equal to the oldest message timestamp.
"Load older messages" sends that cursor as `before`, prepends the returned page,
and preserves the reader's scroll position. Duplicate message IDs are omitted.
A short or empty page ends pagination. An exactly full final page may require
one extra request because this API does not return `hasMore`.

The existing backend uses a timestamp-only cursor and strict `createdAt < before`.
Messages sharing the boundary timestamp can be skipped between pages. A future
backend improvement should use timestamp plus message ID for an unambiguous
cursor. The frontend follows the current API contract.

Socket.IO sends only the access token. Its authentication callback reads storage
on every connection attempt, so reconnects use a newly refreshed access token.
The refresh token is never sent through Socket.IO.

## Verification checklist

1. With no tokens, visit `/profile` and `/chat`: both should redirect to `/login`.
2. Log in with an existing account: expect `/chat` and the conversations request.
3. Open Profile: verify username, bio, and user ID against `/api/users/me`.
4. Select a conversation: check chronological history and the alignment of your
   own messages. Switch quickly between conversations and check for stale data.
5. Use an account with more than 30 messages: load older pages and confirm that
   previously visible messages stay in place and no IDs are duplicated.
6. Test an empty conversation and an account without conversations.
7. Stop a backend service and reload: expect an error with retry. Restart it and
   retry. A service failure should not remove the token.
8. With an expired access token and valid refresh token, load a protected page:
   expect one refresh, a successful retry, and a rotated token pair. With an
   invalid refresh token, expect `/login` without a refresh loop.
9. Log out: verify both tokens are removed, protected content disappears, and Back
   cannot reopen it. Also verify logout in a second tab.
10. At a narrow viewport, select a conversation, then use "Conversations" to
    return to the list.

Static checks: `npm run lint` and `npm run build`.
