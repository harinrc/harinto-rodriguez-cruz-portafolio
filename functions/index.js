const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const WEB_CHAT_URL = 'https://harinrc.github.io/harinto-rodriguez-cruz-portafolio/';
const ADMIN_CHAT_URL = 'https://harinrc.github.io/harinto-rodriguez-cruz-portafolio/admin-chat.html';

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
