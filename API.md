# DevClipboard Hub — API Reference

Base URL: `http://localhost:3001` (dev) · All endpoints are prefixed with `/api`

---

## Conventions

### Authentication

Protected routes require a Bearer access token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

The refresh token is stored as an **httpOnly cookie** named `refreshToken` (set automatically on login/verify).

### Error format

All error responses share the same shape:

```json
{
  "message": "Human-readable reason",
  "code": "MACHINE_CODE",
  "statusCode": 400
}
```

### Content-Type

All request bodies must be `application/json`.

---

## Health

### `GET /api/health`

No auth required.

**Response `200`**

```json
{ "status": "ok", "timestamp": "2026-03-14T10:00:00.000Z" }
```

---

## Auth — `/api/auth`

### `POST /api/auth/register`

Create a new account. Sends a 6-digit OTP to the email.

**Body**

```json
{
  "name": "Nishant",
  "email": "nishant@example.com",
  "password": "Min8CharPassword!"
}
```

**Response `201`**

```json
{ "message": "Verification email sent", "userId": "683abc..." }
```

---

### `POST /api/auth/verify-email`

Verify the OTP sent during registration. Issues access + refresh tokens.

**Body**

```json
{
  "email": "nishant@example.com",
  "otp": "483920"
}
```

**Response `200`** — sets `refreshToken` httpOnly cookie

```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": "683abc...",
    "email": "nishant@example.com",
    "name": "Nishant",
    "emailVerified": true,
    "avatarUrl": null,
    "twoFactorEnabled": false,
    "plan": "FREE",
    "createdAt": "2026-03-14T10:00:00.000Z"
  }
}
```

---

### `POST /api/auth/resend-verification`

Re-send OTP if the previous one expired (rate-limited: once per 9 min).

**Body**

```json
{ "email": "nishant@example.com" }
```

**Response `200`**

```json
{ "message": "Verification email sent if account exists" }
```

---

### `POST /api/auth/login`

Log in with email + password.

**Body**

```json
{
  "email": "nishant@example.com",
  "password": "Min8CharPassword!"
}
```

**Response `200` — normal login** — sets `refreshToken` cookie

```json
{
  "accessToken": "eyJ...",
  "user": { "id": "...", "email": "...", "name": "...", "plan": "FREE", ... }
}
```

**Response `200` — 2FA required** (no tokens yet, no cookie)

```json
{ "requires2FA": true, "twoFactorToken": "eyJ..." }
```

**Response `403` — email not verified**

```json
{
  "message": "Please verify your email first. A new code has been sent.",
  "code": "EMAIL_NOT_VERIFIED"
}
```

---

### `POST /api/auth/logout`

Revoke the current refresh token.

**Body** — none (reads `refreshToken` cookie automatically)

**Response `200`**

```json
{ "message": "Logged out" }
```

---

### `POST /api/auth/refresh`

Rotate the refresh token and issue a new access token.

**Body** — none (reads `refreshToken` cookie automatically)

**Response `200`** — sets new `refreshToken` cookie

```json
{
  "accessToken": "eyJ...",
  "user": { "id": "...", "email": "...", "plan": "FREE", ... }
}
```

---

### `POST /api/auth/2fa/setup`

**Requires auth.** Generate TOTP secret + QR code for the authenticator app.

**Body** — none

**Response `200`**

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeDataUrl": "data:image/png;base64,...",
  "backupCodes": ["a1b2c3d4", "e5f6g7h8", "..."]
}
```

---

### `POST /api/auth/2fa/enable`

**Requires auth.** Confirm TOTP setup with a live code. Returns final backup codes.

**Body**

```json
{ "totpCode": "483920" }
```

**Response `200`**

```json
{ "backupCodes": ["a1b2c3d4", "e5f6g7h8", "...", "(8 total)"] }
```

---

### `POST /api/auth/2fa/disable`

**Requires auth.** Disable 2FA (requires current password).

**Body**

```json
{ "password": "Min8CharPassword!" }
```

**Response `200`**

```json
{ "message": "2FA disabled" }
```

---

### `POST /api/auth/2fa/verify`

Verify the TOTP code after login returned `requires2FA: true`.

**Body**

```json
{
  "twoFactorToken": "eyJ...",
  "totpCode": "483920"
}
```

**Response `200`** — sets `refreshToken` cookie

```json
{
  "accessToken": "eyJ...",
  "user": { "id": "...", "email": "...", "plan": "FREE", ... }
}
```

---

### `POST /api/auth/magic-link`

Send a passwordless sign-in link (creates account if email is new).

**Body**

```json
{ "email": "nishant@example.com" }
```

**Response `200`**

```json
{ "message": "Magic link sent if valid email" }
```

---

### `POST /api/auth/magic-link/verify`

Verify the token from the magic-link URL (`?token=...`).

**Body**

```json
{ "token": "abc123def456..." }
```

**Response `200`** — sets `refreshToken` cookie

```json
{
  "accessToken": "eyJ...",
  "user": { "id": "...", "email": "...", "plan": "FREE", ... }
}
```

---

### `POST /api/auth/forgot-password`

Send a password-reset OTP.

**Body**

```json
{ "email": "nishant@example.com" }
```

**Response `200`**

```json
{ "message": "Reset code sent if account exists" }
```

---

### `POST /api/auth/reset-password`

Reset password using the OTP.

**Body**

```json
{
  "email": "nishant@example.com",
  "otp": "483920",
  "newPassword": "NewSecurePass99!"
}
```

**Response `200`**

```json
{ "message": "Password reset successful" }
```

---

### `PUT /api/auth/change-password`

**Requires auth.** Change password while authenticated.

**Body**

```json
{
  "currentPassword": "OldPass!",
  "newPassword": "NewSecurePass99!"
}
```

**Response `200`**

```json
{ "message": "Password changed" }
```

---

## Users — `/api/users`

All routes require auth.

### `GET /api/users/me`

Get the authenticated user's profile + subscription info.

**Response `200`**

```json
{
  "id": "683abc...",
  "email": "nishant@example.com",
  "name": "Nishant",
  "emailVerified": true,
  "avatarUrl": null,
  "twoFactorEnabled": false,
  "plan": "STARTER",
  "createdAt": "2026-03-14T10:00:00.000Z",
  "subscription": {
    "plan": "STARTER",
    "status": "ACTIVE",
    "currentPeriodEnd": "2026-04-14T10:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "billingInterval": "MONTHLY"
  }
}
```

---

### `PUT /api/users/me`

Update display name or avatar URL. All fields optional.

**Body**

```json
{
  "name": "Nishant Kumar",
  "avatarUrl": "https://cdn.example.com/avatar.png"
}
```

**Response `200`**

```json
{
  "id": "683abc...",
  "name": "Nishant Kumar",
  "avatarUrl": "https://cdn.example.com/avatar.png",
  "updatedAt": "2026-03-14T10:05:00.000Z"
}
```

---

### `DELETE /api/users/me`

Permanently delete account. Cancels active Razorpay subscription first.

**Body**

```json
{ "password": "Min8CharPassword!" }
```

> Magic-link-only accounts can pass an empty string: `{ "password": "" }`

**Response `200`**

```json
{ "message": "Account deleted" }
```

---

## Subscriptions — `/api/subscriptions`

### `GET /api/subscriptions/plans`

**Public — no auth required.** Returns all available plans.

**Response `200`**

```json
[
  {
    "id": "FREE",
    "name": "Free",
    "monthlyINR": 0,
    "yearlyINR": 0,
    "limits": { "clipboard": 50, "snippets": 10 },
    "features": [
      "50 clipboard items",
      "10 snippets",
      "Local storage only",
      "Device Inspector tab"
    ]
  },
  {
    "id": "STARTER",
    "name": "Starter",
    "monthlyINR": 19900,
    "yearlyINR": 230000,
    "rzpPlanIds": { "monthly": "plan_xxx", "yearly": "plan_yyy" },
    "limits": { "clipboard": 500, "snippets": -1 },
    "features": [
      "500 clipboard items",
      "Unlimited snippets",
      "Export (JSON / CSV / TXT)",
      "All Inspector tabs",
      "Cloud sync"
    ]
  },
  {
    "id": "PRO",
    "name": "Pro",
    "monthlyINR": 59900,
    "yearlyINR": 700000,
    "rzpPlanIds": { "monthly": "plan_xxx", "yearly": "plan_yyy" },
    "limits": { "clipboard": 2000, "snippets": -1 },
    "features": [
      "2,000 clipboard items",
      "Unlimited snippets",
      "Export (all formats)",
      "All Inspector tabs",
      "Cloud sync",
      "Two-factor authentication",
      "API access"
    ]
  },
  {
    "id": "TEAM",
    "name": "Team",
    "monthlyINR": 99900,
    "yearlyINR": 1100000,
    "rzpPlanIds": { "monthly": "plan_xxx", "yearly": "plan_yyy" },
    "limits": { "clipboard": -1, "snippets": -1 },
    "features": [
      "Unlimited clipboard items",
      "Unlimited snippets",
      "Export (all formats)",
      "All Inspector tabs",
      "Cloud sync",
      "Two-factor authentication",
      "API access",
      "5 team members",
      "Shared snippets"
    ]
  }
]
```

> `limits: -1` means unlimited.

---

### `GET /api/subscriptions/me`

**Requires auth.** Get the authenticated user's subscription record.

**Response `200`**

```json
{
  "id": "sub_abc...",
  "userId": "683abc...",
  "plan": "STARTER",
  "status": "ACTIVE",
  "billingInterval": "MONTHLY",
  "rzpSubscriptionId": "sub_9xyzABC",
  "rzpPlanId": "plan_xxx",
  "currentPeriodStart": "2026-03-14T10:00:00.000Z",
  "currentPeriodEnd": "2026-04-14T10:00:00.000Z",
  "cancelAtPeriodEnd": false,
  "createdAt": "2026-03-14T10:00:00.000Z"
}
```

---

### `POST /api/subscriptions/cancel`

**Requires auth.** Cancel subscription at end of current billing period.

**Body** — none

**Response `200`**

```json
{ "message": "Subscription will cancel at period end" }
```

---

### `POST /api/subscriptions/reactivate`

**Requires auth.** Not supported with Razorpay — returns a redirect message.

**Response `400`**

```json
{
  "message": "To reactivate, please subscribe again from the pricing page.",
  "code": "REACTIVATE_NOT_SUPPORTED"
}
```

---

## Payments — `/api/payments`

All routes require auth.

### `POST /api/payments/checkout`

Create a Razorpay subscription and return the details needed to open the Razorpay checkout modal.

**Body**

```json
{ "planId": "plan_xxxxxxxxxxxxxxxxxxxx" }
```

> Use the `rzpPlanIds.monthly` or `rzpPlanIds.yearly` value from `GET /api/subscriptions/plans`.

**Response `200`**

```json
{
  "subscriptionId": "sub_9xyzABCDEFGH",
  "keyId": "rzp_test_xxxxxxxxxxxxxxxx"
}
```

**Frontend usage after this response:**

```js
const rzp = new Razorpay({
  key: keyId,
  subscription_id: subscriptionId,
  name: "DevClipboard Hub",
  handler: (res) => {
    // Call POST /api/payments/verify with res
  },
});
rzp.open();
```

---

### `POST /api/payments/verify`

Verify the Razorpay payment signature after the checkout modal succeeds.

**Body** — fields come directly from Razorpay's `handler` callback

```json
{
  "razorpay_payment_id": "pay_9xyzABCDEFGH",
  "razorpay_subscription_id": "sub_9xyzABCDEFGH",
  "razorpay_signature": "abc123def456..."
}
```

**Response `200`**

```json
{ "success": true }
```

**Response `400` — bad signature**

```json
{ "message": "Invalid payment signature", "code": "INVALID_SIGNATURE" }
```

---

## Webhooks — `/api/webhooks`

> These endpoints use a **raw Buffer body parser**, not JSON. Do not call them from frontend code.

### `POST /api/webhooks/razorpay`

Razorpay sends events here. Configure this URL in Razorpay Dashboard → Webhooks.

**Headers required by Razorpay**

```
Content-Type: application/json
x-razorpay-signature: <hmac-sha256-hex>
```

**Handled event types**
| Event | Action |
|---|---|
| `subscription.activated` | Set plan + status ACTIVE |
| `subscription.charged` | Renew period dates, keep ACTIVE |
| `subscription.halted` | Set status PAST_DUE |
| `subscription.cancelled` | Downgrade to FREE + CANCELED |
| `subscription.completed` | Downgrade to FREE + CANCELED |

**Response `200`**

```json
{ "received": true }
```

**Response `400` — bad or missing signature**

```json
{ "error": "Invalid signature" }
```

---

## Common Error Codes

| Code                       | Status | Meaning                                             |
| -------------------------- | ------ | --------------------------------------------------- |
| `EMAIL_IN_USE`             | 409    | Email already registered                            |
| `INVALID_CREDENTIALS`      | 401    | Wrong email or password                             |
| `EMAIL_NOT_VERIFIED`       | 403    | Must verify email before login                      |
| `INVALID_OTP`              | 400    | OTP wrong or expired                                |
| `TOO_SOON`                 | 429    | Resend blocked, wait before retrying                |
| `ALREADY_VERIFIED`         | 400    | Email already verified                              |
| `2FA_NOT_CONFIGURED`       | 400    | 2FA setup not started yet                           |
| `INVALID_TOTP`             | 401    | Wrong TOTP code                                     |
| `INVALID_2FA_TOKEN`        | 401    | 2FA step token expired (re-login)                   |
| `INVALID_REFRESH_TOKEN`    | 401    | Refresh token invalid or revoked                    |
| `TOKEN_REUSED`             | 401    | Refresh token reuse detected — all sessions revoked |
| `NOT_FOUND`                | 404    | Resource not found                                  |
| `INVALID_SIGNATURE`        | 400    | Razorpay payment signature mismatch                 |
| `NO_SUBSCRIPTION`          | 400    | No Razorpay subscription to cancel                  |
| `REACTIVATE_NOT_SUPPORTED` | 400    | Razorpay can't un-cancel; re-subscribe              |
