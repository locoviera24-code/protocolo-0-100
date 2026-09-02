# Mapa del proyecto para personas no programadoras

Lectura estimada: 10-15 minutos.

## La idea principal

La aplicacion guarda primero en el dispositivo. Gym es el nucleo de
entrenamiento; Home muestra que toca hacer; Progreso calcula si hubo mejora;
Nutricion y Protocolo aportan contexto. Firebase solo se usa si la persona activa
Gym Party con backend.

```text
Lo que la persona registra
        |
        v
Datos locales validados -----> Backup JSON elegido por la persona
        |
        +-----> Home muestra la proxima accion
        +-----> Progreso calcula tendencias
        +-----> Gym Party comparte solo segun privacidad
```

## Que pasa al guardar una serie

1. Gym valida ejercicio, reps, carga y tipo de serie.
2. La serie recibe identidad y se agrega a una sesion en `workoutSessions`.
3. La capa de datos valida y guarda localmente; puede mantener una copia
   verificada en IndexedDB.
4. Home lee esa misma sesion para mostrar "continuar".
5. Progreso vuelve a calcular metricas desde esa sesion.
6. Si Gym Party esta activo, prepara una proyeccion segun privacidad.

```text
Guardar serie -> workoutSessions -> Home
                               +-> Progreso
                               +-> Backup
                               +-> Gym Party opcional
```

No existe otro historial principal escondido. El viejo `gymSessions` solo se
conserva para importar datos antiguos.

## Donde se guarda

El navegador mantiene un formato compatible en localStorage y usa IndexedDB
como almacenamiento primario/espejo para dominios habilitados. El registro de
schemas dice que claves existen, cuanto duran, si son sensibles y si entran al
backup. Si una copia se corrompe, la app puede aislarla y recuperar otra valida.

En Android, el widget/notificacion guarda temporalmente acciones en
SharedPreferences. Luego la WebView las importa una sola vez al mismo
`workoutSessions`.

## Que hace cada pantalla

- **Home:** interpreta plan, sesiones y borradores; no inventa entrenamientos.
- **Gym:** crea/edita la rutina y es dueño de sesiones y series.
- **Progreso:** lee registros y calcula tendencias; no guarda otra historia.
- **Nutricion:** guarda comidas, metas, recetas y porciones locales.
- **Protocolo:** guarda el registro diario y score historico.
- **Mas:** ajustes, datos, privacidad, backup y diagnostico.
- **Gym Party:** comparte opcionalmente una parte autorizada del entrenamiento.

## Que entra al backup

El servicio consulta el registro de datos y exporta los campos autorizados. No
incluye la clave tecnica FDC, secretos CI ni configuracion Firebase local
sensible. Antes de importar permite revisar, fusionar, reemplazar o conservar;
crea una copia recuperable para Deshacer.

## Web, PWA y APK

| Canal | Que es | Capacidades propias |
|---|---|---|
| Web | Sitio abierto en navegador | Producto local, sin bridge Android |
| PWA | Web instalada con cache offline | Standalone y actualizacion PWA |
| APK | Web empaquetada en wrapper Android | Widget, notificacion, bridges y cola nativa |

Los archivos Web se copian al APK con un script y se comparan por hash. La app
solo muestra capacidades APK cuando encuentra el contrato esperado
`AndroidBridge.getAppInfo`. Esa comprobacion distingue un navegador normal del
wrapper esperado, pero no es una autenticacion criptografica ni sustituye las
protecciones de WebView y contra inyeccion de scripts.

## Como llega un cambio a Stable

```text
Rama -> PR Draft -> gate local -> CI completo -> revision humana
      -> merge a main (candidato, no Stable)
      -> validacion fisica si aplica
      -> tarea de release autorizada y separada
      -> Android y Web/PWA se promueven con sus propios guards
```

`main` puede ir por delante de Stable. El archivo de version del producto y el
registro Stable son deliberadamente distintos. Un merge normal nunca debe
publicar por accidente.

## Donde buscar una respuesta

- Reglas para cambios: `AGENTS.md`.
- Ownership tecnico: `docs/architecture.md`.
- Datos: `docs/data-model.md`.
- Contratos que no se pueden romper: `docs/architecture-invariants.md`.
- Decisiones: `docs/adr/`.
- Riesgos conocidos: `docs/technical-debt-register.md`.
