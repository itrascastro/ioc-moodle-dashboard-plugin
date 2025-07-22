# AJAX Course Data - Guía Completa

## Índice

- [1. Introducción](#1-introducción)
- [2. Arquitectura de AJAX en Moodle](#2-arquitectura-de-ajax-en-moodle)
- [3. External API Functions](#3-external-api-functions)
  - [3.1 Estructura de External Functions](#31-estructura-de-external-functions)
  - [3.2 get_course_data Implementation](#32-get_course_data-implementation)
  - [3.3 Parámetros y Validación](#33-parámetros-y-validación)
- [4. Frontend AJAX Calls](#4-frontend-ajax-calls)
  - [4.1 AMD Module Integration](#41-amd-module-integration)
  - [4.2 Error Handling](#42-error-handling)
  - [4.3 Data Processing](#43-data-processing)
- [5. Course Data Structure](#5-course-data-structure)
- [6. Security & Permissions](#6-security--permissions)
- [7. Performance Optimization](#7-performance-optimization)
- [8. Troubleshooting](#8-troubleshooting)
- [9. Examples & Code Snippets](#9-examples--code-snippets)

---

## 1. Introducción

El sistema de obtención de datos de cursos en el Teacher Dashboard Plugin utiliza las **External API Functions** de Moodle para proporcionar datos via AJAX de manera segura y eficiente. Esta guía explica cómo funciona todo el sistema end-to-end.

**Flujo Principal:**
```
Frontend (JavaScript) → AJAX Call → External Function → Moodle Core API → Database → JSON Response
```

**Funciones Implementadas:**
- `local_teacher_dashboard_get_course_data`: Obtener cursos suscritos
- `local_teacher_dashboard_save_layout`: Guardar configuración
- `local_teacher_dashboard_get_layout`: Recuperar configuración

---

## 2. Arquitectura de AJAX en Moodle

### 2.1 Componentes del Sistema

**Backend Components:**
```
/classes/external/
├── get_course_data.php       # External function para obtener cursos
├── save_layout.php           # External function para guardar layout
└── get_layout.php            # External function para recuperar layout

/db/
└── services.php              # Registro de external functions
```

**Frontend Components:**
```
/amd/src/dashboard.js         # AMD module con AJAX calls
/index.php                    # Carga del AMD module
```

### 2.2 Moodle External API Pattern

**Patrón Estándar de Moodle:**
1. **External Function Class** extiende `external_api`
2. **Parameter Definition** usando `external_function_parameters`
3. **Return Definition** usando `external_value` o `external_single_structure`
4. **Registration** en `services.php` para habilitar AJAX

---

## 3. External API Functions

### 3.1 Estructura de External Functions

**Clase Base Pattern:**
```php
<?php
namespace local_teacher_dashboard\external;

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;

class get_course_data extends external_api {
    
    // Definir parámetros de entrada
    public static function execute_parameters() {
        return new external_function_parameters([]);
    }
    
    // Lógica principal
    public static function execute() {
        // Implementation logic
    }
    
    // Definir estructura de retorno
    public static function execute_returns() {
        return new external_single_structure([
            'all_courses' => new external_value(PARAM_RAW, 'JSON string of courses')
        ]);
    }
}
```

### 3.2 get_course_data Implementation

**Archivo:** `/classes/external/get_course_data.php`

**Implementación Completa:**
```php
<?php
namespace local_teacher_dashboard\external;

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;
use context_course;

class get_course_data extends external_api {
    
    public static function execute_parameters() {
        return new external_function_parameters([]);
    }
    
    public static function execute() {
        global $USER;
        
        // Validación de contexto
        $context = \context_system::instance();
        self::validate_context($context);
        
        // Verificar capabilities
        require_capability('local/teacher_dashboard:view', $context);
        
        // Obtener cursos del usuario
        $user_courses = enrol_get_users_courses($USER->id, true);
        $courses_data = [];
        
        foreach ($user_courses as $course) {
            $course_context = context_course::instance($course->id);
            
            // Verificar que es teacher
            if (has_capability('mod/assign:grade', $course_context) || 
                has_capability('moodle/course:manageactivities', $course_context)) {
                
                $courses_data[] = [
                    'id' => $course->id,
                    'fullname' => $course->fullname,
                    'shortname' => $course->shortname,
                    'url' => (new \moodle_url('/course/view.php', ['id' => $course->id]))->out(false),
                    'categoryid' => $course->category,
                    'visible' => $course->visible
                ];
            }
        }
        
        return [
            'all_courses' => json_encode($courses_data)
        ];
    }
    
    public static function execute_returns() {
        return new external_single_structure([
            'all_courses' => new external_value(PARAM_RAW, 'JSON string with course data')
        ]);
    }
}
```

### 3.3 Parámetros y Validación

**Parameter Types en Moodle:**
- `PARAM_RAW`: Datos sin procesar (para JSON)
- `PARAM_TEXT`: Texto normal
- `PARAM_INT`: Enteros
- `PARAM_BOOL`: Booleanos
- `PARAM_URL`: URLs válidas

**Validation Pattern:**
```php
public static function execute($param1, $param2) {
    // 1. Validar parámetros
    $params = self::validate_parameters(
        self::execute_parameters(),
        ['param1' => $param1, 'param2' => $param2]
    );
    
    // 2. Validar contexto
    $context = context_system::instance();
    self::validate_context($context);
    
    // 3. Verificar capabilities
    require_capability('local/teacher_dashboard:view', $context);
    
    // 4. Lógica de negocio
    return $result;
}
```

---

## 4. Frontend AJAX Calls

### 4.1 AMD Module Integration

**Estructura AMD para AJAX:**
```javascript
define(['jquery', 'core/ajax'], function($, Ajax) {
    'use strict';
    
    function fetchCourseData() {
        Ajax.call([{
            methodname: 'local_teacher_dashboard_get_course_data',
            args: {},
            done: function(data) {
                processCourseData(data);
            },
            fail: function(error) {
                handleAjaxError(error);
            }
        }]);
    }
    
    return {
        init: function() {
            fetchCourseData();
        }
    };
});
```

### 4.2 Error Handling

**Comprehensive Error Handling:**
```javascript
function handleAjaxError(error) {
    console.error('AJAX Error:', error);
    
    // Diferentes tipos de errores
    if (error.exception) {
        // Error de Moodle exception
        console.error('Moodle Exception:', error.exception);
        console.error('Message:', error.message);
    } else if (error.errorcode) {
        // Error code específico
        console.error('Error Code:', error.errorcode);
    } else {
        // Error genérico
        console.error('Generic Error:', error.message || 'Unknown error');
    }
    
    // Notificar al usuario
    showUserNotification('Error loading course data. Please refresh the page.');
}

function showUserNotification(message) {
    // Implementar notificación visual
    var notification = $('<div class="alert alert-danger">' + message + '</div>');
    $('#teacher-dashboard').prepend(notification);
    
    setTimeout(function() {
        notification.fadeOut();
    }, 5000);
}
```

### 4.3 Data Processing

**Processing Course Data:**
```javascript
function processCourseData(response) {
    try {
        // Parse JSON response
        var courses = JSON.parse(response.all_courses || '[]');
        
        console.log('Loaded courses:', courses.length);
        
        // Validar estructura de datos
        courses.forEach(function(course, index) {
            if (!course.id || !course.fullname || !course.url) {
                console.warn('Invalid course data at index', index, course);
                return;
            }
            
            // Procesar curso válido
            addCourseToAvailableZone(course);
        });
        
    } catch (e) {
        console.error('Error parsing course data:', e);
        handleAjaxError({ message: 'Invalid course data format' });
    }
}

function addCourseToAvailableZone(course) {
    var courseHtml = createCourseHtml(course.id, course.fullname, course.url);
    var $availableCourses = $('.available-items-container .course-list');
    $availableCourses.append(courseHtml);
}
```

---

## 5. Course Data Structure

### 5.1 Standard Course Object

**Estructura JSON de Curso:**
```json
{
    "id": 123,
    "fullname": "Matemáticas Avanzadas - 2025",
    "shortname": "MATH_ADV_2025",
    "url": "/course/view.php?id=123",
    "categoryid": 5,
    "visible": 1
}
```

**Campo por Campo:**
- `id`: ID único del curso en Moodle
- `fullname`: Nombre completo del curso
- `shortname`: Nombre corto del curso  
- `url`: URL relativa para acceder al curso
- `categoryid`: ID de la categoría del curso
- `visible`: Si el curso es visible (1) o no (0)

### 5.2 Extended Course Data

**Datos Adicionales Disponibles:**
```php
// En get_course_data.php - datos adicionales que se pueden incluir
$course_data = [
    'id' => $course->id,
    'fullname' => $course->fullname,
    'shortname' => $course->shortname,
    'url' => $course_url,
    'categoryid' => $course->category,
    'visible' => $course->visible,
    
    // Datos adicionales opcionales
    'summary' => $course->summary,
    'format' => $course->format,
    'startdate' => $course->startdate,
    'enddate' => $course->enddate,
    'numsections' => $course->numsections,
    'enrollmentcount' => count_enrolled_users($course_context),
    'image_url' => $course_image_url
];
```

### 5.3 Data Filtering

**Filtros de Cursos:**
```php
// Solo cursos donde el usuario es teacher
if (has_capability('mod/assign:grade', $course_context) || 
    has_capability('moodle/course:manageactivities', $course_context)) {
    
    // Solo cursos visibles
    if ($course->visible == 1) {
        
        // Solo cursos activos (opcional)
        if ($course->startdate <= time() && 
            ($course->enddate == 0 || $course->enddate >= time())) {
            
            $courses_data[] = $course_data;
        }
    }
}
```

---

## 6. Security & Permissions

### 6.1 Capability Checking

**Verificación de Capabilities:**
```php
public static function execute() {
    global $USER;
    
    // 1. Verificar login
    require_login();
    
    // 2. Contexto del sistema
    $context = context_system::instance();
    self::validate_context($context);
    
    // 3. Capability específica del plugin
    require_capability('local/teacher_dashboard:view', $context);
    
    // 4. Verificación adicional: es teacher
    $is_teacher = false;
    $user_courses = enrol_get_users_courses($USER->id, true);
    
    foreach ($user_courses as $course) {
        $course_context = context_course::instance($course->id);
        if (has_capability('mod/assign:grade', $course_context)) {
            $is_teacher = true;
            break;
        }
    }
    
    if (!$is_teacher && !is_siteadmin()) {
        throw new moodle_exception('access_denied', 'local_teacher_dashboard');
    }
}
```

### 6.2 Data Sanitization

**Sanitización de Datos:**
```php
// Sanitizar output
$courses_data[] = [
    'id' => (int)$course->id,
    'fullname' => clean_text($course->fullname),
    'shortname' => clean_text($course->shortname),
    'url' => $course_url, // Ya sanitizada por moodle_url
    'categoryid' => (int)$course->category,
    'visible' => (bool)$course->visible
];

// En frontend
function createCourseHtml(id, name, url) {
    // Escape HTML entities
    var safeName = $('<div>').text(name).html();
    var safeUrl = $('<div>').text(url).html();
    
    return `<li class="draggable-item" data-item-id="${id}">
        <a href="${safeUrl}" target="_blank">${safeName}</a>
    </li>`;
}
```

### 6.3 CSRF Protection

**Protección CSRF Automática:**
Moodle proporciona protección CSRF automática para External Functions when llamadas via AJAX desde AMD modules.

**Verificación en services.php:**
```php
'local_teacher_dashboard_get_course_data' => array(
    'classname' => 'local_teacher_dashboard\external\get_course_data',
    'methodname' => 'execute',
    'description' => 'Get course data for teacher dashboard',
    'type' => 'read',
    'ajax' => true,
    'loginrequired' => true,  // Requiere login
    'capabilities' => 'local/teacher_dashboard:view'  // Capability requerida
)
```

---

## 7. Performance Optimization

### 7.1 Caching Strategies

**Course Data Caching:**
```php
public static function execute() {
    global $USER;
    
    // Cache key único por usuario
    $cache_key = 'teacher_courses_' . $USER->id;
    
    // Intentar obtener de cache
    $cache = cache::make('local_teacher_dashboard', 'course_data');
    $cached_data = $cache->get($cache_key);
    
    if ($cached_data !== false) {
        return ['all_courses' => $cached_data];
    }
    
    // Si no hay cache, obtener datos
    $courses_data = get_user_courses_data();
    
    // Guardar en cache por 1 hora
    $cache->set($cache_key, json_encode($courses_data), 3600);
    
    return ['all_courses' => json_encode($courses_data)];
}
```

### 7.2 Lazy Loading

**Frontend Lazy Loading:**
```javascript
function initDashboard() {
    // Cargar dashboard básico primero
    setupBasicStructure();
    
    // Cargar datos de cursos asíncronamente
    loadCourseDataAsync();
    
    // Mostrar loading state
    showLoadingState();
}

function loadCourseDataAsync() {
    setTimeout(function() {
        Ajax.call([{
            methodname: 'local_teacher_dashboard_get_course_data',
            args: {},
            done: function(data) {
                hideLoadingState();
                processCourseData(data);
            }
        }]);
    }, 100); // Pequeño delay para UI responsiva
}
```

### 7.3 Batch Operations

**Batch AJAX Calls:**
```javascript
function performBatchOperations() {
    // Múltiples operaciones en una sola llamada
    Ajax.call([
        {
            methodname: 'local_teacher_dashboard_get_course_data',
            args: {}
        },
        {
            methodname: 'local_teacher_dashboard_get_layout',
            args: {}
        }
    ]).done(function(results) {
        // results[0] = course data
        // results[1] = layout data
        processCourseData(results[0]);
        processLayoutData(results[1]);
    });
}
```

---

## 8. Troubleshooting

### 8.1 Common Issues

**1. External Function Not Found:**
```
Error: "Function local_teacher_dashboard_get_course_data not found"
```

**Solución:**
- Verificar registration en `db/services.php`
- Purgar cache de Moodle
- Verificar namespace correcto en class

**2. Permission Denied:**
```
Error: "You do not have permission to use this function"
```

**Solución:**
- Verificar capability assignment
- Verificar user login status
- Verificar context validation

**3. Invalid JSON Response:**
```
Error: "Unexpected token in JSON"
```

**Solución:**
- Verificar que no hay output antes del return
- Usar json_encode() correcto
- Verificar encoding de caracteres

### 8.2 Debug Techniques

**Debugging External Functions:**
```php
public static function execute() {
    // Debug logging
    debugging('Starting get_course_data execution', DEBUG_DEVELOPER);
    
    try {
        $result = get_courses_logic();
        debugging('Course data retrieved successfully: ' . count($result), DEBUG_DEVELOPER);
        return ['all_courses' => json_encode($result)];
        
    } catch (Exception $e) {
        debugging('Error in get_course_data: ' . $e->getMessage(), DEBUG_DEVELOPER);
        throw $e;
    }
}
```

**Frontend Debugging:**
```javascript
Ajax.call([{
    methodname: 'local_teacher_dashboard_get_course_data',
    args: {},
    done: function(data) {
        console.log('✅ AJAX Success:', data);
        console.log('Course count:', JSON.parse(data.all_courses || '[]').length);
    },
    fail: function(error) {
        console.error('❌ AJAX Failed:', error);
        console.error('Stack trace:', error.stack);
    }
}]);
```

### 8.3 Performance Debugging

**Timing AJAX Calls:**
```javascript
function timedAjaxCall() {
    var startTime = Date.now();
    
    Ajax.call([{
        methodname: 'local_teacher_dashboard_get_course_data',
        args: {},
        done: function(data) {
            var endTime = Date.now();
            console.log(`AJAX completed in ${endTime - startTime}ms`);
            
            var courses = JSON.parse(data.all_courses || '[]');
            console.log(`Loaded ${courses.length} courses`);
        }
    }]);
}
```

---

## 9. Examples & Code Snippets

### 9.1 Complete AJAX Implementation

**Frontend Integration:**
```javascript
define(['jquery', 'core/ajax'], function($, Ajax) {
    'use strict';
    
    var courseCache = null;
    
    function refreshCourseData() {
        return new Promise(function(resolve, reject) {
            Ajax.call([{
                methodname: 'local_teacher_dashboard_get_course_data',
                args: {},
                done: function(data) {
                    try {
                        courseCache = JSON.parse(data.all_courses || '[]');
                        console.log('Refreshed course data:', courseCache.length);
                        resolve(courseCache);
                    } catch (e) {
                        reject(new Error('Invalid course data: ' + e.message));
                    }
                },
                fail: function(error) {
                    reject(error);
                }
            }]);
        });
    }
    
    function getCachedCourses() {
        return courseCache || [];
    }
    
    function findCourseById(courseId) {
        var courses = getCachedCourses();
        return courses.find(function(course) {
            return course.id == courseId;
        });
    }
    
    return {
        refreshCourseData: refreshCourseData,
        getCachedCourses: getCachedCourses,
        findCourseById: findCourseById
    };
});
```

### 9.2 Advanced Course Processing

**Data Processing with Validation:**
```javascript
function processAdvancedCourseData(response) {
    try {
        var courses = JSON.parse(response.all_courses || '[]');
        
        // Agrupar por categoría
        var coursesByCategory = {};
        
        courses.forEach(function(course) {
            // Validar curso
            if (!isValidCourse(course)) {
                console.warn('Invalid course:', course);
                return;
            }
            
            // Agrupar
            var catId = course.categoryid || 'uncategorized';
            if (!coursesByCategory[catId]) {
                coursesByCategory[catId] = [];
            }
            coursesByCategory[catId].push(course);
        });
        
        // Ordenar por nombre
        Object.keys(coursesByCategory).forEach(function(catId) {
            coursesByCategory[catId].sort(function(a, b) {
                return a.fullname.localeCompare(b.fullname);
            });
        });
        
        return coursesByCategory;
        
    } catch (e) {
        console.error('Error processing advanced course data:', e);
        return {};
    }
}

function isValidCourse(course) {
    return course &&
           course.id &&
           course.fullname &&
           course.url &&
           typeof course.id === 'number' &&
           typeof course.fullname === 'string' &&
           typeof course.url === 'string';
}
```

### 9.3 Error Recovery

**Robust Error Handling:**
```javascript
function robustCourseDataFetch(maxRetries = 3) {
    var retryCount = 0;
    
    function attemptFetch() {
        return new Promise(function(resolve, reject) {
            Ajax.call([{
                methodname: 'local_teacher_dashboard_get_course_data',
                args: {},
                done: resolve,
                fail: function(error) {
                    retryCount++;
                    
                    if (retryCount < maxRetries) {
                        console.warn(`AJAX failed, retrying (${retryCount}/${maxRetries}):`, error);
                        
                        // Exponential backoff
                        setTimeout(function() {
                            attemptFetch().then(resolve).catch(reject);
                        }, Math.pow(2, retryCount) * 1000);
                        
                    } else {
                        console.error('AJAX failed after all retries:', error);
                        reject(error);
                    }
                }
            }]);
        });
    }
    
    return attemptFetch();
}
```

---

## Conclusión

El sistema de AJAX para obtener datos de cursos en el Teacher Dashboard Plugin utiliza las mejores prácticas de Moodle para proporcionar una integración segura y eficiente. Los puntos clave son:

1. **External API Functions** para backend seguro
2. **AMD Module pattern** para frontend estructurado
3. **Comprehensive error handling** para robustez
4. **Performance optimization** para escalabilidad
5. **Security best practices** para protección

Esta guía proporciona toda la información necesaria para entender, mantener y extender el sistema de datos AJAX del plugin.