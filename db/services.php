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
 * Web service definitions for Teacher Dashboard plugin.
 *
 * @package    local_teacher_dashboard
 * @copyright  2025 Ismael Trascastro
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [
    'local_teacher_dashboard_get_course_data' => [
        'classname'   => 'local_teacher_dashboard\external\get_course_data',
        'methodname'  => 'execute',
        'description' => 'Get course data for teacher dashboard',
        'type'        => 'read',
        'ajax'        => true,
        'loginrequired' => true,
    ],
    'local_teacher_dashboard_save_layout' => [
        'classname'   => 'local_teacher_dashboard\external\save_layout',
        'methodname'  => 'execute',
        'description' => 'Save dashboard layout configuration',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
    ],
    'local_teacher_dashboard_get_layout' => [
        'classname'   => 'local_teacher_dashboard\external\get_layout',
        'methodname'  => 'execute',
        'description' => 'Get saved dashboard layout',
        'type'        => 'read',
        'ajax'        => true,
        'loginrequired' => true,
    ],
];