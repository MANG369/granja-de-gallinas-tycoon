// --- CONSTANTES Y ESTADO DEL JUEGO ---
const USER_ID = 'player1';
const gameRef = ref(database, `gameState/${USER_ID}`);
const DEFAULT_GAME_STATE = {
    // ... (estado anterior)
    walletRewardClaimed: false,
    playerLevel: 1, // NUEVO: Nivel del jugador
    playerXp: 0,    // NUEVO: Experiencia del jugador
};
let gameState = { ...DEFAULT_GAME_STATE };

// --- REFERENCIAS AL DOM ---
const domElements = {
    // ... (referencias anteriores)
    playerLevelDisplay: document.getElementById('player-level-display'),
    eggValueDisplay: document.getElementById('egg-value-display'),
    productionRateDisplay: document.getElementById('production-rate-display'),
};

// ... (Lógica de Wallet y Notificaciones sin cambios) ...

// --- LÓGICA PRINCIPAL DEL JUEGO ---
// ... (Cálculos de costos sin cambios) ...

// NUEVA FUNCIÓN para gestionar la subida de nivel
function checkLevelUp() {
    const xpParaSiguienteNivel = Math.floor(100 * Math.pow(1.5, gameState.playerLevel - 1));
    if (gameState.playerXp >= xpParaSiguienteNivel) {
        gameState.playerLevel++;
        gameState.playerXp -= xpParaSiguienteNivel; // Restar solo el XP necesario
        const recompensa = 100 * gameState.playerLevel;
        gameState.monedas += recompensa;
        showNotification(`¡Nivel ${gameState.playerLevel}! +${recompensa} monedas!`);
    }
}

// Función para añadir XP y comprobar si se sube de nivel
function addXp(amount) {
    gameState.playerXp += amount;
    checkLevelUp();
}

function updateUI() {
    // ... (cálculos de costos sin cambios) ...

    // Actualiza los nuevos paneles de información
    domElements.playerLevelDisplay.innerText = gameState.playerLevel;
    domElements.eggValueDisplay.innerText = `${1 + gameState.eggValueLevel}💰`;
    domElements.productionRateDisplay.innerText = `${gameState.gallinas}🥚`;
    
    // ... (resto de las actualizaciones de la UI sin cambios) ...
}

// --- ACCIONES DEL JUGADOR (MODIFICADAS PARA DAR XP) ---

function comprarGallina() {
    const costo = calcularCostoGallina();
    if (gameState.monedas >= costo && gameState.gallinas < gameState.capacidadCorral) {
        gameState.monedas -= costo;
        gameState.gallinas++;
        addXp(1); // Gana 1 XP por comprar gallina
        updateUI();
        saveGame();
    }
}

function mejorarHuevo() {
    const costo = calcularCostoMejoraHuevo();
    if (gameState.monedas >= costo) {
        gameState.monedas -= costo;
        gameState.eggValueLevel++;
        addXp(10); // Gana 10 XP por mejorar huevo
        updateUI();
        saveGame();
    }
}

function mejorarCorral() {
    const costo = calcularCostoCorral();
    if (gameState.monedas >= costo) {
        gameState.monedas -= costo;
        gameState.capacidadCorral += 10;
        gameState.corralUpgrades++;
        addXp(15); // Gana 15 XP por mejorar corral
        updateUI();
        saveGame();
    }
}

// ... (El resto de funciones como venderHuevos, saveGame, loadGame y los listeners se mantienen igual) ...

// --- INICIO DEL JUEGO ---
loadGame();