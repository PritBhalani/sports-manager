
## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.



# DrPapaya — API Documentation

REST API reference. Base URL: `BASE_URL_REST` (e.g. `http://localhost:3000`). Authenticated requests send session tokens in headers: `Primary-Token`, `Token`, `Content-Decoding` (IMEI).

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Account](#2-account)
3. [User](#3-user)
4. [Bet](#4-bet)
5. [Bet History](#5-bet-history)
6. [Token / Login History](#6-token--login-history)
7. [Position (Net Exposure)](#7-position-net-exposure)
8. [Event Type](#8-event-type)
9. [Manage Market](#9-manage-market)
10. [Setting (Notifications)](#10-setting-notifications)
11. [Dashboard](#11-dashboard)
12. [Public (Unauthenticated)](#12-public-unauthenticated)
13. [External: OpenAI](#13-external-openai)

---

## 1. Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/authenticate/captcha` | None | Fetch captcha for login. |
| POST | `/authenticate/login` | Basic (username, password) | Authenticate and obtain session tokens. |

### `GET /authenticate/captcha`

- **Parameters:** None.
- **Returns:** Captcha payload (e.g. key/image).

### `POST /authenticate/login`

- **Body:**
  - `key` (string) — from captcha response
  - `captcha` (string) — user-entered captcha
  - `IMEI` (string)
  - `device` (string) — e.g. `"web"`
  - `mode` (int) — e.g. `2`
  - `mobile` (string) — e.g. `"+91"`
  - `username` (string)
  - `password` (string)
- **Auth:** Basic Auth with username and password.
- **Returns:** Login response including token/session data.

---

## 2. Account

### Balance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/account/getbalance` | Balance for the authenticated user. |
| GET | `/account/getbalancedetail/{userId}` | Balance detail for a specific user. |

**`GET /account/getbalance`**

- **Auth:** Session.
- **Parameters:** None (user from session).

**`GET /account/getbalancedetail/{userId}`**

- **Auth:** Session.
- **Path:** `userId` (string).

---

### Transfer

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/account/transferout` | Transfer chips out from a user. |
| POST | `/account/transferin` | Transfer chips in to a user. |
| POST | `/account/transfer` | Paginated list of transfers. |

**`POST /account/transferout`**

- **Auth:** Session.
- **Body:**
  - `isTransfer` (bool) — `True`
  - `chips` (float)
  - `userId` (string)
  - `dwType` (string) — `"W"`
  - `timestamp` (string) — milliseconds since epoch.

**`POST /account/transferin`**

- **Auth:** Session.
- **Body:** Same as transferout; `dwType`: `"D"`.

**`POST /account/transfer`**

- **Auth:** Session.
- **Body:**
  - `params`: `pageSize`, `groupBy`, `page`, `orderBy`, `orderByDesc`
  - `searchQuery`: e.g. `{"userId": ""}`
  - `id`: authenticated user id.

---

### Deposit / Withdraw (Chips In/Out)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/account/in` | Deposit chips to a user. |
| POST | `/account/out` | Withdraw chips from a user. |

**`POST /account/in`**

- **Auth:** Session.
- **Body:**
  - `isTransfer` (bool)
  - `chips` (float)
  - `userId` (string)
  - `dwType` (string) — `"D"`
  - `comment` (string)
  - `timestamp` (string) — ms since epoch.

**`POST /account/out`**

- **Auth:** Session.
- **Body:** Same as `/account/in`; `dwType`: `"W"`.

---

### Statements

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/account/getaccountstatement` | Account statement for a user. |
| POST | `/account/getplstatement` | P&amp;L statement for a user. |
| POST | `/account/getCreditstatement` | Credit statement for a user. |

**Request body (shared):**

- **Auth:** Session.
- `searchQuery`: `fromDate`, `toDate` (ISO UTC strings).
- `params`: `pageSize`, `groupBy`, `page`, `orderBy`, `orderByDesc`.
- `id`: `userId`.

---

### Downline & Activity

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/account/getparentstatus/{userId}` | Parent status for user. |
| POST | `/account/downline` | Paginated downline list with search. |
| GET | `/account/getinoutactivity/{userId}` | In/out activity for user. |
| GET | `/account/getcasinoactivity/{userId}` | Casino activity for user. |

**`GET /account/getparentstatus/{userId}`**

- **Auth:** Session.
- **Path:** `userId`.

**`POST /account/downline`**

- **Auth:** Session.
- **Body:**
  - `params`: `pageSize`, `groupBy`, `page`, `orderBy`, `orderByDesc`
  - `id`: parent user id
  - `searchQuery`: `userCode`, `username`, `status` (e.g. `"-1"`), `userId`

**`GET /account/getinoutactivity/{userId}`**  
**`GET /account/getcasinoactivity/{userId}`**

- **Auth:** Session.
- **Path:** `userId`.

---

## 3. User

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/getuserbyid/{userId}` | Get user by id. |
| GET | `/user/getusercode/{parentId}` | Next user code under parent. |
| GET | `/user/getmyinfo/{parentId}` | Current user info. |
| GET | `/user/checkusername/{username}` | Check username availability. |
| GET | `/user/getreferralsetting/{userId}` | Referral settings for user. |
| POST | `/user/addmember` | Create new member. |
| POST | `/user/updatemember` | Update member. |
| POST | `/user/changebettinglock` | Set betting lock. |
| POST | `/user/setcommission` | Set commission. |
| POST | `/user/updatereferralsetting` | Update referral settings. |

**`GET /user/getuserbyid/{userId}`** — Full user object. **Auth:** Session.

**`GET /user/getusercode/{parentId}`** — Next available user code under parent. **Auth:** Session.

**`GET /user/getmyinfo/{parentId}`** — Authenticated user info. **Auth:** Session.

**`GET /user/checkusername/{username}`** — Username availability. **Auth:** Session.

**`GET /user/getreferralsetting/{userId}`** — Referral settings. **Auth:** Session.

**`POST /user/addmember`** — **Body:** Member data (username, userCode, parentId, type, etc.). **Auth:** Session.

**`POST /user/updatemember`** — **Body:** Member fields to update. **Auth:** Session.

**`POST /user/changebettinglock`** — **Body:** `userId`, `bettingLock` (bool). **Auth:** Session.

**`POST /user/setcommission`** — **Body:** `id` (userId), `commissions` (list), `applyAll` (bool). **Auth:** Session.

**`POST /user/updatereferralsetting`** — **Body:** `userId`, `applyAll`, `bonus`, `lockingDays`, `minDeposit`, `minWithdrawalAmount`, `minimumBalanceRequired`. **Auth:** Session.

---

## 4. Bet

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bet/getlivebets` | Paginated live bets (optional user scope). |

**`POST /bet/getlivebets`**

- **Auth:** Session.
- **Body:**
  - `searchQuery`: `fromDate`, `toDate`, `status` (e.g. `"matched"`), `eventTypeId`, `marketTypeCode`, `eventName`, `oddsfrom`, `oddsto`, `stakefrom`, `staketo`; optionally `side`, `inplay`.
  - `params`: `pageSize`, `groupBy`, `page`, `orderBy`, `orderByDesc`.
  - `id` (optional): if set, live bets for that user; otherwise authenticated user.

---

## 5. Bet History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/bethistory/getuseractivity/{userId}` | User bet activity summary. |
| POST | `/bethistory/getbethistory` | Paginated bet history. |
| POST | `/bethistory/getplbymarket` | P&amp;L aggregated by market. |
| GET | `/bethistory/getplbymarketdetails/{marketId}/` or `/{marketId}/{parentId}` | P&amp;L details for a market. |
| POST | `/bethistory/getbethistorybymarketid` | Bet history for a market. |
| POST | `/bethistory/getplbyagent` | P&amp;L by agent (downline). |
| POST | `/bethistory/getdownlinesummary` | Downline P&amp;L summary. |
| POST | `/bethistory/getdownlinesummarydetails` | Downline summary for one user. |

**`GET /bethistory/getuseractivity/{userId}`** — **Auth:** Session. **Path:** `userId`.

**`POST /bethistory/getbethistory`** — **Auth:** Session. **Body:** `searchQuery` (fromDate, toDate, eventTypeId, marketTypeCode, eventName, odds/stake filters), `params` (pagination/sort), optional `id` (userId).

**`POST /bethistory/getplbymarket`** — **Auth:** Session. **Body:** `searchQuery` (fromDate, toDate, eventTypeId), `params` (pagination).

**`GET /bethistory/getplbymarketdetails/{marketId}/` or `/{marketId}/{parentId}`** — **Auth:** Session. **Path:** `marketId`; optional `parentId`.

**`POST /bethistory/getbethistorybymarketid`** — **Auth:** Session. **Body:** `searchQuery`: `marketId`, `status`; `params`: pagination.

**`POST /bethistory/getplbyagent`** — **Auth:** Session. **Body:** `searchQuery` (fromDate, toDate), `params` (pagination), optional `id` (parentId).

**`POST /bethistory/getdownlinesummary`** — **Auth:** Session. **Body:** `searchQuery` (fromDate, toDate), `params` (pagination), optional `id` (parentId).

**`POST /bethistory/getdownlinesummarydetails`** — **Auth:** Session. **Body:** `id` (userId), `searchQuery` (fromDate, toDate).

---

## 6. Token / Login History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/token/loginhistory` | Login history for authenticated user. |
| GET | `/token/loginhistorybyid/{userId}` | Login history for a user. |

**Auth:** Session. Path param `userId` for the by-id endpoint.

---

## 7. Position (Net Exposure)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/position/geteventtypeposition` | Position by event type. |
| GET | `/position/geteventpositionbyid/{sportId}` | Position for a sport/event type. |
| GET | `/position/getmarketpositionbyid/{eventId}` | Position for an event. |
| GET | `/position/getmarketpositionbymarketid/{marketId}` | Position for a market. |
| GET | `/position/getfancyuserposition/{marketId}/false` | Fancy user position for market. |

**Auth:** Session. All GET; path parameters only, no body.

---

## 8. Event Type

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/eventtype/geteventtype` | List event types (sports). |

**Auth:** Session. No parameters.

---

## 9. Manage Market

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/managemarket/getmarketlockstatus/{sportId}` | Market lock status for sport. |
| POST | `/managemarket/updatemarketlockstatus` | Update lock status for a node. |

**`GET /managemarket/getmarketlockstatus/{sportId}`** — **Auth:** Session. **Path:** `sportId`.

**`POST /managemarket/updatemarketlockstatus`** — **Auth:** Session. **Body:** `nodeId`, `isLock` (bool), `nodeType` (int).

---

## 10. Setting (Notifications)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/setting/getnotifications` | Get notification texts. |
| POST | `/setting/updatenotification` | Update notification texts. |

**`GET /setting/getnotifications`** — **Auth:** Session. Returns e.g. text1, text2.

**`POST /setting/updatenotification`** — **Auth:** Session. **Body:** `text1`, `text2`.

---

## 11. Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/gettotalmarket` | Total market count/summary. |
| GET | `/dashboard/getusersummary` | User summary. |
| GET | `/dashboard/getlivebettotal` | Live bet totals. |
| GET | `/dashboard/getrecentprofitloss` | Recent P&amp;L. |
| GET | `/dashboard/getbetsummary` | Bet summary. |
| GET | `/dashboard/getlivebetsummary` | Live bet summary. |

**Auth:** Session. All GET, no parameters; return aggregates for the authenticated context.

---

## 12. Public (Unauthenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/help` | Help content. No auth. |
| GET | `/start` | Data keyed by optional userId. No auth. |

**`GET /help`** — No authentication.

**`GET /start`** — **Query:** `userId` (optional). Returns payload (e.g. welcome/content per user).

---

## 13. External: OpenAI (Optional in system)

| Method | URL | Description |
|--------|-----|-------------|
| POST | `https://api.openai.com/v1/chat/completions` | OpenAI Chat Completions. |

- **Headers:** `Authorization: Bearer {apiKey}`, `Content-Type: application/json`.
- **Body:** `model` (e.g. `gpt-4o-mini`), `messages` (array of `role`/`content`), `max_tokens` (e.g. 500).
- **Returns:** Completion with `choices[].message.content`.

---

*Base URL: `BASE_URL_REST`. Authenticated calls use headers: `Primary-Token`, `Token`, `Content-Decoding` (IMEI).*
