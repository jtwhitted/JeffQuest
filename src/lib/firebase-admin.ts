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
db.settings({ ignoreUndefinedProperties: true });
