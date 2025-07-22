# Teacher Dashboard Plugin - Especificación Completa

## Índice

- [1. Información General](#1-información-general)
  - [1.1 Descripción del Plugin](#11-descripción-del-plugin)
  - [1.2 Objetivos y Propósito](#12-objetivos-y-propósito)
  - [1.3 Público Objetivo](#13-público-objetivo)
  - [1.4 Versión y Compatibilidad](#14-versión-y-compatibilidad)
- [2. Arquitectura del Sistema](#2-arquitectura-del-sistema)
  - [2.1 Diseño General](#21-diseño-general)
  - [2.2 Estructura de Datos](#22-estructura-de-datos)
  - [2.3 Flujo de Datos](#23-flujo-de-datos)
  - [2.4 Patrones de Diseño Utilizados](#24-patrones-de-diseño-utilizados)
- [3. Funcionalidades Principales](#3-funcionalidades-principales)
  - [3.1 Sistema de Bloques](#31-sistema-de-bloques)
  - [3.2 Sistema de Categorías](#32-sistema-de-categorías)
  - [3.3 Gestión de Cursos](#33-gestión-de-cursos)
  - [3.4 Enlaces Personalizados](#34-enlaces-personalizados)
  - [3.5 Drag & Drop Jerárquico](#35-drag--drop-jerárquico)
- [4. Interfaz de Usuario](#4-interfaz-de-usuario)
  - [4.1 Layout Principal](#41-layout-principal)
  - [4.2 Zona de Elementos Disponibles](#42-zona-de-elementos-disponibles)
  - [4.3 Bloques de Dashboard](#43-bloques-de-dashboard)
  - [4.4 Controles y Botones](#44-controles-y-botones)
- [5. Tecnologías Utilizadas](#5-tecnologías-utilizadas)
  - [5.1 Frontend](#51-frontend)
  - [5.2 Backend](#52-backend)
  - [5.3 Integración con Moodle](#53-integración-con-moodle)
- [6. API y Servicios Web](#6-api-y-servicios-web)
  - [6.1 External API Functions](#61-external-api-functions)
  - [6.2 AJAX Endpoints](#62-ajax-endpoints)
  - [6.3 Formato de Datos](#63-formato-de-datos)
- [7. Persistencia de Datos](#7-persistencia-de-datos)
  - [7.1 Estructura de Base de Datos](#71-estructura-de-base-de-datos)
  - [7.2 Configuración del Usuario](#72-configuración-del-usuario)
  - [7.3 Backup y Restauración](#73-backup-y-restauración)
- [8. Seguridad y Permisos](#8-seguridad-y-permisos)
  - [8.1 Capabilities](#81-capabilities)
  - [8.2 Validación de Datos](#82-validación-de-datos)
  - [8.3 Sanitización](#83-sanitización)
- [9. Instalación y Configuración](#9-instalación-y-configuración)
  - [9.1 Requisitos del Sistema](#91-requisitos-del-sistema)
  - [9.2 Proceso de Instalación](#92-proceso-de-instalación)
  - [9.3 Configuración Inicial](#93-configuración-inicial)
- [10. Mantenimiento y Troubleshooting](#10-mantenimiento-y-troubleshooting)
  - [10.1 Logs y Debugging](#101-logs-y-debugging)
  - [10.2 Problemas Conocidos](#102-problemas-conocidos)
  - [10.3 Optimización](#103-optimización)

---

## 1. Información General

### 1.1 Descripción del Plugin

El **Teacher Dashboard Plugin** es un plugin local de Moodle que proporciona a los profesores un dashboard personalizable para organizar y gestionar sus cursos, categorías y enlaces de manera eficiente. El plugin implementa un sistema de drag & drop jerárquico que permite reorganizar elementos a múltiples niveles.

**Características principales:**
- Dashboard personalizable con sistema de 4 bloques
- Drag & drop jerárquico entre bloques, categorías y elementos
- Gestión automática de cursos suscritos
- Creación y gestión de enlaces personalizados
- Persistencia de configuración por usuario
- Interfaz responsive y moderna

### 1.2 Objetivos y Propósito

**Objetivo Principal:** Proporcionar a los profesores una herramienta centralizada para organizar y acceder rápidamente a sus recursos educativos.

**Objetivos Específicos:**
- Reducir el tiempo de navegación entre cursos
- Permitir organización personalizada por categorías temáticas
- Facilitar el acceso a enlaces externos relevantes
- Mejorar la experiencia de usuario en la gestión de cursos
- Proporcionar una alternativa moderna al "My Moodle" tradicional

### 1.3 Público Objetivo

**Usuarios Primarios:**
- Profesores con rol de editing teacher
- Coordinadores académicos
- Administradores de curso

**Requisitos de Usuario:**
- Capability `local/teacher_dashboard:view`
- Rol de teacher en al menos un curso O ser administrador del sitio
- Capabilities de modificación de actividades en cursos

### 1.4 Versión y Compatibilidad

- **Versión Plugin:** 1.0.0
- **Moodle Compatibility:** 3.9+
- **PHP Requirements:** 7.4+
- **Browser Support:** Chrome 90+, Firefox 88+, Safari 14+
- **Mobile Support:** Responsive design compatible

---

## 2. Arquitectura del Sistema

### 2.1 Diseño General

El plugin sigue una **arquitectura en capas** con separación clara de responsabilidades:

```
┌─────────────────────────────────────┐
│           PRESENTATION              │
│  (HTML + CSS + JavaScript AMD)      │
├─────────────────────────────────────┤
│            BUSINESS                 │
│    (External API Functions)         │
├─────────────────────────────────────┤
│             DATA                    │
│  (Moodle DB API + User Preferences) │
└─────────────────────────────────────┘
```

**Componentes principales:**
- **Frontend:** Single Page Application usando AMD modules
- **API Layer:** External functions para AJAX communication
- **Data Layer:** Integración con Moodle core APIs

### 2.2 Estructura de Datos

**Jerarquía de Elementos:**
```
Dashboard
├── Block 1-4 (Bloques principales)
│   ├── Category A
│   │   ├── Course Item
│   │   ├── Custom Link
│   │   └── Course Item
│   └── Category B
│       └── Custom Link
├── Available Items Zone
│   ├── Subscribed Courses
│   ├── Available Categories  
│   └── Available Links
└── Configuration Data
```

**Estructura JSON de Configuración:**
```json
{
  "blocks": {
    "block-1": {
      "categories": [
        {
          "id": "cat-1",
          "name": "Cursos Principals",
          "items": [
            {
              "id": "course-123",
              "type": "course",
              "content": "Matemáticas Avanzadas",
              "url": "/course/view.php?id=123"
            }
          ]
        }
      ]
    }
  }
}
```

### 2.3 Flujo de Datos

**Inicialización del Dashboard:**
1. User access → Authentication check → Capability verification
2. Load saved layout from user preferences
3. Fetch subscribed courses via AJAX
4. Render dashboard with saved configuration
5. Initialize drag & drop event listeners

**Operación Drag & Drop:**
1. dragstart → Identify element type and source
2. dragover → Validate drop target compatibility  
3. drop → Move element in DOM and update data structure
4. Auto-save → Persist new configuration via AJAX

### 2.4 Patrones de Diseño Utilizados

**1. Module Pattern (AMD):**
```javascript
define(['jquery', 'core/ajax'], function($, Ajax) {
    // Encapsulated module functionality
    return { init: init };
});
```

**2. Observer Pattern (Event Delegation):**
```javascript
elements.$dashboard.on('dragstart', '.draggable-item', function(e) {
    // Event handling for dynamically created elements
});
```

**3. Factory Pattern (Element Creation):**
```javascript
function createCategoryHtml(id, name) {
    return `<div class="category">...</div>`;
}
```

---

## 3. Funcionalidades Principales

### 3.1 Sistema de Bloques

**Descripción:** El dashboard se organiza en 4 bloques principales que actúan como contenedores de alto nivel.

**Características:**
- Layout responsive (4 columnas → 2 columnas → 1 columna)
- Cada bloque puede contener múltiples categorías
- Headers personalizables con botones de acción
- Drag & drop de categorías entre bloques

**Implementación:**
```html
<div class="dashboard-block" data-block-id="block-1">
    <div class="block-header">
        <h2>📚 Bloque 1</h2>
        <button class="add-category-to-block">+</button>
    </div>
    <div class="block-content" data-drop-target="block-1">
        <!-- Categorías aquí -->
    </div>
</div>
```

### 3.2 Sistema de Categorías

**Descripción:** Las categorías son contenedores organizacionales que agrupan cursos y enlaces relacionados.

**Funcionalidades:**
- Creación dinámica de nuevas categorías
- Edición de nombres de categoría
- Drag & drop entre bloques
- Contenedor para elementos (cursos/enlaces)
- Drag handle específico para control preciso

**Estructura de Categoría:**
```html
<div class="category draggable-item" data-type="category">
    <div class="category-header">
        <h3>Nombre Categoría</h3>
        <span class="drag-handle">⋮⋮</span>
    </div>
    <ul class="course-list" data-drop-target="cat-id">
        <!-- Elementos aquí -->
    </ul>
</div>
```

### 3.3 Gestión de Cursos

**Descripción:** Integración automática con los cursos en los que el usuario está suscrito como profesor.

**Características:**
- Carga automática de cursos suscritos
- URLs directas a los cursos
- Información actualizada via AJAX
- Drag & drop hacia cualquier categoría
- Posibilidad de "devolver" a zona disponible

**API Integration:**
```javascript
Ajax.call([{
    methodname: 'local_teacher_dashboard_get_course_data',
    args: {},
    done: function(data) {
        var courses = JSON.parse(data.all_courses || '[]');
        loadCoursesIntoCategory(courses, 'reserva');
    }
}]);
```

### 3.4 Enlaces Personalizados

**Descripción:** Sistema para crear y gestionar enlaces externos personalizados.

**Funcionalidades:**
- Creación mediante prompt dialogs
- Validación de URLs
- Edición posterior de nombre y URL
- Mismo comportamiento drag & drop que cursos
- Persistencia en configuración del usuario

**Proceso de Creación:**
1. Click en "Nou Enllaç"
2. Prompt para nombre del enlace
3. Prompt para URL del enlace
4. Validación y creación del elemento
5. Aparición en zona de enlaces disponibles

### 3.5 Drag & Drop Jerárquico

**Descripción:** Sistema completo de arrastrar y soltar con soporte para múltiples niveles jerárquicos.

**Niveles de Operación:**

**Nivel 1 - Elementos (Cursos/Enlaces):**
- Source: Cualquier course-list
- Target: Cualquier course-list (dentro de categorías)
- Validación: Solo elementos pueden moverse a listas

**Nivel 2 - Categorías:**
- Source: Cualquier block-content o zona disponible
- Target: Cualquier block-content 
- Validación: Solo categorías pueden moverse a bloques

**Implementación Técnica:**
```javascript
elements.$dashboard.on('dragover', '.course-list, .block-content', function(e) {
    e.preventDefault();
    var $dropZone = $(this);
    var isCategory = $(draggedElement).hasClass('category');
    
    if ((isCategory && $dropZone.hasClass('block-content')) || 
        (!isCategory && $dropZone.hasClass('course-list'))) {
        $dropZone.addClass('item-drag-over');
    }
});
```

---

## 4. Interfaz de Usuario

### 4.1 Layout Principal

**Estructura Visual:**
```
┌──────────────────────────────────────────┐
│              HEADER                      │
│  Dashboard Title + Action Buttons        │
├──────────────────────────────────────────┤
│         AVAILABLE ITEMS ZONE             │
│  Cursos | Categorías | Enlaces           │
├──────────────────────────────────────────┤
│            MAIN BLOCKS                   │
│  [Block1] [Block2] [Block3] [Block4]     │
│                                          │
├──────────────────────────────────────────┤
│              FOOTER                      │
└──────────────────────────────────────────┘
```

**CSS Grid Implementation:**
```css
.dashboard-blocks {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
}

@media (max-width: 1200px) {
    .dashboard-blocks {
        grid-template-columns: repeat(2, 1fr);
    }
}
```

### 4.2 Zona de Elementos Disponibles

**Propósito:** Área central donde se almacenan todos los elementos disponibles para organizar.

**Secciones:**
1. **Cursos:** Lista automática de cursos suscritos
2. **Categorías:** Categorías creadas disponibles para usar
3. **Enlaces:** Enlaces personalizados creados por el usuario

**Estados Visuales:**
- Empty state con mensajes informativos
- Loading state durante carga AJAX
- Drag states durante operaciones

### 4.3 Bloques de Dashboard

**Diseño Individual:**
```html
<!-- Header del Bloque -->
<div class="block-header">
    <h2>📚 Título del Bloque</h2>
    <button class="add-category-to-block">+</button>
</div>

<!-- Contenido del Bloque -->
<div class="block-content" data-drop-target="block-id">
    <!-- Categorías y elementos -->
</div>
```

**Características Visuales:**
- Header con color distintivo (#34495e)
- Botón "+" para agregar categorías directamente
- Área de drop zone claramente definida
- Min-height para mantener proporción visual

### 4.4 Controles y Botones

**Botones Principales:**
- **"+ Nova Categoria":** Crear nueva categoría
- **"+ Nou Enllaç":** Crear nuevo enlace personalizado  
- **"Desar Configuració":** Guardar configuración manualmente

**Botones Secundarios:**
- **"+" en cada bloque:** Agregar categoría directamente al bloque
- **Drag handles (⋮⋮):** Control específico para arrastrar categorías

**Estados de Botones:**
```css
.dashboard-controls button {
    padding: 8px 16px;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

.dashboard-controls button:hover {
    background: #2980b9;
}
```

---

## 5. Tecnologías Utilizadas

### 5.1 Frontend

**HTML5:**
- Semantic markup
- Data attributes para configuración
- Drag & Drop API nativa

**CSS3:**
- CSS Grid para layout principal
- Flexbox para componentes
- CSS Transitions para animaciones
- Media queries para responsive design

**JavaScript:**
- AMD (Asynchronous Module Definition)
- ES6+ features (const, let, arrow functions)
- Event delegation patterns
- AJAX para comunicación asíncrona

### 5.2 Backend

**PHP 7.4+:**
- Object-oriented programming
- Moodle API integration
- External functions para web services

**Base de Datos:**
- Moodle Database API
- User preferences storage
- JSON data serialization

### 5.3 Integración con Moodle

**APIs Utilizadas:**
- `require_login()` - Authentication
- `context_system::instance()` - Context management  
- `require_capability()` - Permission checking
- `enrol_get_users_courses()` - Course enrollment data
- `get_string()` - Internationalization
- `user_preference_allow_ajax_update()` - Preference management

**AMD Module System:**
```javascript
define(['jquery', 'core/ajax'], function($, Ajax) {
    // Module implementation
});
```

---

## 6. API y Servicios Web

### 6.1 External API Functions

**local_teacher_dashboard_get_course_data:**
- **Propósito:** Obtener lista de cursos suscritos
- **Parámetros:** Ninguno (usa USER global)
- **Retorno:** JSON con array de cursos
- **Ubicación:** `/classes/external/get_course_data.php`

**local_teacher_dashboard_save_layout:**
- **Propósito:** Guardar configuración del dashboard
- **Parámetros:** `layoutdata` (JSON string)
- **Retorno:** Success confirmation
- **Ubicación:** `/classes/external/save_layout.php`

**local_teacher_dashboard_get_layout:**
- **Propósito:** Recuperar configuración guardada
- **Parámetros:** Ninguno
- **Retorno:** JSON con layout data
- **Ubicación:** `/classes/external/get_layout.php`

### 6.2 AJAX Endpoints

**Configuración en services.php:**
```php
$functions = array(
    'local_teacher_dashboard_get_course_data' => array(
        'classname'   => 'local_teacher_dashboard\external\get_course_data',
        'methodname'  => 'execute',
        'description' => 'Get course data for teacher dashboard',
        'type'        => 'read',
        'ajax'        => true,
        'loginrequired' => true,
    )
);
```

### 6.3 Formato de Datos

**Course Data Format:**
```json
{
    "id": 123,
    "fullname": "Matemáticas Avanzadas",
    "shortname": "MATH_ADV",
    "url": "/course/view.php?id=123",
    "categoryid": 5,
    "visible": 1
}
```

**Layout Data Format:**
```json
{
    "blocks": {
        "block-1": {
            "categories": [
                {
                    "id": "cat-123",
                    "name": "Cursos Principals",
                    "items": [
                        {
                            "id": "course-456",
                            "type": "course",
                            "content": "Álgebra Linear",
                            "url": "/course/view.php?id=456"
                        }
                    ]
                }
            ]
        }
    }
}
```

---

## 7. Persistencia de Datos

### 7.1 Estructura de Base de Datos

**Uso de User Preferences:**
El plugin utiliza el sistema de preferencias de usuario de Moodle para almacenar la configuración del dashboard.

**Preference Key:** `local_teacher_dashboard_layout`
**Storage:** Tabla `user_preferences` de Moodle
**Format:** JSON serializado

### 7.2 Configuración del Usuario

**Guardado Automático:**
- Triggered después de cada operación drag & drop
- Serialización JSON de la estructura completa
- Validación de datos antes de persistir

**Código de Guardado:**
```javascript
function saveCompleteConfiguration() {
    var config = { blocks: {} };
    
    elements.$blocksContainer.find('.dashboard-block').each(function() {
        // Recopilar configuración de cada bloque
    });
    
    Ajax.call([{
        methodname: 'local_teacher_dashboard_save_layout',
        args: { layoutdata: JSON.stringify(config) }
    }]);
}
```

### 7.3 Backup y Restauración

**Backup:**
- Las preferencias de usuario se incluyen automáticamente en backups de Moodle
- Exportación manual posible via admin interface

**Restauración:**
- Restauración automática al login
- Fallback a configuración por defecto si no existe configuración

---

## 8. Seguridad y Permisos

### 8.1 Capabilities

**Capability Definida:** `local/teacher_dashboard:view`

**Configuración en access.php:**
```php
$capabilities = array(
    'local/teacher_dashboard:view' => array(
        'captype' => 'read',
        'contextlevel' => CONTEXT_SYSTEM,
        'archetypes' => array(
            'editingteacher' => CAP_ALLOW,
            'manager' => CAP_ALLOW
        )
    )
);
```

### 8.2 Validación de Datos

**Validación de Entrada:**
- Verificación de tipos de datos
- Sanitización de URLs
- Validación de JSON structure
- Límites de longitud para nombres

**Ejemplo de Validación:**
```php
public static function execute($layoutdata) {
    $params = self::validate_parameters(
        self::execute_parameters(),
        array('layoutdata' => $layoutdata)
    );
    
    // Validar JSON
    $layout = json_decode($params['layoutdata'], true);
    if ($layout === null) {
        throw new invalid_parameter_exception('Invalid JSON data');
    }
    
    return $layout;
}
```

### 8.3 Sanitización

**Sanitización de Salida:**
- HTML encoding para nombres de categorías
- URL validation para enlaces personalizados
- XSS protection en todos los outputs

**Escape de Datos:**
```javascript
function createCategoryHtml(id, name) {
    // Escape HTML entities
    var safeName = $('<div>').text(name).html();
    return `<div class="category">${safeName}</div>`;
}
```

---

## 9. Instalación y Configuración

### 9.1 Requisitos del Sistema

**Servidor:**
- PHP 7.4 o superior
- Moodle 3.9 o superior
- MySQL 5.7+ o PostgreSQL 10+

**Cliente:**
- Navegadores modernos con soporte HTML5 Drag & Drop
- JavaScript habilitado
- Resolución mínima 1024x768

### 9.2 Proceso de Instalación

**Pasos de Instalación:**
1. Descargar el plugin en `/local/teacher_dashboard/`
2. Acceder como administrador
3. Ir a Site Administration → Notifications
4. Seguir el proceso de instalación automática
5. Verificar capabilities en Site Administration → Users → Permissions

**Verificación Post-Instalación:**
- Comprobar que aparece en la lista de plugins locales
- Verificar acceso a `/local/teacher_dashboard/index.php`
- Testear funcionalidad drag & drop

### 9.3 Configuración Inicial

**Configuración de Capabilities:**
```php
// En el contexto del sistema
assign_capability('local/teacher_dashboard:view', CAP_ALLOW, $teacherrole->id, $systemcontext);
```

**Configuración de Strings:**
- Verificar archivos en `/lang/en/` y `/lang/ca/`
- Customizar strings según necesidades institucionales

---

## 10. Mantenimiento y Troubleshooting

### 10.1 Logs y Debugging

**Debug Badges:**
El plugin incluye badges de debug visual para troubleshooting de drag & drop:

```css
.debug-badges {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
}
```

**Console Logging:**
- Todos los eventos drag & drop se loggean en console
- Estados de carga AJAX visible en dev tools
- Error handling con mensajes informativos

### 10.2 Problemas Conocidos

**1. Conflict con otros módulos AMD:**
- **Problema:** Múltiples sistemas drag & drop interfieren
- **Solución:** Verificar que solo se carga un módulo AMD de drag & drop

**2. Cache de navegador:**
- **Problema:** Cambios en AMD modules no se reflejan
- **Solución:** Hard refresh (Ctrl+F5) o purge Moodle cache

**3. Permissions no aplicadas:**
- **Problema:** Usuario no puede acceder al dashboard
- **Solución:** Verificar capability assignment y rol de teacher

### 10.3 Optimización

**Performance:**
- Lazy loading de cursos via AJAX
- Event delegation para elementos dinámicos
- Debounced auto-save para reducir llamadas AJAX

**Escalabilidad:**
- Configuración por usuario independiente
- Minimal database impact (solo user preferences)
- Responsive design para múltiples dispositivos

**Monitoreo:**
- Console logs para debugging
- Error tracking via AJAX fail callbacks
- User feedback mediante alerts informativas

---

## Conclusión

Este documento proporciona una especificación completa del Teacher Dashboard Plugin, cubriendo todos los aspectos técnicos, funcionales y de implementación. La arquitectura modular y el uso de estándares de Moodle garantiza compatibilidad y mantenibilidad a largo plazo.

Para información técnica detallada sobre problemas específicos, consultar los documentos complementarios en esta misma carpeta `doc/`.