---
name: Generated client auth
description: How browser sessions authenticate requests made by generated API hooks
---

The generated React client does not read browser storage on its own. Browser JWT sessions need to register a getter with the client's fetch layer, then write and clear the token at login/logout.

**Why:** Protected hooks otherwise make anonymous requests even when the UI has a valid session, which looks like a backend auth failure.

**How to apply:** For browser apps using `@workspace/api-client-react`, configure `setAuthTokenGetter` once at bootstrap and keep its storage key consistent with the auth screens.