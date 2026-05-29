// ==========================================================================
// 1. IMPORTACIONES DE FIREBASE (SDK MODERNO V10)
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ==========================================================================
// 2. CONFIGURACIÓN DE TU PROYECTO (MI-PORTAFOLIO-2BD03)
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDtiou48NFV3a3pyrGSm2eOwAKZ1zmNxo0",
    authDomain: "mi-portafolio-2bd03.firebaseapp.com",
    databaseURL: "https://mi-portafolio-2bd03-default-rtdb.firebaseio.com",
    projectId: "mi-portafolio-2bd03",
    storageBucket: "mi-portafolio-2bd03.firebasestorage.app",
    messagingSenderId: "979258790109",
    appId: "1:979258790109:web:64cd48814ad0bbc0943588",
    measurementId: "G-WE05BPDST4"
};

// Inicializar las instancias de Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);



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
    const closeBtn = document.getElementById('close-chat-btn');
    const chatForm = document.getElementById('chat-contact-form');
    const chatBody = document.getElementById('chat-body');

    if (!chatBtn || !chatWindow) return; // Control de seguridad

    let scrollTimeout;

    // A. Ocultar el botón al deslizar (Scroll) y mostrarlo al detenerse
    window.addEventListener('scroll', () => {
        chatBtn.classList.add('scroll-hide');

        // Limpiar el temporizador mientras se siga detectando movimiento
        window.clearTimeout(scrollTimeout);

        // Volver a mostrar el botón tras 350 milisegundos de inactividad
        scrollTimeout = setTimeout(() => {
            chatBtn.classList.remove('scroll-hide');
        }, 350);
    });

    // B. Abrir y Cerrar la ventana del Widget al hacer clic
    chatBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        
        // Ocultar la notificación roja (badge) una vez que el usuario abre el chat
        const badge = chatBtn.querySelector('.chat-badge');
        if (badge) badge.style.display = 'none';
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });

    // C. Captura del Formulario y Envío Directo a Firebase Realtime Database
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Extraer los valores de los inputs
            const name = document.getElementById('chat-name').value;
            const contact = document.getElementById('chat-contact').value;
            const message = document.getElementById('chat-message').value;

            // Enviar los datos directamente al nodo 'mensajes_contacto' usando la instancia 'db'
            push(ref(db, 'mensajes_contacto'), {
                nombre: name,
                contacto: contact,
                mensaje: message,
                fecha: new Date().toLocaleString("es-NI", { timeZone: "America/Managua" }) // Hora oficial de Nicaragua
            })
            .then(() => {
                console.log("¡Datos guardados con éxito en Firebase!");
            })
            .catch((error) => {
                console.error("Error crítico al guardar en la base de datos: ", error);
            });

            // Reemplazar el formulario por una animación o mensaje visual de éxito
            chatBody.innerHTML = `
                <div style="text-align: center; padding: 40px 10px;">
                    <i class="fas fa-check-circle" style="color: #10b981; font-size: 50px; margin-bottom: 15px;"></i>
                    <h5 style="font-size: 16px; margin-bottom: 10px; color: #ffffff;">¡Mensaje Recibido!</h5>
                    <p style="font-size: 13px; color: #a3a3a3; line-height: 1.6;">Gracias <strong>${name}</strong>, tus datos se guardaron en el servidor. Me pondré en contacto contigo muy pronto.</p>
                </div>
            `;

            // Auto-cerrar la pestaña del widget de forma limpia tras 3.5 segundos
            setTimeout(() => {
                chatWindow.classList.add('hidden');
            }, 3500);
        });
    }
}

// ==========================================================================
// 5. INICIALIZACIÓN CUANDO EL DOM ESTÉ COMPLETO
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    initChatWidget();
    // Aquí puedes inicializar tus otras funciones si es necesario
});