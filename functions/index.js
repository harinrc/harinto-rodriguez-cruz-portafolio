const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

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
        click_action: 'https://harinrc.github.io/harinto-rodriguez-cruz-portafolio/admin-chat.html'
      },
      webpush: {
        fcmOptions: {
          link: 'https://harinrc.github.io/harinto-rodriguez-cruz-portafolio/admin-chat.html'
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

    if (invalidTokens.length) {
      await Promise.all(adminUids.map(async (uid) => {
        const tokensRef = admin.database().ref(`/admin_push_tokens/${uid}`);
        const snap = await tokensRef.once('value');
        const rows = snap.val() || {};
        const updates = {};
        Object.keys(rows).forEach((k) => {
          if (rows[k] && invalidTokens.includes(rows[k].token)) {
            updates[k] = null;
          }
        });
        if (Object.keys(updates).length) {
          await tokensRef.update(updates);
        }
      }));
    }

    return null;
  });
