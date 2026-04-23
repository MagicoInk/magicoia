# IA Mágico

Aplicación web para sugerir respuestas de venta (Instagram, WhatsApp) a partir de conversaciones reales con venta y vendedores referencia.

- **Inicio** (`/`): pegar el chat o subir captura; RAG con **Firestore** (Firebase) y sugerencias con **Google Gemini** (API de [AI Studio](https://aistudio.google.com)).
- **Entrenar** (`/admin`): con `ADMIN_SECRET` subes conversaciones; se trocean, se generan embeddings y se guardan en **Cloud Firestore**.

## Requisitos

- Node 20+
- Proyecto [Firebase](https://console.firebase.google.com) con **Cloud Firestore** activado.
- [Google AI Studio](https://aistudio.google.com/apikey) para `GEMINI_API_KEY` (embeddings `text-embedding-004`, chat/visión `gemini-1.5-flash` por defecto; configurables con `GEMINI_EMBED_MODEL` / `GEMINI_MODEL`).

## Configurar Firebase (Firestore)

1. Crea o elige un proyecto en la consola de Firebase.
2. **Crea la base de datos** Firestore (modo de prueba o con reglas según vuestro criterio; el backend usa la **cuenta de servicio** y no expone claves al navegador).
3. Comprueba que el plan cubre el uso (el **plan gratuito (Spark)** incluye Firestore con límites: [precios y cuotas](https://firebase.google.com/docs/firestore/quotas)).
4. **Cuenta de servicio** (para el servidor, no el `google-services` de apps móviles):
   - Proyecto → engranaje → **Cuentas de servicio** en Google Cloud, o
   - Desde la consola de Firebase: *Project settings* → *Service accounts* → **Generate new private key** (JSON).

### Variables de entorno (una de las dos)

- **`FIREBASE_SERVICE_ACCOUNT_JSON`**: pega el JSON entero en **una sola línea** (o minifica el JSON). Útil en Vercel / hosting.
- **`GOOGLE_APPLICATION_CREDENTIALS`**: ruta absoluta al archivo `.json` en tu máquina. Útil en local. **No** subas ese archivo a git.

Solo el **servidor** (rutas `app/api/*`) llama a Firebase; no hace falta clave pública de Firebase en el front para los datos (el panel admin sigue usando `ADMIN_SECRET` + cabecera).

## Puesta en marcha

```bash
cd "ia magico"
cp .env.example .env
# Edita .env: GEMINI_API_KEY, ADMIN_SECRET, y Firebase
npm install
npm run dev
```

Crea al menos un documento de entrenamiento en **Entrenar**; luego prueba en **Inicio**.

## Despliegue

- Cualquier host con **Node** (tu hosting, Vercel, etc.): `npm run build` y `npm start` (o el comando que use la plataforma).
- En el panel del host, configura `GEMINI_API_KEY`, `ADMIN_SECRET` y `FIREBASE_SERVICE_ACCOUNT_JSON` (o `GOOGLE_APPLICATION_CREDENTIALS` apuntando a un secreto montado como archivo).

**Índice en Firestore:** al listar entradas con `orderBy("createdAt")`, Firestore puede pedir crear un índice; el enlace sale en el error de la consola o en el log de build/runtime.

## Privacidad

Solo almacenáis lo que subís; revisad consentimientos y datos personales (RGPD, etc.).
