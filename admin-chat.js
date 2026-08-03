(function () {
    const stateEl = document.getElementById('admin-auth-state');
    const logoutBtn = document.getElementById('admin-logout-btn');

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
    const closeConversationBtn = document.getElementById('admin-close-conversation-btn');

    if (typeof firebase === 'undefined') {
        console.error('Firebase no esta cargado.');
        return;
    }

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
    let adminTypingTimer = null;

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

    function setView(view) {
        loginSection.hidden = view !== 'login';
        unauthorizedSection.hidden = view !== 'unauthorized';
        appSection.hidden = view !== 'app';
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
    }

    async function checkAdmin(uid) {
        const snap = await firebase.database().ref(`admins/${uid}`).once('value');
        return snap.exists() && snap.val() === true;
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
            return `
                <button type="button" class="conversation-item ${active}" data-conv-id="${item.id}">
                    <div class="conversation-title">${title}</div>
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

    function renderMessages(messages) {
        if (!messages.length) {
            threadMessagesEl.innerHTML = '<p class="thread-empty">Sin mensajes en esta conversacion.</p>';
            return;
        }

        threadMessagesEl.innerHTML = messages.map((msg) => {
            const senderType = msg.senderType === 'admin' ? 'admin' : 'visitor';
            const text = sanitize(msg.text);
            const who = senderType === 'admin' ? 'Tu' : 'Visitante';
            const seen = senderType === 'admin'
                ? (msg.seenByVisitor ? 'Leido por visitante' : 'Enviado')
                : (msg.seenByAdmin ? 'Leido por HarinRC' : 'Enviado');
            return `
                <div class="msg-row ${senderType}">
                    <div class="msg-bubble">${text}</div>
                    <span class="msg-meta">${who} · ${formatDate(msg.createdAt)} · ${seen}</span>
                </div>
            `;
        }).join('');

        threadMessagesEl.scrollTop = threadMessagesEl.scrollHeight;
    }

    function watchConversations() {
        if (conversationsRef) {
            conversationsRef.off();
        }

        conversationsRef = firebase.database().ref('conversations').orderByChild('updatedAt').limitToLast(120);
        conversationsRef.on('value', (snap) => {
            const raw = snap.val() || {};
            const items = Object.keys(raw)
                .map((id) => ({ id, ...raw[id] }))
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

            renderConversations(items);

            if (selectedConversation) {
                const fresh = items.find((it) => it.id === selectedConversation.id);
                if (fresh) {
                    selectedConversation = fresh;
                    threadHeaderEl.textContent = `${fresh.visitorName || 'Visitante'} · ${fresh.visitorContact || 'Sin contacto'}`;
                }
            }
        }, (error) => {
            console.error('Error leyendo conversaciones:', error);
        });
    }

    function openConversation(conversation) {
        selectedConversation = conversation;
        threadHeaderEl.textContent = `${conversation.visitorName || 'Visitante'} · ${conversation.visitorContact || 'Sin contacto'}`;
        sendBtn.disabled = false;
        closeConversationBtn.disabled = false;
        threadMessagesEl.innerHTML = '<p class="thread-empty">Cargando mensajes...</p>';

        setTypingHint(false);
        clearActiveConversationRefs();

        messagesRef = firebase.database().ref(`messages/${conversation.id}`).limitToLast(150);
        messagesRef.on('value', (snap) => {
            const raw = snap.val() || {};
            const messages = Object.keys(raw)
                .map((id) => ({ id, ...raw[id] }))
                .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            renderMessages(messages);

            const unreadForAdmin = messages.filter((msg) => msg.senderType !== 'admin' && !msg.seenByAdmin);
            if (unreadForAdmin.length) {
                const updates = {};
                const nowIso = new Date().toISOString();
                unreadForAdmin.forEach((msg) => {
                    updates[`messages/${conversation.id}/${msg.id}/seenByAdmin`] = true;
                    updates[`messages/${conversation.id}/${msg.id}/seenAtAdmin`] = nowIso;
                });
                firebase.database().ref().update(updates).catch(() => {});
            }
        }, (error) => {
            console.error('Error leyendo mensajes:', error);
            threadMessagesEl.innerHTML = '<p class="thread-empty">No se pudieron cargar los mensajes de esta conversacion.</p>';
        });

        conversationMetaRef = firebase.database().ref(`conversations/${conversation.id}`);
        conversationMetaRef.on('value', (snap) => {
            const meta = snap.val() || {};
            const isClosed = meta.status === 'closed';
            setThreadStatus(meta.status || 'open');
            replyInput.disabled = isClosed;
            sendBtn.disabled = isClosed;
            replyInput.placeholder = isClosed ? 'Este chat esta cerrado.' : 'Escribe una respuesta...';
        });

        visitorTypingRef = firebase.database().ref(`typing/${conversation.id}/visitor`);
        visitorTypingRef.on('value', (snap) => {
            const typing = snap.val() || {};
            setTypingHint(!!typing.isTyping);
        });

        visitorPresenceRef = firebase.database().ref(`presence/${conversation.id}/visitor`);
        visitorPresenceRef.on('value', (snap) => {
            const presence = snap.val() || {};
            const onlineText = presence.isOnline ? 'en linea' : 'desconectado';
            const name = conversation.visitorName || 'Visitante';
            const contact = conversation.visitorContact || 'Sin contacto';
            threadHeaderEl.textContent = `${name} · ${contact} · ${onlineText}`;
        });

        adminTypingRef = firebase.database().ref(`typing/${conversation.id}/admin`);
        adminPresenceRef = firebase.database().ref(`presence/${conversation.id}/admin`);
        connectedRef = firebase.database().ref('.info/connected');
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

        watchConversations();
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
            await firebase.database().ref(`messages/${selectedConversation.id}`).push(payload);
            await firebase.database().ref(`conversations/${selectedConversation.id}`).update({
                status: 'open',
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAtIso: nowIso,
                lastMessage: text
            });
            replyInput.value = '';
            if (adminTypingRef) {
                adminTypingRef.set({
                    isTyping: false,
                    uid: activeUid,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                }).catch(() => {});
            }
        } catch (error) {
            console.error('Error enviando respuesta admin:', error);
        } finally {
            sendBtn.disabled = false;
        }
    }

    async function closeConversation() {
        if (!selectedConversation || !isAdmin) return;

        const nowIso = new Date().toISOString();
        closeConversationBtn.disabled = true;

        try {
            await firebase.database().ref(`conversations/${selectedConversation.id}`).update({
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
        } finally {
            closeConversationBtn.disabled = false;
        }
    }

    async function loginWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await firebase.auth().signInWithPopup(provider);
        } catch (error) {
            console.error('Error login Google:', error);
            if (error && (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request')) {
                try {
                    await firebase.auth().signInWithRedirect(provider);
                } catch (redirectError) {
                    console.error('Error login redirect Google:', redirectError);
                }
            }
        }
    }

    async function loginAnon() {
        try {
            await firebase.auth().signInAnonymously();
        } catch (error) {
            console.error('Error login anonimo:', error);
        }
    }

    async function logout() {
        try {
            await firebase.auth().signOut();
        } catch (error) {
            console.error('Error al cerrar sesion:', error);
        }
    }

    function resetSessionView() {
        selectedConversation = null;
        sendBtn.disabled = true;
        closeConversationBtn.disabled = true;
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

    googleBtn.addEventListener('click', loginWithGoogle);
    anonBtn.addEventListener('click', loginAnon);
    logoutBtn.addEventListener('click', logout);
    replyForm.addEventListener('submit', sendReply);
    closeConversationBtn.addEventListener('click', closeConversation);
    replyInput.addEventListener('input', () => {
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

    firebase.auth().onAuthStateChanged(async (user) => {
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
        currentUidEl.textContent = user.uid;
        logoutBtn.hidden = false;
        setAuthState(`UID: ${user.uid.slice(0, 10)}...`);

        try {
            isAdmin = await checkAdmin(user.uid);
        } catch (error) {
            console.error('Error validando admin:', error);
            isAdmin = false;
        }

        if (!isAdmin) {
            setView('unauthorized');
            return;
        }

        setView('app');
        watchConversations();
    });
})();
