<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Teacher Dashboard main page.
 *
 * @package    local_teacher_dashboard
 * @copyright  2025 Ismael Trascastro
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once('../../config.php');

// Authentication and capability checks
require_login();
$context = context_system::instance();
require_capability('local/teacher_dashboard:view', $context);

// Check if user is a teacher (has any teaching role in any course)
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

// Page setup
$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/local/teacher_dashboard/index.php'));
$PAGE->set_title(get_string('dashboard_title', 'local_teacher_dashboard'));
$PAGE->set_heading(get_string('dashboard_title', 'local_teacher_dashboard'));
$PAGE->set_pagelayout('standard');

// Include CSS
$PAGE->requires->css('/local/teacher_dashboard/styles.css');

// Include JavaScript AMD module
$PAGE->requires->js_call_amd('local_teacher_dashboard/dashboard', 'init');

echo $OUTPUT->header();
?>

<div id="teacher-dashboard">
    
    <div class="header">
        <h1><?php echo get_string('dashboard_title', 'local_teacher_dashboard'); ?></h1>
        <div class="controls">
            <button id="create-category">Crear Categoria</button>
            <button id="create-link">Crear Enllaç</button>
        </div>
    </div>
    
    <div class="creation-zone">
        <h2>Zona de Creació</h2>
        <div class="sections">
            <div class="section" data-section="courses">
                <h3>Cursos Suscrits</h3>
                <div class="items" data-drop-zone="creation-courses"></div>
            </div>
            <div class="section" data-section="categories">
                <h3>Categories</h3>
                <div class="items" data-drop-zone="creation-categories">
                    <!-- Test category -->
                    <div class="category element" data-id="cat-test" data-type="category" draggable="true">
                        <div class="category-header">
                            <h4 class="editable">Test Category</h4>
                            <button onclick="this.parentElement.parentElement.remove(); saveConfiguration()">×</button>
                        </div>
                        <div class="category-items" data-drop-zone="category-test"></div>
                    </div>
                </div>
            </div>
            <div class="section" data-section="links">
                <h3>Enllaços</h3>
                <div class="items" data-drop-zone="creation-links"></div>
            </div>
        </div>
    </div>
    
    <div class="blocks">
        <div class="block" data-block="1">
            <h2>Bloc 1</h2>
            <div class="block-content" data-drop-zone="block-1"></div>
        </div>
        <div class="block" data-block="2">
            <h2>Bloc 2</h2>
            <div class="block-content" data-drop-zone="block-2"></div>
        </div>
        <div class="block" data-block="3">
            <h2>Bloc 3</h2>
            <div class="block-content" data-drop-zone="block-3"></div>
        </div>
        <div class="block" data-block="4">
            <h2>Bloc 4</h2>
            <div class="block-content" data-drop-zone="block-4"></div>
        </div>
    </div>
    
</div>

<?php
echo $OUTPUT->footer();
?>