#!/usr/bin/env node

/**
 * Initialize or promote a super admin user for this project.
 *
 * Usage:
 *   node -r dotenv/config src/scripts/initAdminUser.cjs \
 *     --email admin@example.com \
 *     --password "ChangeMe123!" \
 *     --display-name "Admin User"
 *
 * Optional flags:
 *   --uid <uid>                  Promote an existing Auth user by UID
 *   --phone <phone>              Store a phone number in operators/{uid}
 *   --project-ids <a,b,c>        Optional project access list
 *   --structure-ids <a,b,c>      Optional structure access list
 */

const admin = require("firebase-admin");

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function parseCsv(value) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function printUsageAndExit(message) {
  if (message) {
    console.error(`Error: ${message}\n`);
  }

  console.log(`Usage:
  node -r dotenv/config src/scripts/initAdminUser.cjs --email admin@example.com --password "ChangeMe123!"

Options:
  --email <email>                Email of the admin user
  --password <password>          Required only when creating a new Auth user
  --display-name <name>          Display name stored in Auth and Firestore
  --uid <uid>                    Existing Firebase Auth UID to promote
  --phone <phone>                Optional phone number for operators doc
  --project-ids <id1,id2>        Optional comma-separated project IDs
  --structure-ids <id1,id2>      Optional comma-separated structure IDs
`);
  process.exit(1);
}

function initializeFirebase() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    undefined;

  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    ...(storageBucket ? { storageBucket } : {}),
  });
}

async function getOrCreateAuthUser(auth, options) {
  const { uid, email, password, displayName } = options;

  if (uid) {
    const existingByUid = await auth.getUser(uid);

    if (displayName && existingByUid.displayName !== displayName) {
      return auth.updateUser(uid, { displayName });
    }

    return existingByUid;
  }

  if (!email) {
    throw new Error("Either --uid or --email is required");
  }

  try {
    const existingByEmail = await auth.getUserByEmail(email);

    if (displayName && existingByEmail.displayName !== displayName) {
      return auth.updateUser(existingByEmail.uid, { displayName });
    }

    return existingByEmail;
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }

    if (!password) {
      throw new Error(
        "Password is required when the user does not already exist in Firebase Auth",
      );
    }

    return auth.createUser({
      email,
      password,
      displayName: displayName || email.split("@")[0],
      disabled: false,
    });
  }
}

async function upsertOperatorDocument(db, userRecord, options) {
  const operatorRef = db.collection("operators").doc(userRecord.uid);
  const operatorSnap = await operatorRef.get();
  const now = new Date();

  const payload = {
    email: userRecord.email || options.email || null,
    displayName:
      options.displayName || userRecord.displayName || userRecord.email || null,
    phone: options.phone || null,
    role: "admin",
    projectIds: options.projectIds,
    structureIds: options.structureIds,
    updatedAt: now,
    updatedBy: "script:initAdminUser",
  };

  if (operatorSnap.exists) {
    await operatorRef.set(payload, { merge: true });
    return "updated";
  }

  await operatorRef.set({
    ...payload,
    createdAt: now,
    createdBy: "script:initAdminUser",
  });
  return "created";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsageAndExit();
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    printUsageAndExit(
      "GOOGLE_APPLICATION_CREDENTIALS is not set. Point it to a Firebase service account JSON file.",
    );
  }

  if (!args.uid && !args.email) {
    printUsageAndExit("Missing required flag: --uid or --email");
  }

  initializeFirebase();

  const auth = admin.auth();
  const db = admin.firestore();

  const options = {
    uid: typeof args.uid === "string" ? args.uid.trim() : "",
    email: typeof args.email === "string" ? args.email.trim() : "",
    password: typeof args.password === "string" ? args.password : "",
    displayName:
      typeof args["display-name"] === "string"
        ? args["display-name"].trim()
        : "",
    phone: typeof args.phone === "string" ? args.phone.trim() : "",
    projectIds: parseCsv(args["project-ids"]),
    structureIds: parseCsv(args["structure-ids"]),
  };

  const userRecord = await getOrCreateAuthUser(auth, options);
  const operatorStatus = await upsertOperatorDocument(db, userRecord, options);

  console.log("Admin initialization completed.");
  console.log(`UID: ${userRecord.uid}`);
  console.log(`Email: ${userRecord.email || options.email || "n/a"}`);
  console.log(`Operator doc: ${operatorStatus}`);
  console.log("Role: admin");
}

main().catch((error) => {
  console.error("Failed to initialize admin user.");
  console.error(error);
  process.exit(1);
});
