import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import configRaw from "../../firebase-applet-config.json";

const rawConfig = configRaw as Record<string, any>;
const apiKey =
  rawConfig.apiKey ||
  (rawConfig.apiKey1 && rawConfig.apiKey2 ? rawConfig.apiKey1 + rawConfig.apiKey2 : "");

const firebaseConfig = {
  projectId: rawConfig.projectId,
  appId: rawConfig.appId,
  apiKey,
  authDomain: rawConfig.authDomain,
  storageBucket: rawConfig.storageBucket,
  messagingSenderId: rawConfig.messagingSenderId,
  measurementId: rawConfig.measurementId || undefined,
};

const app = initializeApp(firebaseConfig);

const databaseId =
  rawConfig.firestoreDatabaseId && rawConfig.firestoreDatabaseId !== "(default)"
    ? rawConfig.firestoreDatabaseId
    : undefined;

let _db: any;
try {
  _db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
} catch (err) {
  console.warn("Firestore initialization error, falling back to default:", err);
  try {
    _db = getFirestore(app);
  } catch {
    _db = {} as any;
  }
}

export const db = _db;
export const auth = getAuth(app);

// Connection validation
if (typeof window !== "undefined") {
  (async () => {
    try {
      const { doc, getDocFromServer } = await import("firebase/firestore");
      await getDocFromServer(doc(db, "test", "connection"));
    } catch (error: any) {
      if (error?.message?.includes("the client is offline")) {
        console.error("Please check your Firebase configuration: Firestore client is offline.");
      }
    }
  })();
}

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
