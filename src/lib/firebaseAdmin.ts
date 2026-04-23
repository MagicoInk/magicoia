import { getApps, initializeApp, applicationDefault, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { ServiceAccount } from "firebase-admin/app";

let app: App | null = null;

function initApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const creds = JSON.parse(json) as ServiceAccount;
    app = initializeApp({ credential: cert(creds) });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    app = initializeApp({ credential: applicationDefault() });
  } else {
    throw new Error(
      "Falta configuración de Firebase: pon FIREBASE_SERVICE_ACCOUNT_JSON (JSON de la cuenta de servicio en una línea) o GOOGLE_APPLICATION_CREDENTIALS (ruta a un .json local)."
    );
  }
  return app;
}

export function getDb(): Firestore {
  return getFirestore(initApp());
}
