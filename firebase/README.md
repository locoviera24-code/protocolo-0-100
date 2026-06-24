# Firebase para Gym Party

Gym Party funciona sin Firebase en modo local/demo, pero dos telefonos reales
necesitan sincronizacion online. El MVP esta preparado para Firebase Spark:
Authentication anonimo y Cloud Firestore. No usa Cloud Functions, Storage,
imagenes ni videos.

## Pasos

1. Crear proyecto en Firebase Console.
2. Activar Authentication.
3. En Authentication, habilitar proveedor **Anonymous**. Email/password puede
   agregarse despues si se quiere cuenta recuperable.
4. Crear Cloud Firestore en modo production.
5. Copiar la configuracion web de Firebase.
6. Cargar esa configuracion con uno de estos caminos:

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

7. Publicar reglas desde `firebase/firestore.rules`.
8. Probar login anonimo desde la app.
9. Crear sala Firebase.
10. Copiar el codigo e invitar el segundo usuario desde iPhone/Safari/PWA.

`firebase-config.js` del repo es un stub seguro. Si faltan secrets, los
workflows conservan ese stub y la app sigue funcionando en modo demo/local.

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

Probar reglas en Firebase Emulator antes de usar datos reales.

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
