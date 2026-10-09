# Multi-tenant WhatsApp Automation API

This module lets AIJOBS and other customer websites use the same WhatsApp Cloud API service while keeping each customer's credentials, contacts, events, and message history isolated by tenant.

## Required server environment

- `WHATSAPP_VERIFY_TOKEN`: Meta webhook verification token for this Meta app.
- `WHATSAPP_APP_SECRET`: App Secret from Meta App Settings → Basic. Required to validate webhook signatures.
- `WHATSAPP_TENANT_ENCRYPTION_KEY`: exactly 64 hexadecimal characters (32 random bytes). Used for AES-256-GCM encryption of tenant access tokens. Generate with `openssl rand -hex 32`.
- `WHATSAPP_PLATFORM_ADMIN_KEY`: optional separate admin key; if unset, the existing `WHATSAPP_AUTOMATION_API_KEY` is used. Keep this secret server-side only.
- `WHATSAPP_GRAPH_API_VERSION`: optional Graph API version; defaults to `v23.0`.

Never expose platform admin keys, tenant API keys, access tokens, or app secrets in browser code, public repositories, logs, or client-side environment variables.

## Create a tenant

Server-to-server request:

```http
POST /api/whatsapp/platform/tenants
Content-Type: application/json
x-whatsapp-platform-admin-key: <platform-admin-key>
```

```json
{
  "tenantName": "Customer Company",
  "phoneNumberId": "META_PHONE_NUMBER_ID",
  "wabaId": "META_WABA_ID",
  "accessToken": "CUSTOMER_SYSTEM_USER_ACCESS_TOKEN",
  "graphVersion": "v23.0"
}
```

The response returns a generated `tenantId` and a `tenantApiKey` exactly once. Store the tenant API key in the customer's server-side secret manager. Only its SHA-256 hash is stored in Firestore. Access tokens are encrypted with AES-256-GCM at rest. Duplicate phone-number IDs are rejected.

## Manage tenants

- `GET /api/whatsapp/platform/tenants` — list non-secret tenant metadata.
- `PATCH /api/whatsapp/platform/tenants/:tenantId` — update `tenantName`, `status` (`active` or `paused`), `graphVersion`, or rotate/update `accessToken`.
- All management routes require `x-whatsapp-platform-admin-key`.

## Record opt-in / opt-out

Before sending a message, the tenant must record the recipient's explicit WhatsApp consent. Capture consent through the customer website/app and retain the exact consent language and source.

```http
POST /api/whatsapp/platform/contacts/consent
x-whatsapp-tenant-key: <tenant-api-key>
Content-Type: application/json
```

```json
{
  "phoneNumber": "+919876543210",
  "optedIn": true,
  "source": "website registration form",
  "consentText": "I agree to receive WhatsApp updates about my applications."
}
```

To record opt-out, send the same endpoint with `optedIn: false`. A recipient without a stored opt-in cannot be messaged through the tenant send endpoint.

## Send an approved template

```http
POST /api/whatsapp/platform/send
x-whatsapp-tenant-key: <tenant-api-key>
Content-Type: application/json
```

```json
{
  "to": "+919876543210",
  "templateName": "approved_template_name",
  "languageCode": "en_US",
  "components": []
}
```

The send endpoint only sends template messages, checks tenant state and recipient opt-in, and records an attempt in `whatsappMessages`. Delivery outcomes are updated asynchronously through webhooks.

## Webhook

Configure the Meta app callback as:

`https://aijobs1.in/api/whatsapp/webhook`

Use the exact `WHATSAPP_VERIFY_TOKEN` configured in Vercel. Incoming POST webhooks require a valid `x-hub-signature-256` generated with `WHATSAPP_APP_SECRET`. Tenant events are stored under `whatsappTenants/{tenantId}/events`; the existing AIJOBS phone number continues to use the legacy event collection until migrated.

## Important onboarding limitations

This API is the server-side multi-tenant foundation. Customer onboarding is currently provisioned by a platform administrator; a customer self-serve Embedded Signup UI, billing/subscription controls, message-template management UI, retries/queues, analytics dashboard, and production load tests are separate follow-up work. Each customer must own or authorize their WhatsApp Business assets and meet Meta's current onboarding, template, opt-in, and messaging policies. A test number is not a production sender.
