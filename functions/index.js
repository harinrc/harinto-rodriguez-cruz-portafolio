const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const WEB_CHAT_URL = 'https://harinrc.github.io/harinto-rodriguez-cruz-portafolio/';
const ADMIN_CHAT_URL = 'https://harinrc.github.io/harinto-rodriguez-cruz-portafolio/admin-chat.html';
const MAX_TEXT_LENGTH = 420;
const MAX_NAME_LENGTH = 100;
const MAX_CONTACT_LENGTH = 120;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_MESSAGES_PER_WINDOW = 6;
const RATE_BLOCK_MS = 10 * 60 * 1000;

async function cleanupInvalidTokenGroup(basePath, invalidTokens) {
  if (!invalidTokens.length) return;

  const parentSnap = await admin.database().ref(basePath).once('value');
  const parentObj = parentSnap.val() || {};

  const jobs = Object.keys(parentObj).map(async (ownerId) => {
    const rows = parentObj[ownerId] || {};
    const updates = {};

    Object.keys(rows).forEach((tokenKey) => {
      if (rows[tokenKey] && invalidTokens.includes(rows[tokenKey].token)) {
        updates[tokenKey] = null;
      }
    });

    if (Object.keys(updates).length) {
      await admin.database().ref(`${basePath}/${ownerId}`).update(updates);
    }
  });

  await Promise.all(jobs);
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeConversationId(value) {
  const str = String(value || '').trim();
  if (!str) return '';
  return str.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
}

async function enforceVisitorRateLimit(uid) {
  const now = Date.now();
  const windowBucket = Math.floor(now / RATE_WINDOW_MS);
  const limitRef = admin.database().ref(`/security/visitor_limits/${uid}`);

  const tx = await limitRef.transaction((current) => {
    const row = current || {};
    const blockedUntil = Number(row.blockedUntil || 0);

    if (blockedUntil > now) {
      return {
        bucket: windowBucket,
        count: Number(row.count || 0),
        blockedUntil,
        updatedAt: now
      };
    }

    const previousBucket = Number(row.bucket || -1);
    const count = previousBucket === windowBucket ? Number(row.count || 0) + 1 : 1;
    const next = {
      bucket: windowBucket,
      count,
      updatedAt: now,
      blockedUntil: 0
    };

    if (count > RATE_MAX_MESSAGES_PER_WINDOW) {
      next.blockedUntil = now + RATE_BLOCK_MS;
    }

    return next;
  });

  const data = tx && tx.snapshot ? tx.snapshot.val() : null;
  const blockedUntil = Number((data && data.blockedUntil) || 0);
  if (blockedUntil > now) {
    const retryAfterSec = Math.ceil((blockedUntil - now) / 1000);
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Has enviado demasiados mensajes. Intenta de nuevo en ${retryAfterSec} segundos.`
    );
  }
}

exports.submitVisitorMessage = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesion para enviar mensajes.');
  }

  // Enforce App Check token for direct chat ingestion.
  if (!context.app) {
    throw new functions.https.HttpsError('failed-precondition', 'App Check requerido. Recarga la pagina.');
  }

  const uid = context.auth.uid;
  await enforceVisitorRateLimit(uid);

  const visitorName = cleanText(data && data.visitorName).slice(0, MAX_NAME_LENGTH);
  const visitorContact = cleanText(data && data.visitorContact).slice(0, MAX_CONTACT_LENGTH);
  const text = cleanText(data && data.text).slice(0, MAX_TEXT_LENGTH);
  const providedConversationId = normalizeConversationId(data && data.conversationId);

  if (!visitorName) {
    throw new functions.https.HttpsError('invalid-argument', 'Nombre requerido.');
  }
  if (!visitorContact) {
    throw new functions.https.HttpsError('invalid-argument', 'Contacto requerido.');
  }
  if (!text) {
    throw new functions.https.HttpsError('invalid-argument', 'Mensaje vacio.');
  }

  const db = admin.database();
  let conversationId = providedConversationId;
  let conversationSnap = null;

  if (conversationId) {
    conversationSnap = await db.ref(`/conversations/${conversationId}`).once('value');
    if (conversationSnap.exists()) {
      const conversation = conversationSnap.val() || {};
      if (conversation.visitorId !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'Conversacion no autorizada para este usuario.');
      }
    }
  }

  const nowIso = new Date().toISOString();
  if (!conversationId || !conversationSnap || !conversationSnap.exists()) {
    const newRef = db.ref('/conversations').push();
    conversationId = newRef.key;

    await newRef.set({
      conversationId,
      visitorId: uid,
      visitorName,
      visitorContact,
      status: 'open',
      source: 'web_portfolio_widget',
      createdAt: admin.database.ServerValue.TIMESTAMP,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
      lastMessage: '',
      unreadForAdmin: 0,
      unreadForVisitor: 0
    });
  }

  await db.ref(`/messages/${conversationId}`).push({
    senderType: 'visitor',
    text,
    visitorId: uid,
    conversationId,
    createdAt: admin.database.ServerValue.TIMESTAMP,
    createdAtIso: nowIso,
    seenByAdmin: false,
    seenByVisitor: true
  });

  await db.ref(`/conversations/${conversationId}`).update({
    visitorName,
    visitorContact,
    status: 'open',
    updatedAt: admin.database.ServerValue.TIMESTAMP,
    updatedAtIso: nowIso,
    lastMessage: text,
    unreadForAdmin: admin.database.ServerValue.increment(1)
  });

  await db.ref('/mensajes_contacto').push({
    nombre: visitorName,
    contacto: visitorContact,
    mensaje: text,
    conversationId,
    fecha: new Date().toLocaleString('es-NI', { timeZone: 'America/Managua' })
  });

  return {
    ok: true,
    conversationId
  };
});

exports.pushOnVisitorMessage = functions.database
  .ref('/messages/{conversationId}/{messageId}')
  .onCreate(async (snapshot, context) => {
    const message = snapshot.val() || {};
    if (message.senderType !== 'visitor') {
      return null;
    }

    const conversationId = context.params.conversationId;
    const text = String(message.text || '').slice(0, 140);

    const adminsSnap = await admin.database().ref('/admins').once('value');
    const adminsObj = adminsSnap.val() || {};
    const adminUids = Object.keys(adminsObj).filter((uid) => adminsObj[uid] === true);
    if (!adminUids.length) {
      return null;
    }

    const tokenFetches = adminUids.map((uid) =>
      admin.database().ref(`/admin_push_tokens/${uid}`).once('value')
    );
    const tokenSnaps = await Promise.all(tokenFetches);

    const allTokens = [];
    tokenSnaps.forEach((snap) => {
      const row = snap.val() || {};
      Object.keys(row).forEach((k) => {
        if (row[k] && row[k].token) {
          allTokens.push(row[k].token);
        }
      });
    });

    const uniqueTokens = [...new Set(allTokens)].slice(0, 500);
    if (!uniqueTokens.length) {
      return null;
    }

    const payload = {
      tokens: uniqueTokens,
      data: {
        title: 'Nuevo mensaje de visitante',
        body: text || 'Te escribieron en el chat',
        text,
        conversationId,
        url: ADMIN_CHAT_URL,
        click_action: ADMIN_CHAT_URL
      },
      webpush: {
        fcmOptions: {
          link: ADMIN_CHAT_URL
        },
        notification: {
          title: 'Nuevo mensaje de visitante',
          body: text || 'Te escribieron en el chat',
          icon: 'https://harinrc.github.io/harinto-rodriguez-cruz-portafolio/favicon.png'
        }
      }
    };

    const result = await admin.messaging().sendEachForMulticast(payload);

    const invalidTokens = [];
    result.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error && res.error.code ? res.error.code : '';
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
          invalidTokens.push(uniqueTokens[idx]);
        }
      }
    });

    await cleanupInvalidTokenGroup('/admin_push_tokens', invalidTokens);

    return null;
  });

exports.pushOnAdminMessage = functions.database
  .ref('/messages/{conversationId}/{messageId}')
  .onCreate(async (snapshot, context) => {
    const message = snapshot.val() || {};
    if (message.senderType !== 'admin') {
      return null;
    }

    const conversationId = context.params.conversationId;
    const text = String(message.text || '').slice(0, 140);

    const conversationSnap = await admin.database().ref(`/conversations/${conversationId}`).once('value');
    const conversation = conversationSnap.val() || {};
    const visitorId = conversation.visitorId || '';
    if (!visitorId) return null;

    const visitorTokensSnap = await admin.database().ref(`/visitor_push_tokens/${visitorId}`).once('value');
    const visitorTokensObj = visitorTokensSnap.val() || {};
    const tokens = Object.keys(visitorTokensObj)
      .map((k) => visitorTokensObj[k] && visitorTokensObj[k].token)
      .filter(Boolean)
      .slice(0, 500);

    if (!tokens.length) {
      return null;
    }

    const payload = {
      tokens,
      data: {
        title: 'HarinRC respondio tu chat',
        body: text || 'Tienes una nueva respuesta',
        text,
        conversationId,
        url: WEB_CHAT_URL,
        click_action: WEB_CHAT_URL
      },
      webpush: {
        fcmOptions: {
          link: WEB_CHAT_URL
        },
        notification: {
          title: 'HarinRC respondio tu chat',
          body: text || 'Tienes una nueva respuesta',
          icon: 'https://harinrc.github.io/harinto-rodriguez-cruz-portafolio/favicon.png'
        }
      }
    };

    const result = await admin.messaging().sendEachForMulticast(payload);

    const invalidTokens = [];
    result.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error && res.error.code ? res.error.code : '';
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    if (invalidTokens.length) {
      const tokensRef = admin.database().ref(`/visitor_push_tokens/${visitorId}`);
      const current = (await tokensRef.once('value')).val() || {};
      const updates = {};
      Object.keys(current).forEach((tokenKey) => {
        if (current[tokenKey] && invalidTokens.includes(current[tokenKey].token)) {
          updates[tokenKey] = null;
        }
      });
      if (Object.keys(updates).length) {
        await tokensRef.update(updates);
      }
    }

    return null;
  });
