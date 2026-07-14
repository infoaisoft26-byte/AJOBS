import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error in activityLogService: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface ActivityLogInput {
  userId: string;
  userName: string;
  role: string;
  action: string;
  details: string;
  entityType?: "job" | "user" | "admin" | "application" | "other";
  entityId?: string;
  companyId?: string;
}

/**
 * Records an activity log into 'activity_logs' and optionally 'company_activity_logs'
 */
export async function recordActivityLog(input: ActivityLogInput): Promise<string> {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const timestamp = new Date().toISOString();
  
  const payload = {
    id: logId,
    userId: input.userId,
    userName: input.userName,
    role: input.role,
    action: input.action,
    details: input.details,
    entityType: input.entityType || "other",
    entityId: input.entityId || "",
    createdAt: timestamp,
    ipAddress: "127.0.0.1", // Standard safe fallback
  };

  const path = "activity_logs";
  try {
    // 1. Write to general 'activity_logs'
    await setDoc(doc(db, path, logId), payload);

    // 2. Write to 'company_activity_logs' if companyId is provided
    if (input.companyId) {
      await setDoc(doc(db, "company_activity_logs", logId), {
        ...payload,
        companyId: input.companyId
      });
    }
    
    console.log(`[activityLogService] Successfully recorded action: '${input.action}' for ${input.userName}`);
    return logId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return "";
  }
}
