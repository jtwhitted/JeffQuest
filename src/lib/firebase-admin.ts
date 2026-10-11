import { cert, getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'studio-645902535-c7b43';

function createApp(): App {
    if (getApps().length) {
        return getApps()[0];
    }

    // Local/dev: a service account's fields supplied via env vars.
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        return initializeApp({
            credential: cert({
                projectId: PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // .env files can't hold literal newlines, so they're escaped as \n.
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
            projectId: PROJECT_ID,
        });
    }

    // Deployed on Firebase App Hosting / Cloud Run / GCE: credentials come
    // from the environment automatically, no key file needed.
    return initializeApp({
        credential: applicationDefault(),
        projectId: PROJECT_ID,
    });
}

const app = createApp();

export const db = getFirestore(app);

try {
    db.settings({ ignoreUndefinedProperties: true });
} catch {
    // Firestore throws if settings() is called more than once on the same
    // underlying client. The Firebase app itself is deduplicated via
    // getApps() above, but on Vercel this module can still be evaluated
    // more than once per warm serverless instance (Server Actions and
    // Server Components are bundled separately), and getFirestore(app)
    // returns the same cached client both times. Safe to ignore: it just
    // means an earlier module instantiation already applied these settings.
}
