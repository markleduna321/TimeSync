# External API — Desktop Timekeeping App

**Base URL:** `https://<your-domain>/api/external`  
**Auth:** Sanctum Personal Access Token — send as `Authorization: Bearer <token>`  
**Content-Type:** `application/json`  
**Accept:** `application/json`

---

## Overview

This API is exclusively for the desktop timekeeping application. It covers two concerns:

1. **User sync** — pull the employee list with schedule data so the desktop can operate offline.
2. **Time log push** — send clock-in/out events to the payroll server, either in real time or as a batched flush when connectivity is restored.

Payroll computation stays on the server. The desktop never needs salary or payroll data.

---

## Authentication

### Issue a Token

Obtain a personal access token by authenticating with employee credentials and a stable device name. The token is scoped to `external:timekeeping` and cannot access any other part of the API.

```
POST /auth/token
```

> **Rate limit:** 10 requests per minute per IP.  
> **No `Authorization` header required.**

**Request**

```json
{
  "email": "juan.dela.cruz@company.com",
  "password": "secret",
  "device_name": "Lobby Kiosk 1"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | ✅ | Employee email |
| `password` | string | ✅ | |
| `device_name` | string | ✅ | Max 255 chars. An existing token for the same device name is revoked and replaced. |

**Response `200 OK`**

```json
{
  "token": "3|abcdefghijklmnop...",
  "user": {
    "id": 12,
    "name": "Juan Dela Cruz",
    "email": "juan.dela.cruz@company.com"
  }
}
```

Store the `token` value securely on the device. Send it in every subsequent request as:

```
Authorization: Bearer 3|abcdefghijklmnop...
```

**Error `401 Unprocessable`**

```json
{
  "message": "The provided credentials are incorrect.",
  "errors": {
    "email": ["The provided credentials are incorrect."]
  }
}
```

---

### Revoke a Token

Invalidate the current token (device logout).

```
DELETE /auth/token
```

**Response `204 No Content`** — no body.

---

## Users

### List Users

Returns a paginated list of all employees with their schedule. Use this to populate or refresh the desktop's local user database.

```
GET /users?page=1
```

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": 12,
      "first_name": "Juan",
      "last_name": "Dela Cruz",
      "name": "Juan Dela Cruz",
      "email": "juan.dela.cruz@company.com",
      "schedule": {
        "work_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "shift_start": "08:00",
        "shift_end": "17:00",
        "time_by_day": null
      }
    }
  ],
  "links": {
    "first": "https://<domain>/api/external/users?page=1",
    "last":  "https://<domain>/api/external/users?page=3",
    "prev":  null,
    "next":  "https://<domain>/api/external/users?page=2"
  },
  "meta": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 100,
    "total": 240
  }
}
```

**`schedule` object**

| Field | Type | Notes |
|---|---|---|
| `work_days` | string[] | Day abbreviations: `"Mon"`, `"Tue"`, `"Wed"`, `"Thu"`, `"Fri"`, `"Sat"`, `"Sun"` |
| `shift_start` | `HH:MM` \| null | Default shift start (local time) |
| `shift_end` | `HH:MM` \| null | Default shift end (local time) |
| `time_by_day` | object \| null | Per-day overrides. Keys are day abbreviations; values are `{ "shift_start": "HH:MM", "shift_end": "HH:MM" }`. `null` means same time every day. |

**`time_by_day` example** (employee has different hours on Wednesday)

```json
{
  "Mon": { "shift_start": "08:00", "shift_end": "17:00" },
  "Wed": { "shift_start": "09:00", "shift_end": "18:00" }
}
```

---

### Get Single User

Returns a single employee with their schedule **plus upcoming schedule overrides for the next 30 days**.

```
GET /users/{id}
```

**Response `200 OK`**

```json
{
  "data": {
    "id": 12,
    "first_name": "Juan",
    "last_name": "Dela Cruz",
    "name": "Juan Dela Cruz",
    "email": "juan.dela.cruz@company.com",
    "schedule": {
      "work_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
      "shift_start": "08:00",
      "shift_end": "17:00",
      "time_by_day": null
    },
    "schedule_overrides": [
      {
        "date": "2026-08-12",
        "promotes_to_workday": false,
        "demotes_to_restday": true,
        "shift_start": null,
        "shift_end": null,
        "note": "Public holiday makeup"
      }
    ]
  }
}
```

**`schedule_overrides` array** — each entry describes one admin-set override for a specific date.

| Field | Type | Notes |
|---|---|---|
| `date` | `YYYY-MM-DD` | The affected date |
| `promotes_to_workday` | bool | `true` → this rest day is treated as a work day |
| `demotes_to_restday` | bool | `true` → this work day is treated as a rest day |
| `shift_start` | `HH:MM` \| null | Override shift start, if set |
| `shift_end` | `HH:MM` \| null | Override shift end, if set |
| `note` | string \| null | Admin-entered reason |

**Error `404`**

```json
{ "message": "No query results for model [App\\Models\\User] 99" }
```

---

## Time Logs

### Push a Single Time Log

Create or update a time log entry for one employee on one date. Safe to call multiple times with the same `device_log_id` — repeated calls return the stored record without reprocessing.

```
POST /time-logs
```

**Request**

```json
{
  "device_log_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": 12,
  "date": "2026-08-07",
  "clock_in": "2026-08-07T08:02:00Z",
  "clock_out": "2026-08-07T17:05:00Z",
  "lunch_start": "2026-08-07T12:00:00Z",
  "lunch_end": "2026-08-07T13:00:00Z",
  "breaks": [
    { "start": "2026-08-07T10:00:00Z", "end": "2026-08-07T10:15:00Z" }
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `device_log_id` | UUID | — | Strongly recommended. UUID generated by the desktop. Enables idempotent re-sends. |
| `user_id` | integer | ✅ | Must exist in the users table. |
| `date` | `YYYY-MM-DD` | ✅ | The work date (local calendar date, not UTC). |
| `clock_in` | ISO 8601 datetime | — | UTC timestamp of clock-in event. |
| `clock_out` | ISO 8601 datetime | — | UTC timestamp of clock-out. Must be after `clock_in`. |
| `lunch_start` | ISO 8601 datetime | — | UTC timestamp. |
| `lunch_end` | ISO 8601 datetime | — | UTC timestamp. Must be after `lunch_start`. |
| `breaks` | array | — | Array of `{ "start": ISO8601, "end": ISO8601 }` objects. |

> **Partial logs are allowed.** Send a log with only `clock_in` when the employee punches in; send the same entry again with `clock_out` filled in when they punch out. The server merges updates by `user_id + date`.

> **All timestamps must be UTC.** The server converts them to local time (Asia/Manila) for late and undertime calculations.

**Response `201 Created`** (new record)

```json
{
  "data": {
    "id": 841,
    "date": "2026-08-07",
    "clock_in": "2026-08-07T08:02:00.000000Z",
    "clock_out": "2026-08-07T17:05:00.000000Z",
    "lunch_start": "2026-08-07T12:00:00.000000Z",
    "lunch_end": "2026-08-07T13:00:00.000000Z",
    "breaks": [
      { "start": "2026-08-07T10:00:00Z", "end": "2026-08-07T10:15:00Z" }
    ],
    "status": "clocked_out",
    "total_worked_minutes": 483
  }
}
```

**Response `200 OK`** — returned for updates and idempotent re-sends.

**`status` values** (computed server-side, never trusted from client)

| Value | Meaning |
|---|---|
| `active` | Clocked in, currently working |
| `on_lunch` | `lunch_start` set, `lunch_end` absent |
| `on_break` | Last break entry has `start` but no `end` |
| `clocked_out` | `clock_out` is set |

**Error `422 Unprocessable Entity`**

```json
{
  "message": "The user id field is required.",
  "errors": {
    "user_id": ["The user id field is required."],
    "date": ["The date field must match the format Y-m-d."]
  }
}
```

---

### Batch Push (Offline Sync)

Send up to **200** time log entries in a single request. Use this to flush the desktop's offline queue when connectivity is restored. Each entry is processed independently — a failure on one entry does not affect others.

```
POST /time-logs/batch
```

**Request**

```json
{
  "logs": [
    {
      "device_log_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": 12,
      "date": "2026-08-05",
      "clock_in": "2026-08-05T08:05:00Z",
      "clock_out": "2026-08-05T17:00:00Z"
    },
    {
      "device_log_id": "660f9500-f39c-52e5-b827-557766551111",
      "user_id": 15,
      "date": "2026-08-05",
      "clock_in": "2026-08-05T07:58:00Z",
      "clock_out": "2026-08-05T17:02:00Z",
      "lunch_start": "2026-08-05T12:00:00Z",
      "lunch_end": "2026-08-05T13:00:00Z"
    }
  ]
}
```

**Response `200 OK`**

```json
{
  "accepted": 2,
  "failed": 0,
  "results": [
    {
      "device_log_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": 12,
      "date": "2026-08-05",
      "id": 842,
      "status": "ok"
    },
    {
      "device_log_id": "660f9500-f39c-52e5-b827-557766551111",
      "user_id": 15,
      "date": "2026-08-05",
      "id": 843,
      "status": "ok"
    }
  ]
}
```

If one entry fails the `results` array includes its `status: "error"` and a `message` explaining why. The rest of the batch is still processed.

```json
{
  "accepted": 1,
  "failed": 1,
  "results": [
    { "device_log_id": "550e...", "user_id": 12, "date": "2026-08-05", "id": 842, "status": "ok" },
    { "device_log_id": "660f...", "user_id": 999, "date": "2026-08-05", "status": "error", "message": "..." }
  ]
}
```

---

## Punch Events (Desktop per-event model)

Use these endpoints when your desktop app stores one row per punch (Clock-In, Break-Out, Break-In, Clock-Out). The server assembles each punch into the single day-row that payroll reads.

**`log_type` mapping**

| Desktop `log_type` | Occurrence | Writes to |
|---|---|---|
| `clock_in` | any | `time_logs.clock_in` |
| `clock_out` | any | `time_logs.clock_out`, status → `clocked_out` |
| `break_out` | 1st | `time_logs.lunch_start`, status → `on_lunch` |
| `break_in` | 1st | `time_logs.lunch_end`, status → `active` |
| `break_out` | 2nd+ | appends `{ "start": … }` to `time_logs.breaks[]`, status → `on_break` |
| `break_in` | 2nd+ | fills `end` on last open entry in `time_logs.breaks[]`, status → `active` |

---

### Push a Single Punch

```
POST /time-logs/punch
```

**`device_log_id` is required** (UUID). The server records it in `time_log_punches`. If the same UUID is sent again the punch is skipped without error — safe to retry.

**Request**

```json
{
  "device_log_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": 12,
  "date": "2026-08-07",
  "timestamp": "2026-08-07T08:02:00Z",
  "log_type": "clock_in"
}
```

| Field | Type | Required |
|---|---|---|
| `device_log_id` | UUID | ✅ |
| `user_id` | integer | ✅ |
| `date` | `YYYY-MM-DD` | ✅ |
| `timestamp` | ISO 8601 UTC | ✅ |
| `log_type` | `clock_in` \| `break_out` \| `break_in` \| `clock_out` | ✅ |

**Response `201 Created`** (punch applied)

```json
{ "status": "ok", "result": "applied" }
```

**Response `200 OK`** (duplicate — already seen this `device_log_id`)

```json
{ "status": "ok", "result": "skipped" }
```

---

### Batch Punch Push (Offline Queue Flush)

Send up to **500** punch events in one request. Events are sorted by `timestamp` server-side before processing, so out-of-order offline queues are always assembled correctly.

```
POST /time-logs/punches
```

**Request**

```json
{
  "punches": [
    {
      "device_log_id": "aaaa-...",
      "user_id": 12,
      "date": "2026-08-05",
      "timestamp": "2026-08-05T08:01:00Z",
      "log_type": "clock_in"
    },
    {
      "device_log_id": "bbbb-...",
      "user_id": 12,
      "date": "2026-08-05",
      "timestamp": "2026-08-05T12:00:00Z",
      "log_type": "break_out"
    },
    {
      "device_log_id": "cccc-...",
      "user_id": 12,
      "date": "2026-08-05",
      "timestamp": "2026-08-05T13:00:00Z",
      "log_type": "break_in"
    },
    {
      "device_log_id": "dddd-...",
      "user_id": 12,
      "date": "2026-08-05",
      "timestamp": "2026-08-05T17:05:00Z",
      "log_type": "clock_out"
    }
  ]
}
```

**Response `200 OK`**

```json
{
  "applied": 4,
  "skipped": 0,
  "failed": 0,
  "results": [
    { "device_log_id": "aaaa-...", "user_id": 12, "date": "2026-08-05", "log_type": "clock_in",  "status": "ok", "result": "applied" },
    { "device_log_id": "bbbb-...", "user_id": 12, "date": "2026-08-05", "log_type": "break_out", "status": "ok", "result": "applied" },
    { "device_log_id": "cccc-...", "user_id": 12, "date": "2026-08-05", "log_type": "break_in",  "status": "ok", "result": "applied" },
    { "device_log_id": "dddd-...", "user_id": 12, "date": "2026-08-05", "log_type": "clock_out", "status": "ok", "result": "applied" }
  ]
}
```

A failed entry has `"status": "error"` and a `"message"`. The rest of the batch still processes.

---

## Recommended Sync Workflow

```
Desktop startup / connection restored
  │
  ├─ 1. POST /auth/token  →  store Bearer token
  │
  ├─ 2. GET /users (paginate all pages)
  │       └─ update local employee + schedule DB
  │
  └─ 3. POST /time-logs/punches  (flush offline punch queue, if any)
           └─ mark each entry as synced in local queue

While online:
  └─ POST /time-logs/punch  (real-time push on each punch event)

While offline:
  └─ append to local punch queue; retry when connection is restored
```

---

## Error Reference

| HTTP Status | Meaning |
|---|---|
| `200 OK` | Success (update or idempotent re-send) |
| `201 Created` | New record created |
| `204 No Content` | Success, no body (token revoke) |
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Token lacks `external:timekeeping` ability |
| `404 Not Found` | Resource does not exist |
| `422 Unprocessable Entity` | Validation failed — see `errors` object |
| `429 Too Many Requests` | Rate limit exceeded (token endpoint) |
| `500 Internal Server Error` | Unexpected server error |

All error responses include a top-level `message` string and, where applicable, a field-level `errors` object.
