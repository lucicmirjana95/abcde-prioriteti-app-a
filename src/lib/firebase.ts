import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import configRaw from "../../firebase-applet-config.json";

const firebaseConfig = {
  ...configRaw,
  apiKey: (configRaw as any).apiKey1 + (configRaw as any).apiKey2
};

const app = initializeApp(firebaseConfig);
let _db: any;
try {
  _db = getFirestore(app);
} catch {
  _db = {} as any;
}
export const db = _db;
export const auth = getAuth();

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  
  if (typeof window !== "undefined") {
    const rawMsg = error instanceof Error ? error.message : String(error);
    window.dispatchEvent(
      new CustomEvent("firestore-error-toast", {
        detail: {
          message: `Firestore sync issue: ${rawMsg}`,
          type: "error",
        },
      })
    );
  }
}
