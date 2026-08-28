# Roadmap Gym-first posterior a Stable 2.7.0+96

## Estado y alcance

Este documento convierte la decision de producto Gym-first en una
especificacion ejecutable para los siguientes ciclos. No implementa producto,
suscripciones, telemetria ni una release.

| Identidad | Valor |
| --- | --- |
| Production baseline congelado | `main@609f3e40e3b4c7966ea01a199d41a9223344f82e` |
| Web/PWA Stable | `2.7.0+96` |
| Android Stable | `v2.7.0-build.96`, `versionCode 40` |
| Contrato Workout Quick Actions | schema 1 |
| Backup | schema 3 |
| Fuente canonica de entrenamiento | `workoutSessions` |

Stable 96 queda congelado. Ningun cambio nuevo puede reutilizar build 96,
`versionCode 40` o el tag `v2.7.0-build.96`. Este roadmap conserva IndexedDB,
localStorage, SharedPreferences, backups schema 3, deep links, PWA, WebView y el
modelo canonico de Workout.

## 1. Product thesis

**Protocolo 0->100 es un producto de entrenamiento que reduce la friccion de
registrar y convierte ese historial en una proxima decision util.**

La pregunta central deja de ser "¿completaste todos tus trackers?" y pasa a ser:

> **¿Que entrenas hoy y que te conviene hacer a continuacion?**

Jerarquia estrategica:

1. Gym/Entrenamiento es el nucleo cotidiano.
2. Progreso de entrenamiento demuestra valor y sostiene la vuelta.
3. Nutricion acompaña objetivos fisicos y rendimiento.
4. Habitos/Protocolo acompaña constancia, sueño, recuperacion, atencion y mejora
   personal.
5. Gym Party aporta entrenamiento social.
6. Mas administra configuracion, datos, privacidad y diagnostico.

La promesa futura de Pro es: **"No solo guardamos tu entrenamiento. Te ayudamos
a progresar."** Registrar una rutina, entrenar y conservar los datos propios no
se usa como bloqueo artificial.

## 2. Persona primaria y perfiles secundarios

### Persona primaria

**Persona autodirigida, principiante avanzada o intermedia, que entrena fuerza o
hipertrofia entre dos y cinco veces por semana, repite una rutina y hoy usa la
memoria, notas o una planilla para decidir carga y repeticiones.**

Necesita rapidez durante la sesion, continuidad entre sesiones y evidencia
comprensible de progreso. No busca una prescripcion medica ni una red social
completa. Android es una superficie importante, pero el flujo debe funcionar
tambien en Web/PWA.

### Perfiles secundarios

| Perfil | Necesidad particular | Limite de optimizacion |
| --- | --- | --- |
| Principiante | Configurar una rutina minima y saber que hacer ahora | No imponer un cuestionario largo ni una rutina avanzada sin explicacion |
| Fuerza | Comparables, PRs, carga y descansos | No reducir todo el producto a e1RM |
| Hipertrofia | Series efectivas, volumen y grupos musculares | No presentar volumen como estimulo fisiologico exacto |
| Perdida de grasa | Entrenamiento consistente y nutricion contextual | No hacer recomendaciones clinicas |
| Avanzado | Modalidades, RIR/RPE, equipo, lateralidad y analisis | Mantener complejidad avanzada fuera del camino rapido |
| Casual | Registrar sin culpa y retomar | No usar rachas punitivas ni exigir frecuencia alta |

No se intenta optimizar por igual para todos. La persona primaria decide la
jerarquia; los perfiles secundarios conservan sus modalidades y datos.

## 3. Jobs to be done

### Job principal

> Cuando llego a entrenar, quiero abrir la app, ver el ejercicio y los valores
> relevantes, guardar cada serie con minima interaccion y salir sabiendo si
> avance y que me toca despues.

### Jobs de soporte

- Cuando preparo mi semana, quiero que mi rutina habitual quede lista sin volver
  a configurarla cada dia.
- Cuando termino una sesion, quiero un resumen veraz que refuerce competencia y
  me indique la proxima accion.
- Cuando dudo si estoy mejorando, quiero comparar sesiones equivalentes por
  ejercicio, musculo y periodo.
- Cuando registro comida o recuperacion, quiero entender si acompaña mi objetivo
  sin convertir la app en una consulta medica.
- Cuando entreno desde Android, quiero registrar desde widget o notificacion sin
  abrir un flujo tecnico ni exponer datos en la pantalla bloqueada.

## 4. Auditoria del journey Gym actual

La auditoria reviso `index.html`, `workout-features.js`, `workout-store.js`,
`workout-plan.js`, `workout-ui.js`, `gym/*`, `progress/*`, estilos, pruebas,
capturas, Android Quick Access, widgets, notificacion, Gym Party, README y
handoff. Los taps son minimos conceptuales del happy path actual; no sustituyen
telemetria real.

| Paso | Experiencia actual | Valor | Esfuerzo / taps estimados | Carga y riesgo | Recuperacion | Oportunidad |
| --- | --- | ---: | --- | --- | --- | --- |
| A. Primer uso / entrenamiento no configurado intencionalmente | Se instala automaticamente una rutina semanal de cinco dias; por eso la mera existencia de una rutina no prueba una eleccion del usuario | 4/10 | 0 taps, pero sin eleccion informada | Alta carga conceptual: la rutina puede no corresponder al usuario | Se puede editar o restablecer sin borrar sesiones | Expresar setup solo con una senal fiable; de lo contrario degradar a una propuesta funcional y resolver la intencion en Activation |
| B. Crear rutina | Gym > panel desplegable > dia > nombre/musculos > biblioteca o ejercicio personalizado | 6/10 | 2 taps para abrir, luego muchas decisiones por dia | Alta; mezcla ajustes, acceso rapido, biblioteca y clasificacion | Borrador, autosave visual, copiar dia, deshacer eliminacion | Flujo minimo separado del editor avanzado |
| C. Elegir entrenamiento | El dia de la semana decide la rutina; no existe selector cotidiano claro de alternativa | 6/10 | 0 taps si coincide; varios si hay que editar | Riesgo de entrenar el plan equivocado o abandonar | Se puede añadir un ejercicio manual o editar el dia | Mostrar propuesta de hoy y permitir cambiar sin editar toda la semana |
| D. Iniciar | Gym muestra el logger antes que la tarjeta de hoy; `Empezar` crea sesion, pero guardar tambien puede iniciarla implicitamente | 7/10 | 1 tap a Gym + 0/1 para iniciar | Ambigüedad entre preparar y empezar; notificacion depende de inicio explicito | Borrador y `ensureSession` evitan perdida | Un unico CTA contextual y una transicion de estado explicita |
| E. Elegir ejercicio | Selector prioriza rutina, historial y busqueda; buscar otro esta plegado | 8/10 | 1-3 taps | Baja para rutina habitual; media para ejercicio nuevo | Deduplicacion y adicion a la misma sesion | Mantener selector directo y mejorar cambio contextual |
| F. Primera serie | Reps/carga se preparan desde ultima serie o defaults; Guardar usa el modelo canonico | 8/10 | 1 tap si valores sirven; 2-5 si hay que ajustarlos | Defaults `8 / 0` pueden ser falsos para un usuario nuevo | Validacion, borrador, anomalias y recibo exacto | Mostrar por que se sugieren valores y acelerar primera configuracion |
| G. Series siguientes | Conserva valores, incrementa numero y permite repetir ultima | 9/10 | 1 tap por serie habitual | Baja; es la parte mas fuerte del journey | Editar, eliminar y deshacer por `setId` | Proteger este camino y añadir objetivo visible sin ruido |
| H. Descanso | Timer existe, pero esta desactivado por defecto y su configuracion esta lejos del logger | 6/10 | 0 taps si esta activo; varios para descubrirlo | Puede no aparecer cuando se necesita | Pausar, reanudar y +15 s; Android persiste estado | Configuracion contextual una sola vez y feedback no compulsivo |
| I. Cambiar ejercicio | `Siguiente ejercicio` es directo; selector permite saltar | 8/10 | 1 tap secuencial; 2 con selector | No muestra claramente cuanto falta respecto de objetivos | Estado de sesion conserva ejercicio actual | Progreso de sesion y opcion Saltar sin marcar fracaso |
| J. Terminar | Finalizar esta dentro de `Opcional y finalizar` y luego pide confirmacion | 5/10 | 3 taps desde logger | Facil de omitir; deja sesiones abiertas o cierre poco visible | Sesion puede reabrirse; datos ya estan guardados | Hacer cierre visible cuando corresponda, sin competir con Guardar serie |
| K. Revisar sesion | Solo aparece un mensaje generico de finalizacion; no hay resumen post-workout dedicado | 3/10 | Sin ruta clara | Se pierde el momento de maximo valor percibido | Progreso e historial conservan los datos | Resumen inmediato con hechos, PRs y proxima sesion |
| L. Historial | Historial completo esta plegado en Gym y tambien repartido en Progreso | 6/10 | 2-3 taps | Dos ubicaciones y jerarquia poco clara | Edicion avanzada conserva sesiones | Dejar historial bruto accesible y llevar interpretacion a Progreso |
| M. Progreso por ejercicio | Progreso > Gym > Ejercicios > seleccion/metricas | 8/10 una vez encontrado | 4-5 taps | Gran valor, pero enterrado; comparadores ya son rigurosos | Deep links y estado `rendered + dirty` | Acceso desde resumen post-workout, PR y ultima serie |
| N. Progreso muscular | Progreso > Gym > Musculos; mapa y series primarias/secundarias | 7/10 | 3-4 taps | Puede confundirse volumen con calidad; el copy actual lo limita | Estados de datos insuficientes | Resumen semanal y acceso a detalle, no hero durante sesion |
| O. Volver al siguiente entrenamiento | La rutina diaria existe en Gym, pero Home no la presenta; tras finalizar vuelve a aparecer Empezar en el mismo dia | 4/10 | Depende de recordar abrir Gym | Loop entre sesiones incompleto; posible ambigüedad con doble sesion | Historial y plan siguen intactos | Home Gym-first con proxima sesion y estado terminado/descanso |

### Diagnostico Gym

El cuello de botella principal no es el modelo de series: `workoutSessions`, el
logger rapido, comparabilidad, edicion y Android Quick Access ya son una base
solida. El problema es **descubrimiento, activacion y continuidad**:

- una persona nueva recibe una rutina compleja antes de expresar objetivo;
- Inicio no conduce al entrenamiento;
- comenzar puede ser explicito o implicito;
- finalizar esta escondido;
- el resultado valioso de Progreso requiere varios niveles de navegacion;
- no existe un puente fuerte entre la sesion terminada y la proxima.

No conviene crear otro modelo de workout ni otro logger.

## 5. Auditoria y arquitectura futura de Home

### Situacion actual

El primer viewport muestra marca, score diario, racha `score >= 70`, pendientes
del protocolo y CTA de registro diario. Debajo aparecen plan 0->100, accion del
dia, formulario de pantalla/sueño/lectura/offline y una promocion de Gym Party.
La pregunta "¿que entreno hoy?" no se responde sin abrir Gym.

### Decision por componente

| Componente actual | Decision Gym-first |
| --- | --- |
| Saludo/fecha | Mantener compacto; no debe desplazar la accion principal |
| Score del protocolo | Mover fuera del hero; queda en Recuperacion/Habitos |
| Racha `score >= 70` | Renombrar y mover a Habitos; no representa entrenamiento |
| Pendientes esenciales | Mostrar solo como resumen secundario, nunca competir con Gym |
| CTA diario del protocolo | Mantener bajo la seccion contextual de Habitos |
| Plan 0->100 y objetivos extensos | Plegar y trasladar a Habitos/Mas segun naturaleza |
| Accion del dia | Conservar como complemento de recuperacion o desarrollo personal |
| Formulario diario | Conservar completo debajo del contenido Gym, accesible con un CTA secundario |
| Gym Party promocional | Retirar del primer viewport; acceder desde Gym > Grupo |
| Rutina de hoy | Llevar al hero de Home |
| Sesion activa | Llevar al hero con ejercicio, serie y descanso |
| Ultima sesion/proxima sesion | Integrar como evidencia y proxima accion, no como dashboard gigante |

### Estados de Home

Cada estado tiene una unica accion primaria.

| Estado | Hero y contexto minimo | CTA principal | Secundario permitido |
| --- | --- | --- | --- |
| A. Primer uso / setup requerido | "Tu primer entrenamiento" solo cuando exista una senal fiable de que el entrenamiento aun no fue configurado intencionalmente | **Configurar entrenamiento** | Acceso al editor actual, sin onboarding nuevo |
| B. Rutina, sin sesion hoy | "Hoy te toca Push"; ejercicios, ultima sesion comparable y duracion estimada solo si existe | **Empezar entrenamiento** | Cambiar entrenamiento |
| C. Sesion activa | Ejercicio actual, siguiente serie, progreso real de sesion y timer si esta activo | **Continuar entrenamiento** | Ver rutina |
| D. Sesion terminada | Series/ejercicios, volumen contextual, PRs verificados y proximo entrenamiento | **Ver resumen** | Registrar recuperacion; otra sesion es accion terciaria explicita |
| E. Descanso | "Hoy toca descanso"; proxima sesion y un dato contextual de recuperacion | **Ver proxima sesion** | Registrar recuperacion |

La rutina predeterminada de cinco dias que Stable puede crear automaticamente
impide usar `routine exists` como prueba de configuracion intencional. Home v1
no introduce metadata, no elimina esa rutina y no compara objetos completos con
la factory. Si la intencion no puede conocerse con una senal fiable existente,
el selector debe degradar conservadoramente a un estado funcional (plan de hoy
o descanso) y documentar la limitacion. Distinguir el origen de la rutina y
reemplazar el default invisible pertenece a la fase 2, Activation/Onboarding.

Reglas:

- No mostrar simultaneamente Start, Continue y registro diario con el mismo peso.
- Home lee estado; no crea sesiones ni escribe preferencias durante render.
- Si no hay suficiente informacion, omitir la metrica en lugar de inventarla.
- El contenido inferior conserva Nutricion/Habitos, pero el primer viewport no es
  un dashboard de todos los dominios.
- Deep links de registro diario, Gym, Nutricion y Progreso siguen funcionando.

## 6. Navegacion recomendada

| Alternativa | Claridad Gym-first | Memoria actual | Deep links/shortcuts | Riesgo |
| --- | ---: | ---: | ---: | ---: |
| A. Hoy / Entrenar / Nutricion / Progreso / Mas | 10 | 6 | Requiere migrar etiquetas y documentacion | Medio |
| B. Gym / Nutricion / Progreso / Habitos / Mas | 9 | 4 | Elimina Inicio como destino conocido y obliga a reubicar registro diario | Alto |
| C. Inicio / Gym / Nutricion / Progreso / Mas con Home Gym-first | 8 | 10 | Conserva rutas, shortcuts, widgets y muscle memory | Bajo |

**Recomendacion: C durante el proximo ciclo.** Cambiar la informacion antes que
las etiquetas. Home debe comportarse como "Hoy" sin romper `home/register`,
`gym/train`, shortcuts PWA, acciones Android ni navegacion existente. Evaluar el
renombre visual Inicio -> Hoy solo despues de medir comprension.

## 7. North Star y metricas del producto

### North Star Metric

**Weekly Training Retention (WTR): porcentaje de usuarios activados que completan
al menos dos sesiones de entrenamiento en dias distintos dentro de una ventana
movil de siete dias.**

Una sesion completada requiere estado finalizado y al menos una serie efectiva
valida. La metrica mide valor recurrente, no tiempo dentro de la app. La
frecuencia programada se analiza como segmento para no castigar al usuario
casual, pero no se mezcla en la definicion principal.

### Funnel y salud

| Metrica | Definicion inicial |
| --- | --- |
| Activation | Porcentaje de nuevos usuarios que guardan una primera serie valida; objetivo operativo: dentro de los primeros 3 minutos |
| First workout completion | Activados que finalizan una sesion con >= 3 series efectivas en >= 2 ejercicios dentro de 24 h |
| D1 | Activados que vuelven entre 24-48 h y realizan una accion Gym significativa: continuar, ver proxima sesion o registrar serie |
| D7 | Activados que alcanzan WTR al menos una vez durante sus primeros 10 dias |
| D30 | Activados con al menos tres semanas calificadas de las primeras cuatro |
| Workout completion | Sesiones iniciadas que llegan a finalizado con al menos una serie efectiva |
| Set logging friction | Mediana de tiempo e interacciones desde ejercicio preparado hasta `set_logged`; tasa de undo/error como señal auxiliar |
| Subscription conversion | Usuarios elegibles que ven un momento Pro contextual y comienzan Pro dentro de siete dias |
| Subscription churn | Suscripciones que cancelan o expiran / suscripciones activas al inicio del periodo |
| Product inactivity | Activados sin sesion completada durante 28 dias; no se confunde con churn de pago |

Estas definiciones deben versionarse antes de implementar telemetria. Un cambio
de definicion no puede reescribir silenciosamente las cohortes historicas.

## 8. Arquitectura de retencion

### Loop durante entrenamiento

`abrir -> ejercicio preparado -> serie -> recibo/rest -> siguiente serie ->
siguiente ejercicio -> completar -> resumen`

Ya existe: logger rapido, ultima serie, modalidades, recibo exacto, Deshacer,
timer, siguiente ejercicio, widget y notificacion. Falta: inicio inequivoco,
objetivo/progreso de sesion visible, cierre descubrible y resumen inmediato.

### Loop entre entrenamientos

`terminar -> entender que cambio -> ver proxima sesion -> volver el dia previsto`

Ya existe: rutina semanal, historial, PRs, recomendaciones conservadoras y
comparables. Falta: conectar esos datos al cierre y a Home.

### Loop semanal

`sesiones -> resumen semanal -> insight verificable -> decision de proxima semana`

Ya existe: sesiones, series, volumen, grupos musculares y periodos. Falta: un
resumen priorizado que elija uno o dos hechos, explique confianza y proponga una
accion editable. No debe sugerir "mas volumen" por defecto.

### Loop mensual

`tendencias -> PRs/estancamiento -> contexto -> ajuste de rutina o progresion`

Ya existe: 30/90 dias, e1RM, peso/reps, tiempo, distancia, asistencia, PRs y
anomalias. Falta: deteccion de estancamiento con umbrales transparentes,
comparacion de periodos y un flujo de ajuste que nunca cambie la rutina sin
confirmacion.

## 9. Progreso como motor de retencion

La primera respuesta de Progreso debe ser **"¿estoy mejorando?"**. Orden futuro:

1. resumen de entrenamiento;
2. progreso por ejercicio;
3. grupos musculares;
4. PRs;
5. volumen y frecuencia;
6. peso corporal, si el usuario lo registra;
7. Nutricion;
8. Habitos.

Acciones propuestas:

- Abrir Progreso en Gym/resumen para usuarios con entrenamiento; mantener un
  empty state honesto para quien aun no registro.
- Enlazar ejercicio y PR desde el resumen post-workout mediante los deep links
  actuales.
- Separar hechos (`+2 reps`, `3 sesiones`) de interpretaciones (`progresion
  probable`) y mostrar confianza.
- Mantener historia y exportacion accesibles en Free.
- No combinar score de Habitos, calorias y rendimiento en un unico numero
  "integral" que oculte la pregunta Gym.

## 10. Nutricion como soporte

Nutricion conserva su trabajo local-first: comidas, agua, recetas, porciones,
alimentos propios, metas y cache. Su framing principal pasa a ser:

- que consumi hoy;
- cuanto avance respecto de mi meta elegida;
- si proteina/calorias acompañan ganar musculo, perder grasa, mantener o rendir;
- como registrar la proxima comida rapidamente.

Home puede mostrar **una** linea de proteina/calorias solo si el usuario configuro
metas y registro alimentos. Agua debe ser opt-in contextual. Ausencia de registro
no significa mala nutricion. No se crean calculadoras clinicas, diagnosticos ni
recomendaciones medicas.

## 11. Habitos como capa de rendimiento y autonomia

Protocolo 0->100 no se elimina. Se reorganiza:

| Capa | Datos actuales | Presentacion futura |
| --- | --- | --- |
| Recuperacion/rendimiento | Sueño, pantalla nocturna, telefono en cama, actividad offline | Tarjeta contextual bajo Gym o en descanso, con lenguaje no medico |
| Desarrollo personal | Lectura/escritura, sin redes al despertar, accion diaria | Seccion Habitos accesible, sin competir con entrenamiento |
| Analitica ocasional | Pantalla total, ansiedad/impulso, dia manual, score detallado | Progreso de Habitos/Mas; no necesita aparecer cada dia |

La racha actual `score >= 70` permanece como historia del Protocolo, pero deja de
ser la racha principal de Home.

### Rachas separadas

- **Training consistency:** cumplimiento de sesiones programadas dentro de una
  ventana flexible; descanso y reprogramacion no rompen una cadena moral.
- **Logging consistency:** dias de entrenamiento con registro; informa calidad
  de datos, no rendimiento.
- **Performance:** PRs y tendencias comparables; nunca se expresa como racha.

No se combinan. Se permite pausar, cambiar frecuencia y registrar honestamente
sin penalizacion visual.

## 12. Principios psicologicos y UX

| Principio | Aplicacion legitima | Limite |
| --- | --- | --- |
| Feedback inmediato | Recibo exacto, haptica opcional, progreso real de sesion | No confeti repetitivo ni mensajes genericos |
| Progress principle | Series/ejercicios completados y comparables | No porcentajes si no hay objetivo definido |
| Goal gradient | Mostrar lo que falta de la rutina elegida | Permitir saltar/cambiar sin culpa |
| Endowed progress | Reconocer rutina o trabajo previo real | Nunca precargar logros falsos |
| Autonomia | Editar rutina, valores, frecuencia y recomendaciones | No modificar datos sin confirmacion |
| Competence | PRs verificados, mejora por ejercicio, confianza | No presentar estimaciones como certeza |
| Consistency | Proxima sesion y preparacion de valores | No rachas punitivas |
| Investment | Historial, rutina propia, exportacion y backup | Los datos propios no quedan tras paywall |
| Implementation intentions | Dia/rutina y recordatorio opt-in | No notificaciones compulsivas |

No se usa fake scarcity, fake social proof, culpa, bloqueo del logger, rachas que
incentiven falsificar ni dark patterns de cancelacion.

### Direccion visual

- El hero dominante es rutina/sesion/proxima accion.
- Durante entrenamiento dominan ejercicio, serie, reps/carga/tiempo/distancia,
  Guardar y descanso. Alta densidad operativa, targets grandes y poco adorno.
- Fuera de entrenamiento dominan comparaciones, PRs y proxima decision.
- Numeros grandes solo cuando responden una pregunta; no por decoracion.
- Exito de serie es discreto y exacto. Un PR merece jerarquia mayor, pero siempre
  explica tipo y comparable.

## 13. Presupuestos de time-to-value

| Escenario | Presupuesto objetivo |
| --- | --- |
| Instalacion -> primera serie valida | < 3 min; maximo tres preguntas antes de poder entrenar |
| Usuario con rutina, Home -> sesion iniciada | <= 2 taps y < 10 s |
| Sesion activa -> logger del ejercicio actual | 1 tap desde Home; 0 desde control Android activo |
| Serie habitual con valores correctos | 1 tap y < 5 s |
| Ajustar y guardar una serie | <= 3 interacciones comunes y < 10 s |
| Quick Access -> mutacion durable | < 5 s, una aplicacion aun con redelivery |
| Cambiar al siguiente ejercicio | 1 tap secuencial; <= 2 con selector |
| Finalizar -> ver resumen | <= 2 taps y < 10 s |
| Deshacer serie recien guardada | 1 tap durante 10 s, idempotente |

Los presupuestos se mediran por runtime y percentil; no basta una media global.

## 14. Onboarding Gym-first

Objetivo: primera serie valida, no perfil completo.

1. **Objetivo:** ganar musculo / fuerza / perder grasa / mantener / otro.
2. **Experiencia:** principiante / intermedio / avanzado.
3. **Rutina:** ya tengo / necesito una configuracion minima.

Reglas:

- Cada pregunta se puede omitir y editar despues.
- Si ya tiene rutina, permitir crear/importar sin obligar a clasificar todo.
- Si no tiene, ofrecer una configuracion minima revisable, no aplicar la rutina
  actual de cinco dias como decision invisible.
- Salida unica: **Empezar entrenamiento**.
- Datos de objetivo/experiencia son preferencias, no datos medicos ni permiso
  para prescribir.

Este onboarding no forma parte del primer PR; depende de poder representar
configuracion intencional con una decision explicita y compatible sobre
persistencia. Home v1 no crea esa senal ni intenta inferirla comparando la
rutina almacenada con la factory.

## 15. Arquitectura Free / Pro

Hipotesis de precio: **USD 1,99/mes**. No se implementan billing ni paywall en
este ciclo de roadmap.

| Feature | Free | Pro potencial | Motivo | Retencion | Conversion | Costo | Riesgo |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| Crear/editar rutinas | Completo | Igual | Es requisito del habito basico | 10 | 1 | 4 | 2 |
| Registrar todas las modalidades | Completo | Igual | No bloquear el acto central | 10 | 1 | 6 | 2 |
| Widget, notificacion y shortcuts basicos | Completo segun plataforma | Automatizaciones futuras | Es ventaja de activacion, no cebo | 9 | 3 | 6 | 5 |
| Historial y datos propios | Completo | Igual | Propiedad, confianza y portabilidad | 9 | 1 | 4 | 2 |
| Backup/exportacion/restore | Completo | Sync cloud futuro | Seguridad basica no se vende como rescate | 8 | 4 | 7 | 7 |
| Progreso basico por ejercicio | Ultima sesion, tendencia y PR basico | Comparativas/interpretacion avanzada | Free debe demostrar progreso | 10 | 8 | 6 | 5 |
| Periodos 30/90/todo | 30 dias y datos brutos completos | Comparativas guiadas 30/90 y patrones | Cobrar por analisis, no ocultar historia | 8 | 8 | 6 | 5 |
| Volumen y grupos musculares | Resumen actual comprensible | Balance, tendencias y filtros avanzados | Interpretacion acumulativa | 8 | 7 | 7 | 6 |
| Recomendacion de carga/reps | Ultima serie y objetivo manual | Sugerencia explicada con confianza | Valor recurrente Pro | 9 | 9 | 8 | 8 |
| Insight semanal | Un resumen factual | Insight priorizado, historial y acciones | Momento natural de valor | 9 | 9 | 7 | 6 |
| Estancamientos | Señal basica verificable | Explicacion, periodos y alternativas | Evita abandonar por falta de direccion | 8 | 8 | 8 | 8 |
| Nutricion/Habitos vinculados | Estado diario basico | Correlaciones descriptivas opt-in | Complemento, no diagnostico | 6 | 7 | 8 | 9 |
| Gym Party | Sala basica y entrenamiento compartido | Analitica/grupos ampliados por validar | Adquisicion y compromiso social | 6 | 6 | 9 | 9 |
| Cloud/sync | No requerido para uso local/offline | Futuro Pro | Costo operativo continuo | 7 | 8 | 10 | 10 |
| Privacidad y controles | Completo | Igual | Nunca cobrar por consentimiento o borrado | 8 | 0 | 4 | 2 |

### Momento provisional de monetizacion

Elegibilidad: **despues de tres entrenamientos completados que cubran al menos
siete dias y cuando exista el primer insight semanal real.** El usuario ve un
resumen factual Free y una vista previa honesta del analisis Pro.

Triggers secundarios aceptables:

- intento explicito de abrir una tendencia avanzada;
- solicitud de comparacion 30/90 dias;
- estancamiento verificable con una explicacion disponible.

Nunca mostrar paywall en primer launch, creacion de rutina, sesion activa,
Guardar/Deshacer, exportacion, restore o recuperacion de datos. Limitar
repeticion y permitir cerrar sin perder contexto.

## 16. Android Quick Access como ventaja central

Widget, notificacion, selector, pantalla bloqueada y PWA shortcut forman parte
del loop de entrenamiento, no del diagnostico tecnico.

- Home/Gym explica el acceso rapido despues de la primera sesion, no antes del
  primer valor.
- Estado real por runtime: Web, PWA y APK no prometen las mismas capacidades.
- El widget conserva reps, cuatro ajustes de carga, guardar, ejercicio y contexto
  comparable.
- La notificacion privada aparece solo durante sesion activa; `publicVersion`
  no expone ejercicio, carga ni reps.
- Quick Actions schema 1 y cola durable siguen siendo transporte hacia
  `workoutSessions`, no un segundo modelo.

Bug confirmado de Stable 96: `app/platform-capabilities.js`, `index.html` y
`workout-features.js` aun describen notificacion/pantalla bloqueada como beta o
pendientes. Debe corregirse como Phase 0, sin ampliar funcionalidad.

## 17. Gym Party

Tesis posible: entrenar con otros puede aumentar adquisicion, compromiso y
switching cost. Aun no existe evidencia para hacerlo la primera feature ni para
ponerlo detras de Pro.

- **Validacion tecnica pendiente:** dos clientes reales, backend compartido,
  reconexion, tombstones, privacidad e idempotencia.
- **Prioridad de producto:** posterior al loop individual Gym-first.
- **Monetizacion:** sala basica probablemente Free; grupos ampliados o analitica
  pueden evaluarse para Pro solo despues de validar uso y costos.

Gym Party fisico multi-cliente sigue `RISK ACCEPTED`, no PASS.

## 18. Telemetria privada y experimentacion

No se implementa aun. Diseño minimo:

- Opt-in explicito, revocable y desactivado por defecto.
- Antes del consentimiento solo pueden existir contadores locales.
- ID de instalacion aleatorio y reiniciable; sin fingerprinting ni IDs de datos
  canonicos.
- Retencion limitada y documentada; exportar/borrar consentimiento y eventos.
- Propiedades permitidas: build, runtime, pantalla, resultado, duracion en bucket,
  cantidad de interacciones y variante de experimento.
- Nunca enviar nombre de ejercicio, rutina o comida; peso, reps, notas, calorias,
  datos medicos, contenido del protocolo, sessionId canonico o Gym Party code.

Eventos candidatos:

`home_primary_action`, `routine_created`, `workout_started`,
`workout_completed`, `exercise_started`, `set_logged`, `set_undone`,
`rest_started`, `pr_achieved`, `progress_viewed`, `nutrition_entry_added`,
`habit_checkin_completed`, `paywall_viewed`, `pro_started`.

`set_logged` informa modo general y exito, nunca reps/carga. `pr_achieved`
informa tipo abstracto, no valor ni ejercicio. Telemetria y entitlement no deben
entrar en el primer PR Gym-first.

## 19. Top 10 oportunidades priorizadas

Escala 1-10. Riesgo y esfuerzo altos restan prioridad; confianza expresa la
calidad de evidencia.

| # | Oportunidad | Categoria | Impacto | Urgencia | Riesgo | Esfuerzo | Valor usuario | Confianza |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Home Gym-first por estado con una accion primaria | UX / retencion | 10 | 9 | 6 | 6 | 10 | Alta |
| 2 | Activacion sin rutina y quick workout start | UX / funcionalidad | 10 | 8 | 7 | 7 | 10 | Media |
| 3 | Resumen post-workout con PR/proxima sesion | UX / retencion | 9 | 8 | 6 | 6 | 9 | Alta |
| 4 | Progreso Gym como lectura principal y deep links contextuales | UX / funcionalidad | 9 | 8 | 7 | 7 | 10 | Alta |
| 5 | Reducir friccion de inicio/cierre y mostrar objetivo de sesion | UX / bug de flujo | 9 | 8 | 6 | 6 | 9 | Alta |
| 6 | Corregir verdad de capacidades Stable y descubrir Quick Access | bug / UX | 7 | 10 | 3 | 2 | 7 | Alta |
| 7 | Insight semanal y base justa Free/Pro | funcionalidad / monetizacion | 9 | 6 | 8 | 8 | 9 | Media |
| 8 | Nutricion y recuperacion contextuales en Home | UX / integracion | 7 | 5 | 7 | 6 | 7 | Media |
| 9 | Modelo privado de eventos y experimentos | privacidad / infraestructura | 7 | 5 | 9 | 8 | 5 | Media |
| 10 | Validacion Gym Party multi-cliente | datos / seguridad / test | 8 | 6 | 9 | 5 | 6 | Alta |

Validaciones externas paralelas, sin convertirlas en features: PWA fisica
iPhone y segundo OEM/launcher Android siguen `RISK ACCEPTED`.

## 20. Fases de implementacion

| Fase | Objetivo | Superficie probable | Riesgo / dependencias | Tests y fisico | Android / PWA / datos | Esfuerzo |
| --- | --- | --- | --- | --- | --- | --- |
| 0. Verdad Stable | Corregir estados Android publicados | `app/platform-capabilities.js`, `index.html`, `workout-features.js`, tests y assets | Bajo; no mezclar con rediseño | Unitarias, E2E runtimes, Axe, Samsung breve | WebView sync; sin schema | S |
| 1. Home Gym-first | Selector puro A-E, hero y CTA unico | Nuevo modulo puro de estado, `index.html`, Home styles, router/tests | Preservar registro diario, foco, drafts y deep links | Estados A-E, 320/390/desktop, teclado, Axe, PWA/APK y fisico | Assets Android; solo lectura de datos existentes | M |
| 2. Activacion | Onboarding minimo y rutina/quick start | Workout plan/UI, preferencias compatibles, Home | Requiere decision de persistencia y defaults | Nuevo/sin rutina/importar/skip/offline/restore | PWA y APK; migracion aditiva si hay nueva preferencia | M |
| 3. Flujo workout | Inicio explicito, objetivo, cierre visible y summary | `workout-features.js`, Gym UI/styles, progress links | No duplicar logger ni series; depende de Home | Todas modalidades, edit/undo, timer, proceso destruido, 320 px | Widget/notificacion/paridad; schema intacto | M |
| 4. Retencion Gym | Progreso primero, post-workout y resumen semanal factual | `progress/*`, workout metrics, Home | Comparabilidad/confianza; depende de sesiones suficientes | Fixtures por modalidad/periodo/anomalia; Axe y visual | Web/PWA/APK assets; sin cambio de Workout | L |
| 5. Contexto | Nutricion y Habitos como soporte | Nutrition/protocol selectors, Home secondary cards | Evitar claims medicos y dashboard gigante | Ausencia/parcial/completo, metas opt-in, backup | Local-first; schema 3 salvo propuesta separada | M |
| 6. Insight Pro | Entitlements y superficies Free/Pro, sin billing primero | Modulo de capacidades comerciales separado, Progress | Politica, offline, restauracion de compra futura | Matriz Free/Pro, accesibilidad, no bloquear datos | Posible cuenta futura; requiere ADR de datos | L |
| 7. Telemetria | Consentimiento y eventos privados versionados | Privacy, event adapter, docs/infra | Alto riesgo de privacidad; depende de politica aprobada | Payload allowlist, opt-out/delete, offline, seguridad | No Firebase nativo por defecto | L |
| 8. Hardening | Gym Party, iPhone y segundo OEM | Firebase/Gym Party, PWA, Android fisico | Entornos/hardware externos | Dos clientes, Safari fisico, launcher/OEM | Sin feature nueva salvo defecto reproducible | M |

Cada fase entra en PRs pequeños. Ninguna fase autoriza automaticamente la
siguiente ni una release Stable.

## 21. Primer PR productivo Gym-first recomendado

### Eleccion

**Home Gym-first por estados, manteniendo la navegacion actual.**

Comparacion:

| Candidato | Impacto activation/retention | Alcance | Decision |
| --- | ---: | ---: | --- |
| A. Home Gym-first | Muy alto | M | **Elegido** |
| B. Renombrar/reordenar navegacion | Medio sin Home nuevo | M | Posponer; cambia etiquetas antes que valor |
| C. Onboarding Gym-first | Alto para nuevos, nulo para actuales | M/L | Segundo; necesita estado Home sin rutina |
| D. Quick workout start | Alto, pero parcialmente existente | M | Integrar despues de un CTA Home inequivoco |
| E. Summary post-workout | Alto para retencion, no activation | M | Tercero |
| F. Fix capacidades Android | Correccion necesaria, impacto estrategico menor | S | Phase 0 independiente |

### Problema a resolver

Inicio Stable responde al protocolo diario y obliga a recordar que Gym existe.
No muestra rutina, sesion activa, entrenamiento terminado ni proxima accion. El
logger ya resuelve el trabajo interno; falta la puerta de entrada recurrente.

### Alcance exacto

- Crear un evaluador puro de estados A-E que lea plan, sesion, resumen e
  historial sin escribir almacenamiento.
- Reutilizar `WORKOUT_FEATURES.getQuickWorkoutState()` o extraer un selector
  de lectura equivalente; no duplicar reglas de series.
- Reemplazar el hero del primer viewport por rutina/sesion/proxima accion.
- Mantener el registro diario completo debajo como Habitos/Recuperacion.
- CTA: crear rutina, empezar, continuar, ver resumen o ver proxima sesion.
- Conservar `Inicio / Gym / Nutricion / Progreso / Mas` y todas las rutas.
- No incluir onboarding completo, summary nuevo, paywall, telemetria ni cambio de
  schema.

### Archivos probables

- `app/home-state.js` y/o un nuevo `app/gym-home-state.js` puro;
- `index.html` para composicion y handlers;
- `workout-features.js` solo si falta un selector read-only estable;
- `ui/router.js` unicamente para reutilizar rutas existentes, sin renombrarlas;
- `styles/modules.css` y `styles/responsive.css`;
- pruebas unitarias de estado, `tests/e2e/home-settings.spec.mjs`,
  `tests/e2e/web-core-flow.spec.mjs`, layout/visual/accessibility;
- assets Android regenerados con el script oficial, nunca editados a mano.

### Datos y compatibilidad

- `workoutSessions` sigue canonico.
- No cambia backup schema 3, claves, IndexedDB, localStorage ni
  SharedPreferences.
- Render de Home no crea una sesion; solo la accion explicita Empezar puede
  hacerlo mediante el flujo existente.
- Un usuario sin datos de Gym conserva acceso directo a registro diario.

### Riesgo y tamaño

**Riesgo medio, tamaño M.** El mayor riesgo es degradar el registro diario,
foco, drafts o deep links al cambiar jerarquia. Se controla con selector puro,
una unica accion primaria y pruebas por estado.

### Gates del PR

- Estados A-E deterministas y sin escrituras durante lectura.
- Home -> Gym en <= 2 taps; sesion activa -> Continue en 1.
- Registro diario, Nutricion, Progreso, Mas y Gym Party sin regresiones.
- Foco, `aria-live`, teclado, texto aumentado, reduced motion, 320 px, 390x844 y
  desktop.
- Browser, standalone PWA y APK confiable.
- Offline, update, drafts, back/forward y deep links.
- Paridad exacta de assets Android y smoke fisico en Samsung para Home/Gym.
- Quality gate completo antes de beta.

## 22. Estrategia de versionado y pruebas

Este roadmap no cambia versionado. Para el primer PR productivo:

- build Web/PWA debe ser mayor que 96; `97` es el candidato natural si sigue
  libre al cierre;
- como Home forma parte de los assets empaquetados Android, una beta APK debe usar
  `versionCode > 40`; `41` es el candidato natural si sigue libre;
- mantener version `2.7.0` salvo decision semantica explicita;
- incrementar una sola vez al cierre, regenerar precache y sincronizar assets;
- no tocar `.github/stable-release.json` ni publicar Stable automaticamente.

Piso de regresion actual: 403 Playwright, 14 skips deliberados, 33 Axe,
Firestore, artifact/offline, service worker, Android JVM/debug/release y paridad.
Los conteos pueden crecer, no reducirse sin explicacion y revision.

Estrategia:

- tests puros para cada selector de estado y metrica;
- E2E por estado, no solo screenshots;
- fixtures N-1 para datos/backups cuando una fase toque persistencia;
- pruebas fisicas no se sustituyen con Playwright o Gradle;
- medir time-to-value antes y despues con protocolo reproducible hasta que exista
  telemetria consentida;
- todo defecto reproducible adquiere regresion antes de cerrarse.

## 23. Non-goals explicitos

- No implementar billing, paywall, cuenta, cloud o telemetria en el primer PR.
- No migrar a React/Vue/Angular/Compose/Glance ni reescribir la arquitectura.
- No crear otro modelo de series, otra cola publica ni otro schema de mutaciones.
- No cambiar backup schema 3 ni retirar adaptadores legacy sin migracion.
- No convertir Home en un dashboard de Gym, Nutricion y Habitos con igual peso.
- No dar recomendaciones medicas ni prometer resultados fisicos.
- No activar Coins, rankings, referidos o afiliados; permanecen experimentales.
- No hacer Gym Party la primera feature ni añadir Firebase nativo Android.
- No usar notificaciones compulsivas, fake scarcity, rachas punitivas o datos
  inventados.
- No optimizar archivos grandes sin una medicion concreta.
- No modificar ni reemplazar Stable 96, su tag o release.

## 24. Criterios de exito del ciclo Gym-first

- Una persona entiende en Home que entrenamiento le toca y ejecuta una accion
  principal en segundos.
- Primera serie valida en menos de tres minutos sin cuestionario largo.
- Usuario recurrente abre y registra la siguiente serie en los presupuestos
  definidos.
- Finalizar produce una lectura util y una proxima accion.
- Progreso responde primero si el entrenamiento mejora, con comparables y
  confianza.
- Nutricion y Habitos aportan contexto sin competir ni emitir claims medicos.
- Free permite crear rutina, entrenar, registrar, conservar/exportar y ver
  progreso basico.
- Pro cobra por interpretacion adicional, no por rescatar datos o completar una
  sesion.
- No disminuye cobertura, accesibilidad, offline, privacidad ni compatibilidad.
- WTR, activation, D7 y friccion tienen definiciones versionadas antes de medir.

## Decision requerida

La siguiente autorizacion debe limitarse al **primer PR productivo Gym-first:
Home por estados**, con Phase 0 de capacidades como fix independiente si se
aprueba. Onboarding, summary post-workout, Pro, telemetria y cambios de
navegacion requieren decisiones posteriores.
