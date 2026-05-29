// 1. Efecto de Máquina de Escribir (Typing Effect)
const words = ["Computación y Telemática.", "Software y Sistemas.", "Redes y Conectividad."];
let i = 0;
let timer;

function typingEffect() {
    let word = words[i].split("");
    var loopTyping = function() {
        if (word.length > 0) {
            document.getElementById('typing-text').innerHTML += word.shift();
        } else {
            setTimeout(deletingEffect, 2000); // Tiempo que se queda la palabra escrita
            return false;
        }
        timer = setTimeout(loopTyping, 100); // Velocidad al escribir
    };
    loopTyping();
}

function deletingEffect() {
    let word = words[i].split("");
    var loopDeleting = function() {
        if (word.length > 0) {
            word.pop();
            document.getElementById('typing-text').innerHTML = word.join("");
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

// Iniciar el efecto cuando cargue la página
document.addEventListener("DOMContentLoaded", typingEffect);


// 2. Control del Modo Oscuro (Dark Mode)
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = themeToggleBtn.querySelector('i');

// Verificar si el usuario ya tenía una preferencia guardada
const currentTheme = localStorage.getItem('theme');
if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }
}

// Escuchar el clic en el botón de cambiar tema
themeToggleBtn.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme');
    
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        themeIcon.classList.replace('fa-sun', 'fa-moon');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }
});


// 3. Carrusel Automático con Efecto Desvanecido para Foto de Perfil
function startProfileCarousel() {
    const images = document.querySelectorAll('.profile-img');
    let currentIndex = 0;

    // Si no hay imágenes o solo hay una, no ejecuta el carrusel
    if (images.length <= 1) return;

    setInterval(() => {
        // 1. Quita la clase 'active' de la imagen actual (empieza a desvanecerse)
        images[currentIndex].classList.remove('active');

        // 2. Calcula el índice de la siguiente imagen
        currentIndex = (currentIndex + 1) % images.length;

        // 3. Añade la clase 'active' a la nueva imagen (aparece suavemente)
        images[currentIndex].classList.add('active');
    }, 4000); // Cambia la foto cada 4 segundos (puedes ajustar este tiempo)
}

// Asegurar que el carrusel inicie al cargar el documento
document.addEventListener("DOMContentLoaded", () => {
    // Si ya tenías el typingEffect, puedes llamarlo aquí o mantenerlo aparte
    startProfileCarousel();
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


// 💬 CONFIGURACIÓN GENERAL DEL WIDGET DE CHAT INTERACTIVO
function initChatWidget() {
    const chatBtn = document.getElementById('chat-floating-btn');
    const chatWindow = document.getElementById('chat-window');
    const closeBtn = document.getElementById('close-chat-btn');
    const chatForm = document.getElementById('chat-contact-form');
    const chatBody = document.getElementById('chat-body');

    let scrollTimeout;

    // 1. Ocultar botón al deslizar y mostrar al detenerse
    window.addEventListener('scroll', () => {
        chatBtn.classList.add('scroll-hide');

        window.clearTimeout(scrollTimeout);

        scrollTimeout = setTimeout(() => {
            chatBtn.classList.remove('scroll-hide');
        }, 350); // Se vuelve a mostrar tras 350ms de detener el scroll
    });

    // 2. Abrir/Cerrar la ventana del Widget
    chatBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        const badge = chatBtn.querySelector('.chat-badge');
        if (badge) badge.style.display = 'none'; // Quita la notificación al leer
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });

    // 3. Envío de datos directamente a Firebase
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('chat-name').value;
            const contact = document.getElementById('chat-contact').value;
            const message = document.getElementById('chat-message').value;

            // Enviar datos al nodo 'mensajes_contacto' en Firebase Realtime Database
            if (typeof firebase !== 'undefined') {
                firebase.database().ref('mensajes_contacto').push({
                    nombre: name,
                    contacto: contact,
                    mensaje: message,
                    fecha: new Date().toLocaleString("es-NI", { timeZone: "America/Managua" })
                })
                .then(() => {
                    console.log("Datos enviados satisfactoriamente a Firebase.");
                })
                .catch((error) => {
                    console.error("Error de Firebase: ", error);
                });
            }

            // Animación de éxito dentro del Widget
            chatBody.innerHTML = `
                <div style="text-align: center; padding: 40px 10px;">
                    <i class="fas fa-check-circle" style="color: #10b981; font-size: 50px; margin-bottom: 15px;"></i>
                    <h5 style="font-size: 16px; margin-bottom: 10px;">¡Mensaje Recibido!</h5>
                    <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6;">Gracias ${name}, tus datos se guardaron en el servidor. Revisaré la consola de Firebase para contactarte.</p>
                </div>
            `;

            // Auto cerrar el widget después de mostrar el éxito
            setTimeout(() => {
                chatWindow.classList.add('hidden');
            }, 3500);
        });
    }
}

// Inicializar el widget cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    initChatWidget();
});