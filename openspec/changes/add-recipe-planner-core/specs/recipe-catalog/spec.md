# Spec Delta

## Purpose

Gestión del recetario: crear, editar, consultar y eliminar recetas con ingredientes, cantidades, raciones e instrucciones, organizadas por tipo de comida y etiquetas.

## ADDED Requirements

### Requirement: Recipe creation and editing
El usuario SHALL poder crear y editar una receta con nombre, número de raciones, instrucciones y una lista de ingredientes, cada uno con nombre, cantidad y unidad.

#### Scenario: Crear receta completa
- **WHEN** el usuario guarda una receta con nombre, raciones, al menos un ingrediente y sus instrucciones
- **THEN** la receta queda almacenada y aparece en el catálogo

#### Scenario: Crear sin datos obligatorios
- **WHEN** el usuario intenta guardar una receta sin nombre o sin ingredientes
- **THEN** la aplicación indica qué falta y no guarda la receta

### Requirement: Ingredient units
Cada ingrediente SHALL tener una unidad entre un conjunto definido: unidades, gramos, mililitros, litros o cuantificador aproximado ("al gusto", "1 lata", "1 diente"), además del marcador opcional de despensa.

#### Scenario: Seleccionar unidad
- **WHEN** el usuario añade un ingrediente a una receta
- **THEN** elige su unidad del conjunto definido y el marcador de "despensa" queda a su disposición

#### Scenario: Marcar despensa
- **WHEN** el usuario marca un ingrediente como despensa en una receta
- **THEN** ese ingrediente queda registrado con el marcador y no participará en la lista de la compra

### Requirement: Recipe deletion
El usuario SHALL poder eliminar una receta y, en ese caso, las ranuras del plan que la referencian quedarán vacías.

#### Scenario: Eliminar receta planificada
- **WHEN** el usuario elimina una receta que está asignada a ranuras de la semana actual
- **THEN** la receta desaparece del catálogo y las ranuras que la incluían quedan vacías, sin romper la planificación ni la lista de compra

### Requirement: Filter by food type
El catálogo SHALL ofrecer un filtro por "tipo de comida" a partir de un conjunto fijo (por ejemplo: pasta, carne, pescado, vegetarina, legumbre, arroz...); la receta tiene exactamente un tipo.

#### Scenario: Filtrar por tipo
- **WHEN** el usuario selecciona un tipo de comida
- **THEN** el catálogo muestra solo las recetas de ese tipo

### Requirement: Free tags
Cada receta SHALL poder llevar etiquetas libres definidas por el usuario, y el catálogo SHALL poder filtrar por combinación de etiquetas de manera combinable con el tipo de comida.

#### Scenario: Filtrar por etiquetas combinadas
- **WHEN** el usuario activa dos etiquetas libres
- **THEN** el catálogo muestra las recetas que llevan ambas etiquetas, y puede refinar el resultado con un tipo de comida a la vez

### Requirement: Search by name
El catálogo SHALL permitir buscar recetas por coincidencia con el nombre.

#### Scenario: Buscar receta
- **WHEN** el usuario escribe texto en el buscador
- **THEN** el catálogo queda reducido a las recetas cuyo nombre lo contiene (sin distinguir mayúsculas de minúsculas ni acentos)
