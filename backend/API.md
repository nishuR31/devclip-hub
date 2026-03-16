# Backend API Reference

Base URL: `http://localhost:3001/api`

This document reflects the current backend contracts (routes + controllers + response wrapper behavior).

## Response Format

Success:

```json
{
  "success": true,
  "message": "...",
  "...payloadFields": "..."
}
```

Error:

```json
{
  "success": false,
  "message": "...",
  "code": "OPTIONAL_ERROR_CODE"
}
```

Notes:

- Object payloads are flattened into top-level fields.
- Array/scalar payloads are wrapped as `data`.
- Some delete endpoints return `204 No Content` with empty body.

---

## Health

### `GET /api/health`

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-03-17T00:00:00.000Z"
}
```

---

## Auth (`/api/auth`)

### `POST /register`

Body:

```json
{ "name": "Nishant", "email": "user@example.com", "password": "password123" }
```

Response `201`:

```json
{ "success": true, "message": "Registration successful", "userId": "..." }
```

### `POST /verify-email`

Body:

```json
{ "email": "user@example.com", "otp": "123456" }
```

Response `200`:

```json
{
  "success": true,
  "message": "Email verified",
  "accessToken": "...",
  "user": { "id": "...", "email": "...", "plan": "FREE" }
}
```

Sets `refreshToken` cookie.

### `POST /resend-verification`

Body:

```json
{ "email": "user@example.com" }
```

Response `200`:

```json
{
  "success": true,
  "message": "If that email exists, a new code has been sent."
}
```

### `POST /login`

Body:

```json
{ "email": "user@example.com", "password": "password123" }
```

Response `200` (normal login):

```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "...",
  "user": { "id": "...", "email": "...", "twoFactorEnabled": false }
}
```

Response `200` (2FA required):

```json
{
  "success": true,
  "message": "2FA required",
  "requires2FA": true,
  "twoFactorToken": "..."
}
```

### `POST /logout`

Response `200`:

```json
{ "success": true, "message": "Logged out" }
```

Clears `refreshToken` cookie.

### `POST /refresh`

Uses `refreshToken` cookie.
Response `200`:

```json
{
  "success": true,
  "message": "Token refreshed",
  "accessToken": "...",
  "user": { "id": "...", "email": "...", "plan": "FREE" }
}
```

### OAuth

- `GET /oauth/google/url` → `{ success, message, url }`
- `GET /oauth/google/callback?code=...` → `{ success, message, accessToken, user }` + refresh cookie
- `POST /oauth/google` body `{ code }` → same as callback

### 2FA

- `POST /2fa/setup` (auth) → `{ secret, qrCodeDataUrl, backupCodes }`
- `POST /2fa/enable` (auth) body `{ totpCode }` → `{ backupCodes }`
- `POST /2fa/disable` (auth) body `{ password }` → success message only
- `POST /2fa/verify` body `{ twoFactorToken, totpCode }` → `{ accessToken, user }` + refresh cookie

### Magic Link

- `POST /magic-link` body `{ email }` → success message only
- `POST /magic-link/verify` body `{ token }` → `{ accessToken, user }` + refresh cookie

### Password

- `POST /forgot-password` body `{ email }` → success message only
- `POST /reset-password` body `{ email, otp, newPassword }` → success message only
- `PUT /change-password` (auth) body `{ currentPassword, newPassword }` → success message only

---

## Users (`/api/users`)

### `GET /me` (auth)

Response `200`:

```json
{
  "success": true,
  "message": "Profile fetched",
  "id": "...",
  "email": "user@example.com",
  "name": "Nishant",
  "plan": "FREE",
  "subscription": {
    "plan": "FREE",
    "status": "ACTIVE",
    "currentPeriodEnd": null,
    "cancelAtPeriodEnd": false,
    "billingInterval": "MONTHLY"
  }
}
```

### `PUT /me` (auth)

Body:

```json
{ "name": "Updated Name", "avatarUrl": "https://..." }
```

Response `200`: `{ success, message: "Profile updated", ...updatedFields }`

### `DELETE /me` (auth)

Body:

```json
{ "password": "password123" }
```

Response `200`:

```json
{ "success": true, "message": "Account deleted" }
```

---

## Subscriptions (`/api/subscriptions`)

### `GET /plans`

Response `200`:

```json
{
  "success": true,
  "message": "Plans fetched",
  "data": [
    {
      "id": "FREE",
      "monthlyINR": 0,
      "yearlyINR": 0,
      "limits": { "clipboard": 25, "snippets": 25 }
    }
  ]
}
```

### `GET /me` (auth)

Response `200`: `{ success, message: "Subscription fetched", ...subscriptionFields }`

### `POST /cancel` (auth)

Response `200`: `{ success, message: "Subscription cancellation scheduled", ...subscriptionFields }`

### `POST /reactivate` (auth)

Currently returns error (`400`) with code `REACTIVATE_VIA_PRICING`.

---

## Payments (`/api/payments`)

### `POST /checkout` (auth)

Body:

```json
{ "planId": "plan_xxxxx" }
```

Response `200`:

```json
{
  "success": true,
  "message": "Checkout session created",
  "subscriptionId": "sub_xxxxx",
  "keyId": "rzp_test_xxxxx"
}
```

### `POST /verify` (auth)

Body:

```json
{
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_subscription_id": "sub_xxxxx",
  "razorpay_signature": "..."
}
```

Response `200`:

```json
{ "success": true, "message": "Payment verified" }
```

---

## Workspace (`/api/workspace`)

### `GET /capabilities` (auth)

Response `200`:

```json
{
  "success": true,
  "message": "Capabilities fetched",
  "plan": "FREE",
  "limits": { "clipboard": 25, "snippets": 25 },
  "canEdit": false,
  "canUseCloud": false,
  "canUseTeams": false,
  "canTagEdit": false,
  "source": "localStorage"
}
```

### `GET /team-members` (auth)

Response `200`:

```json
{
  "success": true,
  "message": "Team members fetched",
  "members": [],
  "count": 0,
  "plan": "FREE"
}
```

---

## Clipboard (`/api/clipboard`)

### `GET /` (auth)

Query: `?limit=100`
Response `200`:

```json
{
  "success": true,
  "message": "Clipboard entries fetched",
  "data": [],
  "total": 0,
  "source": "localStorage"
}
```

### `POST /` (auth)

Body:

```json
{ "content": "hello", "pinned": false, "tags": ["work"] }
```

Response `201`: `{ success, message: "Clipboard entry created", ...entry }`

### `PUT /:id` (auth)

Body (partial):

```json
{ "content": "updated", "pinned": true, "tags": ["updated"] }
```

Response `200`: `{ success, message: "Clipboard entry updated", ...entry }`

### `DELETE /:id` (auth)

Response `204` (empty body)

### `DELETE /` (auth)

Clears unpinned entries.
Response `204` (empty body)

---

## Snippets (`/api/snippets`)

### `GET /` (auth)

Query: `?limit=200`
Response `200`: `{ success, message: "Snippets fetched", data: [...] }`

### `POST /` (auth)

Body:

```json
{
  "title": "My Snippet",
  "content": "const a = 1;",
  "tags": ["js"],
  "masked": false,
  "sharedWithTeam": false
}
```

Response `201`: `{ success, message: "Snippet created", ...entry }`

### `PUT /:id` (auth)

Body accepts partial snippet fields.
Response `200`: `{ success, message: "Snippet updated", ...entry }`

### `DELETE /:id` (auth)

Response `204` (empty body)

---

## Webhooks (`/api/webhooks`)

### `POST /razorpay`

Requires header `x-razorpay-signature` and raw JSON body.

Response `200`:

```json
{ "success": true, "message": "Webhook received", "received": true }
```

Invalid signature:

```json
{ "success": false, "message": "Invalid signature" }
```

---

## Status Codes Used

- `200` Success
- `201` Created
- `204` No Content
- `400` Validation/Business rule error
- `401` Unauthorized
- `403` Forbidden
- `404` Not found
- `409` Conflict
- `429` Rate-limited
- `500` Internal error
