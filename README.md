# TikTok Pixel & Events API Extension for Adobe Experience Platform Tags (Launch)

A production-ready Adobe Experience Platform (AEP) Tags extension designed to seamlessly integrate TikTok client-side Pixel tracking (`ttq`) alongside server-side Events API (Conversion API) tracking. It supports standard and custom web events, SHA-256 client-side PII hashing, automatic event deduplication via UUID v4, Single Page Application (SPA) tracking, and built-in error resilience.

---

## 🌟 Key Features

* **Dual-Track Capability**: Fires client-side pixel events (`ttq.track`) and server-side Events API payload (`POST` to TikTok Business API) simultaneously.
* **Shared Event Deduplication**: Automatic generation and synchronization of UUID v4 `event_id` between client and server calls to prevent double-counting.
* **Privacy & Security Compliant**: In-browser SHA-256 normalization and hashing via the Web Crypto API (`crypto.subtle`) for emails, phone numbers, and external IDs before transmission.
* **SPA & Dynamic Route Support**: Monkey-patches `pushState`/`replaceState` and listens for `popstate` events to automatically capture Single Page Application view transitions.
* **Resilient Execution**: Enforces 5s SDK script load timeouts and 10s API request timeouts with non-blocking promises to preserve Adobe Launch rule chain execution.
* **Built-in Debugger & Visual Inspector**: Visual on-screen debug badge and detailed console logs when debug mode is enabled.

---

## 🏗️ Architecture & Data Flow

The extension operates across both the client runtime (browser) and directly connects to TikTok's backend API endpoint via async fetch requests.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                ADOBE LAUNCH RUNTIME                              │
│                                                                                  │
│  ┌──────────────────────┐        ┌──────────────────────┐                        │
│  │ Global Extension     │        │ Event / Rule Trigger │                        │
│  │ Settings             │        │ (e.g. AddToCart)     │                        │
│  └──────────┬───────────┘        └──────────┬───────────┘                        │
│             │                               │                                    │
│             ▼                               ▼                                    │
│  ┌──────────────────────┐        ┌──────────────────────┐                        │
│  │ loadPixel.js         │        │ trackEvent.js        │                        │
│  │ Inject ttq snippet   │        │ Resolve Data Elements│                        │
│  └──────────┬───────────┘        └──────────┬───────────┘                        │
│             │                               │                                    │
│             │                     ┌─────────┴──────────┐                         │
│             │                     │ Generate UUID v4   │                         │
│             │                     │ Shared Event ID    │                         │
│             │                     └─────────┬──────────┘                         │
│             │                               │                                    │
│             │          ┌────────────────────┴────────────────────┐               │
│             │          │                                         │               │
│             ▼          ▼                                         ▼               │
│     ┌──────────────────────┐                        ┌─────────────────────────┐  │
│     │ CLIENT-SIDE DISPATCH │                        │ SERVER-SIDE PREPARATION │  │
│     │  ttq.track(...)      │                        │  sha256(email/phone)    │  │
│     └──────────┬───────────┘                        └────────────┬────────────┘  │
│                │                                                 │               │
└────────────────┼─────────────────────────────────────────────────┼───────────────┘
                 │                                                 │
                 ▼                                                 ▼
      ┌──────────────────────┐                        ┌─────────────────────────┐
      │ TikTok Pixel SDK     │                        │ TikTok Events API       │
      │ (analytics.tiktok)   │                        │ (business-api.tiktok)   │
      └──────────────────────┘                        └─────────────────────────┘

```

---

## 📦 Package Structure

```
tiktok-pixel-extension/
├── extension.json                 # Adobe Extension manifest & component declarations
├── package.json                   # Node package dependencies & scripts
├── src/
│   ├── lib/
│   │   ├── actions/
│   │   │   ├── loadPixel.js       # Base snippet injector & SPA observer
│   │   │   ├── trackEvent.js      # Standard event client/server handler
│   │   │   ├── trackCustomEvent.js# Custom event handler
│   │   │   ├── identify.js        # User identification trigger
│   │   │   └── trackPageViewSPA.js# Manual SPA pageview action
│   │   ├── dataElements/          # Handlers for mapping data layer keys
│   │   │   ├── eventId.js
│   │   │   ├── value.js
│   │   │   ├── currency.js
│   │   │   ├── contentId.js
│   │   │   ├── contentName.js
│   │   │   ├── contentType.js
│   │   │   ├── contentIds.js
│   │   │   ├── query.js
│   │   │   ├── email.js
│   │   │   ├── phoneNumber.js
│   │   │   ├── externalId.js
│   │   │   └── customParams.js
│   │   └── utils/                 # Utility helper modules
│   │       ├── sha256.js          # Web Crypto & JS fallback hasher
│   │       ├── uuid.js            # RFC 4122 v4 UUID generator
│   │       ├── spaListener.js     # History API monkey-patching helper
│   │       └── logger.js          # Console & badge inspector logger
│   └── views/
│       ├── settings.html          # Global extension settings UI
│       └── actions/
│           ├── trackEvent.html    # Action configuration for standard events
│           └── trackCustomEvent.html # Action configuration for custom events
└── test/                          # Jest automated test suites
    ├── loadPixel.test.js
    ├── trackEvent.test.js
    └── sha256.test.js

```

---

## 🚀 Setup & Configuration

### 1. Global Extension Settings (`settings.html`)

Configure these parameters under **Extensions → Installed → TikTok Pixel & Events API**:

| Setting Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `pixelId` | Text | **Yes** | — | TikTok Pixel ID (e.g. `C1234567890ABCDEFG`) |
| `autoPageView` | Boolean | No | `true` | Auto-fire `PageView` on library load & route changes |
| `content_type` | Select | No | `product` | Default content classification (`product` or `other`) |
| `eventsApiEnabled` | Boolean | No | `false` | Enable server-side Events API forwarding |
| `eventsApiAccessToken` | Password | No | — | Access Token generated in TikTok Events Manager |
| `eventsApiEndpoint` | Text | No | `[https://business-api.tiktok.com/open_api/v1.3/pixel/track/](https://business-api.tiktok.com/open_api/v1.3/pixel/track/)` | Override default API endpoint |
| `debugMode` | Boolean | No | `false` | Enable `ttq.debug()`, console logs, and visual badge |

### 2. Available Extension Actions

* **Load TikTok Pixel** (`loadPixel.js`): Injects base JS library. Recommended rule trigger: *Library Loaded (Page Top)*.
* **Track Standard Event** (`trackEvent.js`): Tracks events (`AddToCart`, `Purchase`, `ViewContent`, etc.) across client and server.
* **Track Custom Event** (`trackCustomEvent.js`): Fires non-standard events with custom JSON payloads.
* **Identify User** (`identify.js`): Passes user data to `ttq.identify()`.
* **Track PageView (SPA)** (`trackPageViewSPA.js`): Manually triggers a virtual pageview.

---

## 🛠️ Development & Building

### Prerequisites

* **Node.js**: `v16.x` or higher
* **npm**: `v8.x` or higher

### Installation

```bash
# Clone repository
git clone https://github.com/yourcompany/tiktok-pixel-extension.git
cd tiktok-pixel-extension

# Install dependencies
npm install

```

### Running Tests

```bash
npm test

```

### Building & Packaging for Adobe Exchange

```bash
# Install Adobe Extension CLI globally
npm install -g @adobe/extension-cli

# Build extension assets
npm run build

# Package extension zip archive
npm run package

```