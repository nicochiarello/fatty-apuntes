# Fatty Apuntes 📓

Web para alojar los apuntes de la facu del grupo, organizados por **Año → Materia → (Carpeta) → Apunte**.
Se sube en Markdown (`.md`), HTML (`.html`) o PDF, y se ve renderizado en el navegador, sin descargar nada.

Stack: **Next.js** (App Router, exportado como sitio estático) + **Firebase** (Auth con Google, Firestore, Storage, Hosting).

## 1. Crear el proyecto de Firebase

1. Andá a la [consola de Firebase](https://console.firebase.google.com/) y creá un proyecto nuevo.
2. **Authentication** → pestaña *Sign-in method* → habilitá el proveedor **Google**.
3. **Firestore Database** → creá una base (modo producción está bien, las reglas ya están en `firestore.rules`).
4. **Storage** → creá el bucket por defecto.
5. En **Configuración del proyecto → Tus apps**, agregá una app web (ícono `</>`) y copiá el objeto `firebaseConfig` que te muestra.

## 2. Configurar el proyecto localmente

```bash
npm install
cp .env.local.example .env.local
```

Completá `.env.local` con los valores del `firebaseConfig` que copiaste:

```text
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Editá también `.firebaserc` y reemplazá `REEMPLAZAR-CON-TU-PROJECT-ID` por el Project ID real de Firebase.

## 3. Correrlo en local (con los emuladores de Firebase)

Los navegadores modernos (Chrome, Firefox, Safari, Brave) bloquean por defecto el storage compartido entre `localhost` y `*.firebaseapp.com`, así que el login real de Google **no funciona de forma confiable en `localhost`**. Para desarrollo local se usan los emuladores de Firebase, que corren todo (Auth, Firestore, Storage) en tu máquina sin tocar el proyecto real:

```bash
# Terminal 1
npm run emulators

# Terminal 2
npm run dev
```

Con `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` en tu `.env.local` (ya viene así), la app se conecta automáticamente a los emuladores en vez de a Firebase real. Abrí [http://localhost:3000](http://localhost:3000), iniciá sesión (el emulador te deja elegir/crear un usuario de prueba, sin cuenta de Google real), creá un año, una materia, y subí un apunte de prueba. Los datos de los emuladores son descartables y no tocan tu base de datos real; podés ver/inspeccionarlos en la UI del emulador en [http://localhost:4000](http://localhost:4000).

Para probar contra el proyecto real de Firebase (por ejemplo antes de desplegar), poné `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false` — pero el login con Google en ese modo solo anda bien una vez desplegado (ver paso 4), no en `localhost`.

## 4. Desplegar a Firebase Hosting

Instalá el CLI de Firebase si no lo tenés, iniciá sesión, y conectá las reglas/índices e hosting:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes,storage:rules,hosting
```

Cada vez que quieras publicar cambios:

```bash
npm run build
firebase deploy --only hosting
```

Una vez desplegado, andá a **Authentication → Settings → Authorized domains** en la consola de Firebase y agregá el dominio de Hosting (`tu-proyecto.web.app`) para que el login con Google funcione en producción.

### CORS en el bucket de Storage

Los apuntes (Markdown/HTML) se leen con `fetch()` para renderizarlos, y eso requiere que el bucket de Storage tenga CORS habilitado para el dominio de la app — si no, el navegador bloquea la lectura con un error de CORS (aunque el link directo al archivo funcione). Se configura una sola vez con el [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`/`gsutil`):

```bash
gcloud auth login
gsutil cors set cors.json gs://tu-proyecto.firebasestorage.app
```

`cors.json` ya está en el repo con los orígenes de este proyecto (`web.app`, `firebaseapp.com`, `localhost:3000`) — actualizalo si cambiás de dominio.

## Cómo está organizado

- `src/lib/firebase/` — cliente de Firebase y funciones de lectura/escritura de Firestore/Storage (`years.ts`, `subjects.ts`, `folders.ts`, `notes.ts`).
- `src/lib/auth/AuthContext.tsx` — contexto de autenticación (Google Sign-In).
- `src/app/dashboard/` — año → materia → carpeta (opcional), con rutas por query string (`?id=`, `?year=`, `?subject=`) para que sea compatible con el export estático. Las carpetas son solo una etiqueta organizativa: un apunte con `folderId: null` vive "suelto" en la materia.
- `src/app/note/` — vista del apunte a pantalla completa (sin navbar del dashboard), misma convención de query params.
- `src/components/` — UI reutilizable (`ui/` primitivos, `years/`, `subjects/`, `notes/`, `layout/`).
- `firestore.rules` / `storage.rules` — cualquier usuario logueado con Google puede leer y escribir. No hay roles de admin.

## Limitaciones conocidas / posibles mejoras

- Borrar un año o materia no borra en cascada sus materias/apuntes (quedan huérfanos). Se podría agregar una Cloud Function o limpieza recursiva si molesta. Borrar una carpeta sí está resuelto: sus apuntes se mueven de vuelta a la materia en vez de perderse.
- No hay forma de mover un apunte ya subido a otra carpeta desde la UI — solo se asigna la carpeta al subirlo (o queda "suelto" si se sube desde la materia).
- No hay buscador global de apuntes todavía.
- Todos los usuarios logueados tienen los mismos permisos (crear, subir, borrar cualquier cosa). Si en algún momento querés un rol de admin, es cuestión de agregar un campo `role` en un doc de usuario y chequearlo en `firestore.rules` / `storage.rules`.
