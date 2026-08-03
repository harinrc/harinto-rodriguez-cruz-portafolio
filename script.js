// 1. Efecto de Máquina de Escribir (Typing Effect)
const words = ["Computación y Telemática.", "Software y Sistemas.", "Redes y Conectividad."];
let i = 0;
let timer;

const performanceProfile = (() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cores = navigator.hardwareConcurrency || 4;
    const hasDeviceMemory = typeof navigator.deviceMemory === 'number';
    const memory = hasDeviceMemory ? navigator.deviceMemory : null;
    const isLowEndDevice = cores <= 4 || (hasDeviceMemory && memory <= 4);

    return {
        prefersReducedMotion,
        isLowEndDevice,
        shouldReduceEffects: prefersReducedMotion || isLowEndDevice
    };
})();

function applyPerformanceMode() {
    const mode = performanceProfile.shouldReduceEffects ? 'low' : 'normal';
    document.documentElement.setAttribute('data-performance', mode);
}

function initPcbBackground() {
    const canvas = document.getElementById('pcb-background');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tracks = [];
    let pulses = [];
    let animationFrameId;
    const totalTracks = performanceProfile.shouldReduceEffects ? 22 : 45;
    const pulseSpawnThreshold = performanceProfile.shouldReduceEffects ? 0.65 : 0.2;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let lastFrameTime = 0;
    let resizeTimer;

    const getThemeColor = (name) => {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    };

    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        generateHardware();
        renderFrame();
    };

    function generateHardware() {
        tracks = [];
        pulses = [];

        for (let trackIndex = 0; trackIndex < totalTracks; trackIndex++) {
            const points = [];
            let currentX = Math.random() * canvas.width;
            let currentY = Math.random() * canvas.height;
            points.push({ x: currentX, y: currentY });

            const segments = Math.floor(Math.random() * 3) + 3;
            let currentAngle = (Math.floor(Math.random() * 8) * Math.PI) / 4;

            for (let segmentIndex = 0; segmentIndex < segments; segmentIndex++) {
                const length = Math.random() * 200 + 80;
                currentX += Math.cos(currentAngle) * length;
                currentY += Math.sin(currentAngle) * length;
                points.push({ x: currentX, y: currentY });

                const angleOptions = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2];
                currentAngle += angleOptions[Math.floor(Math.random() * angleOptions.length)];
            }

            tracks.push(points);

            if (Math.random() > pulseSpawnThreshold) {
                pulses.push({
                    trackIndex,
                    segment: 0,
                    progress: 0,
                    speed: Math.random() * 0.003 + 0.002,
                    size: Math.random() * 2 + 1.5
                });
            }
        }
    }

    const drawTrack = (track, colors) => {
        ctx.beginPath();
        ctx.moveTo(track[0].x + 2, track[0].y + 2);
        for (let pointIndex = 1; pointIndex < track.length; pointIndex++) {
            ctx.lineTo(track[pointIndex].x + 2, track[pointIndex].y + 2);
        }
        ctx.strokeStyle = colors.trackShadow;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(track[0].x, track[0].y);
        for (let pointIndex = 1; pointIndex < track.length; pointIndex++) {
            ctx.lineTo(track[pointIndex].x, track[pointIndex].y);
        }
        ctx.strokeStyle = colors.track;
        ctx.lineWidth = 3;
        ctx.stroke();

        const start = track[0];
        const end = track[track.length - 1];

        [start, end].forEach((position) => {
            ctx.beginPath();
            ctx.arc(position.x + 1, position.y + 1, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = colors.trackShadow;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(position.x, position.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = colors.node;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(position.x, position.y, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = colors.hole;
            ctx.fill();
        });
    };

    const drawPulse = (pulse, colors) => {
        const track = tracks[pulse.trackIndex];
        if (!track || pulse.segment >= track.length - 1) return;

        const pointA = track[pulse.segment];
        const pointB = track[pulse.segment + 1];
        const x = pointA.x + (pointB.x - pointA.x) * pulse.progress;
        const y = pointA.y + (pointB.y - pointA.y) * pulse.progress;

        ctx.beginPath();
        ctx.arc(x, y, pulse.size + 6, 0, Math.PI * 2);
        ctx.fillStyle = colors.pulseGlow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, pulse.size + 2, 0, Math.PI * 2);
        ctx.fillStyle = colors.pulseCore;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, pulse.size, 0, Math.PI * 2);
        ctx.fillStyle = colors.pulseHot;
        ctx.shadowBlur = performanceProfile.shouldReduceEffects ? 6 : 12;
        ctx.shadowColor = colors.pulseCore;
        ctx.fill();
        ctx.shadowBlur = 0;

        pulse.progress += pulse.speed;
        if (pulse.progress >= 1) {
            pulse.progress = 0;
            pulse.segment += 1;
            if (pulse.segment >= track.length - 1) {
                pulse.segment = 0;
                pulse.speed = Math.random() * 0.003 + 0.002;
            }
        }
    };

    function renderFrame() {
        const colors = {
            base: getThemeColor('--pcb-base'),
            trackShadow: getThemeColor('--pcb-track-shadow'),
            track: getThemeColor('--pcb-track'),
            node: getThemeColor('--pcb-node'),
            hole: getThemeColor('--pcb-hole'),
            pulseGlow: getThemeColor('--pcb-pulse-glow'),
            pulseCore: getThemeColor('--pcb-pulse-core'),
            pulseHot: getThemeColor('--pcb-pulse-hot')
        };

        ctx.fillStyle = colors.base;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        tracks.forEach((track) => drawTrack(track, colors));

        if (!prefersReducedMotion.matches) {
            pulses.forEach((pulse) => drawPulse(pulse, colors));
        }
    }

    const animate = (timestamp = 0) => {
        const minFrameTime = performanceProfile.shouldReduceEffects ? 33 : 16;
        if ((timestamp - lastFrameTime) >= minFrameTime) {
            renderFrame();
            lastFrameTime = timestamp;
        }

        if (!prefersReducedMotion.matches && !document.hidden) {
            animationFrameId = window.requestAnimationFrame(animate);
        }
    };

    const restartAnimation = () => {
        if (animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
        }
        lastFrameTime = 0;
        renderFrame();
        if (!prefersReducedMotion.matches && !document.hidden) {
            animationFrameId = window.requestAnimationFrame(animate);
        }
    };

    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resizeCanvas, performanceProfile.shouldReduceEffects ? 180 : 90);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            return;
        }

        if (!document.hidden) {
            restartAnimation();
        }
    });

    prefersReducedMotion.addEventListener('change', restartAnimation);

    const themeObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.attributeName === 'data-theme') {
                renderFrame();
                break;
            }
        }
    });

    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    resizeCanvas();
    restartAnimation();
}

function typingEffect() {
    const typingTarget = document.getElementById('typing-text');
    if (!typingTarget) return;

    let word = words[i].split("");
    var loopTyping = function() {
        if (word.length > 0) {
            typingTarget.innerHTML += word.shift();
        } else {
            setTimeout(deletingEffect, 2000); // Tiempo que se queda la palabra escrita
            return false;
        }
        timer = setTimeout(loopTyping, 100); // Velocidad al escribir
    };
    loopTyping();
}

function deletingEffect() {
    const typingTarget = document.getElementById('typing-text');
    if (!typingTarget) return;

    let word = words[i].split("");
    var loopDeleting = function() {
        if (word.length > 0) {
            word.pop();
            typingTarget.innerHTML = word.join("");
        } else {
            if (words.length > (i + 1)) {
                i++;
            } else {
                i = 0;
            }
            setTimeout(typingEffect, 500); // Tiempo antes de empezar la siguiente palabra
            return false;
        }
        timer = setTimeout(loopDeleting, 50); // Velocidad al borrar
    };
    loopDeleting();
}

function initSectionTypewriter() {
    const typingElements = Array.from(document.querySelectorAll('.js-typewriter:not(.js-typewriter-loop)'));
    if (!typingElements.length) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const playTyping = (element) => {
        if (!element || element.dataset.typed === 'true') return;

        const fullText = element.dataset.fullText || element.textContent.trim();
        element.dataset.fullText = fullText;
        element.dataset.typed = 'true';

        if (prefersReducedMotion) {
            element.textContent = fullText;
            element.classList.add('is-complete');
            return;
        }

        element.textContent = '';
        element.classList.remove('is-complete');

        let charIndex = 0;
        const typeNextChar = () => {
            if (charIndex < fullText.length) {
                element.textContent += fullText.charAt(charIndex);
                charIndex += 1;
                window.setTimeout(typeNextChar, 55);
                return;
            }

            element.classList.add('is-complete');
        };

        typeNextChar();
    };

    if (!('IntersectionObserver' in window)) {
        typingElements.forEach(playTyping);
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            playTyping(entry.target);
            obs.unobserve(entry.target);
        });
    }, {
        threshold: 0.35,
        rootMargin: '0px 0px -8% 0px'
    });

    typingElements.forEach((element) => observer.observe(element));
}

function initLoopingFooterTypewriter() {
    const loopElements = Array.from(document.querySelectorAll('.js-typewriter-loop'));
    if (!loopElements.length) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const runLoop = (element) => {
        if (!element || element.dataset.loopStarted === 'true') return;

        const fallbackText = element.dataset.fullText || element.textContent.trim();
        const phrases = (element.dataset.loopPhrases || fallbackText)
            .split('|')
            .map((phrase) => phrase.trim())
            .filter(Boolean);

        if (!phrases.length) return;

        element.dataset.fullText = phrases[0];
        element.dataset.loopStarted = 'true';

        if (prefersReducedMotion) {
            element.textContent = phrases[0];
            element.classList.add('is-complete');
            return;
        }

        element.classList.remove('is-complete');

        let phraseIndex = 0;
        let charIndex = 0;
        let isDeleting = false;

        const tick = () => {
            const currentPhrase = phrases[phraseIndex];

            if (!isDeleting) {
                charIndex += 1;
                element.textContent = currentPhrase.slice(0, charIndex);

                if (charIndex >= currentPhrase.length) {
                    isDeleting = true;
                    window.setTimeout(tick, 1700);
                    return;
                }

                window.setTimeout(tick, 55);
                return;
            }

            charIndex -= 1;
            element.textContent = currentPhrase.slice(0, Math.max(0, charIndex));

            if (charIndex <= 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                window.setTimeout(tick, 460);
                return;
            }

            window.setTimeout(tick, 38);
        };

        element.textContent = '';
        tick();
    };

    // Inicia siempre para evitar casos donde el observer no dispare en el footer.
    loopElements.forEach(runLoop);
}

// Iniciar el efecto cuando cargue la página
document.addEventListener("DOMContentLoaded", () => {
    applyPerformanceMode();
    initPcbBackground();
    typingEffect();
    initSectionTypewriter();
    initLoopingFooterTypewriter();
});


// 2. Tema fijo en modo oscuro
function enforceDarkTheme() {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
}


// 3. Carrusel Automático con Efecto Desvanecido para Foto de Perfil
function startProfileCarousel() {
    const images = document.querySelectorAll('.profile-img');
    let currentIndex = 0;

    // Si no hay imágenes o solo hay una, no ejecuta el carrusel
    if (images.length <= 1) return;

    const profileInterval = performanceProfile.shouldReduceEffects ? 7000 : 4000;

    setInterval(() => {
        // 1. Quita la clase 'active' de la imagen actual (empieza a desvanecerse)
        images[currentIndex].classList.remove('active');

        // 2. Calcula el índice de la siguiente imagen
        currentIndex = (currentIndex + 1) % images.length;

        // 3. Añade la clase 'active' a la nueva imagen (aparece suavemente)
        images[currentIndex].classList.add('active');
    }, profileInterval); // Cambia la foto automáticamente
}

// 4. Portadas dinámicas en Hero con desvanecido cada 10s
function initHeroBackgroundSlider() {
    const slides = document.querySelectorAll('.hero-bg-slide');
    if (slides.length <= 1) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
        slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === 0);
        });
        return;
    }

    let currentIndex = 0;

    const heroInterval = performanceProfile.shouldReduceEffects ? 14000 : 10000;

    window.setInterval(() => {
        slides[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % slides.length;
        slides[currentIndex].classList.add('active');
    }, heroInterval);
}

// 5. Mini carruseles por proyecto (desvanecimiento cada 3 segundos)
function startProjectImageCarousels() {
    const galleries = document.querySelectorAll('.project-img.project-gallery');

    galleries.forEach((gallery) => {
        const slides = gallery.querySelectorAll('.project-slide');
        let currentIndex = 0;
        let autoplayTimer;
        let resumeTimer;
        let isPaused = false;
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchCurrentY = 0;
        let isSwiping = false;

        if (slides.length <= 1) return;

        const baseInterval = Number(gallery.dataset.slideInterval) || 3000;
        const slideInterval = performanceProfile.shouldReduceEffects ? Math.max(4300, baseInterval + 1300) : baseInterval;
        const dotsWrapper = document.createElement('div');
        dotsWrapper.className = 'project-dots';
        dotsWrapper.setAttribute('aria-label', 'Indicadores de imágenes del proyecto');

        const dots = Array.from(slides, (_, index) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `project-dot${index === 0 ? ' active' : ''}`;
            dot.setAttribute('aria-label', `Ver imagen ${index + 1}`);

            dot.addEventListener('click', () => {
                goToSlide(index);
                pauseAutoplay();
                resumeAutoplay();
            });

            dotsWrapper.appendChild(dot);
            return dot;
        });

        gallery.appendChild(dotsWrapper);

        const goToSlide = (nextIndex) => {
            slides[currentIndex].classList.remove('active');
            dots[currentIndex].classList.remove('active');

            currentIndex = nextIndex;

            slides[currentIndex].classList.add('active');
            dots[currentIndex].classList.add('active');
        };

        const startAutoplay = () => {
            stopAutoplay();
            autoplayTimer = setInterval(() => {
                if (isPaused) return;
                const nextIndex = (currentIndex + 1) % slides.length;
                goToSlide(nextIndex);
            }, slideInterval);
        };

        const stopAutoplay = () => {
            if (autoplayTimer) {
                clearInterval(autoplayTimer);
            }
        };

        const pauseAutoplay = () => {
            isPaused = true;
            window.clearTimeout(resumeTimer);
        };

        const resumeAutoplay = () => {
            window.clearTimeout(resumeTimer);
            resumeTimer = setTimeout(() => {
                isPaused = false;
            }, 900);
        };

        const goToNextSlide = () => {
            const nextIndex = (currentIndex + 1) % slides.length;
            goToSlide(nextIndex);
        };

        const goToPrevSlide = () => {
            const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
            goToSlide(prevIndex);
        };

        const handleSwipe = () => {
            const deltaX = touchEndX - touchStartX;
            const deltaY = Math.abs(touchStartY - touchCurrentY);
            const swipeThreshold = 35;

            if (Math.abs(deltaX) < swipeThreshold || deltaY > 70) {
                return;
            }

            if (deltaX < 0) {
                goToNextSlide();
            } else {
                goToPrevSlide();
            }
        };

        gallery.addEventListener('mouseenter', pauseAutoplay);
        gallery.addEventListener('mouseleave', resumeAutoplay);
        gallery.addEventListener('focusin', pauseAutoplay);
        gallery.addEventListener('focusout', resumeAutoplay);

        gallery.addEventListener('touchstart', (event) => {
            const touch = event.changedTouches[0];
            touchStartX = touch.clientX;
            touchEndX = touch.clientX;
            touchStartY = touch.clientY;
            touchCurrentY = touch.clientY;
            isSwiping = true;
            pauseAutoplay();
        }, { passive: true });

        gallery.addEventListener('touchmove', (event) => {
            if (!isSwiping) return;
            const touch = event.changedTouches[0];
            touchEndX = touch.clientX;
            touchCurrentY = touch.clientY;
        }, { passive: true });

        gallery.addEventListener('touchend', (event) => {
            if (!isSwiping) return;

            const touch = event.changedTouches[0];
            touchEndX = touch.clientX;
            touchCurrentY = touch.clientY;

            handleSwipe();
            isSwiping = false;
            resumeAutoplay();
        }, { passive: true });

        gallery.addEventListener('touchcancel', () => {
            isSwiping = false;
            resumeAutoplay();
        }, { passive: true });

        startAutoplay();
    });
}

// Asegurar que el carrusel inicie al cargar el documento
document.addEventListener("DOMContentLoaded", () => {
    // Si ya tenías el typingEffect, puedes llamarlo aquí o mantenerlo aparte
    enforceDarkTheme();
    initHeroBackgroundSlider();
    startProfileCarousel();
    startProjectImageCarousels();
});

// 📱 Lógica para abrir y cerrar el Menú de Hamburguesa en Móviles
function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            // Alterna la clase 'active' para mostrar u ocultar el menú
            navLinks.classList.toggle('active');
            
            // Cambia el icono de barras por una "X" al abrirse
            const icon = menuBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.className = 'fas fa-times';
            } else {
                icon.className = 'fas fa-bars';
            }
        });

        // Cierra el menú automáticamente cuando el usuario hace clic en una opción (Inicio, Proyectos, etc.)
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                menuBtn.querySelector('i').className = 'fas fa-bars';
            });
        });
    }
}

// Inicializar al cargar el portafolio
document.addEventListener("DOMContentLoaded", () => {
    initMobileMenu();
});



// ==========================================================================
// 1. CONFIGURACIÓN Y CONTROL DEL WIDGET DE CHAT INTERACTIVO
// ==========================================================================
function initChatWidget() {
    const chatBtn = document.getElementById('chat-floating-btn');
    const chatWindow = document.getElementById('chat-window');
    const closeBtn = document.getElementById('close-chat-btn');
    const chatBody = document.getElementById('chat-body');
    const badge = chatBtn ? chatBtn.querySelector('.chat-badge') : null;

    if (!chatBtn || !chatWindow || !chatBody) return;
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
        console.error('Firebase no esta inicializado para el widget de chat.');
        return;
    }

    const VISITOR_APP_NAME = 'harinrc-visitor-chat-app';
    let visitorApp;
    try {
        visitorApp = firebase.apps.find((app) => app.name === VISITOR_APP_NAME)
            || firebase.initializeApp(firebase.app().options, VISITOR_APP_NAME);
    } catch (error) {
        console.warn('No se pudo inicializar app secundaria de Firebase, se usara app por defecto:', error);
        visitorApp = firebase.app();
    }

    const db = visitorApp.database();
    const auth = visitorApp.auth();

    const CHAT_STORAGE_KEY = 'harinrc_chat_conversation_v1';
    const CHAT_VISITOR_KEY = 'harinrc_chat_visitor_v1';
    const CHAT_PROFILE_KEY = 'harinrc_chat_profile_v1';
    const MAX_MESSAGE_LENGTH = 420;

    let scrollTimeout;
    let activeConversationId = window.localStorage.getItem(CHAT_STORAGE_KEY) || '';
    let activeVisitorId = window.localStorage.getItem(CHAT_VISITOR_KEY) || '';
    let activeProfile = { name: '', contact: '' };
    let messagesRef = null;
    let conversationMetaRef = null;
    let adminTypingRef = null;
    let adminPresenceRef = null;
    let visitorTypingRef = null;
    let visitorPresenceRef = null;
    let visitorMessagingRef = null;
    let visitorSwReg = null;
    let lastSendAt = 0;
    let currentAuthUid = '';
    let authInitError = null;
    let unreadAdminCount = 0;
    let notificationPermissionRequested = false;
    let conversationRecoveryAttempted = false;
    const VISITOR_VAPID_PUBLIC_KEY = 'REEMPLAZA_CON_TU_VAPID_KEY_PUBLICA';

    const getAuthUid = () => {
        const currentUser = auth.currentUser;
        return currentUser && currentUser.uid ? currentUser.uid : '';
    };

    const authReadyPromise = (() => {
        if (!auth) {
            return Promise.resolve(null);
        }

        const tryAnonSignIn = () => auth.signInAnonymously();

        return auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .catch((persistenceError) => {
                // En algunos navegadores privados LOCAL puede fallar; intentamos seguir con sign-in.
                console.warn('No se pudo aplicar persistencia LOCAL en Firebase Auth:', persistenceError);
                return null;
            })
            .then(() => tryAnonSignIn())
            .then((credential) => {
                authInitError = null;
                currentAuthUid = (credential && credential.user && credential.user.uid) ? credential.user.uid : getAuthUid();

                auth.onAuthStateChanged((user) => {
                    currentAuthUid = user && user.uid ? user.uid : '';
                });

                return credential;
            })
            .catch((error) => {
                authInitError = error || null;
                console.error('No se pudo iniciar sesión anónima en Firebase Auth:', error);
                return null;
            });
    })();

    const ensureAuthenticatedVisitorUid = async () => {
        await authReadyPromise;
        const authUid = getAuthUid() || currentAuthUid;
        if (authUid) {
            currentAuthUid = authUid;
            activeVisitorId = authUid;
            window.localStorage.setItem(CHAT_VISITOR_KEY, activeVisitorId);
            return authUid;
        }

        const detail = authInitError && authInitError.code
            ? ` (${authInitError.code})`
            : '';
        throw new Error(`No hay sesión anónima de Firebase Auth${detail}`);
    };

    try {
        const rawProfile = window.localStorage.getItem(CHAT_PROFILE_KEY);
        if (rawProfile) {
            const parsedProfile = JSON.parse(rawProfile);
            activeProfile.name = String(parsedProfile.name || '');
            activeProfile.contact = String(parsedProfile.contact || '');
        }
    } catch (_error) {
        activeProfile = { name: '', contact: '' };
    }

    const sanitizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

    const normalizeTokenKey = (token) => String(token || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 160);

    const saveVisitorPushToken = async (visitorId, token) => {
        if (!visitorId || !token) return;
        const tokenKey = normalizeTokenKey(token);
        await db.ref(`visitor_push_tokens/${visitorId}/${tokenKey}`).set({
            token,
            updatedAt: firebase.database.ServerValue.TIMESTAMP,
            userAgent: navigator.userAgent || ''
        });
    };

    const ensureVisitorMessaging = async (visitorId) => {
        if (!visitorId) return;
        if (!('serviceWorker' in navigator)) return;
        if (!firebase.messaging || !firebase.messaging.isSupported || !firebase.messaging.isSupported()) return;

        try {
            if (!visitorSwReg) {
                visitorSwReg = await navigator.serviceWorker.register('./admin-sw.js');
            }

            if (!visitorMessagingRef) {
                visitorMessagingRef = firebase.messaging();
                visitorMessagingRef.useServiceWorker(visitorSwReg);
                if (VISITOR_VAPID_PUBLIC_KEY && !VISITOR_VAPID_PUBLIC_KEY.startsWith('REEMPLAZA_')) {
                    visitorMessagingRef.usePublicVapidKey(VISITOR_VAPID_PUBLIC_KEY);
                }
            }

            if ('Notification' in window && Notification.permission === 'default') {
                await Notification.requestPermission();
            }

            if (!('Notification' in window) || Notification.permission !== 'granted') return;

            const token = await visitorMessagingRef.getToken();
            await saveVisitorPushToken(visitorId, token);
        } catch (error) {
            console.error('No se pudo registrar push para visitante:', error);
        }
    };

    const updateBadge = () => {
        if (!badge) return;
        if (unreadAdminCount <= 0) {
            badge.textContent = '1';
            badge.style.display = chatWindow.classList.contains('hidden') ? 'flex' : 'none';
            return;
        }

        badge.textContent = String(Math.min(unreadAdminCount, 99));
        badge.style.display = 'flex';
    };

    const playNotificationTone = () => {
        try {
            const AudioContextRef = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextRef) return;
            const ctx = new AudioContextRef();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = 820;
            gain.gain.value = 0.001;

            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;
            gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

            osc.start(now);
            osc.stop(now + 0.24);
        } catch (_error) {
            // Ignorar errores de audio en navegadores restringidos.
        }
    };

    const maybeNotifyAdminReply = (text) => {
        const canNotify = document.hidden || chatWindow.classList.contains('hidden');
        if (!canNotify) return;

        unreadAdminCount += 1;
        updateBadge();
        playNotificationTone();

        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            const body = String(text || 'Tienes una nueva respuesta en tu chat.').slice(0, 140);
            new Notification('HarinRC respondió', {
                body,
                icon: 'favicon.png'
            });
        }
    };

    const requestNotificationPermission = () => {
        if (notificationPermissionRequested) return;
        notificationPermissionRequested = true;
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
    };

    const clearRealtimeRefs = () => {
        if (messagesRef) {
            messagesRef.off();
            messagesRef = null;
        }
        if (conversationMetaRef) {
            conversationMetaRef.off();
            conversationMetaRef = null;
        }
        if (adminTypingRef) {
            adminTypingRef.off();
            adminTypingRef = null;
        }
        if (adminPresenceRef) {
            adminPresenceRef.off();
            adminPresenceRef = null;
        }
        if (visitorTypingRef) {
            visitorTypingRef.off();
            visitorTypingRef = null;
        }
        if (visitorPresenceRef) {
            visitorPresenceRef.off();
            visitorPresenceRef = null;
        }
    };

    const applyConversationStatus = (status) => {
        const input = document.getElementById('chat-live-message');
        const sendBtn = document.getElementById('chat-send-btn');
        const statusLabel = document.getElementById('chat-status-label');
        const isClosed = status === 'closed';

        if (statusLabel) {
            statusLabel.textContent = isClosed
                ? 'Chat cerrado por HarinRC. Puedes enviar un nuevo primer mensaje para abrir otro chat.'
                : 'Chat en linea con HarinRC.';
            statusLabel.classList.toggle('closed', isClosed);
        }

        if (input) {
            input.disabled = isClosed;
            input.placeholder = isClosed ? 'Este chat esta cerrado.' : 'Escribe tu mensaje...';
        }
        if (sendBtn) {
            sendBtn.disabled = isClosed;
        }
    };

    const setPresenceStatus = (isOnline) => {
        const dot = document.querySelector('.profile-status');
        const heading = document.querySelector('.chat-header h4');
        if (dot) {
            dot.classList.toggle('online', !!isOnline);
            dot.classList.toggle('offline', !isOnline);
        }
        if (heading) {
            heading.textContent = isOnline
                ? 'Contacto Directo | HarinRC (Activo)'
                : 'Contacto Directo | HarinRC (Desconectado)';
        }
    };

    const ensureVisitorId = () => {
        const authUid = currentAuthUid || getAuthUid();
        if (authUid) {
            activeVisitorId = authUid;
            window.localStorage.setItem(CHAT_VISITOR_KEY, activeVisitorId);
            return activeVisitorId;
        }

        if (activeVisitorId) return activeVisitorId;
        const randomId = (window.crypto && window.crypto.randomUUID)
            ? window.crypto.randomUUID()
            : `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        activeVisitorId = randomId;
        window.localStorage.setItem(CHAT_VISITOR_KEY, activeVisitorId);
        return activeVisitorId;
    };

    const ensureConversationId = () => {
        if (activeConversationId) return activeConversationId;
        const randomId = (window.crypto && window.crypto.randomUUID)
            ? window.crypto.randomUUID()
            : `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        activeConversationId = randomId;
        window.localStorage.setItem(CHAT_STORAGE_KEY, activeConversationId);
        return activeConversationId;
    };

    const formatClock = (timestamp) => {
        if (!timestamp) return '--:--';
        try {
            return new Date(timestamp).toLocaleTimeString('es-NI', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Managua'
            });
        } catch (_error) {
            return '--:--';
        }
    };

    const renderEntryForm = () => {
        chatBody.innerHTML = `
            <p class="chat-welcome">👋 ¡Hola! Déjame tus datos para abrir el chat y responderte en tiempo real.</p>
            <form id="chat-contact-form">
                <div class="chat-input-group">
                    <label><i class="fas fa-user"></i> Nombre</label>
                    <input type="text" id="chat-name" required maxlength="70" placeholder="Tu nombre o empresa" value="${activeProfile.name.replace(/"/g, '&quot;')}">
                </div>
                <div class="chat-input-group">
                    <label><i class="fas fa-envelope"></i> Correo o Teléfono</label>
                    <input type="text" id="chat-contact" required maxlength="100" placeholder="Ej: nombre@correo.com o celular" value="${activeProfile.contact.replace(/"/g, '&quot;')}">
                </div>
                <div class="chat-input-group">
                    <label><i class="fas fa-code"></i> Primer mensaje</label>
                    <textarea id="chat-message" required maxlength="${MAX_MESSAGE_LENGTH}" placeholder="Describe brevemente lo que necesitas..."></textarea>
                </div>
                <button type="submit" class="chat-submit-btn">Iniciar Chat</button>
            </form>
        `;

        const chatForm = document.getElementById('chat-contact-form');
        if (!chatForm) return;

        chatForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const nameInput = document.getElementById('chat-name');
            const contactInput = document.getElementById('chat-contact');
            const messageInput = document.getElementById('chat-message');

            if (!nameInput || !contactInput || !messageInput) return;
            if (typeof firebase === 'undefined') {
                console.error('Firebase no está disponible en el cliente.');
                return;
            }

            const name = sanitizeText(nameInput.value);
            const contact = sanitizeText(contactInput.value);
            const message = sanitizeText(messageInput.value).slice(0, MAX_MESSAGE_LENGTH);

            if (!name || !contact || !message) return;

            activeProfile = { name, contact };
            window.localStorage.setItem(CHAT_PROFILE_KEY, JSON.stringify(activeProfile));

            const conversationId = ensureConversationId();
            const nowIso = new Date().toISOString();

            const submitButton = chatForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;

            let verifiedVisitorId = '';
            try {
                verifiedVisitorId = await ensureAuthenticatedVisitorUid();
            } catch (authError) {
                if (submitButton) submitButton.disabled = false;
                console.error('No fue posible autenticar visitante para iniciar el chat:', authError);
                alert('No se pudo iniciar el chat porque Firebase Auth no está lista. Activa Authentication > Sign-in method > Anonymous y vuelve a intentar.');
                return;
            }

            const conversationPayload = {
                conversationId,
                visitorId: verifiedVisitorId,
                visitorName: name,
                visitorContact: contact,
                status: 'open',
                source: 'web_portfolio_widget',
                createdAtIso: nowIso,
                updatedAtIso: nowIso,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                lastMessage: '',
                unreadForAdmin: 0,
                unreadForVisitor: 0
            };

            const messagePayload = {
                senderType: 'visitor',
                text: message,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                createdAtIso: nowIso,
                visitorId: verifiedVisitorId,
                conversationId,
                seenByAdmin: false,
                seenByVisitor: true
            };

            db.ref(`conversations/${conversationId}`).set(conversationPayload)
                .then(() => db.ref(`messages/${conversationId}`).push(messagePayload))
                .then(() => db.ref(`conversations/${conversationId}`).update({
                    lastMessage: message,
                    status: 'open',
                    updatedAt: firebase.database.ServerValue.TIMESTAMP,
                    updatedAtIso: nowIso,
                    unreadForAdmin: firebase.database.ServerValue.increment(1)
                }))
                .then(() => db.ref('mensajes_contacto').push({
                    nombre: name,
                    contacto: contact,
                    mensaje: message,
                    conversationId,
                    fecha: new Date().toLocaleString('es-NI', { timeZone: 'America/Managua' })
                }))
                .then(() => {
                ensureVisitorMessaging(verifiedVisitorId);
                mountConversationView(conversationId);
            }).catch((error) => {
                console.error('Error al iniciar chat:', error);
                if (error && String(error.code || '').toLowerCase().includes('permission_denied')) {
                    alert('Firebase rechazó el guardado por reglas (permission_denied). Verifica que las reglas publicadas sean las nuevas y que Anonymous Auth esté activo.');
                }
                if (submitButton) submitButton.disabled = false;
            });
        });
    };

    const renderMessages = (messagesList = []) => {
        const thread = document.getElementById('chat-thread');
        if (!thread) return;

        if (!messagesList.length) {
            thread.innerHTML = '<p class="chat-empty">Aun no hay mensajes. Escribe para iniciar la conversacion.</p>';
            return;
        }

        thread.innerHTML = messagesList.map((entry) => {
            const isVisitor = entry.senderType !== 'admin';
            const sideClass = isVisitor ? 'visitor' : 'admin';
            const safeText = String(entry.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const seenLabel = !isVisitor
                ? (entry.seenByVisitor ? 'Leido' : 'Enviado')
                : (entry.seenByAdmin ? 'Leido por HarinRC' : 'Enviado');

            return `
                <div class="chat-message ${sideClass}">
                    <div class="chat-message-bubble">${safeText}</div>
                    <span class="chat-message-time">${formatClock(entry.createdAt)} · ${seenLabel}</span>
                </div>
            `;
        }).join('');

        thread.scrollTop = thread.scrollHeight;
    };

    const subscribeConversationMessages = (conversationId) => {
        if (messagesRef) {
            messagesRef.off();
        }

        messagesRef = db.ref(`messages/${conversationId}`).limitToLast(80);
        messagesRef.on('value', (snapshot) => {
            conversationRecoveryAttempted = false;
            const rawMessages = snapshot.val() || {};
            const list = Object.keys(rawMessages)
                .map((key) => ({ id: key, ...rawMessages[key] }))
                .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            renderMessages(list);

            const adminUnread = list.filter((entry) => entry.senderType === 'admin' && !entry.seenByVisitor);
            if (adminUnread.length) {
                const updates = {};
                const nowIso = new Date().toISOString();
                adminUnread.forEach((entry) => {
                    updates[`messages/${conversationId}/${entry.id}/seenByVisitor`] = true;
                    updates[`messages/${conversationId}/${entry.id}/seenAtVisitor`] = nowIso;
                });
                updates[`conversations/${conversationId}/unreadForVisitor`] = 0;
                db.ref().update(updates).catch(() => {});

                const latest = adminUnread[adminUnread.length - 1];
                maybeNotifyAdminReply(latest.text || 'Nueva respuesta');
            }
        }, (error) => {
            const errorCode = error && error.code ? String(error.code).toLowerCase() : '';
            if (!errorCode.includes('permission_denied')) {
                console.error('Error al leer mensajes del chat:', error);
                return;
            }

            if (!conversationRecoveryAttempted) {
                conversationRecoveryAttempted = true;
                ensureAuthenticatedVisitorUid()
                    .then(() => {
                        subscribeConversationMessages(conversationId);
                    })
                    .catch((recoveryError) => {
                        console.error('No fue posible recuperar sesión de chat:', recoveryError);
                    });
                return;
            }

            if (messagesRef) {
                messagesRef.off();
                messagesRef = null;
            }

            clearRealtimeRefs();

            activeConversationId = '';
            window.localStorage.removeItem(CHAT_STORAGE_KEY);
            window.localStorage.removeItem(CHAT_VISITOR_KEY);
            renderEntryForm();
        });
    };

    const mountConversationView = (conversationId) => {
        clearRealtimeRefs();

        chatBody.innerHTML = `
            <p class="chat-welcome">💬 Chat activo. Este historial se mantiene para este navegador.</p>
            <p id="chat-status-label" class="chat-status-label">Chat en linea con HarinRC.</p>
            <p id="chat-typing-indicator" class="chat-typing-indicator" hidden>HarinRC esta escribiendo...</p>
            <div id="chat-thread" class="chat-thread" aria-live="polite"></div>
            <form id="chat-live-form" class="chat-live-form">
                <div class="chat-input-group">
                    <label><i class="fas fa-paper-plane"></i> Mensaje</label>
                    <textarea id="chat-live-message" maxlength="${MAX_MESSAGE_LENGTH}" required placeholder="Escribe tu mensaje..."></textarea>
                </div>
                <button id="chat-send-btn" type="submit" class="chat-submit-btn">Enviar Mensaje</button>
            </form>
        `;

        const liveForm = document.getElementById('chat-live-form');
        const liveMessage = document.getElementById('chat-live-message');
        const typingIndicator = document.getElementById('chat-typing-indicator');
        if (!liveForm || !liveMessage) return;

        unreadAdminCount = 0;
        updateBadge();

        const visitorId = ensureVisitorId();
        ensureVisitorMessaging(visitorId);
        const connectedRef = db.ref('.info/connected');
        visitorPresenceRef = db.ref(`presence/${conversationId}/visitor`);
        connectedRef.on('value', (snap) => {
            if (snap.val() !== true) return;
            visitorPresenceRef.onDisconnect().set({
                uid: visitorId,
                isOnline: false,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });

            visitorPresenceRef.set({
                uid: visitorId,
                isOnline: true,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            }).catch(() => {});
        });

        visitorTypingRef = db.ref(`typing/${conversationId}/visitor`);
        adminTypingRef = db.ref(`typing/${conversationId}/admin`);
        adminPresenceRef = db.ref(`presence/${conversationId}/admin`);
        conversationMetaRef = db.ref(`conversations/${conversationId}`);

        adminTypingRef.on('value', (snap) => {
            const val = snap.val() || {};
            if (!typingIndicator) return;
            typingIndicator.hidden = !val.isTyping;
        });

        adminPresenceRef.on('value', (snap) => {
            const val = snap.val() || {};
            setPresenceStatus(!!val.isOnline);
        });

        conversationMetaRef.on('value', (snap) => {
            const conv = snap.val() || {};
            applyConversationStatus(conv.status || 'open');
        });

        subscribeConversationMessages(conversationId);

        let typingTimer;
        liveMessage.addEventListener('input', () => {
            visitorTypingRef.set({
                isTyping: liveMessage.value.trim().length > 0,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                uid: visitorId
            }).catch(() => {});

            window.clearTimeout(typingTimer);
            typingTimer = window.setTimeout(() => {
                visitorTypingRef.set({
                    isTyping: false,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP,
                    uid: visitorId
                }).catch(() => {});
            }, 1000);
        });

        liveForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (typeof firebase === 'undefined') return;

            const now = Date.now();
            if (now - lastSendAt < 900) return;

            const text = sanitizeText(liveMessage.value).slice(0, MAX_MESSAGE_LENGTH);
            if (!text) return;

            lastSendAt = now;
            const nowIso = new Date().toISOString();

            const sendButton = liveForm.querySelector('button[type="submit"]');
            if (sendButton) sendButton.disabled = true;

            let verifiedVisitorId = '';
            try {
                verifiedVisitorId = await ensureAuthenticatedVisitorUid();
            } catch (authError) {
                if (sendButton) sendButton.disabled = false;
                console.error('No fue posible autenticar visitante para enviar mensajes:', authError);
                alert('No se pudo enviar porque Firebase Auth no está lista. Activa Authentication > Sign-in method > Anonymous y vuelve a intentar.');
                return;
            }

            const payload = {
                senderType: 'visitor',
                text,
                visitorId: verifiedVisitorId,
                conversationId,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                createdAtIso: nowIso,
                seenByAdmin: false,
                seenByVisitor: true
            };

            db.ref(`messages/${conversationId}`).push(payload)
                .then(() => db.ref(`conversations/${conversationId}`).update({
                    updatedAt: firebase.database.ServerValue.TIMESTAMP,
                    updatedAtIso: nowIso,
                    lastMessage: text,
                    status: 'open',
                    unreadForAdmin: firebase.database.ServerValue.increment(1)
                }))
                .then(() => {
                liveMessage.value = '';
                visitorTypingRef.set({
                    isTyping: false,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP,
                    uid: verifiedVisitorId
                }).catch(() => {});
                if (sendButton) sendButton.disabled = false;
            }).catch((error) => {
                console.error('Error al enviar mensaje:', error);
                if (error && String(error.code || '').toLowerCase().includes('permission_denied')) {
                    alert('Firebase rechazó el mensaje por reglas (permission_denied). Verifica reglas publicadas y sesión anónima activa.');
                }
                if (sendButton) sendButton.disabled = false;
            });
        });
    };

    window.addEventListener('scroll', () => {
        chatBtn.classList.add('scroll-hide');
        window.clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            chatBtn.classList.remove('scroll-hide');
        }, 350);
    }, { passive: true });

    chatBtn.addEventListener('click', () => {
        requestNotificationPermission();
        const isHidden = chatWindow.classList.toggle('hidden');
        document.body.classList.toggle('chat-open', !isHidden);
        if (!isHidden) {
            unreadAdminCount = 0;
            updateBadge();
        } else if (badge) {
            updateBadge();
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            chatWindow.classList.add('hidden');
            document.body.classList.remove('chat-open');
            updateBadge();
        });
    }

    authReadyPromise.finally(() => {
        if (!activeVisitorId) ensureVisitorId();

        if (activeConversationId && typeof firebase !== 'undefined') {
            mountConversationView(activeConversationId);
            return;
        }

        renderEntryForm();
    });
}

// ==========================================================================
// 2. INICIALIZACIÓN CUANDO LA PÁGINA ESTÉ TOTALMENTE CARGADA
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    initChatWidget();
    // Aquí abajo puedes poner las inicializaciones de tus otras funciones si las tienes
});

// ==========================================================================
// 3. CARRUSEL SUAVE DE GALERÍA
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    const galleryCarousel = document.querySelector('.gallery-carousel');

    if (!galleryCarousel) return;

    const galleryCards = Array.from(galleryCarousel.querySelectorAll('.gallery-link'));
    if (galleryCards.length < 2) return;

    let currentIndex = 0;
    let autoScrollTimer;
    let resumeTimer;
    let isPaused = false;
    let isUserInteracting = false;

    const scrollToCard = (index) => {
        const targetCard = galleryCards[index];
        if (!targetCard) return;

        galleryCarousel.scrollTo({
            left: targetCard.offsetLeft - galleryCarousel.offsetLeft,
            behavior: performanceProfile.shouldReduceEffects ? 'auto' : 'smooth'
        });
    };

    const getClosestCardIndex = () => {
        const carouselCenter = galleryCarousel.scrollLeft + (galleryCarousel.clientWidth / 2);
        let closestIndex = 0;
        let closestDistance = Infinity;

        galleryCards.forEach((card, index) => {
            const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
            const distance = Math.abs(cardCenter - carouselCenter);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        return closestIndex;
    };

    const startAutoScroll = () => {
        stopAutoScroll();
        autoScrollTimer = setInterval(() => {
            if (isPaused || isUserInteracting) return;

            currentIndex = (currentIndex + 1) % galleryCards.length;
            scrollToCard(currentIndex);
        }, performanceProfile.shouldReduceEffects ? 7000 : 5200);
    };

    const stopAutoScroll = () => {
        if (autoScrollTimer) {
            clearInterval(autoScrollTimer);
        }
    };

    const pauseAutoScroll = () => {
        isPaused = true;
        window.clearTimeout(resumeTimer);
    };

    const resumeAutoScroll = () => {
        window.clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
            isPaused = false;
            currentIndex = getClosestCardIndex();
            startAutoScroll();
        }, 1200);
    };

    galleryCarousel.addEventListener('pointerdown', () => {
        isUserInteracting = true;
        pauseAutoScroll();
    });

    window.addEventListener('pointerup', () => {
        if (!isUserInteracting) return;
        isUserInteracting = false;
        resumeAutoScroll();
    });

    galleryCarousel.addEventListener('scroll', () => {
        if (isUserInteracting) return;
        pauseAutoScroll();
        resumeAutoScroll();
    });

    galleryCarousel.addEventListener('mouseenter', () => {
        pauseAutoScroll();
    });

    galleryCarousel.addEventListener('mouseleave', () => {
        resumeAutoScroll();
    });

    galleryCarousel.addEventListener('touchstart', () => {
        isUserInteracting = true;
        pauseAutoScroll();
    }, { passive: true });

    galleryCarousel.addEventListener('touchend', () => {
        isUserInteracting = false;
        resumeAutoScroll();
    }, { passive: true });

    galleryCarousel.addEventListener('focusin', () => {
        pauseAutoScroll();
    });

    galleryCarousel.addEventListener('focusout', () => {
        resumeAutoScroll();
    });

    startAutoScroll();
});