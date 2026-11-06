# CL4N TB3ST PWA — prototipo 0.2

## Incluye
- Identidad CL4N TB3ST y PWA instalable.
- Vista de prueba de roles: Líder, Decano y Miembro.
- Miembros: alta, edición de nombre/nick y eliminación según rol.
- Actividades creadas/editadas/eliminadas por líderes.
- Encuestas, votos visibles y confirmación de participación.
- Bloqueo de cancelación cuando falta una hora o menos para iniciar.
- Datos guardados localmente en el navegador.

## Limitación importante
Este prototipo todavía NO tiene autenticación ni base de datos compartida. El selector de rol es solo para probar la interfaz y cualquier usuario puede cambiarlo; no representa seguridad real. Los datos se guardan únicamente en el dispositivo. Para que todos los integrantes vean los mismos datos y los permisos sean reales, hay que conectar un backend (por ejemplo Supabase), configurar cuentas y aplicar políticas de seguridad en el servidor.

## Publicación
Reemplaza los archivos del repositorio de GitHub Pages con los de esta carpeta. No borres el repositorio. Al actualizar, cierra y vuelve a abrir la PWA; si sigue mostrando la versión anterior, limpia los datos/caché del sitio o espera la actualización del service worker.
