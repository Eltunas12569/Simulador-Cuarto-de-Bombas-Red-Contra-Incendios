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
    
    const inputMainStart = document.getElementById("input-main-start");
    const btnMainSave = document.getElementById("btn-main-save");
    
    const inputDieselStart = document.getElementById("input-diesel-start");
    const btnDieselSave = document.getElementById("btn-diesel-save");
    
    const needleMain = document.getElementById("gauge-needle-main");
    const needleDiesel = document.getElementById("gauge-needle-diesel");
    
    const valveWheels = document.querySelectorAll(".valve-wheel");
    const testValveContainers = document.querySelectorAll(".test-valve-container");
    const waterSprays = document.querySelectorAll(".water-spray");
    const valveSliders = document.querySelectorAll(".valve-slider");
    
    const nfpaWarning = document.getElementById("nfpa-warning");

    const mainStopBtn = document.getElementById("main-stop-btn");
    const dieselStopBtn = document.getElementById("diesel-stop-btn");

    const dieselAlarmBeacon = document.getElementById("diesel-alarm-beacon");

    const minorLeakNode = document.getElementById("minor-leak-node");
    const minorLeakSpray = document.getElementById("minor-leak-spray");

    // Variables del Sistema
    let currentPressure = 130; // Presión inicial ideal
    let startPressure = 120;   // Jockey arranca
    let stopPressure = 130;    // Cuándo se apaga
    let isRunning = false;
    
    let mainStartPressure = 110; // Arranca min 10 PSI debajo de Jockey
    let isMainRunning = false;

    let dieselStartPressure = 100; // Respaldo, arranca debajo de la principal
    let isDieselRunning = false;
    let isDieselBroken = false; // Estado de avería
    let dieselStartAttempts = 0; // Intentos de arranque
    let dieselCrankTimer = 0;    // Temporizador de marcha
    let dieselFailedAlertShown = false; // Bandera de alerta mostrada

    let isMinorLeakActive = false; // Estado de la fuga menor
    let isReliefOpen = false; // Estado de la válvula de alivio

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
        if (newStart < mainStartPressure + 10) {
            alert("NFPA 20: La bomba Jockey debe arrancar entre 10 a 15 PSI por encima de la bomba Principal (Jerarquía de presiones).");
            return;
        }
        
        startPressure = newStart;
        stopPressure = newStop;
        settingsModal.classList.remove("active");
    });

    // Abrir menú de configuración Principal
    mainControlPanel.addEventListener("click", () => {
        inputMainStart.value = mainStartPressure;
        mainSettingsModal.classList.add("active");
    });

    // Guardar cambios del menú Principal
    btnMainSave.addEventListener("click", () => {
        const newStart = parseFloat(inputMainStart.value);
        
        if (newStart > startPressure - 5) {
            alert("NFPA 20: La bomba Principal debe arrancar al menos 5 a 10 PSI por debajo de la bomba Jockey.");
            return;
        }
        if (newStart <= dieselStartPressure) {
            alert("Jerarquía de presiones: La bomba Principal debe arrancar ANTES que la bomba Diésel de respaldo.");
            return;
        }
        mainStartPressure = newStart;
        mainSettingsModal.classList.remove("active");
    });

    // Abrir menú de configuración Diésel
    dieselControlPanel.addEventListener("click", () => {
        inputDieselStart.value = dieselStartPressure;
        dieselSettingsModal.classList.add("active");
    });

    // Guardar cambios del menú Diésel
    btnDieselSave.addEventListener("click", () => {
        const newStart = parseFloat(inputDieselStart.value);
        if (newStart >= mainStartPressure) {
            alert("La bomba Diésel de respaldo debe configurarse para arrancar a menor presión que la bomba Principal.");
            return;
        }
        dieselStartPressure = newStart;
        dieselSettingsModal.classList.remove("active");
    });

    // Botones de Paro Manual (Normativa NFPA 20)
    mainStopBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Evita que se abra el modal de configuración
        if (isMainRunning) {
            if (currentPressure >= mainStartPressure) {
                isMainRunning = false;
                mainPump.classList.remove("running");
                mainStatusIndicator.classList.remove("on");
            } else {
                alert("NFPA 20: No se puede detener la bomba de emergencia mientras la demanda de presión siga activa (presión actual < arranque).");
            }
        }
    });

    dieselStopBtn.addEventListener("click", (e) => {
        e.stopPropagation(); 
        if (isDieselRunning) {
            if (currentPressure >= dieselStartPressure) {
                isDieselRunning = false;
                dieselPump.classList.remove("running");
                dieselStatusIndicator.classList.remove("on");
            } else {
                alert("NFPA 20: No se puede detener la bomba Diésel mientras el sistema requiera presión crítica.");
            }
        }
    });

    // Averiar/Reparar Bomba Diésel al hacerle clic
    dieselPump.addEventListener("click", () => {
        isDieselBroken = !isDieselBroken;
        if (isDieselBroken) {
            dieselPump.classList.add("broken");
            // Apaga la bomba forzosamente si estaba corriendo
            if (isDieselRunning) {
                isDieselRunning = false;
                dieselPump.classList.remove("running");
                dieselStatusIndicator.classList.remove("on");
            }
        } else {
            dieselPump.classList.remove("broken");
            dieselStartAttempts = 0;
            dieselCrankTimer = 0;
            dieselFailedAlertShown = false;
            dieselPump.classList.remove("cranking");
            if (dieselAlarmBeacon) dieselAlarmBeacon.classList.remove("active");
        }
    });

    // Botón de Fuga Menor
    if (minorLeakNode) {
        minorLeakNode.addEventListener("click", () => {
            isMinorLeakActive = !isMinorLeakActive;
        });
    }

    // Activar/Desactivar Fuga girando las válvulas
    const maxValveRotation = 720; // 2 vueltas completas para máxima apertura
    let valveRotations = [];
    let isDraggingValves = [];
    let previousMouseYs = [];

    // Inicializar los estados de las válvulas dinámicamente según la cantidad que exista
    valveWheels.forEach(() => {
        valveRotations.push(0);
        isDraggingValves.push(false);
        previousMouseYs.push(0);
    });

    function updateValveLeak(index) {
        if (valveWheels[index]) valveWheels[index].style.transform = `rotate(${valveRotations[index]}deg)`;
        if (valveSliders[index] && valveSliders[index].value != valveRotations[index]) {
            valveSliders[index].value = valveRotations[index];
        }
    }

    valveSliders.forEach((slider, i) => {
        slider.addEventListener("input", (e) => {
            valveRotations[i] = parseFloat(e.target.value);
            updateValveLeak(i);
        });
    });

    testValveContainers.forEach((container, i) => {
        container.addEventListener("mousedown", (e) => {
            isDraggingValves[i] = true;
            previousMouseYs[i] = e.clientY;
            e.preventDefault();
        });
    });

    window.addEventListener("mousemove", (e) => {
        for(let i=0; i<valveWheels.length; i++) {
            if (!isDraggingValves[i]) continue;
            let deltaY = previousMouseYs[i] - e.clientY; // Mover ratón hacia arriba es positivo
            previousMouseYs[i] = e.clientY;
            valveRotations[i] += deltaY * 3; // Sensibilidad de giro
            if (valveRotations[i] < 0) valveRotations[i] = 0;
            if (valveRotations[i] > maxValveRotation) valveRotations[i] = maxValveRotation;
            updateValveLeak(i);
        }
    });

    window.addEventListener("mouseup", () => {
        for(let i=0; i<valveWheels.length; i++) isDraggingValves[i] = false;
    });

    // Hacer clic en los rociadores para abrirlos al 100% de golpe
    const sprinklerValves = document.querySelectorAll(".sprinkler-valve-container");
    sprinklerValves.forEach((container) => {
        let wheel = container.querySelector(".valve-wheel");
        let wheelIndex = Array.from(valveWheels).indexOf(wheel);
        
        container.addEventListener("click", () => {
            if (wheelIndex !== -1) {
                if (valveRotations[wheelIndex] === 0) {
                    valveRotations[wheelIndex] = maxValveRotation;
                } else {
                    valveRotations[wheelIndex] = 0;
                }
                updateValveLeak(wheelIndex);
            }
        });
    });

    // Bucle principal de simulación (se ejecuta cada 100 milisegundos)
    setInterval(() => {
        let pressureChange = 0;
        let totalLeakFactor = 0;
        
        // Las fugas drenan presión drásticamente sumando sus aperturas
        for(let i=0; i<valveWheels.length; i++) {
            let leakFactor = valveRotations[i] / maxValveRotation; // Porcentaje de apertura (0.0 a 1.0)
            
            // Determinar si el agua es de un rociador o manguera principal
            let isSprinkler = waterSprays[i] && waterSprays[i].classList.contains("sprinkler-water-spray");
            
            // Un rociador consume un 80% menos presión/flujo que una manguera abierta
            let effectiveLeak = isSprinkler ? leakFactor * 0.2 : leakFactor; 
            totalLeakFactor += effectiveLeak;
            
            if (leakFactor > 0 && currentPressure > 0) {
                if (waterSprays[i]) {
                    waterSprays[i].style.opacity = leakFactor;
                    if (isSprinkler) {
                        waterSprays[i].style.width = `${currentPressure * 0.7 * leakFactor}px`; // Chorro mucho más corto (presión reducida)
                    } else {
                        waterSprays[i].style.width = `${currentPressure * 2.0 * leakFactor}px`; // Manguera principal chorro largo
                    }
                }
            } else {
                if (waterSprays[i]) {
                    waterSprays[i].style.opacity = 0;
                    waterSprays[i].style.width = `0px`; // El agua se detiene si se cierra
                }
            }
        }
        
        if (totalLeakFactor > 0 && currentPressure > 0) {
            // Fuga realista: el consumo de agua disminuye si hay poca presión en la red
            let leakDrain = (currentPressure / 130) * 4.0 * totalLeakFactor;
            pressureChange -= leakDrain;
        }
        
        // Lógica de Fuga Menor
        if (isMinorLeakActive && currentPressure > 0) {
            // Fuga pequeña, resta mucha menos presión que las mangueras grandes
            let minorLeakDrain = (currentPressure / 130) * 0.4; // Reducido a la mitad
            pressureChange -= minorLeakDrain;
            
            if (minorLeakSpray) {
                minorLeakSpray.style.opacity = 1;
                minorLeakSpray.style.height = `${currentPressure * 0.45}px`; // Escala la longitud del chorro hacia abajo (30%)
            }
        } else {
            if (minorLeakSpray) {
                minorLeakSpray.style.opacity = 0;
                minorLeakSpray.style.height = `0px`;
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
            if (!isDieselBroken) {
                isDieselRunning = true;
                dieselPump.classList.add("running");
                dieselStatusIndicator.classList.add("on");
                dieselStartAttempts = 0;
                dieselCrankTimer = 0;
                dieselFailedAlertShown = false;
            } else {
                // Secuencia de intento de arranque (6 intentos)
                if (dieselStartAttempts < 6) {
                    dieselCrankTimer++;
                    if (dieselCrankTimer <= 10) {
                        dieselPump.classList.add("cranking"); // 1 segundo dando marcha
                    } else if (dieselCrankTimer <= 20) {
                        dieselPump.classList.remove("cranking"); // 1 segundo de descanso
                    } else {
                        dieselCrankTimer = 0;
                        dieselStartAttempts++;
                    }
                } else if (!dieselFailedAlertShown) {
                    dieselPump.classList.remove("cranking");
                    dieselFailedAlertShown = true;
                    if (dieselAlarmBeacon) dieselAlarmBeacon.classList.add("active");
                }
            }
        }
        
        // Cada bomba inyecta presión; suavizamos el límite de entrega (Churn) para evitar que la aguja rebote bruscamente
        if (isRunning && currentPressure < stopPressure) pressureChange += Math.min(1.0, stopPressure - currentPressure); 
        if (isMainRunning && currentPressure < 185) pressureChange += Math.min(2.5, 185 - currentPressure); 
        if (isDieselRunning && currentPressure < 195) pressureChange += Math.min(4.5, 195 - currentPressure); 
        
        currentPressure += pressureChange;

        // Válvula de alivio (By-pass a cisterna) para exceso de presión (> 175 PSI límite seguro)
        const reliefSpray = document.getElementById("relief-water-spray");
        const cisternWater = document.getElementById("cistern-water");
        const reliefSystem = document.getElementById("relief-system");
        
        if (currentPressure > 175) {
            isReliefOpen = true; // Se abre si existe peligro de sobrepresión (> 175)
        } else if (currentPressure <= 130.05) {
            isReliefOpen = false; // Se cierra únicamente al estabilizarse en la presión ideal de reposo
        }
        
        if (isReliefOpen) {
            // Si las bombas siguen empujando por encima de 175, la válvula recorta el exceso drásticamente
            if (currentPressure > 175) {
                currentPressure -= (currentPressure - 175) * 0.8;
            }
            // Drenaje super fuerte (-5.5) para vencer el empuje de CUALQUIER bomba (evitando estancamiento)
            currentPressure -= 5.5; 
            
            // Forzamos el cierre exacto para apagar la animación de forma limpia
            if (currentPressure <= 130.05) {
                currentPressure = 130;
                isReliefOpen = false;
            }
            
            if (reliefSpray) reliefSpray.classList.add("active");
            if (cisternWater) cisternWater.classList.add("splashing");
            if (reliefSystem) reliefSystem.classList.add("active");
        } else {
            if (reliefSpray) reliefSpray.classList.remove("active");
            if (cisternWater) cisternWater.classList.remove("splashing");
            if (reliefSystem) reliefSystem.classList.remove("active");
        }

        // Estabilización visual para simular la curva de la bomba cerrada (Churn Pressure)
        if (totalLeakFactor === 0 && currentPressure <= 175) {
            if (isRunning && !isMainRunning && !isDieselRunning && currentPressure > stopPressure - 1) currentPressure = stopPressure;
        }
        
        // Lógica de apagado Jockey
        if (isRunning && currentPressure >= stopPressure) {
            isRunning = false;
            pump.classList.remove("running");
            statusIndicator.classList.remove("on");
        }
        
        if (currentPressure < 0) currentPressure = 0;
        if (currentPressure > 200) currentPressure = 200; // Límite máximo de presión a 200
        
        // Lógica de Alertas NFPA 20
        let isLeaking = totalLeakFactor > 0;
        if (currentPressure > 175) {
            nfpaWarning.innerText = "¡PRECAUCIÓN! Presión > 175 PSI. Se requiere obligatoriamente Válvulas Reductoras de Presión (PRV) para protección física e integridad.";
            nfpaWarning.style.display = "block";
            nfpaWarning.style.background = "rgba(220, 53, 69, 0.95)"; // Rojo
            nfpaWarning.style.color = "white";
        } else if (isLeaking && currentPressure < 65) {
            nfpaWarning.innerText = "¡ALERTA! Presión residual < 65 PSI. No se garantiza el funcionamiento seguro de las mangueras para combate de incendios.";
            nfpaWarning.style.display = "block";
            nfpaWarning.style.background = "rgba(255, 193, 7, 0.95)"; // Amarillo
            nfpaWarning.style.color = "black";
        } else {
            nfpaWarning.style.display = "none";
        }

        // Actualizar UI
        panelScreen.innerText = currentPressure.toFixed(0) + " PSI";
        mainPanelScreen.innerText = currentPressure.toFixed(0) + " PSI";
        dieselPanelScreen.innerText = currentPressure.toFixed(0) + " PSI";
        
        // El manómetro va de 0 a 200 PSI (representado visualmente de -90deg a +90deg)
        let displayPressure = currentPressure > 200 ? 200 : currentPressure;
        let angle = (displayPressure / 200) * 180 - 90;
        needle.style.transform = `rotate(${angle}deg)`;
        if (needleMain) needleMain.style.transform = `rotate(${angle}deg)`;
        if (needleDiesel) needleDiesel.style.transform = `rotate(${angle}deg)`;
        
    }, 100);

    // Ajuste de Escala Dinámico para adaptarse a cualquier monitor/pantalla
    const wrapper = document.querySelector('.pump-system-wrapper');
    function scaleSimulator() {
        // El diseño necesita un canvas virtual de aprox 2250x800 para verse completo
        // Aplicamos un multiplicador de 0.9 para reducir el tamaño global un 10%
        const scale = Math.min(window.innerWidth * 0.95 / 2250, window.innerHeight * 0.95 / 800) * 0.9;
        wrapper.style.transform = `scale(${scale})`;
    }
    window.addEventListener("resize", scaleSimulator);
    scaleSimulator(); // Ejecutar inmediatamente al abrir la página
});