// Importar las funciones necesarias del SDK de Firebase para la versión modular (v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// --- CONFIGURACIÓN DE FIREBASE ---
// Tu configuración personal para conectar el juego con tu base de datos.
const firebaseConfig = {
    apiKey: "AIzaSyDLSHJNGDuW69hT9dEEpemp38Pbq0zF_LY",
    authDomain: "granja-de-gallinas-tycoon.firebaseapp.com",
    databaseURL: "https://granja-de-gallinas-tycoon-default-rtdb.firebaseio.com",
    projectId: "granja-de-gallinas-tycoon",
    storageBucket: "granja-de-gallinas-tycoon.appspot.com",
    messagingSenderId: "511126269785",
    appId: "1:511126269785:web:2f4cdb0038c905b340a648",
    measurementId: "G-G4WSJFJG9W"
};

// --- INICIALIZACIÓN Y CONSTANTES GLOBALES ---
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const USER_ID = 'player1'; // ID de jugador simple. En un juego real, esto sería dinámico.
const GAME_TICK_MS = 10000; // Producción de huevos cada 10 segundos.
const SAVE_INTERVAL_MS = 30000; // Guardado automático en la nube cada 30 segundos.
const gameRef = ref(database, 'gameState/' + USER_ID);

// Objeto que define el estado inicial de una partida nueva.
const DEFAULT_GAME_STATE = {
    gallinas: 0,
    huevos: 0,
    monedas: 10,
    capacidadCorral: 10,
    costoGallinaBase: 10,
    costoCorralBase: 100,
};

// Variable para almacenar el estado actual del juego.
let gameState = { ...DEFAULT_GAME_STATE };

// --- REFERENCIAS A ELEMENTOS DEL DOM ---
// Guardamos los elementos de la página en constantes para un acceso más rápido y eficiente.
const gallinasCountEl = document.getElementById('gallinas-count');
const huevosCountEl = document.getElementById('huevos-count');
const monedasCountEl = document.getElementById('monedas-count');
const corralEl = document.getElementById('corral');
const comprarGallinaBtn = document.getElementById('comprar-gallina-btn');
const costoGallinaEl = document.getElementById('costo-gallina');
const mejorarCorralBtn = document.getElementById('mejorar-corral-btn');
const costoCorralEl = document.getElementById('costo-corral');
const venderHuevosBtn = document.getElementById('vender-huevos-btn');
const valorVentaEl = document.getElementById('valor-venta');
const offlineModal = document.getElementById('offline-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const offlineGallinasEl = document.getElementById('offline-gallinas');
const offlineHuevosEl = document.getElementById('offline-huevos');

// --- CÁLCULOS DEL JUEGO ---
// Funciones que calculan los costos crecientes para mantener el juego balanceado.
const calcularCostoGallina = () => Math.floor(gameState.costoGallinaBase * Math.pow(1.15, gameState.gallinas));
const calcularCostoCorral = () => Math.floor(gameState.costoCorralBase * Math.pow(1.8, (gameState.capacidadCorral - 10) / 10));

// --- ACTUALIZACIÓN DE LA INTERFAZ (UI) ---
/**
 * Función central que refresca todos los elementos visuales del juego
 * con los datos del `gameState` actual.
 */
function updateUI() {
    const costoActualGallina = calcularCostoGallina();
    const costoActualCorral = calcularCostoCorral();

    gallinasCountEl.innerText = `${gameState.gallinas} / ${gameState.capacidadCorral}`;
    huevosCountEl.innerText = gameState.huevos;
    monedasCountEl.innerText = gameState.monedas;
    valorVentaEl.innerText = gameState.huevos;
    costoGallinaEl.innerText = costoActualGallina;
    costoCorralEl.innerText = costoActualCorral;

    // Lógica de feedback: Desactiva los botones si no se cumplen las condiciones.
    comprarGallinaBtn.disabled = gameState.monedas < costoActualGallina || gameState.gallinas >= gameState.capacidadCorral;
    mejorarCorralBtn.disabled = gameState.monedas < costoActualCorral;
    venderHuevosBtn.disabled = gameState.huevos === 0;

    // Se asegura de que el número de gallinas visuales coincida con el estado.
    actualizarCorralVisual();
}

/**
 * Dibuja las gallinas en el corral.
 */
function actualizarCorralVisual() {
    if (corralEl.children.length === gameState.gallinas) return; // Optimización: no redibujar si no hay cambios.
    
    corralEl.innerHTML = ''; // Limpiar el corral para redibujar.
    for (let i = 0; i < gameState.gallinas; i++) {
        const gallinaDiv = document.createElement('div');
        gallinaDiv.classList.add('chicken');
        gallinaDiv.style.left = `${Math.random() * 90}%`;
        gallinaDiv.style.top = `${Math.random() * 80}%`;
        gallinaDiv.style.animation = `peck 2.5s infinite ${Math.random() * 2.5}s`;
        corralEl.appendChild(gallinaDiv);
    }
}

// --- ACCIONES DEL JUGADOR ---

function comprarGallina() {
    const costo = calcularCostoGallina();
    if (gameState.monedas >= costo && gameState.gallinas < gameState.capacidadCorral) {
        gameState.monedas -= costo;
        gameState.gallinas++;
        showFloatingText(`+1 🐔`, comprarGallinaBtn);
        updateUI();
        saveGame();
    }
}

function mejorarCorral() {
    const costo = calcularCostoCorral();
    if (gameState.monedas >= costo) {
        gameState.monedas -= costo;
        gameState.capacidadCorral += 10;
        showFloatingText(`+10 CAP`, mejorarCorralBtn);
        updateUI();
        saveGame();
    }
}

function venderHuevos() {
    if (gameState.huevos > 0) {
        const huevosVendidos = gameState.huevos;
        gameState.monedas += huevosVendidos;
        gameState.huevos = 0;
        showFloatingText(`+${huevosVendidos} 💰`, venderHuevosBtn);
        updateUI();
        saveGame();
    }
}

// --- PERSISTENCIA DE DATOS (FIREBASE) ---

/**
 * Guarda el estado actual del juego en Firebase.
 * Incluye un timestamp del servidor para calcular el progreso offline.
 */
function saveGame() {
    const gameData = {
        ...gameState,
        lastOnline: serverTimestamp()
    };
    // set() sobrescribe los datos en la referencia, guardando la partida.
    set(gameRef, gameData);
}

/**
 * Carga el estado del juego desde Firebase al iniciar.
 * Si falla o no hay datos, inicia una partida nueva.
 */
async function loadGame() {
    try {
        const snapshot = await get(gameRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Carga los datos guardados, usando valores por defecto si alguno falta.
            Object.assign(gameState, {
                ...DEFAULT_GAME_STATE,
                ...data
            });

            // Calcular producción offline
            const lastOnline = data.lastOnline || Date.now();
            const now = Date.now();
            const secondsOffline = Math.floor((now - lastOnline) / 1000);
            
            if (secondsOffline > 10 && gameState.gallinas > 0) {
                const huevosProducidosOffline = Math.floor(secondsOffline / (GAME_TICK_MS / 1000)) * gameState.gallinas;
                if (huevosProducidosOffline > 0) {
                    gameState.huevos += huevosProducidosOffline;
                    offlineGallinasEl.innerText = gameState.gallinas;
                    offlineHuevosEl.innerText = huevosProducidosOffline;
                    offlineModal.classList.remove('hidden');
                }
            }
        } else {
             // Si no hay datos en la nube, se usa el estado por defecto.
            console.log("No se encontraron datos guardados. Empezando partida nueva.");
            gameState = { ...DEFAULT_GAME_STATE };
        }
    } catch (error) {
        console.error("Error al cargar datos desde Firebase:", error);
        alert("No se pudo conectar a la base de datos. Se iniciará una partida local.");
        gameState = { ...DEFAULT_GAME_STATE };
    }
    
    updateUI();
}

// --- EFECTOS VISUALES ---
/**
 * Muestra un texto flotante animado sobre un elemento.
 * @param {string} text El texto a mostrar (ej: "+10 💰")
 * @param {HTMLElement} element El elemento sobre el cual aparecerá el texto.
 */
function showFloatingText(text, element) {
    const floatingText = document.createElement('div');
    floatingText.classList.add('floating-text');
    floatingText.innerText = text;

    const gameContainer = document.getElementById('game-container');
    gameContainer.appendChild(floatingText);
    
    // Posiciona el texto sobre el botón que fue clickeado
    const rect = element.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();
    floatingText.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
    floatingText.style.top = `${rect.top - containerRect.top}px`;
    
    // Se auto-destruye después de que la animación termine.
    floatingText.addEventListener('animationend', () => {
        floatingText.remove();
    });
}

// --- BUCLES Y EVENTOS DE INICIO ---

// Bucle principal del juego para producción de huevos.
setInterval(() => {
    if (gameState.gallinas > 0) {
        gameState.huevos += gameState.gallinas;
        updateUI();
    }
}, GAME_TICK_MS);

// Bucle de guardado automático como respaldo.
setInterval(saveGame, SAVE_INTERVAL_MS);

// Asignar funciones a los clics de los botones.
comprarGallinaBtn.addEventListener('click', comprarGallina);
mejorarCorralBtn.addEventListener('click', mejorarCorral);
venderHuevosBtn.addEventListener('click', venderHuevos);
closeModalBtn.addEventListener('click', () => {
    offlineModal.classList.add('hidden');
});

// --- INICIO DEL JUEGO ---
// La primera acción al cargar la página es intentar cargar la partida guardada.
loadGame();