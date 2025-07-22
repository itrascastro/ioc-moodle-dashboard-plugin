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
 * External function to save dashboard layout
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

class save_layout extends external_api {

    public static function execute_parameters() {
        return new external_function_parameters([
            'layoutdata' => new external_value(PARAM_RAW, 'JSON layout data')
        ]);
    }

    public static function execute($layoutdata) {
        global $USER, $CFG, $DB;

        // Validate parameters
        $params = self::validate_parameters(
            self::execute_parameters(),
            ['layoutdata' => $layoutdata]
        );

        // Validate context
        $context = \context_system::instance();
        self::validate_context($context);

        // Check capability
        require_capability('local/teacher_dashboard:view', $context);

        // Validate JSON
        $layout = json_decode($params['layoutdata'], true);
        if ($layout === null) {
            throw new \invalid_parameter_exception('Invalid JSON data');
        }

        // Save to user preferences using DB directly
        $existing = $DB->get_record('user_preferences', 
            ['userid' => $USER->id, 'name' => 'local_teacher_dashboard_layout']);
        
        if ($existing) {
            $DB->set_field('user_preferences', 'value', $params['layoutdata'], ['id' => $existing->id]);
        } else {
            $DB->insert_record('user_preferences', (object)[
                'userid' => $USER->id,
                'name' => 'local_teacher_dashboard_layout',
                'value' => $params['layoutdata']
            ]);
        }

        return [
            'success' => true,
            'message' => 'Layout saved successfully'
        ];
    }

    public static function execute_returns() {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Success status'),
            'message' => new external_value(PARAM_TEXT, 'Success message')
        ]);
    }
}