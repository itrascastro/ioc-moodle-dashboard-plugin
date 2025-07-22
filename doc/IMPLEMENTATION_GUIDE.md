# Implementation Guide - Teacher Dashboard Plugin

## Índice

- [1. Arquitectura General](#1-arquitectura-general)
- [2. Estructura de Archivos](#2-estructura-de-archivos)
- [3. Implementación Frontend](#3-implementación-frontend)
  - [3.1 AMD Module Structure](#31-amd-module-structure)
  - [3.2 HTML Structure](#32-html-structure)
  - [3.3 CSS Architecture](#33-css-architecture)
- [4. Implementación Backend](#4-implementación-backend)
  - [4.1 External API Functions](#41-external-api-functions)
  - [4.2 Database Integration](#42-database-integration)
  - [4.3 Moodle Integration](#43-moodle-integration)
- [5. Drag & Drop System](#5-drag--drop-system)
- [6. Data Flow](#6-data-flow)
- [7. Configuration Management](#7-configuration-management)
- [8. Security Implementation](#8-security-implementation)
- [9. Performance Optimizations](#9-performance-optimizations)
- [10. Testing Strategy](#10-testing-strategy)

---

## 1. Arquitectura General

### 1.1 Patrón Arquitectónico

El plugin sigue un patrón **MVC modificado** adaptado a Moodle:

```
┌─────────────────────────────────────┐
│              VIEW LAYER             │
│     (HTML + CSS + JavaScript)       │
│  - index.php (HTML structure)       │
│  - styles.css (presentation)        │
│  - dashboard.js (behavior)          │
├─────────────────────────────────────┤
│           CONTROLLER LAYER          │
│         (External Functions)        │
│  - get_course_data.php              │
│  - save_layout.php                  │
│  - get_layout.php                   │
├─────────────────────────────────────┤
│             MODEL LAYER             │
│        (Moodle Core + Data)         │
│  - User Preferences                 │
│  - Course Enrollment API            │
│  - Context & Capability System      │
└─────────────────────────────────────┘
```

### 1.2 Principios de Diseño

**1. Separation of Concerns:**
- Frontend: Presentación e interacción usuario
- Backend: Lógica de negocio y datos
- Integration: APIs estándar de Moodle

**2. Single Responsibility:**
- Cada external function tiene un propósito específico
- Componentes JavaScript modulares
- CSS organizado por funcionalidad

**3. Dependency Injection:**
- AMD modules con dependencies explícitas
- Moodle APIs via dependency injection

---

## 2. Estructura de Archivos

### 2.1 Directorio Root

```
local/teacher_dashboard/
├── index.php                    # Página principal del dashboard
├── version.php                  # Metadatos del plugin
├── styles.css                   # Estilos principales
├── lang/                        # Archivos de idioma
│   ├── en/local_teacher_dashboard.php
│   └── ca/local_teacher_dashboard.php
├── db/                          # Definiciones de base de datos
│   ├── access.php               # Capabilities
│   └── services.php             # External functions
├── classes/external/            # External API functions
│   ├── get_course_data.php
│   ├── save_layout.php
│   └── get_layout.php
├── amd/                         # JavaScript AMD modules
│   ├── src/dashboard.js         # Source code
│   └── build/dashboard.min.js   # Compiled version
└── doc/                         # Documentación
    ├── PLUGIN_SPECIFICATION.md
    ├── DRAG_DROP_PROBLEMS.md
    └── ...
```

### 2.2 File Dependencies

**Dependency Graph:**
```
index.php
├── requires → config.php (Moodle core)
├── includes → styles.css
├── loads → amd/build/dashboard.min.js
└── uses → lang/*/local_teacher_dashboard.php

dashboard.js
├── requires → jquery
├── requires → core/ajax
└── calls → external functions

External Functions
├── extend → external_api
├── use → Moodle core APIs
└── access → user preferences
```

---

## 3. Implementación Frontend

### 3.1 AMD Module Structure

**Archivo:** `/amd/src/dashboard.js`

**Patrón Singleton:**
```javascript
define(['jquery', 'core/ajax'], function($, Ajax) {
    'use strict';
    
    var initialized = false;
    var elements = {};
    
    function init() {
        if (initialized) return;
        initialized = true;
        
        cacheElements();
        setupEventHandlers();
        setupDragAndDrop();
        loadLayout();
        refreshMoodleData();
    }
    
    return { init: init };
});
```

**Funciones Principales:**

1. **cacheElements():** Cache de elementos DOM
```javascript
function cacheElements() {
    elements = {
        $dashboard: $('#teacher-dashboard'),
        $blocksContainer: $('.dashboard-blocks'),
        $availableItems: $('.available-items-container'),
        addCategoryBtn: document.getElementById('add-category-btn'),
        addLinkBtn: document.getElementById('add-link-btn'),
        saveConfigBtn: document.getElementById('save-config-btn')
    };
}
```

2. **setupEventHandlers():** Event listeners estáticos
```javascript
function setupEventHandlers() {
    elements.addCategoryBtn.addEventListener('click', createNewCategory);
    elements.addLinkBtn.addEventListener('click', createNewLink);
    elements.saveConfigBtn.addEventListener('click', saveCompleteConfiguration);
}
```

3. **setupDragAndDrop():** Sistema drag & drop
```javascript
function setupDragAndDrop() {
    var draggedElement = null;
    
    // Event delegation para elementos dinámicos
    elements.$dashboard.on('dragstart', '.draggable-item', function(e) {
        draggedElement = this;
        setTimeout(() => $(this).addClass('item-dragging'), 0);
        e.originalEvent.dataTransfer.effectAllowed = 'move';
    });
    
    // Drop zones con validación jerárquica
    elements.$dashboard.on('dragover', '.course-list, .block-content', function(e) {
        e.preventDefault();
        var $dropZone = $(this);
        var isCategory = $(draggedElement).hasClass('category');
        
        if ((isCategory && $dropZone.hasClass('block-content')) || 
            (!isCategory && $dropZone.hasClass('course-list'))) {
            $('.item-drag-over').removeClass('item-drag-over');
            $dropZone.addClass('item-drag-over');
        }
    });
}
```

### 3.2 HTML Structure

**Archivo:** `/index.php`

**Layout Principal:**
```html
<div id="teacher-dashboard">
    <!-- Header con controles -->
    <div class="dashboard-header">
        <h1><?php echo get_string('dashboard_title', 'local_teacher_dashboard'); ?></h1>
        <div class="dashboard-controls">
            <button id="add-category-btn">+ Nova Categoria</button>
            <button id="add-link-btn">+ Nou Enllaç</button>
            <button id="save-config-btn">Desar Configuració</button>
        </div>
    </div>
    
    <!-- Zona de elementos disponibles -->
    <div class="available-items-section">
        <h2>📦 Elements Disponibles</h2>
        <div class="available-items-container">
            <div class="available-group" data-category="reserva">
                <h3>Cursos</h3>
                <ul class="course-list"></ul>
            </div>
            <!-- Más grupos... -->
        </div>
    </div>
    
    <!-- Bloques principales -->
    <div class="dashboard-main">
        <div class="dashboard-blocks">
            <div class="dashboard-block" data-block-id="block-1">
                <div class="block-header">
                    <h2>📚 Bloque 1</h2>
                    <button class="add-category-to-block">+</button>
                </div>
                <div class="block-content" data-drop-target="block-1">
                    <!-- Categorías dinámicas -->
                </div>
            </div>
            <!-- Más bloques... -->
        </div>
    </div>
</div>
```

**Elementos Dinámicos:**
```html
<!-- Estructura de Categoría -->
<div class="category draggable-item" data-type="category" data-category-id="cat-1">
    <div class="category-header">
        <h3>Nombre Categoría</h3>
        <span class="drag-handle">⋮⋮</span>
    </div>
    <ul class="course-list" data-drop-target="cat-1">
        <!-- Items aquí -->
    </ul>
</div>

<!-- Estructura de Item -->
<li class="draggable-item" data-item-id="course-123" data-type="course" draggable="true">
    <a href="/course/view.php?id=123" target="_blank">Nombre del Curso</a>
</li>
```

### 3.3 CSS Architecture

**Archivo:** `/styles.css`

**Organización por Componentes:**
```css
/* === BASE STYLES === */
#teacher-dashboard {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 20px;
    background: #f8f9fa;
}

/* === LAYOUT COMPONENTS === */
.dashboard-blocks {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
}

/* === INTERACTIVE ELEMENTS === */
.draggable-item {
    background: #fff;
    margin: 5px 0;
    border-radius: 5px;
    border: 1px solid #dee2e6;
    transition: all 0.3s ease;
    cursor: move;
}

/* === DRAG & DROP STATES === */
.item-dragging {
    opacity: 0.6;
    background: #fff3cd !important;
    border: 2px dashed #ffc107 !important;
    transform: rotate(2deg);
}

.item-drag-over {
    background: #d4edda !important;
    border: 2px dashed #28a745 !important;
}
```

**Responsive Design:**
```css
@media (max-width: 1200px) {
    .dashboard-blocks {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .dashboard-blocks {
        grid-template-columns: 1fr;
    }
}
```

---

## 4. Implementación Backend

### 4.1 External API Functions

**Patrón Base para External Functions:**
```php
<?php
namespace local_teacher_dashboard\external;

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;

class function_name extends external_api {
    
    public static function execute_parameters() {
        return new external_function_parameters([
            // Parameter definitions
        ]);
    }
    
    public static function execute($param) {
        global $USER;
        
        // 1. Validate parameters
        $params = self::validate_parameters(
            self::execute_parameters(),
            ['param' => $param]
        );
        
        // 2. Validate context
        $context = context_system::instance();
        self::validate_context($context);
        
        // 3. Check capabilities
        require_capability('local/teacher_dashboard:view', $context);
        
        // 4. Business logic
        $result = perform_business_logic($params);
        
        return $result;
    }
    
    public static function execute_returns() {
        return new external_single_structure([
            // Return structure definition
        ]);
    }
}
```

**Implementación get_course_data:**
```php
public static function execute() {
    global $USER;
    
    $context = context_system::instance();
    self::validate_context($context);
    require_capability('local/teacher_dashboard:view', $context);
    
    $user_courses = enrol_get_users_courses($USER->id, true);
    $courses_data = [];
    
    foreach ($user_courses as $course) {
        $course_context = context_course::instance($course->id);
        
        if (has_capability('mod/assign:grade', $course_context) || 
            has_capability('moodle/course:manageactivities', $course_context)) {
            
            $courses_data[] = [
                'id' => $course->id,
                'fullname' => $course->fullname,
                'shortname' => $course->shortname,
                'url' => (new moodle_url('/course/view.php', ['id' => $course->id]))->out(false),
                'categoryid' => $course->category,
                'visible' => $course->visible
            ];
        }
    }
    
    return ['all_courses' => json_encode($courses_data)];
}
```

### 4.2 Database Integration

**User Preferences para Persistencia:**
```php
// Guardar configuración
function save_user_layout($layoutdata) {
    global $USER;
    
    $preference_name = 'local_teacher_dashboard_layout';
    $json_data = json_encode($layoutdata);
    
    set_user_preference($preference_name, $json_data, $USER->id);
}

// Recuperar configuración
function get_user_layout() {
    global $USER;
    
    $preference_name = 'local_teacher_dashboard_layout';
    $saved_data = get_user_preference($preference_name, '', $USER->id);
    
    if (!empty($saved_data)) {
        return json_decode($saved_data, true);
    }
    
    return null; // Default empty configuration
}
```

**Estructura de Datos Guardada:**
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
                            "content": "Matemáticas",
                            "url": "/course/view.php?id=456"
                        }
                    ]
                }
            ]
        }
    }
}
```

### 4.3 Moodle Integration

**Plugin Configuration Files:**

**version.php:**
```php
<?php
defined('MOODLE_INTERNAL') || die();

$plugin->version   = 2025012200;
$plugin->requires  = 2020061500; // Moodle 3.9
$plugin->component = 'local_teacher_dashboard';
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.0.0';
```

**db/access.php:**
```php
<?php
$capabilities = array(
    'local/teacher_dashboard:view' => array(
        'captype' => 'read',
        'contextlevel' => CONTEXT_SYSTEM,
        'archetypes' => array(
            'editingteacher' => CAP_ALLOW,
            'teacher' => CAP_ALLOW,
            'manager' => CAP_ALLOW
        )
    )
);
```

**db/services.php:**
```php
<?php
$functions = array(
    'local_teacher_dashboard_get_course_data' => array(
        'classname'   => 'local_teacher_dashboard\external\get_course_data',
        'methodname'  => 'execute',
        'description' => 'Get course data for teacher dashboard',
        'type'        => 'read',
        'ajax'        => true,
        'loginrequired' => true,
    ),
    // Más functions...
);
```

---

## 5. Drag & Drop System

### 5.1 Arquitectura Jerárquica

**Niveles de Drag & Drop:**
```
1. Items (courses/links) → Categories (course-list)
2. Categories → Blocks (block-content)
3. Items/Categories → Available Zone (bidirectional)
```

**Validation Matrix:**
```
Source Type    → Target Type       → Valid?
────────────────────────────────────────────
Item (course)  → course-list       → ✅ Yes
Item (link)    → course-list       → ✅ Yes
Category       → block-content     → ✅ Yes
Category       → course-list       → ❌ No
Item           → block-content     → ❌ No
```

### 5.2 Event Handling Implementation

**dragstart Event:**
```javascript
elements.$dashboard.on('dragstart', '.draggable-item', function(e) {
    draggedElement = this;
    dragType = this.classList.contains('category') ? 'category' : 'item';
    
    // Visual feedback
    setTimeout(() => $(this).addClass('item-dragging'), 0);
    
    // Set transfer data
    e.originalEvent.dataTransfer.effectAllowed = 'move';
    e.originalEvent.dataTransfer.setData('text/html', this.outerHTML);
    
    // Debug
    console.log(`🔥 DRAGSTART: ${dragType} - ${this.textContent.trim()}`);
});
```

**dragover Event con Validación:**
```javascript
elements.$dashboard.on('dragover', '.course-list, .block-content', function(e) {
    e.preventDefault();
    
    var $dropZone = $(this);
    var isValidDrop = false;
    
    // Validar según tipo de elemento y zona
    if (dragType === 'category' && $dropZone.hasClass('block-content')) {
        isValidDrop = true;
    } else if (dragType === 'item' && $dropZone.hasClass('course-list')) {
        isValidDrop = true;
    }
    
    if (isValidDrop) {
        $('.item-drag-over').removeClass('item-drag-over');
        $dropZone.addClass('item-drag-over');
        e.originalEvent.dataTransfer.dropEffect = 'move';
    } else {
        e.originalEvent.dataTransfer.dropEffect = 'none';
    }
});
```

**drop Event:**
```javascript
elements.$dashboard.on('drop', '.item-drag-over', function(e) {
    e.preventDefault();
    
    var $dropZone = $(this);
    
    // Mover elemento
    $dropZone.append(draggedElement);
    $dropZone.removeClass('item-drag-over');
    
    // Auto-save configuration
    saveCompleteConfiguration();
    
    console.log(`🎯 DROP: Moved ${dragType} to ${$dropZone.data('drop-target') || $dropZone.attr('class')}`);
});
```

### 5.3 Dynamic Element Configuration

**Configuración de Elementos Creados:**
```javascript
function createNewCategory() {
    var categoryName = prompt('Nom de la nova categoria:');
    if (!categoryName) return;
    
    Ajax.call([{
        methodname: 'local_teacher_dashboard_create_category',
        args: { name: categoryName },
        done: function(response) {
            // Crear HTML
            var categoryHtml = createCategoryHtml(response.id, response.name);
            var $newCategory = $(categoryHtml);
            
            // Insertar en DOM
            elements.$availableItems.find('[data-category="available-categories"] .category-list').append($newCategory);
            
            // IMPORTANTE: Configurar drag & drop para nuevo elemento
            setupSingleElement($newCategory[0]);
            setupSingleDropZone($newCategory.find('.course-list')[0]);
        }
    }]);
}

function setupSingleElement(element) {
    if (!element || element.dataset.listenersAdded === 'true') return;
    
    // Los event listeners delegados del dashboard ya manejan estos elementos
    // Solo necesitamos marcar como configurado
    element.dataset.listenersAdded = 'true';
}
```

---

## 6. Data Flow

### 6.1 Initialization Flow

```
1. User accesses /local/teacher_dashboard/index.php
   ↓
2. index.php: Authentication & capability check
   ↓
3. index.php: Load HTML structure & include AMD module
   ↓
4. dashboard.js: init() called
   ↓
5. cacheElements() → setupEventHandlers() → setupDragAndDrop()
   ↓
6. loadLayout() → AJAX call to get_layout
   ↓
7. refreshMoodleData() → AJAX call to get_course_data
   ↓
8. rebuildDashboard() → Reconstruct DOM from saved data
   ↓
9. Ready for user interaction
```

### 6.2 Save Configuration Flow

```
1. User performs drag & drop operation
   ↓
2. drop event handler triggered
   ↓
3. DOM updated with new element position
   ↓
4. saveCompleteConfiguration() called automatically
   ↓
5. Traverse DOM to build configuration object
   ↓
6. JSON.stringify(config)
   ↓
7. AJAX call to save_layout external function
   ↓
8. Backend saves to user preferences
   ↓
9. Success/error feedback to user
```

### 6.3 Load Configuration Flow

```
1. loadLayout() called during initialization
   ↓
2. AJAX call to get_layout external function
   ↓
3. Backend retrieves from user preferences
   ↓
4. JSON data returned to frontend
   ↓
5. rebuildDashboard(layout) called
   ↓
6. Clear existing blocks
   ↓
7. Iterate through layout.blocks
   ↓
8. Create HTML for each category and item
   ↓
9. Insert into DOM with proper structure
   ↓
10. Setup drag & drop for reconstructed elements
```

---

## 7. Configuration Management

### 7.1 Configuration Object Structure

**Complete Configuration Format:**
```javascript
var completeConfig = {
    "version": "1.0",
    "timestamp": 1641234567890,
    "blocks": {
        "block-1": {
            "title": "Bloque 1",
            "categories": [
                {
                    "id": "cat-123",
                    "name": "Cursos Principals",
                    "position": 0,
                    "items": [
                        {
                            "id": "course-456",
                            "type": "course",
                            "content": "Matemáticas",
                            "url": "/course/view.php?id=456",
                            "position": 0
                        },
                        {
                            "id": "link-789",
                            "type": "link",
                            "content": "Google Classroom",
                            "url": "https://classroom.google.com",
                            "position": 1
                        }
                    ]
                }
            ]
        }
    },
    "available": {
        "courses": [...],
        "categories": [...],
        "links": [...]
    }
};
```

### 7.2 Configuration Serialization

**DOM to Configuration:**
```javascript
function saveCompleteConfiguration() {
    var config = {
        version: "1.0",
        timestamp: Date.now(),
        blocks: {}
    };
    
    elements.$blocksContainer.find('.dashboard-block').each(function() {
        var $block = $(this);
        var blockId = $block.data('block-id');
        
        config.blocks[blockId] = {
            title: $block.find('.block-header h2').text(),
            categories: []
        };
        
        $block.find('.category').each(function(categoryIndex) {
            var $category = $(this);
            var categoryData = {
                id: $category.data('category-id') || 'temp-' + Date.now(),
                name: $category.find('h3').text(),
                position: categoryIndex,
                items: []
            };
            
            $category.find('.draggable-item').each(function(itemIndex) {
                var $item = $(this);
                var itemData = {
                    id: $item.data('item-id'),
                    type: $item.data('type'),
                    content: $item.find('a').length ? $item.find('a').text() : $item.text().trim(),
                    url: $item.find('a').attr('href') || '',
                    position: itemIndex
                };
                categoryData.items.push(itemData);
            });
            
            config.blocks[blockId].categories.push(categoryData);
        });
    });
    
    // Save via AJAX
    Ajax.call([{
        methodname: 'local_teacher_dashboard_save_layout',
        args: { layoutdata: JSON.stringify(config) },
        done: () => console.log('✅ Layout saved successfully'),
        fail: (err) => console.error('❌ Error saving layout:', err)
    }]);
}
```

### 7.3 Configuration Deserialization

**Configuration to DOM:**
```javascript
function rebuildDashboard(layout) {
    console.log('🔄 Rebuilding dashboard from saved layout');
    
    // Clear existing content
    elements.$blocksContainer.empty();
    
    Object.keys(layout.blocks).forEach(blockId => {
        var blockData = layout.blocks[blockId];
        
        // Create block HTML
        var blockHtml = createBlockHtml(blockId, blockData.title || blockId);
        var $block = $(blockHtml).appendTo(elements.$blocksContainer);
        var $blockContent = $block.find('.block-content');
        
        // Create categories within block
        if (blockData.categories) {
            blockData.categories
                .sort((a, b) => (a.position || 0) - (b.position || 0))
                .forEach(categoryData => {
                    var $category = createAndInsertCategory($blockContent, categoryData);
                    var $categoryList = $category.find('.course-list');
                    
                    // Create items within category
                    if (categoryData.items) {
                        categoryData.items
                            .sort((a, b) => (a.position || 0) - (b.position || 0))
                            .forEach(itemData => {
                                var itemHtml = createItemHtml(itemData);
                                $categoryList.append(itemHtml);
                            });
                    }
                });
        }
    });
    
    console.log('✅ Dashboard rebuilt successfully');
}
```

---

## 8. Security Implementation

### 8.1 Authentication & Authorization

**Multi-level Security Checks:**
```php
// 1. Basic Moodle authentication
require_login();

// 2. Context validation
$context = context_system::instance();
require_capability('local/teacher_dashboard:view', $context);

// 3. Teacher role verification
$is_teacher = false;
$user_courses = enrol_get_users_courses($USER->id, true);

foreach ($user_courses as $course) {
    $course_context = context_course::instance($course->id);
    if (has_capability('mod/assign:grade', $course_context) || 
        has_capability('moodle/course:manageactivities', $course_context)) {
        $is_teacher = true;
        break;
    }
}

if (!$is_teacher && !is_siteadmin()) {
    print_error('access_denied', 'local_teacher_dashboard');
}
```

### 8.2 Input Validation & Sanitization

**Parameter Validation:**
```php
public static function execute_parameters() {
    return new external_function_parameters([
        'layoutdata' => new external_value(PARAM_RAW, 'JSON layout data')
    ]);
}

public static function execute($layoutdata) {
    // Validate parameters
    $params = self::validate_parameters(
        self::execute_parameters(),
        ['layoutdata' => $layoutdata]
    );
    
    // Validate JSON structure
    $layout = json_decode($params['layoutdata'], true);
    if ($layout === null) {
        throw new invalid_parameter_exception('Invalid JSON data');
    }
    
    // Validate layout structure
    if (!isset($layout['blocks']) || !is_array($layout['blocks'])) {
        throw new invalid_parameter_exception('Invalid layout structure');
    }
    
    return validate_and_sanitize_layout($layout);
}
```

**Data Sanitization:**
```php
function validate_and_sanitize_layout($layout) {
    $sanitized = ['blocks' => []];
    
    foreach ($layout['blocks'] as $blockId => $blockData) {
        // Sanitize block ID
        $safeBlockId = clean_param($blockId, PARAM_ALPHANUMEXT);
        
        $sanitized['blocks'][$safeBlockId] = [
            'categories' => []
        ];
        
        if (isset($blockData['categories'])) {
            foreach ($blockData['categories'] as $category) {
                $sanitizedCategory = [
                    'id' => clean_param($category['id'], PARAM_ALPHANUMEXT),
                    'name' => clean_param($category['name'], PARAM_TEXT),
                    'items' => []
                ];
                
                if (isset($category['items'])) {
                    foreach ($category['items'] as $item) {
                        $sanitizedCategory['items'][] = [
                            'id' => clean_param($item['id'], PARAM_ALPHANUMEXT),
                            'type' => clean_param($item['type'], PARAM_ALPHA),
                            'content' => clean_param($item['content'], PARAM_TEXT),
                            'url' => clean_param($item['url'], PARAM_URL)
                        ];
                    }
                }
                
                $sanitized['blocks'][$safeBlockId]['categories'][] = $sanitizedCategory;
            }
        }
    }
    
    return $sanitized;
}
```

### 8.3 XSS Prevention

**Frontend Output Escaping:**
```javascript
function createCategoryHtml(id, name) {
    // Escape HTML entities
    var safeName = $('<div>').text(name).html();
    var safeId = $('<div>').text(id).html();
    
    return `
        <div class="category draggable-item" data-category-id="${safeId}" data-type="category">
            <div class="category-header">
                <h3>${safeName}</h3>
                <span class="drag-handle">⋮⋮</span>
            </div>
            <ul class="course-list" data-drop-target="${safeId}"></ul>
        </div>`;
}

function createItemHtml(itemData) {
    var safeName = $('<div>').text(itemData.content).html();
    var safeUrl = $('<div>').text(itemData.url).html();
    var safeId = $('<div>').text(itemData.id).html();
    
    return `
        <li class="draggable-item" data-item-id="${safeId}" data-type="${itemData.type}" draggable="true">
            <a href="${safeUrl}" target="_blank">${safeName}</a>
        </li>`;
}
```

---

## 9. Performance Optimizations

### 9.1 Frontend Optimizations

**Event Delegation:**
```javascript
// ❌ Ineficiente - listeners individuales
document.querySelectorAll('.draggable-item').forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
});

// ✅ Eficiente - event delegation
elements.$dashboard.on('dragstart', '.draggable-item', handleDragStart);
```

**Debounced Auto-save:**
```javascript
var saveTimeout;

function debouncedAutoSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(function() {
        saveCompleteConfiguration();
    }, 1000); // Save after 1 second of inactivity
}

// Call on every drag operation
elements.$dashboard.on('drop', '.item-drag-over', function(e) {
    // Handle drop...
    debouncedAutoSave();
});
```

**DOM Caching:**
```javascript
var domCache = {
    $availableCourses: null,
    $availableCategories: null,
    $availableLinks: null
};

function getCachedElement(selector) {
    if (!domCache[selector]) {
        domCache[selector] = $(selector);
    }
    return domCache[selector];
}
```

### 9.2 Backend Optimizations

**Data Caching:**
```php
function get_user_courses_optimized($userid) {
    $cache = cache::make('local_teacher_dashboard', 'user_courses');
    $cache_key = 'courses_' . $userid;
    
    $cached_courses = $cache->get($cache_key);
    if ($cached_courses !== false) {
        return $cached_courses;
    }
    
    $courses = enrol_get_users_courses($userid, true);
    $processed_courses = process_course_data($courses);
    
    // Cache for 1 hour
    $cache->set($cache_key, $processed_courses, 3600);
    
    return $processed_courses;
}
```

**Batch Database Operations:**
```php
function bulk_validate_capabilities($userid, $course_ids) {
    $valid_courses = [];
    
    // Single query instead of per-course queries
    $contexts = context_course::get_multiple_instances($course_ids);
    
    foreach ($contexts as $context) {
        if (has_capability('mod/assign:grade', $context, $userid) ||
            has_capability('moodle/course:manageactivities', $context, $userid)) {
            $valid_courses[] = $context->instanceid;
        }
    }
    
    return $valid_courses;
}
```

### 9.3 Resource Management

**Memory Management:**
```javascript
var cleanup = {
    intervals: [],
    timeouts: [],
    eventListeners: []
};

function addInterval(intervalId) {
    cleanup.intervals.push(intervalId);
}

function addTimeout(timeoutId) {
    cleanup.timeouts.push(timeoutId);
}

function cleanupResources() {
    cleanup.intervals.forEach(id => clearInterval(id));
    cleanup.timeouts.forEach(id => clearTimeout(id));
    cleanup.intervals = [];
    cleanup.timeouts = [];
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanupResources);
```

---

## 10. Testing Strategy

### 10.1 Unit Testing

**JavaScript Unit Tests:**
```javascript
// Test drag & drop validation
function testDragDropValidation() {
    var tests = [
        { dragType: 'category', target: 'block-content', expected: true },
        { dragType: 'category', target: 'course-list', expected: false },
        { dragType: 'item', target: 'course-list', expected: true },
        { dragType: 'item', target: 'block-content', expected: false }
    ];
    
    tests.forEach(test => {
        var result = validateDropOperation(test.dragType, test.target);
        console.assert(result === test.expected, 
            `Test failed: ${test.dragType} → ${test.target} should be ${test.expected}`);
    });
}
```

### 10.2 Integration Testing

**AJAX Testing:**
```javascript
function testAjaxIntegration() {
    console.log('🧪 Testing AJAX integration...');
    
    // Test course data fetch
    Ajax.call([{
        methodname: 'local_teacher_dashboard_get_course_data',
        args: {},
        done: function(data) {
            console.log('✅ Course data fetch successful');
            var courses = JSON.parse(data.all_courses || '[]');
            console.log(`Found ${courses.length} courses`);
        },
        fail: function(error) {
            console.error('❌ Course data fetch failed:', error);
        }
    }]);
}
```

### 10.3 User Acceptance Testing

**Manual Test Cases:**
1. **Basic Drag & Drop:** User can move course from available to category
2. **Category Management:** User can create, rename, and move categories
3. **Link Management:** User can create and organize custom links
4. **Persistence:** Configuration saves and loads correctly
5. **Responsive:** Interface works on mobile devices
6. **Error Handling:** Graceful failure when network issues occur

**Test Checklist:**
- [ ] Dashboard loads without errors
- [ ] Course data loads correctly
- [ ] Drag & drop works for all element types
- [ ] Configuration saves and persists
- [ ] Responsive layout adapts to screen size
- [ ] Error messages are user-friendly
- [ ] Performance acceptable with many elements

---

## Conclusión

Esta guía de implementación proporciona una visión completa de cómo está construido el Teacher Dashboard Plugin. La arquitectura modular, el uso de patrones estándar de Moodle, y las optimizaciones implementadas garantizan un plugin robusto, seguro y mantenible.

Para desarrollo futuro, se recomienda seguir los patrones establecidos y consultar la documentación complementaria en esta misma carpeta `doc/`.