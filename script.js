// ... (el código de Firebase y TON Connect se mantiene igual) ...

// --- LÓGICA DEL JUEGO ---
// ... (las funciones de cálculo y acciones como comprar, vender, etc. se mantienen igual) ...

function updateUI() {
    const costoActualGallina = calcularCostoGallina();
    const costoActualCorral = calcularCostoCorral();

    // Actualiza los nuevos campos del header
    document.getElementById('gallinas-count').innerText = `${gameState.gallinas}/${gameState.capacidadCorral}`;
    document.getElementById('huevos-count').innerText = gameState.huevos;
    document.getElementById('monedas-count').innerText = gameState.monedas;
    
    // Actualiza los costos en los párrafos
    document.getElementById('costo-gallina').innerText = costoActualGallina;
    document.getElementById('costo-corral').innerText = costoActualCorral;
    document.getElementById('valor-venta').innerText = gameState.huevos;

    // Lógica para desactivar botones
    comprarGallinaBtn.disabled = gameState.monedas < costoActualGallina || gameState.gallinas >= gameState.capacidadCorral;
    mejorarCorralBtn.disabled = gameState.monedas < costoActualCorral;
    venderHuevosBtn.disabled = gameState.huevos === 0;

    // NOTA: La lógica para los contadores 0/0/0 en los botones se añadiría aquí en el futuro.
    // document.getElementById('gallina-level').innerText = gameState.gallinaLevel || 0;
}

// ... (el resto del script.js se mantiene igual) ...