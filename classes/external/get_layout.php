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
 * External function to get dashboard layout
 *
 * @package    local_teacher_dashboard
 * @copyright  2025 Ismael Trascastro
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_teacher_dashboard\external;

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->libdir . '/externallib.php');
require_once($CFG->dirroot . '/lib/moodlelib.php');

class get_layout extends external_api {

    public static function execute_parameters() {
        return new external_function_parameters([]);
    }

    public static function execute() {
        global $USER, $CFG, $DB;

        // Validate context
        $context = \context_system::instance();
        self::validate_context($context);

        // Check capability
        require_capability('local/teacher_dashboard:view', $context);

        // Get from user preferences using DB directly
        $layoutdata = $DB->get_field('user_preferences', 'value', 
            ['userid' => $USER->id, 'name' => 'local_teacher_dashboard_layout']);
        
        if (!$layoutdata) {
            $layoutdata = '';
        }

        return [
            'layoutdata' => $layoutdata
        ];
    }

    public static function execute_returns() {
        return new external_single_structure([
            'layoutdata' => new external_value(PARAM_RAW, 'JSON layout data')
        ]);
    }
}