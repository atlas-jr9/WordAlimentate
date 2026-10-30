# Tasks

## 1. Setup e infraestructura

- [x] 1.1 Scaffold Vite + React + TypeScript con ESLint y Tailwind; verificar que `npm run build` completa y genera el bundle
  <!-- Inicializa el proyecto base con toda la tooling del stack decidido. -->
- [x] 1.2 Crear proyecto Supabase y guardar credenciales (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) como variables de entorno de Vercel y `.env.local`
  <!-- Configura el servicio de datos externo sin exponer claves en el repo -->
- [x] 1.3 Escribir migración SQL inicial con tablas `recipes`, `recipe_ingredients`, `tags`, `recipe_tags`, `plan_slots`, `shopping_list_items` (constraints y unique por design.md); verificar que se aplica en Supabase limpia sin errores
  <!-- Crea el modelo de datos versionado en el repo -->
- [x] 1.4 Activar RLS en todas las tablas con policies que solo den acceso a usuarios autenticados; verificar con SQL que un anon call no ve filas y el usuario sí
  <!-- Garantiza la privacidad a nivel de base de datos, no de interfaz -->
- [x] 1.5 Crear la cuenta única en el panel de Supabase con registro público deshabilitado; verificar que el intento de signup desde API falla
  <!-- Deja el acceso cerrado a un solo usuario: requisito de private-access -->
- [x] 1.6 Conectar el repo a Vercel y desplegar el scaffold vacío; verificar la URL de preview responde
  <!-- Confirma el pipeline de despliegue antes de escribir features -->

## 2. Acceso privado

- [x] 2.1 Configurar cliente Supabase Auth y sesión de login por email+contraseña; verificar que login con credenciales correctas crea sesión y las incorrectas fallan con mensaje claro
  <!-- Implementa la puerta de entrada de la app -->
- [x] 2.2 Añadir guard en el router: rutas privadas redirigen a /login sin sesión y la sesión persiste tras recargar; verificar manualmente ambos casos
  <!-- Cubre el requisito "session required for all content" -->
- [x] 2.3 Añadir botón de cerrar sesión en la navegación; verificar que tras cerrar sesión se vuelve a /login y no se ve contenido
  <!-- Completa el flujo de sesión -->
- [x] 2.4 Test de componente del login (renderizado y error de credenciales inválidas); verificar que el test corre en local
  <!-- Fija el comportamiento del acceso en un test automatizado -->

## 3. Catálogo de recetas

- [x] 3.1 Modelar tipos TypeScript y funciones de acceso a datos para recetas e ingredientes (CRUD contra Supabase); verificar con datos reales insertados desde la app
  <!-- Pone la capa de datos del catálogo lista para la UI -->
- [x] 3.2 Crear pantalla de listado con tarjeta de receta (nombre, tipo, etiquetas, nº raciones); verificar que una receta creada aparece listada
  <!-- Primera vista del catálogo visible al usuario -->
- [x] 3.3 Implementar editor de receta: ingredientes dinámicos (añadir/quitar filas con nombre, cantidad, unidad del enum, marca despensa), raciones, instrucciones y guardado con validación de nombre y de al menos un ingrediente; verificar guardado y re-lectura correcta y el caso de error con datos faltantes
  <!-- CRUD completo de la entidad central -->
- [x] 3.4 Añadir filtro por tipo de comida + combinación de etiquetas libres y búsqueda de nombre sin acentos/mayúsculas; verificar los 3 filtros aplicados en serie y que se combinan entre sí
  <!-- Cubre los requisitos de filtrado y búsqueda del catálogo -->
- [x] 3.5 Implementar eliminación de receta con confirmación y limpieza de ranuras que la referencian; verificar que tras borrar una receta planificada la ranura queda vacía
  <!-- Evita referencias huérfanas en el plan -->
- [ ] 3.6 Test de la lógica de filtrado/búsqueda con fixtures de recetas; verificar que el test corre
  <!-- Asegura que los filtros no se rompen en el futuro -->

## 4. Planificador semanal

- [ ] 4.1 Modelar tipos y acceso a datos de `plan_slots` (leer semana, upsert ranura, vaciar ranura) con `week_start` como lunes ISO; verificar operación de datos con dos semanas distintas de forma independiente
  <!-- Capa de datos del planner sobre semanas reales -->
- [ ] 4.2 Implementar vista semanal 7 días × 2 ranuras (comida/cena) con navegación entre semanas (anterior/siguiente/hoy); verificar que las semanas muestran planes distintos
  <!-- La cuadrícula del planificador y su requisito de semanas con fecha -->
- [ ] 4.3 Implementar selector de receta por ranura: elegir desde el catálogo, asignar la misma receta dos veces y vaciar la ranura; verificar que la vista refleja siempre el estado de la base de datos
  <!-- Cubre "assign and remove recipes" -->
- [ ] 4.4 Layout responsive del planificador: tarjeta de día en móvil en columna y tabla amplia en escritorio; verificar en viewport de 375 px y 1440 px
  <!-- Requisito responsive en la vista más gráfica -->

## 5. Lista de la compra

- [ ] 5.1 Implementar función pura de generación: agrega por `(lower(name), unit)` del plan activo, escala según raciones registradas y excluye despensa; verificar con tabla de casos: 2+3 uds → 5, arroz g vs lata → 2 líneas, receta doble duplica, el ingrediente de despensa no aparece
  <!-- El núcleo de agregación, testeado sin UI -->
- [ ] 5.2 Persistir estado `checked` e ítems manuales en `shopping_list_items` por `(week_start, name, unit)`; verificar que recargar y cambiar de dispositivo mantiene la marca de comprado
  <!-- Requisitos de check-off persistente -->
- [ ] 5.3 Implementar vista de lista: ítems con checkbox de comprado y cantidad+unidad, ítems manuales visibles como tal y opción de añadirlos/quitarlos; verificar añadir, marcar, desmarcar y borrar un manual
  <!-- La UI de compra con su gestión interactiva -->
- [ ] 5.4 Enlazar lista y plan: al abrir la lista se reconstruye desde el plan actual y refresca tras cambios del plan; verificar que asignar/retirar receta cambia la lista en la siguiente consulta
  <!-- "La lista sigue al plan" -->
- [ ] 5.5 Layout móvil-first de la lista como vista primaria, con checkbox de un solo pulgar y navegación accesible; verificar el uso en 375 px y que la navegación no desplaza la lista
  <!-- Requisito "mobile-first list view" -->
- [ ] 5.6 Test de integración del flujo completo receta → plan → lista con fixtures; verificar el test de extremo de la generación
  <!-- Verificación de sistema entre capas, no de una sola -->

## 6. Cierre y despliegue

- [ ] 6.1 Ajustar la navegación global (recetas/plan/compra) con estados vacíos amigables en las 3 vistas; verificar que cada vista tiene estado de vacío legible
  <!-- El pulido de UX para no dejar pantallas en blanco -->
- [ ] 6.2 Revisar responsive final en móvil y escritorio sobre las 3 vistas en conjunto; verificar que no hay desbordes ni controles inalcanzables en 375 px/1440 px
  <!-- Última pasada de responsive integral -->
- [ ] 6.3 Redesplegar en Vercel en producción y ejecutar un smoke test manual con una receta real de punta a punta; verificar que el flujo login → receta → plan → compra funciona en móvil y PC
  <!-- Aceptación final contra el entorno real -->

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result.
