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
// 4. CONFIGURACIÓN Y CONTROL DEL WIDGET DE CHAT INTERACTIVO
// ==========================================================================
function initChatWidget() {
    const chatBtn = document.getElementById('chat-floating-btn');
    const chatWindow = document.getElementById('chat-window');
    const chatForm = document.getElementById('chat-contact-form');
    const chatBody = document.getElementById('chat-body');

    // (Aquí mantienes la lógica del scroll y de abrir/cerrar que ya funciona al 100)

    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('chat-name').value;
            const contact = document.getElementById('chat-contact').value;
            const message = document.getElementById('chat-message').value;

            // 🌟 LA SINTAXIS DE ÁNGELES BEAUTY (Directa y sin vueltas)
            firebase.database().ref('mensajes_contacto').push({
                nombre: name,
                contacto: contact,
                mensaje: message,
                fecha: new Date().toLocaleString("es-NI", { timeZone: "America/Managua" })
            })
            .then(() => {
                console.log("¡Mensaje enviado de una a Firebase!");
            })
            .catch((error) => {
                console.error("Error:", error);
            });

            // Animación de éxito
            chatBody.innerHTML = `
                <div style="text-align: center; padding: 40px 10px;">
                    <i class="fas fa-check-circle" style="color: #10b981; font-size: 50px; margin-bottom: 15px;"></i>
                    <h5 style="font-size: 16px; margin-bottom: 10px; color: #ffffff;">¡Mensaje Recibido!</h5>
                    <p style="font-size: 13px; color: #a3a3a3; line-height: 1.6;">Gracias <strong>${name}</strong>, tus datos se guardaron en el servidor.</p>
                </div>
            `;

            setTimeout(() => {
                chatWindow.classList.add('hidden');
            }, 3500);
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initChatWidget();
});