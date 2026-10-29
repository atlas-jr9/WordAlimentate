# Spec Delta

## Purpose

Protege el contenido del recetario con un acceso único y privado: sin registro público, todos los datos y pantallas requieren una sesión autenticada.

## ADDED Requirements

### Requirement: No public registration
La aplicación no SHALL offering registro público ni accesos anónimos; la cuenta es única y se crea manualmente en el proveedor de datos.

#### Scenario: Intento de registro público
- **WHEN** un visitante anónimo abre la aplicación
- **THEN** no existe ninguna vía de registro o de creación de cuentas expuesta en la interfaz

### Requirement: Session required for all content
Toda vista y todo acceso a datos SHALL requerir una sesión autenticada; sin sesión, la aplicación muestra solo la pantalla de acceso.

#### Scenario: Acceso sin sesión
- **WHEN** un usuario no autenticado intenta abrir cualquier pantalla o descargar datos
- **THEN** es redirigido a la pantalla de acceso y los datos permanecen inaccesibles

#### Scenario: Sesión persistente entre dispositivos
- **WHEN** el usuario se autentica desde un dispositivo nuevo
- **THEN** puede consultar y editar sus recetas, plan y lista de compra desde ese dispositivo sin depender de otro

### Requirement: Log out
La aplicación SHALL permitir cerrar la sesión desde cualquier dispositivo.

#### Scenario: Cierre de sesión
- **WHEN** el usuario pulsa "Cerrar sesión"
- **THEN** la sesión termina en ese dispositivo y el acceso posterior a los datos requiere autenticarse de nuevo
