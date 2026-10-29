# Proposal

## Why

Es necesario organizar las comidas de la semana de forma personal: guardar y consultar recetas privadas (ingredientes, cantidades, instrucciones), planificar el menú semanal y generar automáticamente la lista de la compra. Los datos deben centralizarse para usar la app desde varios dispositivos (PC en casa, móvil en el supermercado).

## What Changes

- Aplicación web privada, single-user y multi-dispositivo: sin registro público, una única cuenta con sesión obligatoria para todo el contenido.
- Catálogo de recetas con CRUD: ingredientes (nombre, cantidad, unidad), nº de raciones, instrucciones, campo fijo "tipo de comida" y etiquetas libres, con listado filtrable y búsqueda por nombre.
- Marca por ingrediente de "despensa" (sal, aceite, etc.) para excluirlos de la lista de la compra.
- Planificador semanal de semanas con fecha real (no plantilla): 7 días × 2 ranuras (comida y cena), con asignación y retirada de recetas en cada ranura.
- Lista de la compra generada a partir del plan de la semana: agregación por ingrediente (misma unidad se suma, unidades distintas en líneas separadas), escalado por raciones de cada receta y exclusión de ingredientes de despensa.
- Lista de la compra interactiva: marcar "comprado" con estado persistente y añadir/eliminar ítems manuales que no provienen de ninguna receta.
- Interfaz responsive, con la lista de la compra como vista destacada en móvil.
- Infraestructura: front-end TypeScript en Vercel y Supabase (Postgres + Auth + RLS) como capa de datos; sin backend propio.

## Capabilities

### New Capabilities

- `private-access`: acceso restringido a un único usuario privado (sin registro público); toda lógica y datos requieren sesión autenticada.
- `recipe-catalog`: CRUD y consulta de recetas con ingredientes, cantidades, unidades, raciones, instrucciones, tipo de comida y etiquetas; filtrado y búsqueda.
- `weekly-planner`: planificación de semanas reales con fecha, disposición 7 días × 2 ranuras (comida/cena) y gestión de recetas por ranura.
- `shopping-list`: lista de la compra generada desde el plan semanal (agregación, escalado por raciones, exclusión de despensa) y gestión interactiva (comprado persistente, ítems manuales).

### Modified Capabilities

- Ninguna; es un proyecto nuevo sin specs previas.

## Impact

- Sin código previo que modificar: repositorio virgin salvo `openspec/`.
- Nuevas dependencias: framework front-end TypeScript (Vite), cliente JS de Supabase, suele añadirse librería de estilos ligera.
- Servicios externos: proyecto Supabase (tablas `recipes`, `recipe_ingredients`, `recipe_tags`, `tags`, `plan_slots`, `shopping_list_items`, con RLS) y despliegue en Vercel.
- Riesgos: configurar RLS correctamente (es el requisito de privacidad), y la normalización de cantidades/unidades al agregar la compra.
