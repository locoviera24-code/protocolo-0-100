# Firebase para Gym Party

Gym Party funciona sin Firebase en modo local/demo, pero dos telefonos reales
necesitan sincronizacion online. El MVP esta preparado para Firebase Spark:
Authentication anonimo, Email/Password opcional para recuperar cuenta en otro
dispositivo y Cloud Firestore. No usa Cloud Functions, Storage, imagenes ni
videos.

## Pasos

1. Crear proyecto en Firebase Console.
2. Activar Authentication.
3. En Authentication, habilitar proveedor **Anonymous**.
4. En Authentication, habilitar **Email/Password** si se quiere cambiar de
   dispositivo manteniendo la misma Gym Party y el mismo usuario.
5. Crear Cloud Firestore en modo production.
6. Copiar la configuracion web de Firebase.
7. Cargar esa configuracion con uno de estos caminos:

   - **GitHub Pages/APK recomendado:** crear secrets de GitHub con los nombres
     `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`,
     `FIREBASE_APP_ID`, `FIREBASE_MESSAGING_SENDER_ID` y
     `FIREBASE_STORAGE_BUCKET`. Los workflows generan `firebase-config.js`
     automaticamente al publicar web o compilar APK.
   - **Prueba local:** abrir **Gym Party > Firebase opcional** y pegar un JSON
     con:

```json
{
  "apiKey": "FIREBASE_API_KEY",
  "authDomain": "FIREBASE_AUTH_DOMAIN",
  "projectId": "FIREBASE_PROJECT_ID",
  "appId": "FIREBASE_APP_ID",
  "messagingSenderId": "FIREBASE_MESSAGING_SENDER_ID",
  "storageBucket": "FIREBASE_STORAGE_BUCKET"
}
```

8. Publicar reglas e indices desde `firebase/firestore.rules` y
   `firebase/firestore.indexes.json`.
9. Probar login anonimo desde la app.
10. Crear sala Firebase.
11. Para migrar entre dispositivos, abrir **Invitar amigo y administrar sala >
    Guardar acceso para otro dispositivo** y guardar email/clave.
12. En el dispositivo nuevo, abrir **Entrar desde otro dispositivo** y entrar
    con ese email/clave.
13. Copiar el codigo e invitar el segundo usuario desde iPhone/Safari/PWA.

`firebase-config.js` del repo es un stub seguro. Si faltan secrets, los
workflows conservan ese stub y la app sigue funcionando en modo demo/local.

Con Firebase CLI autenticado, desplegar desde la raiz:

```powershell
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project TU_PROJECT_ID
```

En Firebase Console tambien se puede pegar `firebase/firestore.rules`; los
indices compuestos de `firebase/firestore.indexes.json` deben crearse por CLI o
siguiendo el enlace que devuelve Firestore al detectar un indice faltante.

## Verificacion local con Emulator

Requiere Java 21 y dependencias instaladas:

```powershell
npm ci
npm run test:rules
```

`firebase/rules.test.mjs` cubre accesos validos y negativos: lectura fuera de
sala, escalado de rol, IDs incorrectos, escritura por otro usuario, limites de
miembros y valores invalidos de series/peso.

## Seguridad

La API key web de Firebase es publica por diseno. No agregues service accounts,
claves privadas ni credenciales administrativas al frontend.

Las reglas incluidas buscan que:

- un usuario lea solo salas donde es miembro;
- nadie liste todas las salas;
- un usuario cree/edite solo sus propios entrenamientos compartidos;
- un owner pueda actualizar/desactivar sala;
- no se lean datos de salas ajenas;
- no se modifiquen perfiles de otros usuarios;
- las invitaciones apunten a una sala activa.
- los updates usen solo campos permitidos y no cambien `partyId`, `userId`, rol
  o IDs inmutables;
- reps, peso, fechas, revisiones y tombstones tengan tipos/rangos validos.

Probar reglas en Firebase Emulator antes de usar datos reales. Las reglas no
deben reemplazarse por `allow read, write: if true` durante pruebas publicadas.

## Sincronizacion y recuperacion

- La app descarga cambios nuevos antes de subir su cola local.
- `revision`, `updatedAt`, `localDate`, `timeZone` y `utcOffset` permiten
  reconciliar ediciones entre dispositivos. `dirty`, `syncState`, intentos y
  errores son estado local de cola y no se suben a Firestore.
- Las eliminaciones son tombstones (`deleted`, `deletedAt`) y evitan que una
  serie borrada reaparezca.
- Los fallos conservan la cola y aplican backoff; no bloquean el entrenamiento.
- La sesion anonima persiste en el mismo navegador/PWA.
- Para cambiar de dispositivo conservando el mismo UID, cada usuario debe
  vincular su propio acceso email/clave antes de perder el dispositivo. El
  owner de la sala no guarda ni conoce la clave de otro miembro.

## Datos compartidos por defecto

Se comparte solo gym con consentimiento:

- alias;
- fecha;
- rutina;
- ejercicios;
- series;
- repeticiones;
- kilos;
- volumen;
- duracion;
- progreso semanal.

No se comparte por defecto:

- nutricion;
- sueno;
- ansiedad;
- pantalla/redes;
- peso corporal;
- notas privadas;
- correo visible;
- datos personales.

## Costos y performance

Para mantenerse en Spark/free tier:

- no usar listeners realtime permanentes por defecto;
- usar el boton **Sincronizar ahora**;
- cargar ultimas semanas;
- limitar sala recomendada a `MAX_GYM_PARTY_MEMBERS = 10`;
- no subir fotos ni videos;
- cachear o calcular semanalmente `weekly_member_stats` si el uso crece.
