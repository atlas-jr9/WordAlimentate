# Spec Delta

## Purpose

Lista de la compra semanal generada automáticamente desde el plan: agrega ingredientes por unidad, escala por raciones, excluye la despensa y permite uso interactivo en el súper.

## ADDED Requirements

### Requirement: List generated from the weekly plan
La aplicación SHALL generar la lista de la compra a partir de las ranuras planificadas de la semana; los ingredientes de despensa no aparecen en la lista.

#### Scenario: Generar lista de la semana
- **WHEN** el usuario abre la lista de la compra de la semana actual
- **THEN** aparece el conjunto de ingredientes de todas las recetas planificadas, salvo los marcados como despensa

#### Scenario: La lista sigue al plan
- **WHEN** el usuario asigna o retira una receta en el plan
- **THEN** la lista de la compra refleja el cambio en su próxima consulta

### Requirement: Aggregate by ingredient and unit
Ingredientes con el mismo nombre y la misma unidad SHALL sumarse en una única línea con la cantidad total; con la misma unidad pero nombres distintos quedan en líneas separadas, así como el mismo ingrediente con unidades distintas.

#### Scenario: Sumar misma unidad
- **WHEN** dos recetas de la semana usan zanahorias en unidades (2 y 3)
- **THEN** la lista muestra una única línea con 5 unidades

#### Scenario: Unidades distintas separan líneas
- **WHEN** una receta usa 500 g de arroz y otra 1 lata de arroz
- **THEN** la lista muestra dos líneas separadas de arroz, una por cada unidad

### Requirement: Scale by servings
Cada receta de la lista SHALL contribuir a las cantidades escalando por su número de raciones, cuando la unidad lo permite (no aplica a "al gusto" ni a cuantificadores aproximados como "1 lata").

#### Scenario: Receta de varias raciones
- **WHEN** una receta de 4 raciones que usa 400 g de carne está planificada
- **THEN** la lista suma 400 g de carne por esa receta tal como cantidades directas; si el usuario registra la receta con raciones distintas, las cantidades se muestran en proporción a las raciones registradas

### Requirement: Checked-off state persists
Cada ítem de la lista SHALL poder marcarse como "comprado" y su estado se conserva entre sesiones y dispositivos de la misma semana.

#### Scenario: Marcar comprado en el súper
- **WHEN** el usuario marca un ítem como comprado desde el móvil
- **THEN** el estado persiste y sigue marcado al reabrir la lista después

### Requirement: Manual list items
El usuario SHALL poder añadir a la lista ítems que no provienen de ninguna receta (con cantidad y unidad opcionales) y eliminarlos cuando ya no hacen falta.

#### Scenario: Añadir ítem manual
- **WHEN** el usuario añade "papel de cocina" a la lista
- **THEN** el ítem aparece listado sin vínculo a ninguna receta y puede marcarse como comprado

#### Scenario: Eliminar ítem manual
- **WHEN** el usuario elimina un ítem manual
- **THEN** desaparece de la lista y no reaparece al regenerarla

### Requirement: Mobile-first list view
En pantallas de móvil, la lista de la compra SHALL presentarse como vista de uso primario: cómoda de consultar y de marcas con un solo pulgar.

#### Scenario: Consultar en móvil
- **WHEN** el usuario abre la lista de la compra en un móvil
- **THEN** los ítems se muestran a lo ancho de la pantalla con el control de "comprado" a un lado, y la navegación a otras vistas queda disponible sin desplaçar la lista
