# Excepciones de accesibilidad automatizada

La auditoría `tests/e2e/accessibility-axe.spec.mjs` ejecuta axe sobre Inicio,
Gym, Nutrición, Progreso, Más, Datos y copias y Gym Party en Android Chromium,
iPhone WebKit y escritorio Chromium.

No hay reglas axe desactivadas ni excepciones activas. Una excepción futura
debe registrar la regla, el motivo técnico, navegador, issue y fecha de revisión;
no se acepta una exclusión global para ocultar una infracción de la aplicación.

Las pruebas automatizadas complementan, pero no reemplazan, la checklist manual
de teclado, lector de pantalla, zoom, contraste forzado y tamaño de texto.
