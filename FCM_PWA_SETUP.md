# Setup FCM + PWA (solo admin)

## 1) Publicar reglas RTDB

1. Abre Firebase Console > Realtime Database > Rules.
2. Copia el contenido de `firebase-rules.realtime.json` (solo el objeto `rules`).
3. Publica.

## 2) Configurar VAPID key para Web Push

1. Firebase Console > Project Settings > Cloud Messaging.
2. En Web configuration, genera/par de claves VAPID si no existe.
3. Copia la Public Key.
4. En `admin-chat.js`, reemplaza:
   - `const FCM_VAPID_PUBLIC_KEY = 'REEMPLAZA_CON_TU_VAPID_KEY_PUBLICA';`

## 3) Desplegar Cloud Function de notificaciones

1. Instala Firebase CLI si hace falta:
   - `npm install -g firebase-tools`
2. Login:
   - `firebase login`
3. En la carpeta `functions` instala dependencias:
   - `npm install`
4. Desde la raiz del proyecto despliega funciones:
   - `firebase deploy --only functions`

Funcion creada:
- `pushOnVisitorMessage`
- `pushOnAdminMessage`

Trigger:
- `/messages/{conversationId}/{messageId}`

Comportamiento:
- Si `senderType` es `visitor`, envía push a todos los tokens guardados en `admin_push_tokens/*`.
- Si `senderType` es `admin`, envía push a los tokens del visitante en `visitor_push_tokens/{visitorId}`.

## 4) PWA solo para admin

Ya esta implementado con estos archivos:
- `admin-manifest.webmanifest`
- `admin-sw.js`
- `admin-chat.html` (solo esta pagina enlaza manifest y registra SW mediante JS)

Esto significa:
- `index.html` NO es PWA.
- Solo `admin-chat.html` muestra instalacion y funciona como app instalada.

## 5) Validar flujo completo

1. Abre `admin-chat.html`.
2. Inicia sesion admin.
3. Acepta permiso de notificaciones.
4. Verifica que aparezca token en RTDB:
   - `admin_push_tokens/{adminUid}/{tokenKey}`
   - `visitor_push_tokens/{visitorUid}/{tokenKey}` (cuando visitante acepta notificaciones)
5. Envia mensaje desde visitante.
6. Debe llegar push al admin aunque admin este en segundo plano.

## 6) Notas

- Si no llega push, revisar logs de Cloud Functions y permisos del navegador.
- Si cambias dominio o subruta, actualiza el `click_action/link` en `functions/index.js`.
- En iOS, push web requiere condiciones especificas de Safari/PWA instalada.

## 7) Fase 2 anti-spam (nuevo)

Se agregó una ingesta segura para mensajes de visitante:
- `submitVisitorMessage` (Callable Cloud Function)

Que hace:
- Exige `auth.uid`.
- Exige token App Check.
- Aplica rate limit por UID (ventana de 1 minuto, max 6 mensajes).
- Si excede, bloquea temporalmente (10 minutos).
- Solo el backend escribe en `messages` y `conversations` para visitantes.

Pasos para activar:
1. Publica rules de `firebase-rules.realtime.json`.
2. Despliega funciones:
   - `firebase deploy --only functions`
3. Publica frontend actualizado (`index.html` + `script.js`).

Comprobacion:
1. Envio normal de visitante funciona.
2. Envio rapido repetido dispara error de limite.
3. Visitante ya no puede crear mensajes directos en `messages/*` desde cliente.
