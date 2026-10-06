# Microsoft and Facebook login plan

Research and design only. Read on 2026-10-06 from `dev_test` at `1ea066a4c1a6f3c21784113736409e93a892594b`.

Neither provider is enabled by this document. No dependency, credential, schema migration, login button, or production OAuth code was added. Email and password stay the account system.

Labels: **Fact**, **Recommendation**, **Open question**.

## 1. Recommendation

**Recommendation.** Leave both providers off.

RideWear already creates and restores accounts with email and password. The Microsoft and Facebook buttons stay config-gated, and production leaves them disabled when `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, and `MICROSOFT_CLIENT_ID` are unset. Turning either one on for a primary account, on an iOS build, runs into App Store Review Guideline 4.8 and into trust-boundary gaps in the code that already exists. Those gaps are listed in §4 and §5. They are not fixed here.

Of the two, Microsoft personal accounts are the only one worth a later implementation task. Facebook adds a social-data review, a data-deletion callback, and a redirect rule the current custom scheme does not match in Meta's manual-flow guide. Enabling both does not remove the iOS requirement and doubles the operator work. The comparison is in §12.

Do not enqueue that later task from this document.

## 2. What the app does today

**Fact.** Identity and connected services are separate. `AuthIdentity.provider` is `local`, `facebook`, or `microsoft`. `ConnectedAccount` is Strava. Strava is not a login method. Sources: `apps/api/prisma/schema.prisma`, `SECURITY.md` §1 and §4.

**Fact.** Email registration stores `User.email`, a bcrypt `passwordHash`, and an `AuthIdentity` with `provider: local` and `providerSubjectId` set to that email. Login requires `passwordHash`. An OAuth-only user has no password: forgot-password returns the same generic message and does not send mail, and change-password returns `NO_LOCAL_PASSWORD`. Sources: `UsersService.createLocalUser`, `AuthService.login`, `AuthService.forgotPassword`, `AuthService.changePassword`.

**Fact.** The PKCE login and link routes already exist and refuse to start when the provider is not configured:

- `POST /auth/oauth/:provider/start` and `POST /auth/oauth/:provider/callback`
- `POST /auth/identities/:provider/start` and `POST /auth/identities/:provider/callback` (JWT required)

`POST /auth/oauth` is a legacy path. It accepts `demo:` tokens only when `NODE_ENV` is not `production` and the provider is not configured. `ALLOW_DEMO_OAUTH` cannot turn that path on in production. Source: `AuthService.allowDemoOAuth` and `apps/api/.env.example`.

**Fact.** Flutter opens the authorize URL with `flutter_web_auth_2` and the callback scheme `ridewear`. That plugin uses the system browser session (Custom Tabs on Android, `ASWebAuthenticationSession` on iOS), not an embedded page the app draws itself. After the redirect it posts `code` and `state` to the API. Source: `apps/mobile/lib/services/oauth_flow.dart`.

**Fact.** The login screen still shows Microsoft and Facebook buttons. They call the real PKCE flow only when `GET /auth/providers` says that provider is enabled. Otherwise, outside production, they call the legacy demo path. In production, with the providers unset, the buttons are disabled. Profile has the same gate for linking. This plan does not change those screens.

**Fact.** There is no unlink route. Account deletion deletes `OAuthState` rows for that user and then the user. `AuthIdentity` rows follow the user through `onDelete: Cascade`. `OAuthState.userId` is still not a foreign key. Source: `UsersService.deleteAccount`.

## 3. Trust boundary

```
Flutter  -- RideWear JWT -->  NestJS API  -- code + PKCE verifier -->  Microsoft or Meta
   |                              |
   | secure storage               | AuthIdentity (subject, optional email, optional avatar)
   | no IdP secret                | OAuthState (state, verifier, 10 minutes)
```

**Fact.** The mobile app must not hold `FACEBOOK_APP_SECRET`, `MICROSOFT_CLIENT_SECRET`, or the PKCE `code_verifier`. The verifier is created in `startOAuth`, stored on `OAuthState`, and sent only by the API during the code exchange. The state row is deleted before the exchange, so a code can be redeemed once.

**Recommendation.** Keep that shape. The API is the confidential side of the exchange even when the IdP registration is a public client. Flutter's only IdP job is to open the system browser and return `code` and `state`.

**Fact.** RideWear's own session is a separate HS256 JWT. `JwtModule` signs `{ sub: userId }` with `JWT_EXPIRES_IN` defaulting to `7d`. The login body still returns email and display name. `JwtStrategy` accepts an optional `email` claim so older tokens keep working. The device stores the token in `flutter_secure_storage` under `accessToken`, with iOS keychain accessibility `first_unlock_this_device` and iCloud sync off. Logout deletes that key. There is no server session list and no refresh token.

**Recommendation.** Do not store Microsoft or Facebook access tokens, refresh tokens, or ID tokens. The IdP exchange exists to prove a subject and then issue the RideWear JWT. Requesting `offline_access` from Microsoft, which the code does today, asks for a refresh token the API then discards. A later change should stop sending that scope. This document does not change the code.

## 4. Microsoft

Sources read on 2026-10-06:

- [OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [How to add a redirect URI](https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-redirect-uri)
- [ID tokens](https://learn.microsoft.com/en-us/entra/identity-platform/id-tokens) and [ID token claims](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference)
- [OpenID Connect](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
- [Public and confidential clients](https://learn.microsoft.com/en-us/entra/identity-platform/msal-client-applications)
- [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252) (OAuth 2.0 for native apps)

### Flow to keep

**Recommendation.** Authorization code plus PKCE (`S256`) in the system browser. That is the flow the API already builds:

1. API creates `state`, `code_verifier`, and `code_challenge`, and inserts `OAuthState` with purpose `login` or `link`, a 10-minute expiry, and the redirect URI.
2. The phone opens `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` with `response_type=code`, `response_mode=query`, `scope`, `state`, `code_challenge`, and `code_challenge_method=S256`.
3. The system browser returns to `ridewear://oauth/callback?code&state`.
4. The phone posts `code` and `state` to the matching callback. The API checks purpose, expiry, and, for link, the JWT user id, deletes the state row, and posts the code and verifier to `/{tenant}/oauth2/v2.0/token`.
5. The API validates the ID token and maps it to an `AuthIdentity`. It then issues a RideWear JWT.

Do not use the implicit flow. Do not use an embedded WebView. Do not use the resource-owner password grant. Do not add MSAL in the first implementation. `flutter_web_auth_2` is already the external user-agent.

### Public client

**Fact.** Microsoft documents native and mobile apps as public clients. Public clients must not send a client secret when redeeming an authorization code. The current `exchangeMicrosoft` adds `MICROSOFT_CLIENT_SECRET` when it is set.

**Recommendation.** Register the app as **Mobile and desktop applications**, enable public client flows, and leave `MICROSOFT_CLIENT_SECRET` empty. The API already allows a missing secret. A later change should ignore a secret for this provider so a copied web-app secret cannot turn the public client into a hybrid. A confidential client, with a secret, is a different registration: its redirect URI has to be an HTTPS URL on the API, not `ridewear://`. Do not mix those two registrations.

### Tenant and subject

**Fact.** `MICROSOFT_TENANT_ID` defaults to `common`. The `common` authority accepts personal Microsoft accounts and any Entra ID work tenant. Personal Microsoft accounts use tenant id `9188040d-6c67-4c5b-b112-36a304b66dad`. The `oid` claim is immutable inside one tenant and is different for the same person in another tenant. `profile` is required to receive `oid`. `sub` is the pairwise id for this app registration. `preferred_username` and `email` can change and are not the account key. Sources: ID token claims reference, read 2026-10-06.

**Fact.** The code sets `providerSubjectId` to `oid`, or `sub` if `oid` is missing, and does not store the tenant id. It copies `preferred_username` or `email` onto both the identity and `User.email`.

**Recommendation.** Before any real Microsoft user exists:

- Set the authority to `consumers` unless a human explicitly wants work accounts. `common` lets a person create a RideWear account from an arbitrary organization tenant.
- Persist the subject as `{tid}:{oid}`. The column is already a string, so this does not need a migration if it happens before real rows exist. Demo subjects (`demo:…`) are not Microsoft oids.
- Treat missing `oid` as a failed login. Do not fall back to `preferred_username`.
- Keep email off `User.email` unless the token says that address is verified. Store an unverified address only on `AuthIdentity.providerEmail`, or store nothing. An unverified address must not occupy `User.email` and block the person who actually controls that mailbox.

**Open question.** Work-account login (`organizations` or `common`) is a product decision. The recommendation is personal accounts only.

### ID token checks the code does not do yet

**Fact.** `jwtVerify` is called with the tenant JWKS and `audience` set to `MICROSOFT_CLIENT_ID`. The authorize URL does not send `nonce`. The verify call does not set `issuer`. Microsoft's ID token page says to check the signature, `aud`, the time claims, and that `nonce` matches the authorize request. For the v2 endpoint the issuer is `https://login.microsoftonline.com/{tid}/v2.0`, not the word `common`.

**Recommendation.** A later change, still with the provider unset, should:

1. Store a `nonce` on `OAuthState` and send it on authorize. The state row is the right place; no new table.
2. Require `iss` to be `https://login.microsoftonline.com/{tid}/v2.0` and require `tid` to match the chosen authority. For `consumers`, that tenant id is the personal-account GUID above.
3. Require `aud` to equal `MICROSOFT_CLIENT_ID`, and require `exp` / `nbf`.
4. Validate the ID token from the token response. Do not accept a token the phone supplies.
5. When `MICROSOFT_CLIENT_ID` is set, `POST /auth/oauth` must reject Microsoft instead of validating a client-supplied token. Demo tokens stay available only while the provider is unset and `NODE_ENV` is not production.

### Scopes

**Recommendation.** Request `openid profile email`. Drop `offline_access`. Do not request Microsoft Graph scopes such as `User.Read`. `profile` is what yields `name` and `oid`. `email` is optional profile data, not the subject. If the person has no email claim, create the account with `User.email` null.

### Sign-out

**Fact.** The v2 sign-out endpoint is `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/logout`. A `post_logout_redirect_uri` must be registered. RideWear logout currently only deletes the local JWT.

**Recommendation.** Do not call Microsoft sign-out until the provider is enabled, and do not block local logout on it. RideWear does not keep a Microsoft session. Provider sign-out is optional polish after enablement, because the RideWear JWT is the session that matters.

## 5. Facebook

Sources read on 2026-10-06:

- [Manually Build a Login Flow](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow), page updated 30 June 2026. Its examples use Graph `v25.0`.
- [OIDC code flow with PKCE](https://developers.facebook.com/docs/facebook-login/guides/advanced/oidc-token/). On that page, `client_secret` is optional when `code_verifier` is sent. Limited Login is not available on this manual OIDC flow.
- [Login Security](https://developers.facebook.com/docs/facebook-login/security). Strict mode requires the redirect URI to match a registered value exactly. `state` is the exception.
- [Data Deletion Request Callback](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback).
- [Graph API versioning](https://developers.facebook.com/docs/graph-api/guides/versioning/). The versioning guide's dialog example uses `v26.0`. The JavaScript SDK page fetched the same day says to use the most recent version, `v26.0`, unless there is a reason not to.
- [Facebook Login for iOS](https://developers.facebook.com/docs/facebook-login/ios/) and [for Android](https://developers.facebook.com/docs/facebook-login/android/). Those quickstarts are SDK integrations. This plan does not add those SDKs.

### Flow

**Fact.** The API already starts `https://www.facebook.com/v19.0/dialog/oauth` with `response_type=code`, `scope=public_profile,email`, PKCE S256, and `state`. The exchange is `GET https://graph.facebook.com/v19.0/oauth/access_token` with `client_id`, `client_secret`, `redirect_uri`, `code`, and `code_verifier`, then `GET /me?fields=id,name,email,picture.type(large)`.

**Fact.** Meta's manual-flow guide still describes a server-side code exchange with the app secret. The separate OIDC PKCE guide allows the secret to be omitted when the verifier is present. The app secret must stay on the API either way. The manual-flow guide's redirect examples are HTTPS, plus `ms-app://` for Windows desktop and `https://www.facebook.com/connect/login_success.html` for an embedded desktop webview. It does not document `ridewear://oauth/callback`. The iOS SDK uses an `fb{APP-ID}` scheme, which is a different integration.

**Recommendation.** Do not enable Facebook on the current redirect until a human confirms, in the App Dashboard, that `ridewear://oauth/callback` is accepted as a Valid OAuth Redirect URI. If the dashboard rejects it, the implementation has to add an HTTPS callback on the existing API and only then continue. That callback would exchange the code on the server and redirect to `ridewear://oauth/callback` with a one-time RideWear result, not with the app secret. Do not add the Facebook SDK to get a custom scheme. Do not embed a WebView.

**Recommendation.** Pin a Graph version that the versioning page still lists on the day of implementation. `v19.0` is what the code calls today. The pages read on 2026-10-06 show `v25.0` and `v26.0`. Meta's versioning guide says a version stays available for at least two years. Re-read that guide before changing the pin. Do not guess that `v19.0` still answers.

### Token check

**Fact.** The manual-flow guide says to inspect the access token with `GET graph.facebook.com/debug_token` using an app token, and to check `app_id` and `user_id`. The code exchange does not call `debug_token`. The legacy `POST /auth/oauth` path, when Facebook is configured, calls `/me` with the access token the phone sent and does not check `app_id`.

**Recommendation.** After a code exchange, call `debug_token` from the API and require `is_valid`, the app id, and the same user id returned by `/me`. When `FACEBOOK_APP_ID` is set, reject `POST /auth/oauth` for Facebook. Demo tokens stay only while Facebook is unset and `NODE_ENV` is not production.

### Scopes and data

**Recommendation.** `public_profile` is the minimum: app-scoped user id and name. Request `email` only as an optional permission and allow login when it is declined. Do not request friends, birthday, photos, or pages. Do not request `picture` until a profile photo is a product requirement. Do not use the Facebook user id as `User.email`.

**Fact.** The data-deletion document says apps that access user data must explain deletion in the privacy policy, and must configure either a data-deletion instruction URL or an HTTPS callback. The callback returns `{ url, confirmation_code }`. A deauthorize callback is separate and optional.

**Recommendation.** If Facebook is ever enabled, the operator sets an instruction URL that points at the in-app account deletion path before any callback code exists. A callback, if added later, would remove the Facebook `AuthIdentity` for that app-scoped id and, when that user has no password and no other identity, delete the RideWear account the same way `DELETE` account does. The status page must not reveal whether an email is registered. This plan does not add that endpoint.

### Limited Login

**Fact.** Meta's OIDC PKCE page says Limited Login is not available on the manual flow. Limited Login is an iOS SDK feature.

**Recommendation.** Do not take a new SDK dependency to get Limited Login. The manual code flow is the one that matches the current API.

## 6. Account linking

These rules match the code where it is already safe, and they name the gaps a later change has to close before enablement.

| Situation | Required behavior | Today |
| --- | --- | --- |
| Same provider subject signs in again | Issue a RideWear JWT for that user. Do not create a second user. | Implemented in `loginWithIdentity`. |
| Provider email matches another user's `User.email` | Do not merge. Return `EMAIL_IN_USE_LINK_REQUIRED`. The person signs in with email, then links in Profile. | Implemented. The legacy demo path has no email, so this is covered by the direct identity tests. |
| Provider subject already linked to another user | Linking returns a conflict. Login returns the original user. | Implemented in `linkIdentity`. |
| Link without a RideWear JWT | Reject. | Link routes use `JwtAuthGuard`, and the state row stores `userId`. |
| Login state used on the link callback, or the reverse | Reject purpose mismatch. | Implemented. |
| Email missing or declined | Create the user with `User.email` null. Password reset stays unavailable until they set a password. | Create path allows null email. |
| Unverified provider email | Do not write it to `User.email`. | Not implemented. Microsoft currently copies `preferred_username`. |
| Unlink | Allow only when another method remains: a password or a second identity. Otherwise require account deletion. | No unlink route. |
| Provider account disappears | The RideWear user remains. Password login still works if `passwordHash` is set. An OAuth-only user has no recovery until they have set a password on a verified email. | No provider-revoke handler. |
| Two providers, one person | They stay two users unless the signed-in user links the second subject. | Implemented by the no-merge rule. |
| User deletes the RideWear account | Delete identities with the user. A later Facebook callback must tolerate an already-deleted subject. | User cascade deletes identities. |

**Recommendation.** Add unlink only in the implementation task, and only with the "another method remains" rule. Do not add a support backdoor that binds a provider subject to an email by hand.

**Recommendation.** After a successful provider link, Profile should keep offering "set a password" for users with `NO_LOCAL_PASSWORD`. That flow already exists as change-password only when a hash exists, so the later task needs an explicit set-password path that proves control of `User.email` first. Without that, an OAuth-only user is stranded when the provider account disappears.

## 7. Session, logout, and revocation

| Item | Rule |
| --- | --- |
| RideWear access token | Remains the HS256 JWT with `sub` only. Default lifetime 7 days. Stored in secure storage. Not an IdP token. |
| Logout | Delete the local token, as `AuthState.logout` does. Do not call Microsoft or Facebook unless those providers are enabled and a human wants a provider sign-out. Local logout must succeed if the provider is unreachable. |
| Revocation | There is no server denylist. A stolen RideWear JWT works until `exp`. That is the current email-login property too. Do not add a session table in the provider task. |
| IdP tokens | Do not persist them. Do not encrypt them with `TOKEN_ENCRYPTION_KEY`. That key is for Strava. |
| PKCE verifier | Stays in `OAuthState` until use or expiry. `deleteExpiredAuthSecrets` already runs on start. Do not log `code`, `code_verifier`, ID tokens, or app secrets. |
| Account deletion | Keeps the current user delete. It does not call Microsoft logout or Facebook deauthorize. A failed provider call must not decide whether the local account can be removed. Same rule as Strava today. |

## 8. Redirects and operator setup

No step below is done by this task. No secret belongs in git, in Flutter, or in this document.

### Values already in the repo

| Item | Value |
| --- | --- |
| Redirect | `ridewear://oauth/callback` (`OAUTH_REDIRECT_URI`) |
| Android scheme | `ridewear`, host `oauth`, path prefix `/callback` on `MainActivity` |
| Android application id | `no.motorcycleclothing.motorcycle_clothing` |
| iOS scheme | `ridewear` in `CFBundleURLSchemes` |
| iOS bundle id | `no.motorcycleclothing.motorcycleClothing` |
| Callback scheme passed to the browser helper | `ridewear` |

**Fact.** RFC 8252 prefers claimed HTTPS redirects (Android App Links, iOS Universal Links) because another app can register the same custom scheme. PKCE with the verifier stored only on the API limits what a scheme collision can do: the other app can see the authorization code and cannot redeem it without the verifier. That is acceptable for a first enablement. Claimed HTTPS links are a later hardening step, not a new provider.

### Microsoft, human operator

1. Create an app registration whose supported accounts are personal Microsoft accounts if the authority is `consumers`.
2. Add platform **Mobile and desktop applications**. Add the custom redirect `ridewear://oauth/callback`. The redirect-URI document says this platform is the one for mobile apps that are not using MSAL, and that a custom redirect URI is allowed there.
3. Turn on public client flows. Do not create a client secret.
4. Put `MICROSOFT_CLIENT_ID` and `MICROSOFT_TENANT_ID=consumers` in the API host environment. Leave `MICROSOFT_CLIENT_SECRET` empty.
5. Do not register the MSAL broker redirects (`msauth://…`, `msauth.{bundle}://auth`) unless a later task adds MSAL. Those redirects are a different integration.
6. Confirm the iOS consequence in §12 before shipping an iOS build with the button enabled.

### Facebook, human operator

1. Create a Meta app and add Facebook Login.
2. Set a privacy-policy URL and either a data-deletion instruction URL or an HTTPS deletion callback.
3. Try to save `ridewear://oauth/callback` under Valid OAuth Redirect URIs. If the dashboard rejects it, stop. Do not ship a secret while the code still sends that redirect.
4. Leave the app in development mode until App Review grants the access external users need. The Android quickstart says `public_profile` needs advanced access for external users. Role users can test before that.
5. Put `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` only in the API host environment.
6. Package name, bundle id, and signing key hashes are required by the native SDK quickstarts. They are not required by the manual code flow unless the operator chooses the SDK. Do not commit a keystore or a key hash.

### Android and a future iOS build

The Android intent filter and the iOS URL type for `ridewear` are already present. A future iOS build uses the same scheme. Universal Links and Associated Domains are not required for the custom-scheme phase. Do not add the Facebook queries (`fbapi`) or Microsoft Authenticator queries (`msauthv2`, `msauthv3`) unless the SDK or broker path is chosen.

## 9. Privacy

| Data | Ask for it? | Where it would live |
| --- | --- | --- |
| Provider subject (`facebook` app-scoped id, or Microsoft `tid` + `oid`) | Yes. It is the login key. | `AuthIdentity.providerSubjectId` |
| Display name | Yes, for the profile name on first create. | `User.displayName` |
| Email | Optional. Only from a verified claim, and never as a silent merge. | `AuthIdentity.providerEmail`. `User.email` only when verified and unused. |
| Avatar URL | No, until a product task asks. | The code stores `picture` today. A later change should stop requesting it. |
| Friend list, birthday, posts | No. | Nowhere. |
| Provider access or refresh token | No. | Nowhere. |
| RideWear JWT | Yes, as today. | Device secure storage. The token carries the user id, not the email. |

Provider login does not change the weather, route, or wardrobe data flows. It adds an identity row and, when email is kept, the same mailbox already used for password reset.

## 10. Phased work

A later human-authorized task would do the code work. This phase list is the scope boundary, not permission to start.

### Phase 0 — this document

Providers stay off. Email and password stay as they are.

### Phase 1 — close the gaps while both providers stay unconfigured

Files that would change, and no others:

- `apps/api/src/auth/auth.service.ts`
- Focused specs next to `auth.linking.spec.ts`
- `apps/api/.env.example` comments only if the tenant recommendation needs to be visible. No secret values.

Work:

- Microsoft: nonce, issuer, `tid`+`oid` subject, drop `offline_access`, do not send a client secret, do not copy `preferred_username` into `User.email`.
- Facebook: move off `v19.0` only after re-reading the versioning page; add `debug_token`; stop requesting the picture field.
- Reject the legacy token body when that provider is configured.
- Keep `GET /auth/providers` returning `enabled: false` when the env vars are empty.
- Do not add a package, a migration, or a button.

### Phase 2 — operator setup

A human does §8 outside the repository. The agent does not create IdP apps or handle secrets.

### Phase 3 — Microsoft only, if a human still wants it

Set the API env vars on the host. Confirm `enabled: true` only for Microsoft. Exercise the test matrix on Android. Do not ship the iOS binary with the button on until Guideline 4.8 is satisfied by a separate, explicitly authorized login.

### Phase 4 — Facebook only by a separate decision

Start only after the redirect URI is accepted or an HTTPS API callback exists, and after deletion instructions are published. This is not the default next step after Microsoft.

## 11. Test matrix

Run these in the later implementation task. They are not run for this document, because this document does not change runtime code.

| Check | Pass |
| --- | --- |
| Provider unset | `providersStatus` has Facebook and Microsoft `enabled: false`. Start returns 400. Legacy `demo:` still works outside production. |
| Production demo | `NODE_ENV=production` rejects `demo:` even if `ALLOW_DEMO_OAUTH` is set. Already the rule. |
| PKCE | Authorize URL contains `code_challenge_method=S256`. Token request contains the stored verifier and not a secret. |
| State | Expired, reused, or purpose-mismatched state is rejected. Link state from another user is rejected. |
| Microsoft token | Wrong `aud`, wrong `iss`, wrong `nonce`, or missing `oid` does not create a user. |
| Subject | The stored id is `{tid}:{oid}`. A second login with the same pair does not create a user. |
| Email collision | Verified email that belongs to another user returns `EMAIL_IN_USE_LINK_REQUIRED` and does not create an identity. |
| Unverified email | `User.email` stays null. |
| Facebook debug token | `app_id` mismatch or `is_valid: false` does not create a user. |
| Legacy lockout | With the provider configured, `POST /auth/oauth` does not accept a raw provider token. |
| Logout | Local token is removed when the device is offline. |
| Secrets | Tests use fake ids. No real app secret, client secret, or token is committed. |
| UI | No new widget test is required in phase 1. Existing tests that expect both providers disabled keep passing. |

No Android device, iOS device, or live IdP call is required to merge phase 1. Phase 3 needs one physical or emulator pass: system browser opens, cancel returns to the app, success reaches Profile, and a second launch restores the session from secure storage.

## 12. Microsoft, Facebook, both, or neither

| Choice | What it adds | What it costs | Fit for RideWear |
| --- | --- | --- | --- |
| Neither | Nothing. Email and password already register, reset, and restore a session. | People type a password. | Best current choice. |
| Microsoft only | A personal-account button on top of the PKCE path that already exists. No social graph. Scopes can stay `openid profile email`. | Entra registration. The token checks in §4. App Store Review Guideline 4.8 if the iOS app offers it as a primary login. | The only provider worth a later task, and only after phase 1 and a human iOS decision. |
| Facebook only | A familiar consumer button. | Graph version pin, `debug_token`, redirect-URI uncertainty, App Review for external users, privacy-policy and data-deletion setup, and the same iOS guideline. The app does not use Facebook friends or posts. | Weak fit. |
| Both | Two buttons. | Both cost columns, plus two operator consoles. iOS still needs a qualifying equivalent login. | Not worth it before either one is proven. |

**Fact.** Guideline 4.8, read on 2026-10-06 from [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), says an app that uses a third-party or social login service to set up or authenticate the user's primary account must also offer an equivalent login that limits collection to name and email, lets the user hide their email, and does not collect app interactions for advertising without consent. Facebook Login is one of the named examples. Microsoft is not named in that sentence. It is still a third-party login used as a primary account, so the section applies unless an exception does. RideWear is not an enterprise-only app, a government ID client, or a client whose only purpose is Facebook or Microsoft. The app's own email form does not provide a private relay address. Sign in with Apple is the login that meets the three bullets in current App Store practice. This plan does not add it and does not queue it.

**Fact.** Android has no equivalent store rule in the documents read for this task. Enabling Microsoft on an Android build alone would not trigger Guideline 4.8. The repository already contains an iOS target with the same login screen, so turning the flag on in a shared API would affect an iOS build that pointed at that API.

**Recommendation.** Neither, until a human writes a task that includes the phase 1 fixes and an explicit decision about Sign in with Apple. Do not set `MICROSOFT_CLIENT_ID`, `FACEBOOK_APP_ID`, or `FACEBOOK_APP_SECRET` on the way there.
