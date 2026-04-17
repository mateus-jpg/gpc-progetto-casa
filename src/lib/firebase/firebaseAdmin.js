// lib/firebaseAdmin.ts
import admin from "firebase-admin";

if (!admin.apps.length) {
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    undefined;

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    ...(storageBucket ? { storageBucket } : {}),
  });
}

export const auth = admin.auth();
export const db = admin.firestore();
export default admin;
