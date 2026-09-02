import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  writeBatch,
  type Firestore,
  type DocumentReference,
  type QuerySnapshot,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

export type DataResetScopeKey =
  | "app_a_daily"
  | "app_a_preferences"
  | "vision_shared"
  | "routines_shared";

export type RemoteCollectionName =
  | "dailyResets"
  | "rolloverDecisions"
  | "visionStrategies"
  | "todayCandidates"
  | "routines"
  | "routineCompletions";

export interface DataResetScopeSelection {
  appADailyData: boolean; // default true
  appAPreferences: boolean; // default false
  sharedVisionData: boolean; // default false
  sharedRoutinesData: boolean; // default false
}

export const DEFAULT_SCOPE_SELECTION: Readonly<DataResetScopeSelection> = Object.freeze({
  appADailyData: true,
  appAPreferences: false,
  sharedVisionData: false,
  sharedRoutinesData: false,
});

export const ALL_SCOPES_SELECTION: Readonly<DataResetScopeSelection> = Object.freeze({
  appADailyData: true,
  appAPreferences: true,
  sharedVisionData: true,
  sharedRoutinesData: true,
});

export interface RemoteCollectionTarget {
  scopeCategory: "app_a_daily" | "vision_shared" | "routines_shared";
  collectionName: RemoteCollectionName;
  rootCollection: "appAUsers" | "users";
}

/**
 * Fixed allowlist of supported Firestore collections.
 * Arbitrary paths or collectionGroup queries are strictly prohibited.
 */
export const SUPPORTED_REMOTE_COLLECTIONS: readonly RemoteCollectionTarget[] = Object.freeze([
  Object.freeze({
    scopeCategory: "app_a_daily",
    collectionName: "dailyResets",
    rootCollection: "appAUsers",
  }),
  Object.freeze({
    scopeCategory: "app_a_daily",
    collectionName: "rolloverDecisions",
    rootCollection: "appAUsers",
  }),
  Object.freeze({
    scopeCategory: "vision_shared",
    collectionName: "visionStrategies",
    rootCollection: "users",
  }),
  Object.freeze({
    scopeCategory: "vision_shared",
    collectionName: "todayCandidates",
    rootCollection: "users",
  }),
  Object.freeze({
    scopeCategory: "routines_shared",
    collectionName: "routines",
    rootCollection: "users",
  }),
  Object.freeze({
    scopeCategory: "routines_shared",
    collectionName: "routineCompletions",
    rootCollection: "users",
  }),
]);

export const MAX_RESET_BATCH_SIZE = 400;

export interface ResetProgressEvent {
  scopeCategory: DataResetScopeKey;
  stage: "validating" | "querying" | "deleting_batches" | "completed" | "failed";
  collectionName?: RemoteCollectionName;
  batchIndex?: number;
  totalBatches?: number;
  processedCount: number;
  totalCount?: number;
}

export interface ResetScopeStatus {
  scope: DataResetScopeKey;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  processedDocuments: number;
  error?: {
    stage: string;
    firebaseCode: string;
    category: string;
  };
}

export interface DataResetResult {
  success: boolean;
  isPartial: boolean;
  completedScopes: DataResetScopeKey[];
  failedScopes: DataResetScopeKey[];
  scopeStatuses: Record<DataResetScopeKey, ResetScopeStatus>;
  totalDeletedDocuments: number;
}

export interface FirestoreAdapter {
  getDocsBatch: (
    rootCol: string,
    userId: string,
    subCol: string,
    limitCount: number
  ) => Promise<{ docs: Array<{ ref: DocumentReference; id: string }> }>;
  commitBatchDeletes: (
    docRefs: DocumentReference[]
  ) => Promise<void>;
}

export class AppADataResetError extends Error {
  readonly stage: string;
  readonly firebaseCode: string;
  readonly category: string;

  constructor(
    message: string,
    stage = "unknown",
    firebaseCode = "unknown",
    category = "unknown"
  ) {
    super(message);
    this.name = "AppADataResetError";
    this.stage = stage;
    this.firebaseCode = firebaseCode;
    this.category = category;
  }
}

export function sanitizeFirebaseErrorCode(code: unknown): string {
  if (typeof code !== "string" || !code) return "unknown";
  return code
    .toLowerCase()
    .replace(/^firestore\//, "")
    .replace(/^auth\//, "")
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 50);
}

export function mapFirebaseErrorCodeToCategory(code: string): string {
  const normalized = sanitizeFirebaseErrorCode(code);
  switch (normalized) {
    case "permission_denied":
    case "permission-denied":
      return "permission_denied";
    case "unauthenticated":
    case "authentication_required":
      return "unauthenticated";
    case "unavailable":
      return "unavailable";
    case "deadline_exceeded":
    case "deadline-exceeded":
      return "network";
    case "resource_exhausted":
    case "resource-exhausted":
      return "quota";
    case "invalid_user_id":
      return "validation";
    default:
      return "unknown";
  }
}

/**
 * Standard Firestore implementation for live database calls.
 * Uses bounded queries of at most MAX_RESET_BATCH_SIZE (400) docs.
 */
export const defaultFirestoreAdapter: FirestoreAdapter = {
  async getDocsBatch(rootCol: string, userId: string, subCol: string, limitCount = MAX_RESET_BATCH_SIZE) {
    const colRef = collection(db, rootCol, userId, subCol);
    const q = query(colRef, limit(Math.min(limitCount, MAX_RESET_BATCH_SIZE)));
    const snap = await getDocs(q);
    return {
      docs: snap.docs.map((d) => ({ ref: d.ref, id: d.id })),
    };
  },
  async commitBatchDeletes(docRefs: DocumentReference[]) {
    if (docRefs.length === 0) return;
    const batch = writeBatch(db);
    for (const ref of docRefs) {
      batch.delete(ref);
    }
    await batch.commit();
  },
};

/**
 * Validates authenticated user ID.
 */
export function validateUserId(userId: unknown): string {
  if (typeof userId !== "string" || !userId.trim() || userId.length > 128) {
    throw new AppADataResetError(
      "Invalid or empty user ID",
      "validation",
      "invalid_user_id",
      "validation"
    );
  }
  return userId.trim();
}

/**
 * Executes safe remote collection resets according to the fixed allowlist.
 * Sequential bounded queries capped at MAX_RESET_BATCH_SIZE (400 docs) per page.
 * Never loads full collections into memory.
 * Privacy-safe: never logs sensitive user inputs, document IDs, or paths.
 */
export async function executeDataReset(
  userId: string,
  scopes: DataResetScopeSelection,
  options?: {
    adapter?: FirestoreAdapter;
    onProgress?: (event: ResetProgressEvent) => void;
    onResetPreferences?: () => void;
  }
): Promise<DataResetResult> {
  const validUid = validateUserId(userId);
  const adapter = options?.adapter || defaultFirestoreAdapter;
  const onProgress = options?.onProgress;

  const scopeStatuses: Record<DataResetScopeKey, ResetScopeStatus> = {
    app_a_daily: {
      scope: "app_a_daily",
      status: scopes.appADailyData ? "pending" : "skipped",
      processedDocuments: 0,
    },
    vision_shared: {
      scope: "vision_shared",
      status: scopes.sharedVisionData ? "pending" : "skipped",
      processedDocuments: 0,
    },
    routines_shared: {
      scope: "routines_shared",
      status: scopes.sharedRoutinesData ? "pending" : "skipped",
      processedDocuments: 0,
    },
    app_a_preferences: {
      scope: "app_a_preferences",
      status: scopes.appAPreferences ? "pending" : "skipped",
      processedDocuments: 0,
    },
  };

  const completedScopes: DataResetScopeKey[] = [];
  const failedScopes: DataResetScopeKey[] = [];
  let totalDeletedDocuments = 0;

  const remoteScopeKeys: Array<"app_a_daily" | "vision_shared" | "routines_shared"> = [
    "app_a_daily",
    "vision_shared",
    "routines_shared",
  ];

  for (const scopeKey of remoteScopeKeys) {
    if (!scopes[scopeKey === "app_a_daily" ? "appADailyData" : scopeKey === "vision_shared" ? "sharedVisionData" : "sharedRoutinesData"]) {
      continue;
    }

    scopeStatuses[scopeKey].status = "in_progress";
    let scopeDocCount = 0;
    let scopeFailed = false;

    // Filter relevant targets from fixed allowlist
    const targets = SUPPORTED_REMOTE_COLLECTIONS.filter(
      (item) => item.scopeCategory === scopeKey
    );

    for (const target of targets) {
      let batchIndex = 0;

      while (true) {
        onProgress?.({
          scopeCategory: scopeKey,
          stage: "querying",
          collectionName: target.collectionName,
          processedCount: scopeDocCount,
          batchIndex: batchIndex + 1,
        });

        let docsToDelete: Array<{ ref: DocumentReference }>;
        try {
          const queryRes = await adapter.getDocsBatch(
            target.rootCollection,
            validUid,
            target.collectionName,
            MAX_RESET_BATCH_SIZE
          );
          docsToDelete = queryRes.docs;
        } catch (err: any) {
          const rawCode = err?.code || err?.message || "query_failed";
          const sanitizedCode = sanitizeFirebaseErrorCode(rawCode);
          const category = mapFirebaseErrorCodeToCategory(sanitizedCode);

          scopeStatuses[scopeKey].status = "failed";
          scopeStatuses[scopeKey].error = {
            stage: "query_docs",
            firebaseCode: sanitizedCode,
            category,
          };
          scopeFailed = true;
          failedScopes.push(scopeKey);
          onProgress?.({
            scopeCategory: scopeKey,
            stage: "failed",
            collectionName: target.collectionName,
            processedCount: scopeDocCount,
          });
          break; // Stop further processing for this target
        }

        // If collection is empty, termination of repeated query
        if (docsToDelete.length === 0) {
          break;
        }

        // Chunk documents strictly capped at MAX_RESET_BATCH_SIZE (400)
        const chunk = docsToDelete.slice(0, MAX_RESET_BATCH_SIZE);
        batchIndex++;

        onProgress?.({
          scopeCategory: scopeKey,
          stage: "deleting_batches",
          collectionName: target.collectionName,
          batchIndex,
          processedCount: scopeDocCount,
        });

        try {
          await adapter.commitBatchDeletes(chunk.map((d) => d.ref));
          scopeDocCount += chunk.length;
          totalDeletedDocuments += chunk.length;
          scopeStatuses[scopeKey].processedDocuments = scopeDocCount;
        } catch (err: any) {
          const rawCode = err?.code || err?.message || "batch_commit_failed";
          const sanitizedCode = sanitizeFirebaseErrorCode(rawCode);
          const category = mapFirebaseErrorCodeToCategory(sanitizedCode);

          scopeStatuses[scopeKey].status = "failed";
          scopeStatuses[scopeKey].error = {
            stage: "batch_commit",
            firebaseCode: sanitizedCode,
            category,
          };
          scopeFailed = true;
          failedScopes.push(scopeKey);
          onProgress?.({
            scopeCategory: scopeKey,
            stage: "failed",
            collectionName: target.collectionName,
            processedCount: scopeDocCount,
          });
          break; // Stop further processing for this target
        }

        // If returned documents were less than the page size, collection is now empty
        if (docsToDelete.length < MAX_RESET_BATCH_SIZE) {
          break;
        }
      }

      if (scopeFailed) {
        break; // Stop processing remaining targets in this scope
      }
    }

    if (!scopeFailed) {
      scopeStatuses[scopeKey].status = "completed";
      completedScopes.push(scopeKey);
      onProgress?.({
        scopeCategory: scopeKey,
        stage: "completed",
        processedCount: scopeDocCount,
      });
    }
  }

  // Preferences scope (only executed if all selected remote scopes succeeded)
  if (scopes.appAPreferences) {
    if (failedScopes.length === 0) {
      scopeStatuses.app_a_preferences.status = "in_progress";
      try {
        if (options?.onResetPreferences) {
          options.onResetPreferences();
        }
        scopeStatuses.app_a_preferences.status = "completed";
        completedScopes.push("app_a_preferences");
        onProgress?.({
          scopeCategory: "app_a_preferences",
          stage: "completed",
          processedCount: 1,
        });
      } catch (err: any) {
        scopeStatuses.app_a_preferences.status = "failed";
        scopeStatuses.app_a_preferences.error = {
          stage: "preferences_reset",
          firebaseCode: "local_storage_error",
          category: "storage",
        };
        failedScopes.push("app_a_preferences");
      }
    } else {
      // Remote scopes failed; do not clear local preferences prematurely
      scopeStatuses.app_a_preferences.status = "pending";
    }
  }

  const isPartial = failedScopes.length > 0 && completedScopes.length > 0;
  const success = failedScopes.length === 0;

  return {
    success,
    isPartial,
    completedScopes,
    failedScopes,
    scopeStatuses,
    totalDeletedDocuments,
  };
}
