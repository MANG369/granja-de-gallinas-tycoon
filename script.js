// Importar las funciones necesarias del SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Tu configuración de Firebase que proporcionaste
const firebaseConfig = {
    apiKey: "AIzaSyDLSHJNGDuW69hT9dEEpemp38Pbq0zF_LY",
    authDomain: "granja-de-gallinas-tycoon.firebaseapp.com",
    databaseURL: "https://granja-de-gallinas-tycoon-default-rtdb.firebaseio.com",
    projectId: "granja-de-gallinas-tycoon",
    storageBucket: "granja-de-gallinas-tycoon.appspot.com", // Corregido: .appspot.com
    messagingSenderId: "511126269785",
    appId: "1:511126269785:web:2f4cdb0038c905b340a648",
    measurementId: "G-G4WSJFJG9W"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// --- VARIABLES DEL JUEGO ---
let gameState = {
    gallinas: 0,
    huevos: 0,
    monedas: 10,
    capacidadCorral: 10,
    costoGallinaBase: 10,
    costoCorralBase: 100,
};

// --- REFERENCIAS A ELEMENTOS DEL DOM ---
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

// Modal de progreso offline
const offlineModal = document.getElementById('offline-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const offlineGallinasEl = document.getElementById('offline-gallinas');
const offlineHuevosEl = document.getElementById('offline-huevos');

// --- LÓGICA DE COSTOS ---
const calcularCostoGallina = () => Math.floor(gameState.costoGallinaBase * Math.pow(1.15, gameState.gallinas));
const calcularCostoCorral = () => Math.floor(gameState.costoCorralBase * Math.pow(1.8, (gameState.capacidadCorral - 10) / 10));

// --- FUNCIONES PRINCIPALES ---

function updateUI() {
    const costoActualGallina = calcularCostoGallina();
    const costoActualCorral = calcularCostoCorral();

    gallinasCountEl.innerText = `${gameState.gallinas} / ${gameState.capacidadCorral}`;
    huevosCountEl.innerText = gameState.huevos;
    monedasCountEl.innerText = gameState.monedas;
    valorVentaEl.innerText = gameState.huevos;
    costoGallinaEl.innerText = costoActualGallina;
    costoCorralEl.innerText = costoActualCorral;

    // Lógica para desactivar botones si no hay dinero
    comprarGallinaBtn.disabled = gameState.monedas < costoActualGallina || gameState.gallinas >= gameState.capacidadCorral;
    mejorarCorralBtn.disabled = gameState.monedas < costoActualCorral;
    venderHuevosBtn.disabled = gameState.huevos === 0;

    // Actualizar visualmente las gallinas en el corral
    actualizarCorralVisual();
}

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

function actualizarCorralVisual() {
    corralEl.innerHTML = ''; // Limpiar el corral
    for (let i = 0; i < gameState.gallinas; i++) {
        const gallinaDiv = document.createElement('div');
        gallinaDiv.classList.add('chicken');
        // Posicionar aleatoriamente para que no estén todas en el mismo sitio
        gallinaDiv.style.left = `${Math.random() * 90}%`;
        gallinaDiv.style.top = `${Math.random() * 80}%`;
        // Añadir animación con un retraso aleatorio
        gallinaDiv.style.animation = `peck 2.5s infinite ${Math.random() * 2}s`;
        corralEl.appendChild(gallinaDiv);
    }
}

// --- PERSISTENCIA DE DATOS (FIREBASE) ---

const userId = 'player1'; // ID de jugador simple para este ejemplo
const gameRef = ref(database, 'gameState/' + userId);

function saveGame() {
    const gameData = {
        ...gameState,
        lastOnline: serverTimestamp() // Guardar la hora del servidor
    };
    set(gameRef, gameData);
}

async function loadGame() {
    const snapshot = await get(gameRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Cargar datos del juego
        gameState = {
            gallinas: data.gallinas || 0,
            huevos: data.huevos || 0,
            monedas: data.monedas || 10,
            capacidadCorral: data.capacidadCorral || 10,
            costoGallinaBase: data.costoGallinaBase || 10,
            costoCorralBase: data.costoCorralBase || 100,
        };

        // Calcular producción offline
        const lastOnline = data.lastOnline || Date.now();
        const now = Date.now();
        const secondsOffline = Math.floor((now - lastOnline) / 1000);
        
        if (secondsOffline > 10) { // Solo si estuvo desconectado más de 10 seg
            const huevosProducidosOffline = Math.floor(secondsOffline / 10) * gameState.gallinas;
            if (huevosProducidosOffline > 0) {
                gameState.huevos += huevosProducidosOffline;
                // Mostrar modal
                offlineGallinasEl.innerText = gameState.gallinas;
                offlineHuevosEl.innerText = huevosProducidosOffline;
                offlineModal.classList.remove('hidden');
            }
        }
        
    }
    // Si no existen datos, simplemente empieza un juego nuevo con los valores por defecto
    
    updateUI(); // Actualizar la interfaz con los datos cargados o iniciales
}


// --- EFECTOS VISUALES ---
function showFloatingText(text, element) {
    const floatingText = document.createElement('div');
    floatingText.classList.add('floating-text');
    floatingText.innerText = text;

    const rect = element.getBoundingClientRect();
    const containerRect = document.getElementById('game-container').getBoundingClientRect();

    floatingText.style.top = `${rect.top - containerRect.top - 30}px`;
    floatingText.style.left = `${rect.left - containerRect.left + (rect.width / 2) - 15}px`;
    
    document.getElementById('game-container').appendChild(floatingText);

    // Eliminar el elemento después de la animación
    setTimeout(() => {
        floatingText.remove();
    }, 1500);
}


// --- BUCLES Y EVENT LISTENERS ---

// Producción automática de huevos
setInterval(() => {
    if (gameState.gallinas > 0) {
        gameState.huevos += gameState.gallinas;
        updateUI();
    }
}, 10000); // 1 huevo por gallina cada 10 segundos

// Guardado automático periódico
setInterval(saveGame, 30000); // Guardar cada 30 segundos

// Asignar funciones a los botones
comprarGallinaBtn.addEventListener('click', comprarGallina);
mejorarCorralBtn.addEventListener('click', mejorarCorral);
venderHuevosBtn.addEventListener('click', venderHuevos);
closeModalBtn.addEventListener('click', () => {
    offlineModal.classList.add('hidden');
});


// --- INICIO DEL JUEGO ---
// Cargar los datos del jugador cuando la página se abre
loadGame();