let fbFirestore: any = null;
function getFirestoreModule() {
  if (!fbFirestore) {
    try {
      fbFirestore = require("firebase/firestore");
    } catch {
      fbFirestore = {};
    }
  }
  return fbFirestore;
}

export const firestoreAdapter = {
  doc: ((...args: any[]) => getFirestoreModule().doc?.(...args)) as any,
  setDoc: ((...args: any[]) => getFirestoreModule().setDoc?.(...args)) as any,
  getDocs: ((...args: any[]) => getFirestoreModule().getDocs?.(...args)) as any,
  runTransaction: ((...args: any[]) => getFirestoreModule().runTransaction?.(...args)) as any,
  deleteDoc: ((...args: any[]) => getFirestoreModule().deleteDoc?.(...args)) as any,
  collection: ((...args: any[]) => getFirestoreModule().collection?.(...args)) as any,
  query: ((...args: any[]) => getFirestoreModule().query?.(...args)) as any,
  where: ((...args: any[]) => getFirestoreModule().where?.(...args)) as any,
  db: null as any,
};
