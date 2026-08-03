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
            return `
                <div class="msg-row ${senderType}">
                    <div class="msg-bubble">${text}</div>
                    <span class="msg-meta">${who} · ${formatDate(msg.createdAt)}</span>
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

        if (messagesRef) {
            messagesRef.off();
        }

        messagesRef = firebase.database().ref(`messages/${conversation.id}`).limitToLast(150);
        messagesRef.on('value', (snap) => {
            const raw = snap.val() || {};
            const messages = Object.keys(raw)
                .map((id) => ({ id, ...raw[id] }))
                .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            renderMessages(messages);
        }, (error) => {
            console.error('Error leyendo mensajes:', error);
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
            createdAtIso: nowIso
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

        if (messagesRef) {
            messagesRef.off();
            messagesRef = null;
        }

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
