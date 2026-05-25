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