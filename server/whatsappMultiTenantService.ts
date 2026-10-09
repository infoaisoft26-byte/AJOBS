import crypto from "crypto";
import type { Request, Response } from "express";
import { getFirestoreDb } from "./firestoreHelper.js";

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";
const PLATFORM_ADMIN_KEY = process.env.WHATSAPP_PLATFORM_ADMIN_KEY || process.env.WHATSAPP_AUTOMATION_API_KEY || "";
const ENCRYPTION_KEY_HEX = process.env.WHATSAPP_TENANT_ENCRYPTION_KEY || "";

type Tenant = {
  tenantId: string;
  tenantName: string;
  phoneNumberId: string;
  wabaId: string;
  graphVersion: string;
  accessTokenEncrypted: string;
  apiKeyHash: string;
  status: "active" | "paused";
  createdAt?: unknown;
  updatedAt?: unknown;
};

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function normalizePhone(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function encryptionKey() {
  if (!/^[a-f0-9]{64}$/i.test(ENCRYPTION_KEY_HEX)) {
    throw new Error("WHATSAPP_TENANT_ENCRYPTION_KEY must be a 32-byte (64 hex character) key");
  }
  return Buffer.from(ENCRYPTION_KEY_HEX, "hex");
}

function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}

function decryptSecret(value: string) {
  const [ivValue, tagValue, ciphertextValue] = value.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error("Stored tenant credential is invalid");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function hashKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function requirePlatformAdmin(req: Request, res: Response) {
  const supplied = String(req.header("x-whatsapp-platform-admin-key") || "");
  if (!PLATFORM_ADMIN_KEY || !supplied || !safeEqual(supplied, PLATFORM_ADMIN_KEY)) {
    res.status(401).json({ success: false, error: "PLATFORM_ADMIN_AUTH_REQUIRED" });
    return false;
  }
  return true;
}

async function authenticateTenant(req: Request, res: Response) {
  const supplied = String(req.header("x-whatsapp-tenant-key") || "");
  if (!supplied) {
    res.status(401).json({ success: false, error: "TENANT_API_KEY_REQUIRED" });
    return null;
  }
  const db = getFirestoreDb();
  if (!db) {
    res.status(503).json({ success: false, error: "DATABASE_UNAVAILABLE" });
    return null;
  }
  const snapshot = await db.collection("whatsappTenants").where("apiKeyHash", "==", hashKey(supplied)).limit(1).get();
  if (snapshot.empty) {
    res.status(401).json({ success: false, error: "INVALID_TENANT_API_KEY" });
    return null;
  }
  const doc = snapshot.docs[0];
  const tenant = doc.data() as Tenant;
  if (tenant.status !== "active") {
    res.status(403).json({ success: false, error: "TENANT_PAUSED" });
    return null;
  }
  return { db, ref: doc.ref, tenant };
}

function publicTenant(tenant: Tenant) {
  return {
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,
    phoneNumberId: tenant.phoneNumberId,
    wabaId: tenant.wabaId,
    graphVersion: tenant.graphVersion,
    status: tenant.status,
    createdAt: tenant.createdAt || null,
    updatedAt: tenant.updatedAt || null,
  };
}

export async function handleCreateTenant(req: Request, res: Response) {
  if (!requirePlatformAdmin(req, res)) return;
  const { tenantName, phoneNumberId, wabaId, accessToken, graphVersion } = req.body || {};
  const name = String(tenantName || "").trim();
  const phoneId = String(phoneNumberId || "").trim();
  const businessId = String(wabaId || "").trim();
  const token = String(accessToken || "").trim();

  if (!name || !phoneId || !businessId || !token) {
    return res.status(400).json({ success: false, error: "tenantName_phoneNumberId_wabaId_accessToken_required" });
  }
  if (!/^\d{5,30}$/.test(phoneId) || !/^\d{5,30}$/.test(businessId)) {
    return res.status(400).json({ success: false, error: "INVALID_META_ASSET_ID" });
  }
  if (token.length < 20) {
    return res.status(400).json({ success: false, error: "INVALID_ACCESS_TOKEN" });
  }

  const db = getFirestoreDb();
  if (!db) return res.status(503).json({ success: false, error: "DATABASE_UNAVAILABLE" });

  try {
    // Fail closed before storing credentials if encryption is not configured.
    encryptSecret(token);
  } catch (error: any) {
    return res.status(503).json({ success: false, error: error?.message || "TENANT_ENCRYPTION_NOT_CONFIGURED" });
  }

  const existing = await db.collection("whatsappTenants").where("phoneNumberId", "==", phoneId).limit(1).get();
  if (!existing.empty) {
    return res.status(409).json({ success: false, error: "PHONE_NUMBER_ALREADY_CONNECTED", tenantId: existing.docs[0].id });
  }

  const tenantId = "tenant_" + crypto.randomBytes(9).toString("hex");
  const tenantApiKey = "wa_live_" + crypto.randomBytes(32).toString("hex");
  const tenant: Tenant = {
    tenantId,
    tenantName: name,
    phoneNumberId: phoneId,
    wabaId: businessId,
    graphVersion: String(graphVersion || GRAPH_VERSION).trim(),
    accessTokenEncrypted: encryptSecret(token),
    apiKeyHash: hashKey(tenantApiKey),
    status: "active",
  };

  await db.collection("whatsappTenants").doc(tenantId).create({
    ...tenant,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // The tenant API key is returned only once; only its hash is stored.
  return res.status(201).json({
    success: true,
    tenant: publicTenant(tenant),
    tenantApiKey,
    warning: "Copy the tenantApiKey now. It cannot be retrieved later; rotate it if lost.",
  });
}

export async function handleListTenants(req: Request, res: Response) {
  if (!requirePlatformAdmin(req, res)) return;
  const db = getFirestoreDb();
  if (!db) return res.status(503).json({ success: false, error: "DATABASE_UNAVAILABLE" });
  const snapshot = await db.collection("whatsappTenants").orderBy("createdAt", "desc").limit(500).get();
  return res.json({ success: true, tenants: snapshot.docs.map((doc) => publicTenant(doc.data() as Tenant)) });
}

export async function handleUpdateTenant(req: Request, res: Response) {
  if (!requirePlatformAdmin(req, res)) return;
  const tenantId = String(req.params.tenantId || "").trim();
  const db = getFirestoreDb();
  if (!db) return res.status(503).json({ success: false, error: "DATABASE_UNAVAILABLE" });
  const ref = db.collection("whatsappTenants").doc(tenantId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return res.status(404).json({ success: false, error: "TENANT_NOT_FOUND" });

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  const body = req.body || {};
  let rotatedTenantApiKey: string | undefined;
  if (body.rotateApiKey === true) {
    rotatedTenantApiKey = "wa_live_" + crypto.randomBytes(32).toString("hex");
    patch.apiKeyHash = hashKey(rotatedTenantApiKey);
  }
  if (body.tenantName !== undefined) {
    const value = String(body.tenantName).trim();
    if (!value) return res.status(400).json({ success: false, error: "INVALID_TENANT_NAME" });
    patch.tenantName = value;
  }
  if (body.status !== undefined) {
    if (!["active", "paused"].includes(String(body.status))) return res.status(400).json({ success: false, error: "INVALID_TENANT_STATUS" });
    patch.status = body.status;
  }
  if (body.accessToken !== undefined) {
    const token = String(body.accessToken).trim();
    if (token.length < 20) return res.status(400).json({ success: false, error: "INVALID_ACCESS_TOKEN" });
    try { patch.accessTokenEncrypted = encryptSecret(token); }
    catch (error: any) { return res.status(503).json({ success: false, error: error?.message || "TENANT_ENCRYPTION_NOT_CONFIGURED" }); }
  }
  if (body.graphVersion !== undefined) patch.graphVersion = String(body.graphVersion).trim() || GRAPH_VERSION;

  await ref.update(patch);
  const updated = await ref.get();
  return res.json({
    success: true,
    tenant: publicTenant(updated.data() as Tenant),
    ...(rotatedTenantApiKey ? { tenantApiKey: rotatedTenantApiKey, warning: "Copy the rotated tenantApiKey now. It cannot be retrieved later." } : {}),
  });
}

export async function handleTenantConsent(req: Request, res: Response) {
  const auth = await authenticateTenant(req, res);
  if (!auth) return;
  const phone = normalizePhone(req.body?.phoneNumber);
  const optedIn = req.body?.optedIn;
  const source = String(req.body?.source || "").trim();
  const consentText = String(req.body?.consentText || "").trim();

  if (phone.length < 8 || phone.length > 15 || typeof optedIn !== "boolean") {
    return res.status(400).json({ success: false, error: "valid_phoneNumber_and_boolean_optedIn_required" });
  }
  if (optedIn && (!source || !consentText)) {
    return res.status(400).json({ success: false, error: "consent_source_and_exact_consent_text_required" });
  }

  const now = new Date().toISOString();
  await auth.db.collection("whatsappTenants").doc(auth.tenant.tenantId)
    .collection("contacts").doc(phone).set({
      phoneNumber: phone,
      optedIn,
      consentSource: optedIn ? source : null,
      consentText: optedIn ? consentText : null,
      consentedAt: optedIn ? now : null,
      optedOutAt: optedIn ? null : now,
      updatedAt: now,
    }, { merge: true });

  return res.json({ success: true, phoneNumber: phone, optedIn });
}

export async function handleTenantSend(req: Request, res: Response) {
  const auth = await authenticateTenant(req, res);
  if (!auth) return;
  const phone = normalizePhone(req.body?.to);
  const templateName = String(req.body?.templateName || "").trim();
  const languageCode = String(req.body?.languageCode || "en_US").trim();
  const components = req.body?.components;

  if (phone.length < 8 || phone.length > 15 || !/^[a-z0-9_]{2,512}$/.test(templateName)) {
    return res.status(400).json({ success: false, error: "valid_to_and_templateName_required" });
  }
  if (components !== undefined && !Array.isArray(components)) {
    return res.status(400).json({ success: false, error: "components_must_be_an_array" });
  }

  const contact = await auth.db.collection("whatsappTenants").doc(auth.tenant.tenantId)
    .collection("contacts").doc(phone).get();
  if (!contact.exists || contact.data()?.optedIn !== true) {
    return res.status(403).json({ success: false, error: "RECIPIENT_OPT_IN_REQUIRED" });
  }

  const recordRef = auth.db.collection("whatsappMessages").doc();
  const now = new Date().toISOString();
  await recordRef.set({
    tenantId: auth.tenant.tenantId,
    to: phone,
    templateName,
    languageCode,
    status: "queued",
    createdAt: now,
  });

  try {
    const accessToken = decryptSecret(auth.tenant.accessTokenEncrypted);
    const response = await fetch(
      "https://graph.facebook.com/" + (auth.tenant.graphVersion || GRAPH_VERSION) + "/" + auth.tenant.phoneNumberId + "/messages",
      {
        method: "POST",
        headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: { name: templateName, language: { code: languageCode }, ...(components?.length ? { components } : {}) },
        }),
      }
    );
    const data: any = await response.json();
    if (!response.ok) {
      await recordRef.update({ status: "failed", errorCode: data?.error?.code || null, errorMessage: data?.error?.message || "WhatsApp API request failed", updatedAt: new Date().toISOString() });
      return res.status(502).json({ success: false, error: "WHATSAPP_PROVIDER_REJECTED_MESSAGE", providerMessage: data?.error?.message || "Request failed" });
    }
    await recordRef.update({
      status: "accepted",
      providerMessageId: data?.messages?.[0]?.id || null,
      providerResponse: data,
      updatedAt: new Date().toISOString(),
    });
    return res.status(200).json({ success: true, messageId: data?.messages?.[0]?.id || null });
  } catch (error: any) {
    await recordRef.update({ status: "failed", errorMessage: error?.message || "Send failed", updatedAt: new Date().toISOString() });
    return res.status(502).json({ success: false, error: "WHATSAPP_SEND_FAILED" });
  }
}

export async function receiveMultiTenantWhatsAppWebhook(req: Request, res: Response) {
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}));

  // Production webhooks must have a verifiable Meta signature.
  if (!APP_SECRET) return res.status(503).json({ success: false, error: "WHATSAPP_APP_SECRET_NOT_CONFIGURED" });
  const signature = String(req.header("x-hub-signature-256") || "");
  const expected = "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");
  if (!signature || !safeEqual(signature, expected)) return res.sendStatus(401);

  let payload: any;
  try { payload = JSON.parse(rawBody.toString("utf8")); }
  catch { return res.status(400).json({ success: false, error: "INVALID_JSON" }); }

  const db = getFirestoreDb();
  if (!db) return res.status(503).json({ success: false, error: "DATABASE_UNAVAILABLE" });
  const batch = db.batch();
  let count = 0;

  for (const entry of Array.isArray(payload.entry) ? payload.entry : []) {
    for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
      const value = change?.value || {};
      const phoneNumberId = String(value?.metadata?.phone_number_id || "");
      if (!phoneNumberId) continue;

      const tenantQuery = await db.collection("whatsappTenants").where("phoneNumberId", "==", phoneNumberId).limit(1).get();
      if (tenantQuery.empty) {
        // Keep the existing AIJOBS single-number integration working during migration.
        if (phoneNumberId === String(process.env.WHATSAPP_PHONE_NUMBER_ID || "")) {
          const legacyEvents = db.collection("whatsappWebhookEvents");
          for (const message of Array.isArray(value.messages) ? value.messages : []) {
            batch.set(legacyEvents.doc(), {
              type: "message", phoneNumberId, from: message?.from || "", messageId: message?.id || "",
              messageType: message?.type || "", timestamp: message?.timestamp || "", text: message?.text?.body || "",
              receivedAt: new Date().toISOString(),
            });
            count++;
          }
          for (const status of Array.isArray(value.statuses) ? value.statuses : []) {
            batch.set(legacyEvents.doc(), {
              type: "status", phoneNumberId, recipientId: status?.recipient_id || "", messageId: status?.id || "",
              status: status?.status || "", timestamp: status?.timestamp || "", receivedAt: new Date().toISOString(),
            });
            count++;
          }
        }
        continue;
      }

      const tenantId = tenantQuery.docs[0].id;
      const events = db.collection("whatsappTenants").doc(tenantId).collection("events");
      for (const message of Array.isArray(value.messages) ? value.messages : []) {
        batch.set(events.doc(), {
          tenantId, type: "message", phoneNumberId, from: message?.from || "", messageId: message?.id || "",
          messageType: message?.type || "", timestamp: message?.timestamp || "", text: message?.text?.body || "",
          receivedAt: new Date().toISOString(),
        });
        count++;
      }
      for (const status of Array.isArray(value.statuses) ? value.statuses : []) {
        const messageId = String(status?.id || "");
        batch.set(events.doc(), {
          tenantId, type: "status", phoneNumberId, recipientId: status?.recipient_id || "", messageId,
          status: status?.status || "", timestamp: status?.timestamp || "", receivedAt: new Date().toISOString(),
        });
        count++;
        if (messageId) {
          const sentMessage = await db.collection("whatsappMessages").where("providerMessageId", "==", messageId).limit(1).get();
          if (!sentMessage.empty && sentMessage.docs[0].data()?.tenantId === tenantId) {
            batch.update(sentMessage.docs[0].ref, { status: String(status?.status || "unknown"), lastStatusAt: new Date().toISOString() });
          }
        }
      }
    }
  }

  if (count) await batch.commit();
  console.log("[WHATSAPP_MULTI_TENANT_WEBHOOK]", JSON.stringify({ events: count }));
  return res.sendStatus(200);
}
