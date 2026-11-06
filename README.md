# CLANHUB PWA — versión inicial

## Qué incluye
- Diseño responsive para móviles.
- Navegación entre Inicio, Miembros, Retos y Normas.
- Alta y eliminación local de integrantes.
- Marcado de asistencia.
- Aceptación del reto 1v1.
- Persistencia local mediante `localStorage`.
- Manifiesto PWA y service worker para caché offline.

## Importante
Esta versión es un prototipo funcional local. No incluye todavía autenticación, permisos reales, base de datos compartida ni sincronización entre dispositivos. Los cambios quedan guardados en el navegador del dispositivo donde se realizan.

## Cómo probar en tu computadora
Sirve la carpeta con un servidor local (no basta con abrir `index.html` para probar la instalación PWA):
```bash
python -m http.server 8000
```
Abre `http://localhost:8000`.

## Cómo publicar gratis para instalar en Android
1. Crea una cuenta en GitHub.
2. Sube los archivos de esta carpeta a un repositorio.
3. En el repositorio, abre Settings → Pages.
4. Activa publicación desde la rama principal y carpeta raíz.
5. Abre la URL HTTPS generada en Chrome en Android.
6. Menú ⋮ → Instalar aplicación o Añadir a pantalla de inicio.

El hosting debe servir HTTPS para que el service worker funcione en producción.

## Siguiente etapa
Conectar autenticación y base de datos (por ejemplo, Supabase), definir roles de administrador, líder, lideresa y miembro, y convertir los datos locales en datos compartidos.
