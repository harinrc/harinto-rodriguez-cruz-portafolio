(function () {
    const stateEl = document.getElementById('admin-auth-state');
    const logoutBtn = document.getElementById('admin-logout-btn');
    const pwaInstallBtn = document.getElementById('admin-install-pwa-btn');

    const loginSection = document.getElementById('admin-login');
    const unauthorizedSection = document.getElementById('admin-unauthorized');
    const appSection = document.getElementById('admin-app');

    const googleBtn = document.getElementById('admin-google-btn');
    const anonBtn = document.getElementById('admin-anon-btn');
    const copyUidBtn = document.getElementById('copy-uid-btn');
    const currentUidEl = document.getElementById('admin-current-uid');

    const listEl = document.getElementById('admin-conversations-list');
    const threadHeaderEl = document.getElementById('admin-thread-header');
    const threadMessagesEl = document.getElementById('admin-thread-messages');
    const replyForm = document.getElementById('admin-reply-form');
    const replyInput = document.getElementById('admin-reply-input');
    const sendBtn = document.getElementById('admin-send-btn');
    const replyCharCounterEl = document.getElementById('admin-char-counter');
    const closeConversationBtn = document.getElementById('admin-close-conversation-btn');
    const deleteConversationBtn = document.getElementById('admin-delete-conversation-btn');

    if (typeof firebase === 'undefined') {
        console.error('Firebase no esta cargado.');
        return;
    }

    const db = firebase.database();
    const auth = firebase.auth();
    const FCM_VAPID_PUBLIC_KEY = 'REEMPLAZA_CON_TU_VAPID_KEY_PUBLICA';

    let isAdmin = false;
    let activeUid = '';
    let selectedConversation = null;
    let conversationsRef = null;
    let messagesRef = null;
    let conversationMetaRef = null;
    let visitorTypingRef = null;
    let adminTypingRef = null;
    let visitorPresenceRef = null;
    let adminPresenceRef = null;
    let connectedRef = null;
    let adminRoleRef = null;
    let adminTypingTimer = null;
    let messaging = null;
    let swReg = null;
    let deferredInstallPrompt = null;
    let lastRenderedAdminConversationId = '';
    let hasRenderedAdminThread = false;
    const notifiedAdminMessageKeys = new Set();

    function formatDate(ts) {
        if (!ts) return '--:--';
        try {
            return new Date(ts).toLocaleString('es-NI', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Managua'
            });
        } catch (_error) {
            return '--:--';
        }
    }

    function sanitize(text) {
        return String(text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function isNearBottom(element, threshold = 56) {
        if (!element) return true;
        const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
        return distance <= threshold;
    }

    function syncThreadScroll(element, shouldStick, previousBottomOffset) {
        if (!element) return;
        if (shouldStick) {
            element.scrollTop = element.scrollHeight;
            return;
        }

        element.scrollTop = Math.max(0, element.scrollHeight - previousBottomOffset);
    }

    function buildAdminNotifyKey(data) {
        return [
            String(data.conversationId || ''),
            String(data.messageId || ''),
            String(data.createdAt || ''),
            String(data.text || '')
        ].join('::');
    }

    function setView(view) {
        const showLogin = view === 'login';
        const showUnauthorized = view === 'unauthorized';
        const showApp = view === 'app';

        loginSection.hidden = !showLogin;
        unauthorizedSection.hidden = !showUnauthorized;
        appSection.hidden = !showApp;

        loginSection.style.display = showLogin ? 'block' : 'none';
        unauthorizedSection.style.display = showUnauthorized ? 'block' : 'none';
        appSection.style.display = showApp ? 'grid' : 'none';
    }

    function setAuthState(text) {
        stateEl.textContent = text;
    }

    function setThreadStatus(status) {
        const statusEl = document.getElementById('admin-thread-status');
        if (!statusEl) return;
        const isClosed = status === 'closed';
        statusEl.textContent = isClosed ? 'Estado: cerrado' : 'Estado: abierto';
        statusEl.classList.toggle('closed', isClosed);
    }

    function setTypingHint(isTyping) {
        const hintEl = document.getElementById('admin-typing-hint');
        if (!hintEl) return;
        hintEl.hidden = !isTyping;
    }

    function clearActiveConversationRefs() {
        if (messagesRef) {
            messagesRef.off();
            messagesRef = null;
        }
        if (conversationMetaRef) {
            conversationMetaRef.off();
            conversationMetaRef = null;
        }
        if (visitorTypingRef) {
            visitorTypingRef.off();
            visitorTypingRef = null;
        }
        if (visitorPresenceRef) {
            visitorPresenceRef.off();
            visitorPresenceRef = null;
        }
        if (connectedRef) {
            connectedRef.off();
            connectedRef = null;
        }
        if (adminTypingRef) {
            adminTypingRef.off();
            adminTypingRef = null;
        }
        if (adminPresenceRef) {
            adminPresenceRef.off();
            adminPresenceRef = null;
        }
        if (adminRoleRef) {
            adminRoleRef.off();
            adminRoleRef = null;
        }
    }

    function isTrueLike(value) {
        return value === true || value === 1 || value === '1' || value === 'true';
    }

    async function checkAdmin(uid) {
        const snap = await db.ref(`admins/${uid}`).once('value');
        return snap.exists() && isTrueLike(snap.val());
    }

    function watchAdminRole(uid) {
        if (adminRoleRef) {
            adminRoleRef.off();
            adminRoleRef = null;
        }

        adminRoleRef = db.ref(`admins/${uid}`);
        adminRoleRef.on('value', (snap) => {
            const allowed = snap.exists() && isTrueLike(snap.val());
            if (!allowed || isAdmin) return;

            isAdmin = true;
            setView('app');
            setAuthState(`UID: ${uid.slice(0, 10)}... · admin activo`);
            watchConversations();
            ensurePwaAndMessaging();
        }, (error) => {
            console.error('Error observando rol admin:', error);
        });
    }

    function renderConversations(items) {
        if (!items.length) {
            listEl.innerHTML = '<p class="thread-empty">No hay conversaciones aun.</p>';
            return;
        }

        listEl.innerHTML = items.map((item) => {
            const active = selectedConversation && selectedConversation.id === item.id ? 'active' : '';
            const title = sanitize(item.visitorName || 'Visitante');
            const contact = sanitize(item.visitorContact || 'Sin contacto');
            const last = sanitize(item.lastMessage || 'Sin mensajes');
            const unreadForAdmin = Number(item.unreadForAdmin || 0);
            const unreadHtml = unreadForAdmin > 0 ? `<span class="conversation-unread">${Math.min(unreadForAdmin, 99)}</span>` : '';
            return `
                <button type="button" class="conversation-item ${active}" data-conv-id="${item.id}">
                    <div class="conversation-title">${title}${unreadHtml}</div>
                    <div class="conversation-sub">${contact}</div>
                    <div class="conversation-sub">${last}</div>
                    <div class="conversation-sub">${formatDate(item.updatedAt)}</div>
                </button>
            `;
        }).join('');

        listEl.querySelectorAll('.conversation-item').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-conv-id');
                const picked = items.find((it) => it.id === id);
                if (picked) {
                    openConversation(picked);
                }
            });
        });
    }

    function getDayKey(timestamp) {
        if (!timestamp) return 'sin-fecha';
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }

    function formatDaySeparatorLabel(timestamp) {
        if (!timestamp) return 'Sin fecha';
        const date = new Date(timestamp);
        const now = new Date();
        const startOfDay = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
        const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        try {
            return date.toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Managua' });
        } catch (_error) {
            return date.toLocaleDateString();
        }
    }

    function buildAdminSeenLabel(msg) {
        const senderType = msg.senderType === 'admin' ? 'admin' : 'visitor';
        return senderType === 'admin'
            ? (msg.seenByVisitor ? 'Leido por visitante' : 'Enviado')
            : (msg.seenByAdmin ? 'Leido por HarinRC' : 'Enviado');
    }

    function buildAdminMessageRowHtml(msg) {
        const senderType = msg.senderType === 'admin' ? 'admin' : 'visitor';
        const text = sanitize(msg.text);
        const who = senderType === 'admin' ? 'Tu' : 'Visitante';
        return `
            <div class="msg-row ${senderType}" data-msg-id="${msg.id}">
                <div class="msg-bubble">${text}</div>
                <span class="msg-meta">${who} · ${formatDate(msg.createdAt)} · ${buildAdminSeenLabel(msg)}</span>
            </div>
        `;
    }

    function buildAdminDateSeparatorHtml(timestamp) {
        return `<div class="thread-date-separator"><span>${formatDaySeparatorLabel(timestamp)}</span></div>`;
    }

    function renderMessages(messages, options = {}) {
        if (!messages.length) {
            threadMessagesEl.innerHTML = '<p class="thread-empty">Sin mensajes en esta conversacion.</p>';
            return;
        }

        const shouldStickToBottom = options.forceScrollToBottom || isNearBottom(threadMessagesEl);
        const previousBottomOffset = Math.max(0, threadMessagesEl.scrollHeight - threadMessagesEl.scrollTop);

        // Renderizado incremental (igual que en el widget del visitante):
        // solo se agregan los mensajes nuevos y se actualiza el estado de
        // los existentes, en vez de reconstruir todo el hilo en cada evento.
        const existingRowsById = new Map();
        threadMessagesEl.querySelectorAll('[data-msg-id]').forEach((el) => {
            existingRowsById.set(el.getAttribute('data-msg-id'), el);
        });
        let existingIds = Array.from(existingRowsById.keys());
        const newIds = messages.map((msg) => msg.id);

        // Igual que en el widget del visitante: si Firebase recorto mensajes
        // viejos (limitToLast) solo se quitan esas filas sobrantes en vez de
        // reconstruir todo el hilo en cada mensaje nuevo.
        let dropCount = 0;
        if (existingIds.length && newIds.length) {
            for (let d = 0; d <= existingIds.length; d += 1) {
                const remainder = existingIds.slice(d);
                if (remainder.length === 0 || remainder.every((id, index) => id === newIds[index])) {
                    dropCount = d;
                    break;
                }
            }
        }
        if (dropCount > 0) {
            for (let i = 0; i < dropCount; i += 1) {
                const staleRow = existingRowsById.get(existingIds[i]);
                if (staleRow) staleRow.remove();
            }
            threadMessagesEl.querySelectorAll('.thread-date-separator').forEach((separator) => {
                const next = separator.nextElementSibling;
                if (!next || next.classList.contains('thread-date-separator')) {
                    separator.remove();
                }
            });
            existingIds = existingIds.slice(dropCount);
        }

        const canPatchInPlace = existingIds.length > 0
            && existingIds.length <= newIds.length
            && existingIds.every((id, index) => id === newIds[index]);

        let hasNewContent = !canPatchInPlace || dropCount > 0;

        if (!canPatchInPlace) {
            let lastDayKey = '';
            threadMessagesEl.innerHTML = messages.map((msg) => {
                const dayKey = getDayKey(msg.createdAt);
                const separator = dayKey !== lastDayKey ? buildAdminDateSeparatorHtml(msg.createdAt) : '';
                lastDayKey = dayKey;
                return separator + buildAdminMessageRowHtml(msg);
            }).join('');
        } else {
            for (let index = 0; index < existingIds.length; index += 1) {
                const msg = messages[index];
                const row = existingRowsById.get(msg.id);
                if (!row) continue;
                const metaEl = row.querySelector('.msg-meta');
                const who = msg.senderType === 'admin' ? 'Tu' : 'Visitante';
                const newMetaText = `${who} · ${formatDate(msg.createdAt)} · ${buildAdminSeenLabel(msg)}`;
                if (metaEl && metaEl.textContent !== newMetaText) {
                    metaEl.textContent = newMetaText;
                }
            }

            const tail = messages.slice(existingIds.length);
            if (tail.length) {
                hasNewContent = true;
                let lastDayKey = getDayKey(messages[existingIds.length - 1].createdAt);
                const tailHtml = tail.map((msg) => {
                    const dayKey = getDayKey(msg.createdAt);
                    const separator = dayKey !== lastDayKey ? buildAdminDateSeparatorHtml(msg.createdAt) : '';
                    lastDayKey = dayKey;
                    return separator + buildAdminMessageRowHtml(msg);
                }).join('');
                threadMessagesEl.insertAdjacentHTML('beforeend', tailHtml);
            }
        }

        // Si solo se actualizo el estado "Enviado/Leido" (sin mensajes nuevos),
        // no se toca el scroll: forzar scrollTop aqui interrumpia el scroll
        // manual/inercial del admin cada vez que Firebase confirmaba lectura.
        if (hasNewContent) {
            syncThreadScroll(threadMessagesEl, shouldStickToBottom, previousBottomOffset);
        }
    }

    function watchConversations() {
        if (conversationsRef) conversationsRef.off();

        conversationsRef = db.ref('conversations').orderByChild('updatedAt').limitToLast(180);
        conversationsRef.on('value', (snap) => {
            const raw = snap.val() || {};
            const items = Object.keys(raw)
                .map((id) => ({ id, ...raw[id] }))
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

            renderConversations(items);

            if (selectedConversation) {
                const fresh = items.find((it) => it.id === selectedConversation.id);
                if (fresh) selectedConversation = fresh;
            }
        }, (error) => {
            console.error('Error leyendo conversaciones:', error);
        });
    }

    function openConversation(conversation) {
        selectedConversation = conversation;
        if (lastRenderedAdminConversationId !== conversation.id) {
            lastRenderedAdminConversationId = conversation.id;
            hasRenderedAdminThread = false;
        }
        threadHeaderEl.textContent = `${conversation.visitorName || 'Visitante'} · ${conversation.visitorContact || 'Sin contacto'}`;
        sendBtn.disabled = false;
        closeConversationBtn.disabled = false;
        deleteConversationBtn.disabled = false;
        replyInput.disabled = false;
        replyInput.placeholder = 'Escribe una respuesta...';
        threadMessagesEl.innerHTML = '<p class="thread-empty">Cargando mensajes...</p>';

        setTypingHint(false);
        clearActiveConversationRefs();

        messagesRef = db.ref(`messages/${conversation.id}`).limitToLast(220);
        messagesRef.on('value', (snap) => {
            const raw = snap.val() || {};
            const messages = Object.keys(raw)
                .map((id) => ({ id, ...raw[id] }))
                .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

            renderMessages(messages, { forceScrollToBottom: !hasRenderedAdminThread });
            hasRenderedAdminThread = true;

            const unreadForAdmin = messages.filter((msg) => msg.senderType !== 'admin' && !msg.seenByAdmin);
            if (unreadForAdmin.length) {
                const updates = {};
                const nowIso = new Date().toISOString();
                unreadForAdmin.forEach((msg) => {
                    updates[`messages/${conversation.id}/${msg.id}/seenByAdmin`] = true;
                    updates[`messages/${conversation.id}/${msg.id}/seenAtAdmin`] = nowIso;
                });
                updates[`conversations/${conversation.id}/unreadForAdmin`] = 0;
                db.ref().update(updates).catch(() => {});
            }
        }, (error) => {
            console.error('Error leyendo mensajes:', error);
            threadMessagesEl.innerHTML = '<p class="thread-empty">No se pudieron cargar los mensajes de esta conversacion.</p>';
        });

        conversationMetaRef = db.ref(`conversations/${conversation.id}`);
        conversationMetaRef.on('value', (snap) => {
            const meta = snap.val() || {};
            const isClosed = meta.status === 'closed';
            setThreadStatus(meta.status || 'open');
            replyInput.disabled = isClosed;
            sendBtn.disabled = isClosed;
            replyInput.placeholder = isClosed ? 'Este chat esta cerrado.' : 'Escribe una respuesta...';
        });

        visitorTypingRef = db.ref(`typing/${conversation.id}/visitor`);
        visitorTypingRef.on('value', (snap) => {
            const typing = snap.val() || {};
            setTypingHint(!!typing.isTyping);
        });

        visitorPresenceRef = db.ref(`presence/${conversation.id}/visitor`);
        visitorPresenceRef.on('value', (snap) => {
            const presence = snap.val() || {};
            const onlineText = presence.isOnline ? 'en linea' : 'desconectado';
            const name = selectedConversation ? selectedConversation.visitorName : 'Visitante';
            const contact = selectedConversation ? selectedConversation.visitorContact : 'Sin contacto';
            threadHeaderEl.textContent = `${name || 'Visitante'} · ${contact || 'Sin contacto'} · ${onlineText}`;
        });

        adminTypingRef = db.ref(`typing/${conversation.id}/admin`);
        adminPresenceRef = db.ref(`presence/${conversation.id}/admin`);
        connectedRef = db.ref('.info/connected');
        connectedRef.on('value', (snap) => {
            if (snap.val() !== true) return;
            adminPresenceRef.onDisconnect().set({
                uid: activeUid,
                isOnline: false,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            adminPresenceRef.set({
                uid: activeUid,
                isOnline: true,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            }).catch(() => {});
        });
    }

    async function sendReply(event) {
        event.preventDefault();
        if (!selectedConversation || !isAdmin) return;

        const text = String(replyInput.value || '').trim().slice(0, 420);
        if (!text) return;

        sendBtn.disabled = true;

        const nowIso = new Date().toISOString();
        const payload = {
            senderType: 'admin',
            text,
            visitorId: selectedConversation.visitorId || '',
            conversationId: selectedConversation.id,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            createdAtIso: nowIso,
            seenByAdmin: true,
            seenByVisitor: false
        };

        try {
            await db.ref(`messages/${selectedConversation.id}`).push(payload);
            await db.ref(`conversations/${selectedConversation.id}`).update({
                status: 'open',
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAtIso: nowIso,
                lastMessage: text,
                unreadForVisitor: firebase.database.ServerValue.increment(1)
            });
            replyInput.value = '';
            if (replyCharCounterEl) {
                replyCharCounterEl.textContent = '0/420';
            }
            if (adminTypingRef) {
                adminTypingRef.set({
                    isTyping: false,
                    uid: activeUid,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                }).catch(() => {});
            }
        } catch (error) {
            console.error('Error enviando respuesta admin:', error);
            alert('No se pudo enviar. Revisa reglas de messages y connection.');
        } finally {
            sendBtn.disabled = false;
        }
    }

    async function closeConversation() {
        if (!selectedConversation || !isAdmin) return;

        const nowIso = new Date().toISOString();
        closeConversationBtn.disabled = true;

        try {
            await db.ref(`conversations/${selectedConversation.id}`).update({
                status: 'closed',
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAtIso: nowIso,
                lastMessage: '[Chat cerrado por admin]'
            });
            if (adminTypingRef) {
                adminTypingRef.set({
                    isTyping: false,
                    uid: activeUid,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                }).catch(() => {});
            }
        } catch (error) {
            console.error('Error cerrando conversacion:', error);
            alert('No se pudo cerrar. Revisa reglas de conversations.');
        } finally {
            closeConversationBtn.disabled = false;
        }
    }

    async function deleteConversation() {
        if (!selectedConversation || !isAdmin) return;

        const ok = window.confirm('Se eliminara todo el historial de este chat. Esta accion no se puede deshacer.');
        if (!ok) return;

        const conversationId = selectedConversation.id;
        deleteConversationBtn.disabled = true;
        closeConversationBtn.disabled = true;
        sendBtn.disabled = true;

        try {
            const updates = {};
            updates[`messages/${conversationId}`] = null;
            updates[`typing/${conversationId}`] = null;
            updates[`presence/${conversationId}`] = null;
            updates[`conversations/${conversationId}`] = null;
            await db.ref().update(updates);

            selectedConversation = null;
            threadHeaderEl.textContent = 'Selecciona una conversacion';
            threadMessagesEl.innerHTML = '<p class="thread-empty">No hay conversacion seleccionada.</p>';
            replyInput.value = '';
            replyInput.disabled = true;
            setThreadStatus('open');
            setTypingHint(false);
            clearActiveConversationRefs();
            deleteConversationBtn.disabled = true;
            closeConversationBtn.disabled = true;
            sendBtn.disabled = true;
        } catch (error) {
            console.error('Error eliminando conversacion:', error);
            alert('No se pudo eliminar el chat. Revisa permisos en rules.');
            deleteConversationBtn.disabled = false;
            closeConversationBtn.disabled = false;
            sendBtn.disabled = false;
        }
    }

    async function loginWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await auth.signInWithPopup(provider);
        } catch (error) {
            console.error('Error login Google:', error);
            if (error && (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request')) {
                try {
                    await auth.signInWithRedirect(provider);
                } catch (redirectError) {
                    console.error('Error login redirect Google:', redirectError);
                }
            }
        }
    }

    async function loginAnon() {
        try {
            await auth.signInAnonymously();
        } catch (error) {
            console.error('Error login anonimo:', error);
        }
    }

    async function logout() {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('Error al cerrar sesion:', error);
        }
    }

    function resetSessionView() {
        selectedConversation = null;
        sendBtn.disabled = true;
        closeConversationBtn.disabled = true;
        deleteConversationBtn.disabled = true;
        replyInput.disabled = true;
        replyInput.value = '';
        replyInput.placeholder = 'Escribe una respuesta...';
        listEl.innerHTML = '<p class="thread-empty">Inicia sesion como admin para ver conversaciones.</p>';
        threadHeaderEl.textContent = 'Selecciona una conversacion';
        threadMessagesEl.innerHTML = '<p class="thread-empty">No hay conversacion seleccionada.</p>';
        setThreadStatus('open');
        setTypingHint(false);
        clearActiveConversationRefs();

        if (conversationsRef) {
            conversationsRef.off();
            conversationsRef = null;
        }
    }

    function normalizeTokenKey(token) {
        return String(token || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    async function saveAdminPushToken(token) {
        if (!activeUid || !token) return;
        const tokenKey = normalizeTokenKey(token).slice(0, 160);
        await db.ref(`admin_push_tokens/${activeUid}/${tokenKey}`).set({
            token,
            updatedAt: firebase.database.ServerValue.TIMESTAMP,
            userAgent: navigator.userAgent || ''
        });
    }

    async function ensurePwaAndMessaging() {
        if (!isAdmin) return;
        if (!('serviceWorker' in navigator)) return;

        try {
            if (!swReg) {
                swReg = await navigator.serviceWorker.register('./admin-sw.js');
            }
        } catch (error) {
            console.error('No se pudo registrar admin-sw.js:', error);
            return;
        }

        if (!firebase.messaging || !firebase.messaging.isSupported || !firebase.messaging.isSupported()) {
            return;
        }

        if (!messaging) {
            messaging = firebase.messaging();
            messaging.useServiceWorker(swReg);
            if (FCM_VAPID_PUBLIC_KEY && !FCM_VAPID_PUBLIC_KEY.startsWith('REEMPLAZA_')) {
                messaging.usePublicVapidKey(FCM_VAPID_PUBLIC_KEY);
            }
            messaging.onMessage((payload) => {
                const data = payload && payload.data ? payload.data : {};
                const notifyKey = buildAdminNotifyKey(data);
                if (notifiedAdminMessageKeys.has(notifyKey)) return;

                notifiedAdminMessageKeys.add(notifyKey);
                if (notifiedAdminMessageKeys.size > 80) {
                    const oldestKey = notifiedAdminMessageKeys.values().next().value;
                    notifiedAdminMessageKeys.delete(oldestKey);
                }

                const text = data.text || 'Nuevo mensaje del visitante';
                const conversationId = String(data.conversationId || '');
                const isActiveConversation = !!selectedConversation && selectedConversation.id === conversationId;
                if (!document.hidden && isActiveConversation) return;

                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Nuevo chat recibido', {
                        body: String(text).slice(0, 140),
                        icon: 'favicon.png',
                        tag: `chat-${conversationId || 'admin'}`,
                        renotify: false
                    });
                }
            });
        }

        try {
            if ('Notification' in window && Notification.permission === 'default') {
                await Notification.requestPermission();
            }

            if (Notification.permission !== 'granted') {
                return;
            }

            const token = await messaging.getToken();
            await saveAdminPushToken(token);
        } catch (error) {
            console.error('Error inicializando FCM admin:', error);
        }
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        if (pwaInstallBtn) pwaInstallBtn.hidden = false;
    });

    if (pwaInstallBtn) {
        pwaInstallBtn.addEventListener('click', async () => {
            if (!deferredInstallPrompt) return;
            deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice;
            deferredInstallPrompt = null;
            pwaInstallBtn.hidden = true;
        });
    }

    googleBtn.addEventListener('click', loginWithGoogle);
    anonBtn.addEventListener('click', loginAnon);
    logoutBtn.addEventListener('click', logout);
    replyForm.addEventListener('submit', sendReply);
    closeConversationBtn.addEventListener('click', closeConversation);
    deleteConversationBtn.addEventListener('click', deleteConversation);
    // Enter envia la respuesta; Shift+Enter inserta un salto de linea.
    replyInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (typeof replyForm.requestSubmit === 'function') {
                replyForm.requestSubmit();
            } else {
                replyForm.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        }
    });
    replyInput.addEventListener('input', () => {
        if (replyCharCounterEl) {
            replyCharCounterEl.textContent = `${replyInput.value.length}/420`;
        }
        if (!selectedConversation || !adminTypingRef) return;
        adminTypingRef.set({
            isTyping: replyInput.value.trim().length > 0,
            uid: activeUid,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        }).catch(() => {});

        window.clearTimeout(adminTypingTimer);
        adminTypingTimer = window.setTimeout(() => {
            if (!adminTypingRef) return;
            adminTypingRef.set({
                isTyping: false,
                uid: activeUid,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            }).catch(() => {});
        }, 1000);
    });

    copyUidBtn.addEventListener('click', async () => {
        if (!activeUid) return;
        try {
            await navigator.clipboard.writeText(activeUid);
            copyUidBtn.textContent = 'UID copiado';
            window.setTimeout(() => {
                copyUidBtn.textContent = 'Copiar UID';
            }, 1400);
        } catch (_error) {
            copyUidBtn.textContent = 'No se pudo copiar';
            window.setTimeout(() => {
                copyUidBtn.textContent = 'Copiar UID';
            }, 1400);
        }
    });

    auth.onAuthStateChanged(async (user) => {
        resetSessionView();

        if (!user) {
            activeUid = '';
            isAdmin = false;
            setAuthState('Sin sesion');
            logoutBtn.hidden = true;
            setView('login');
            return;
        }

        activeUid = user.uid;
        const provider = user.isAnonymous
            ? 'anonimo'
            : ((user.providerData && user.providerData[0] && user.providerData[0].providerId) || 'desconocido');
        currentUidEl.textContent = user.uid;
        logoutBtn.hidden = false;
        setAuthState(`UID: ${user.uid.slice(0, 10)}... · ${provider}`);
        watchAdminRole(user.uid);

        try {
            isAdmin = await checkAdmin(user.uid);
        } catch (error) {
            console.error('Error validando admin:', error);
            isAdmin = false;
        }

        if (!isAdmin) {
            listEl.innerHTML = '<p class="thread-empty">Tu cuenta no tiene permisos de admin.</p>';
            setAuthState(`UID: ${user.uid.slice(0, 10)}... · sin permisos admin`);
            setView('unauthorized');
            return;
        }

        setView('app');
        watchConversations();
        ensurePwaAndMessaging();
    });

    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((error) => {
        console.warn('No se pudo fijar persistencia LOCAL en admin auth:', error);
    });
})();
