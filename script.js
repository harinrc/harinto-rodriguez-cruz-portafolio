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
    // Captura de los elementos del DOM
    const chatBtn = document.getElementById('chat-floating-btn');
    const chatWindow = document.getElementById('chat-window');
    const closeBtn = document.getElementById('close-chat-btn');
    const chatForm = document.getElementById('chat-contact-form');
    const chatBody = document.getElementById('chat-body');

    // Control de seguridad por si acaso no existen los ID en el HTML
    if (!chatBtn || !chatWindow) return; 

    let scrollTimeout;

    // 🅰️ LÓGICA DEL SCROLL: Ocultar al deslizar y aparecer al detenerse
    window.addEventListener('scroll', () => {
        // Añade la clase CSS que vuelve invisible el botón
        chatBtn.classList.add('scroll-hide');

        // Limpia el temporizador mientras la pantalla se siga moviendo
        window.clearTimeout(scrollTimeout);

        // Cuando el usuario deja de deslizar por 350ms, el botón reaparece
        scrollTimeout = setTimeout(() => {
            chatBtn.classList.remove('scroll-hide');
        }, 350);
    }, { passive: true });

    // 🅱️ INTERACTIVIDAD: Abrir y Cerrar la ventana del Widget
    chatBtn.addEventListener('click', () => {
        const isHidden = chatWindow.classList.toggle('hidden');
        document.body.classList.toggle('chat-open', !isHidden);

        const badge = chatBtn.querySelector('.chat-badge');
        if (badge) badge.style.display = !isHidden ? 'none' : 'flex';
    });

    // Cerrar el chat desde la 'X' del encabezado
    closeBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
        document.body.classList.remove('chat-open');
        const badge = chatBtn.querySelector('.chat-badge');
        if (badge) badge.style.display = 'flex';
    });

    // 💡 ENVÍO DE DATOS DIRECTO A FIREBASE (Sintaxis Clásica v8)
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Capturamos lo que escribió el cliente
            const name = document.getElementById('chat-name').value;
            const contact = document.getElementById('chat-contact').value;
            const message = document.getElementById('chat-message').value;

            // Validación para asegurar que Firebase existe antes de empujar los datos
            if (typeof firebase !== 'undefined') {
                // Guarda la información en el nodo 'mensajes_contacto'
                firebase.database().ref('mensajes_contacto').push({
                    nombre: name,
                    contacto: contact,
                    mensaje: message,
                    fecha: new Date().toLocaleString("es-NI", { timeZone: "America/Managua" }) // Hora de Nicaragua
                })
                .then(() => {
                    console.log("¡Datos guardados con éxito en la consola de Firebase!");
                })
                .catch((error) => {
                    console.error("Error directo de Firebase: ", error);
                });
            } else {
                console.error("Error: Firebase no está cargado en el HTML.");
            }

            // Animación y mensaje visual de éxito en la interfaz del usuario
            chatBody.innerHTML = `
                <div style="text-align: center; padding: 40px 10px;">
                    <i class="fas fa-check-circle" style="color: #10b981; font-size: 50px; margin-bottom: 15px;"></i>
                    <h5 style="font-size: 16px; margin-bottom: 10px; color: #ffffff;">¡Mensaje Recibido!</h5>
                    <p style="font-size: 13px; color: #a3a3a3; line-height: 1.6;">Gracias <strong>${name}</strong>, tus datos se guardaron en el servidor. Me pondré en contacto contigo muy pronto.</p>
                </div>
            `;

            // Auto-cerrar el panel del chat limpiamente tras 3.5 segundos
            setTimeout(() => {
                chatWindow.classList.add('hidden');
            }, 3500);
        });
    }
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