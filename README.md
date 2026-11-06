# CL4N TB3ST — aplicación PWA

## Identidad
El nombre oficial de la aplicación es **CL4N TB3ST**. Ese nombre se usa en el título, la interfaz y el manifiesto instalable.

## Estado actual
- Interfaz PWA existente con secciones de Inicio, Integrantes, Actividades, Retos y Normas.
- El prototipo anterior guarda información en el navegador y su selector de roles no es seguro.
- Se añadió `supabase/schema.sql` como base de datos inicial: perfiles con teléfono único, integrantes, actividades, asistencia y encuestas.
- La base de datos aplica políticas RLS. Los nuevos perfiles solo pueden crearse como `Miembro`; los rangos elevados no se asignan desde la interfaz pública.

## Configuración pendiente
1. En Supabase, abre **SQL Editor**.
2. Copia el contenido de `supabase/schema.sql` y ejecútalo en el proyecto correcto.
3. Después habrá que implementar y configurar el mecanismo de autenticación y recuperación antes de retirar el modo de demostración.

## Importante sobre la recuperación sin SMS
El esquema de base de datos no envía mensajes ni verifica que una persona controle un número telefónico. La recuperación asistida por líderes requiere una función segura del servidor y un proceso de comprobación. No se debe tratar un teléfono no verificado como prueba suficiente de identidad.

## Seguridad
Nunca publiques la clave `service_role`, contraseñas de base de datos ni secretos de funciones en el código del navegador. La clave publicable puede utilizarse en el frontend con RLS correctamente configurado.
