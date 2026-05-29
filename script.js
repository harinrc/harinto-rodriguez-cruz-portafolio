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
    });

    // 🅱️ INTERACTIVIDAD: Abrir y Cerrar la ventana del Widget
    chatBtn.addEventListener('click', () => {
        // Hace el toggle de la clase 'hidden' para mostrar/ocultar el panel
        chatWindow.classList.toggle('hidden');
        
        // Oculta la notificación roja (badge) una vez que se abre el chat
        const badge = chatBtn.querySelector('.chat-badge');
        if (badge) badge.style.display = 'none';
    });

    // Cerrar el chat desde la 'X' del encabezado
    closeBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
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
                    <p style="font-size: 13px; color: #a3a3a3; line-height: 1.6;">Gracias<strong>${name}</strong>, tus datos se guardaron en el servidor. Me pondré en contacto contigo muy pronto.</p>
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