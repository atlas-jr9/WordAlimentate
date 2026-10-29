# Spec Delta

## Purpose

Planificar las comidas de semanas con fecha real: cada semana consta de 7 días con dos ranuras de comida (comida y cena) donde se asignan recetas.

## ADDED Requirements

### Requirement: Week-based planning
El planificador SHALL trabajar sobre semanas con fecha real (lunes a domingo de un calendario), no sobre plantillas repetitivas; el usuario navega entre semanas pasadas, actual y futuras.

#### Scenario: Navegar entre semanas
- **WHEN** el usuario avanza de semana en el planificador
- **THEN** se muestra el plan de la semana siguiente y el plan de otra semana no se ve afectado

#### Scenario: Plan retenido con el tiempo
- **WHEN** el usuario vuelve a una semana pasada
- **THEN** puede consultar qué recetas planificó ese semana

### Requirement: Two meal slots per day
Cada día de la semana SHALL tener dos ranuras de planificación: comida y cena.

#### Scenario: Ver la cuadrícula semanal
- **WHEN** el usuario abre el planificador
- **THEN** ve una vista de 7 días por 2 ranuras que identifica cada día por su fecha y cada ranura como comida o cena

### Requirement: Assign and remove recipes
El usuario SHALL poder asignar una receta a una ranura y retirarla de la misma; cada receta puede aparecer varias veces en una semana.

#### Scenario: Asignar receta desde el catálogo
- **WHEN** el usuario abre el selector de recetas en una ranura y elige una
- **THEN** la ranura queda vinculada a esa receta y la lista de compra de la semana la incorpora

#### Scenario: Asignar la misma receta dos veces
- **WHEN** el usuario asigna la misma receta a la comida del lunes y a la cena del jueves
- **THEN** ambas ranuras la muestran y la lista de compra acumula dos veces sus ingredientes

#### Scenario: Retirar receta de una ranura
- **WHEN** el usuario retira la receta de una ranura
- **THEN** la ranura queda vacía y los ingredientes de esa receta dejan de contribuir a la lista de compra de la semana

### Requirement: Slot vacancies allowed
Las ranuras SHALL poder quedarse vacías y la lista de compra SHALL generarse únicamente con las ranuras que tienen receta.

#### Scenario: Semana parcialmente vacía
- **WHEN** el usuario tiene solo tres ranuras planificadas y consulta la lista de compra
- **THEN** la lista contiene los ítems derivados de esas tres recetas y ningún ítem por las ranuras vacías
