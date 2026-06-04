document.addEventListener("DOMContentLoaded", () => {
    // Elementos del DOM
    const pump = document.getElementById("jockey-pump");
    const panelScreen = document.getElementById("panel-screen");
    const statusIndicator = document.getElementById("status-indicator");
    const needle = document.getElementById("gauge-needle");
    
    const mainPump = document.getElementById("main-pump");
    const mainPanelScreen = document.getElementById("main-panel-screen");
    const mainStatusIndicator = document.getElementById("main-status-indicator");
    const mainControlPanel = document.getElementById("main-pump-panel");
    const mainSettingsModal = document.getElementById("main-settings-modal");
    
    const dieselPump = document.getElementById("diesel-pump");
    const dieselPanelScreen = document.getElementById("diesel-panel-screen");
    const dieselStatusIndicator = document.getElementById("diesel-status-indicator");
    const dieselControlPanel = document.getElementById("diesel-pump-panel");
    const dieselSettingsModal = document.getElementById("diesel-settings-modal");
    
    const controlPanel = document.getElementById("control-panel");
    const settingsModal = document.getElementById("settings-modal");
    
    const inputStart = document.getElementById("input-start");
    const inputStop = document.getElementById("input-stop");
    const btnSave = document.getElementById("btn-save");
    const btnLeak = document.getElementById("btn-leak");
    
    const inputMainStart = document.getElementById("input-main-start");
    const inputMainStop = document.getElementById("input-main-stop");
    const btnMainSave = document.getElementById("btn-main-save");
    
    const inputDieselStart = document.getElementById("input-diesel-start");
    const inputDieselStop = document.getElementById("input-diesel-stop");
    const btnDieselSave = document.getElementById("btn-diesel-save");
    
    const valveWheel = document.getElementById("valve-wheel");
    const testValveContainer = document.getElementById("test-valve-container");
    const waterSpray = document.getElementById("water-spray");
    const needleMain = document.getElementById("gauge-needle-main");
    const needleDiesel = document.getElementById("gauge-needle-diesel");
    const valveSlider = document.getElementById("valve-slider");
    
    // Variables del Sistema
    let currentPressure = 100; // Presión inicial
    let startPressure = 80;    // Cuándo arranca
    let stopPressure = 100;    // Cuándo se apaga
    let isRunning = false;
    let isLeaking = false;
    
    let mainStartPressure = 60; // Arranca más bajo que la jockey
    let mainStopPressure = 100;
    let isMainRunning = false;

    let dieselStartPressure = 40; // Arranca en caída extrema
    let dieselStopPressure = 100;
    let isDieselRunning = false;

    // Abrir menú de configuración
    controlPanel.addEventListener("click", () => {
        inputStart.value = startPressure;
        inputStop.value = stopPressure;
        settingsModal.classList.add("active");
    });

    // Guardar cambios del menú
    btnSave.addEventListener("click", () => {
        const newStart = parseFloat(inputStart.value);
        const newStop = parseFloat(inputStop.value);
        
        if (newStart >= newStop) {
            alert("La presión de arranque debe ser menor a la de paro.");
            return;
        }
        
        startPressure = newStart;
        stopPressure = newStop;
        settingsModal.classList.remove("active");
    });

    // Abrir menú de configuración Principal
    mainControlPanel.addEventListener("click", () => {
        inputMainStart.value = mainStartPressure;
        inputMainStop.value = mainStopPressure;
        mainSettingsModal.classList.add("active");
    });

    // Guardar cambios del menú Principal
    btnMainSave.addEventListener("click", () => {
        const newStart = parseFloat(inputMainStart.value);
        const newStop = parseFloat(inputMainStop.value);
        
        if (newStart >= newStop) {
            alert("La presión de arranque debe ser menor a la de paro.");
            return;
        }
        mainStartPressure = newStart;
        mainStopPressure = newStop;
        mainSettingsModal.classList.remove("active");
    });

    // Abrir menú de configuración Diésel
    dieselControlPanel.addEventListener("click", () => {
        inputDieselStart.value = dieselStartPressure;
        inputDieselStop.value = dieselStopPressure;
        dieselSettingsModal.classList.add("active");
    });

    // Guardar cambios del menú Diésel
    btnDieselSave.addEventListener("click", () => {
        const newStart = parseFloat(inputDieselStart.value);
        const newStop = parseFloat(inputDieselStop.value);
        if (newStart >= newStop) {
            alert("La presión de arranque debe ser menor a la de paro.");
            return;
        }
        dieselStartPressure = newStart;
        dieselStopPressure = newStop;
        dieselSettingsModal.classList.remove("active");
    });

    // Activar/Desactivar Fuga girando la válvula
    let valveRotation = 0;
    const maxValveRotation = 720; // 2 vueltas completas para máxima apertura
    let isDraggingValve = false;
    let previousMouseY = 0;

    function updateValveLeak() {
        if (valveWheel) valveWheel.style.transform = `rotate(${valveRotation}deg)`;
        if (valveSlider && valveSlider.value != valveRotation) {
            valveSlider.value = valveRotation;
        }
        isLeaking = valveRotation > 0;
        if (isLeaking) {
            btnLeak.classList.add("active");
            btnLeak.innerText = "Cerrar Válvula de Prueba";
        } else {
            btnLeak.classList.remove("active");
            btnLeak.innerText = "Abrir Válvula de Prueba (Crear Fuga)";
        }
    }

    btnLeak.addEventListener("click", () => {
        valveRotation = valveRotation > 0 ? 0 : maxValveRotation;
        updateValveLeak();
    });

    if (valveSlider) {
        valveSlider.addEventListener("input", (e) => {
            valveRotation = parseFloat(e.target.value);
            updateValveLeak();
        });
    }

    testValveContainer.addEventListener("mousedown", (e) => {
        isDraggingValve = true;
        previousMouseY = e.clientY;
        e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDraggingValve) return;
        let deltaY = previousMouseY - e.clientY; // Mover ratón hacia arriba es positivo
        previousMouseY = e.clientY;
        valveRotation += deltaY * 3; // Sensibilidad de giro
        if (valveRotation < 0) valveRotation = 0;
        if (valveRotation > maxValveRotation) valveRotation = maxValveRotation;
        updateValveLeak();
    });

    window.addEventListener("mouseup", () => {
        isDraggingValve = false;
    });

    // Bucle principal de simulación (se ejecuta cada 100 milisegundos)
    setInterval(() => {
        let pressureChange = 0;
        let leakFactor = valveRotation / maxValveRotation; // Porcentaje de apertura (0.0 a 1.0)
        
        // La fuga drena presión drásticamente
        if (isLeaking && currentPressure > 0) {
            pressureChange -= 4.0 * leakFactor; // Consumo variable
            if (waterSpray) {
                waterSpray.style.opacity = leakFactor;
                waterSpray.style.width = `${currentPressure * 3.0 * leakFactor}px`; // Distancia variable
            }
        } else {
            if (waterSpray) {
                waterSpray.style.opacity = 0;
                waterSpray.style.width = `0px`; // El agua se detiene si se cierra
            }
        }
        
        // Lógica de arranque automático Jockey
        if (currentPressure <= startPressure && !isRunning) {
            isRunning = true;
            pump.classList.add("running"); // Inicia animación CSS
            statusIndicator.classList.add("on");
        }
        
        // Lógica de arranque automático Principal
        if (currentPressure <= mainStartPressure && !isMainRunning) {
            isMainRunning = true;
            mainPump.classList.add("running");
            mainStatusIndicator.classList.add("on");
        }
        
        // Lógica de arranque automático Diésel
        if (currentPressure <= dieselStartPressure && !isDieselRunning) {
            isDieselRunning = true;
            dieselPump.classList.add("running");
            dieselStatusIndicator.classList.add("on");
        }
        
        // Cada bomba inyecta presión a la red si está encendida
        if (isRunning) pressureChange += 1.0; 
        if (isMainRunning) pressureChange += 2.5; 
        if (isDieselRunning) pressureChange += 4.5; // El Diésel es una bestia inyectando presión
        
        currentPressure += pressureChange;
        
        // Lógica de apagado Jockey
        if (isRunning && currentPressure >= stopPressure) {
            isRunning = false;
            pump.classList.remove("running");
            statusIndicator.classList.remove("on");
        }
        
        // Lógica de apagado Principal
        if (isMainRunning && currentPressure >= mainStopPressure) {
            isMainRunning = false;
            mainPump.classList.remove("running");
            mainStatusIndicator.classList.remove("on");
        }
        
        // Lógica de apagado Diésel
        if (isDieselRunning && currentPressure >= dieselStopPressure) {
            isDieselRunning = false;
            dieselPump.classList.remove("running");
            dieselStatusIndicator.classList.remove("on");
        }
        
        if (currentPressure < 0) currentPressure = 0;
        if (currentPressure > 150) currentPressure = 150;
        
        // Actualizar UI
        panelScreen.innerText = currentPressure.toFixed(0) + " PSI";
        mainPanelScreen.innerText = currentPressure.toFixed(0) + " PSI";
        dieselPanelScreen.innerText = currentPressure.toFixed(0) + " PSI";
        
        // El manómetro va de 0 a 150 PSI (representado visualmente de -90deg a +90deg)
        let displayPressure = currentPressure > 150 ? 150 : currentPressure;
        let angle = (displayPressure / 150) * 180 - 90;
        needle.style.transform = `rotate(${angle}deg)`;
        if (needleMain) needleMain.style.transform = `rotate(${angle}deg)`;
        if (needleDiesel) needleDiesel.style.transform = `rotate(${angle}deg)`;
        
    }, 100);

    // Ajuste de Escala Dinámico para adaptarse a cualquier monitor/pantalla
    const wrapper = document.querySelector('.pump-system-wrapper');
    function scaleSimulator() {
        // El diseño necesita un canvas virtual de aprox 2250x800 para verse completo
        const scale = Math.min(window.innerWidth * 0.95 / 2250, window.innerHeight * 0.95 / 800);
        wrapper.style.transform = `scale(${scale})`;
    }
    window.addEventListener("resize", scaleSimulator);
    scaleSimulator(); // Ejecutar inmediatamente al abrir la página
});