# Design

## Context

Proyecto nuevo (no hay código aún); el estado actual y la motivación están en proposal.md. Restricciones que moldean el diseño: un solo usuario privado, acceso multi-dispositivo, presupuesto mínimo de mantenimiento, y despliegue en plataforma estática tipo Vercel con datos en Supabase (decisión tomada en fase de exploración).

## Goals / Non-Goals

**Goals:**
- Infraestructura mínima de una persona: sin backend propio que mantener.
- Privacidad garantizada a nivel de base de datos (RLS), no solo de interfaz.
- Generación y agregación de la lista de compra determinista y testeable (función pura, separada de la UI).
- UI responsive donde la lista de compra sea cómoda en móvil.

**Non-Goals:**
- Copiar semana anterior, favoritas, fotos de recetas (candidatos para v2).
- Exportación/importación de datos, nutrición, rappel de calorías.
- Multi-usuario, invitaciones, registro público.

## Decisions

1. **Arquitectura: SPA estática en Vercel + Supabase.** Front-end TypeScript que llama a la API de Supabase (Postgres, Auth, RLS) directamente desde el cliente. Alternativas descartadas: servidor Node completo en Render/Fly (más superficie de mantenimiento sin beneficio en single-user) y 100% estático con localStorage (rompe multi-dispositivo).

2. **Stack front-end: Vite + React + TypeScript + React Router; Tailwind para estilos.** Requisito del responsive y tiempo de iteración. Alternativa: CSS modules a mano (viable en v1, pero doble trabajo para estados responsive); sustituir Tailwind por CSS puro es sabor, no arquitectura.

3. **Modelo de datos (Postgres/Supabase):**
   - `recipes` (id, name, food_type, servings, instructions, created_at)
   - `recipe_ingredients` (id, recipe_id, name, quantity numeric, unit enum: `uds|g|ml|approx`, pantry boolean)
   - `tags` (id, name unique) + `recipe_tags` (recipe_id, tag_id)
   - `plan_slots` (id, week_start date (lunes ISO), day_of_week 0-6, slot enum: `lunch|dinner`, recipe_id nullable; unique (week_start, day_of_week, slot))
   - `shopping_list_items` (id, week_start, name, quantity, unit, manual boolean, checked boolean) — guarda solo lo no derivable del plan: ítems manuales y estado "comprado"; el resto de la lista se reconstruye del plan.
   - Todas las tablas con RLS: solo accesibles con `auth.uid() = <cuenta única>` (limitado a usuarios autenticados).

4. **Auth: cuenta única por email+contraseña** creada manualmente en el panel de Supabase; registro deshabilitado; guard de sesión a nivel de router. Alternativa magic link (posible sin cambios de esquema). El requisito se cumple igual; elegimos contraseña por simplicidad de uso diario.

5. **Generación de la lista: función pura en cliente.** Entrada: plan de la semana + sus recetas. Clave de agregación: `(lower(name), unit)` — misma unidad suma, distinta unidad tiene línea propia. La línea con marca de despensa (`pantry = true`) queda excluida. Estado `checked` e ítems manuales persistidos por `(week_start, name, unit)`. Escalado por raciones: v1 multiplica la cantidad registrada, con hook para factor de comensales posterior. Testeable con datos de ejemplo sin desplegar nada.

6. **Sincronización: carga on-demand, sin realtime.** Cada vista trae sus datos al entrar; tras una edición se recarga la vista afectada. Realtime de Supabase se deja como mejora futura.

## Risks / Trade-offs

- [RLS mal configurado expone datos] → consultas siempre del lado servicio con anon key limitada; verificación manual de tablas sin policy antes de desplegar (doctor de SQL en las tasks).
- [Typos crean líneas de compra no agregadas ("zanahorias" vs "zanahoria")] → autocompletado sobre nombres ya usados y posibilidad de fusionar líneas manualmente en la lista.
- [Dependencia de Supabase de por vida] → el modelo es Postgres estándar; migrar a otro proveedor Postgres es portable.
- [App SPA sin backend propio no valida en el servidor] → aceptado para v1: RLS es la barrera; la validación de formularios va en el cliente y en constraints de la base.

## Migration Plan

Proyecto nuevo: crear proyecto Supabase → aplicar migraciones SQL versionadas en el repo (`supabase/migrations/`) → desplegar SPA en Vercel con variables de entorno de Supabase. Rollback trivial por ser greenfield: revertir el despliegue.

## Open Questions

- Estilo exacto de UI (tokens/tema); no afecta a specs ni tasks.
- Si el usuario prefiere magic link en vez de contraseña, el cambio es de configuración de Supabase, no de esquema.
