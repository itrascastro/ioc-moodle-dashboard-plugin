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
 * External API for getting course data.
 *
 * @package    local_teacher_dashboard
 * @copyright  2025 Ismael Trascastro
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_teacher_dashboard\external;

use external_api;
use external_function_parameters;
use external_single_structure;
use external_multiple_structure;
use external_value;
use context_system;
use context_course;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/externallib.php');

/**
 * External API for getting course data for the teacher dashboard.
 */
class get_course_data extends external_api {

    /**
     * Parameters for get_course_data
     *
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([]);
    }

    /**
     * Get course data for teacher dashboard
     *
     * @return array Course data including notifications and mail count
     */
    public static function execute() {
        global $DB, $USER, $CFG;

        // Validate context and capabilities
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('local/teacher_dashboard:view', $context);

        // Get user's courses where they are a teacher
        $courses = enrol_get_users_courses($USER->id, true);
        $course_data = [];
        $mail_count = 0;

        // For each course, get recent activity data
        foreach ($courses as $course) {
            $course_context = context_course::instance($course->id);
            
            // Only include if user has teaching capabilities
            if (has_capability('mod/assign:grade', $course_context) || 
                has_capability('moodle/course:manageactivities', $course_context)) {
                
                $course_info = self::get_course_notifications($course->id);
                if (!empty($course_info)) {
                    $course_data[$course->id] = $course_info;
                }
            }
        }

        // Get mail count if local_mail plugin is available
        if (file_exists($CFG->dirroot . '/local/mail/locallib.php')) {
            $mail_count = self::get_mail_count();
        }

        // Get all user courses for the course list
        $all_courses = [];
        foreach ($courses as $course) {
            $course_context = context_course::instance($course->id);
            
            // Only include if user has teaching capabilities
            if (has_capability('mod/assign:grade', $course_context) || 
                has_capability('moodle/course:manageactivities', $course_context)) {
                
                $all_courses[] = [
                    'id' => $course->id,
                    'fullname' => $course->fullname,
                    'shortname' => $course->shortname,
                    'url' => (new \moodle_url('/course/view.php', ['id' => $course->id]))->out(false)
                ];
            }
        }

        return [
            'courses' => json_encode($course_data),
            'all_courses' => json_encode($all_courses),
            'mail' => $mail_count
        ];
    }

    /**
     * Get course notifications and recent activity
     *
     * @param int $courseid Course ID
     * @return string HTML content for course notifications
     */
    private static function get_course_notifications($courseid) {
        global $DB, $USER;

        $course = $DB->get_record('course', ['id' => $courseid]);
        if (!$course) {
            return '';
        }

        $context = context_course::instance($courseid);
        
        // Get recent forum posts (unread)
        $forums = $DB->get_records('forum', ['course' => $courseid]);
        $notifications = [];
        
        foreach ($forums as $forum) {
            $discussions = $DB->get_records_sql(
                "SELECT d.*, COUNT(p.id) as postcount 
                 FROM {forum_discussions} d 
                 LEFT JOIN {forum_posts} p ON p.discussion = d.id 
                 WHERE d.forum = ? AND d.timemodified > ? 
                 GROUP BY d.id 
                 ORDER BY d.timemodified DESC 
                 LIMIT 5", 
                [$forum->id, time() - (7 * 24 * 60 * 60)] // Last 7 days
            );
            
            foreach ($discussions as $discussion) {
                $notifications[] = [
                    'title' => $discussion->name,
                    'url' => new \moodle_url('/mod/forum/discuss.php', ['d' => $discussion->id]),
                    'time' => $discussion->timemodified,
                    'count' => $discussion->postcount
                ];
            }
        }

        // Get recent assignments that need grading
        $assignments = $DB->get_records_sql(
            "SELECT a.*, COUNT(s.id) as submissions
             FROM {assign} a
             LEFT JOIN {assign_submission} s ON s.assignment = a.id AND s.status = 'submitted'
             LEFT JOIN {assign_grades} g ON g.assignment = a.id AND g.userid = s.userid
             WHERE a.course = ? AND s.id IS NOT NULL AND g.id IS NULL
             GROUP BY a.id
             HAVING submissions > 0",
            [$courseid]
        );

        foreach ($assignments as $assignment) {
            // Get the course module ID for the assignment
            $cm = get_coursemodule_from_instance('assign', $assignment->id, $assignment->course);
            if ($cm) {
                $notifications[] = [
                    'title' => $assignment->name . ' (' . $assignment->submissions . ' pendents)',
                    'url' => new \moodle_url('/mod/assign/view.php', ['id' => $cm->id, 'action' => 'grading']),
                    'time' => $assignment->timemodified,
                    'type' => 'assignment'
                ];
            }
        }

        if (empty($notifications)) {
            return '';
        }

        // Sort by time
        usort($notifications, function($a, $b) {
            return $b['time'] - $a['time'];
        });

        // Generate HTML
        $html = '<div class="local-course-overview-container" id="local-course-overview-container-' . $courseid . '">';
        $html .= '<div class="local-course-overview-item">';
        $html .= '<span>Activitat recent (' . count($notifications) . ')</span>';
        $html .= '</div>';
        $html .= '<div id="local-course-overview-forum-' . $courseid . '" style="display: none;">';
        $html .= '<ul>';
        
        foreach (array_slice($notifications, 0, 5) as $notification) {
            $html .= '<li><a href="' . $notification['url'] . '" target="_blank">' . 
                     s($notification['title']) . '</a></li>';
        }
        
        $html .= '</ul>';
        $html .= '</div>';
        $html .= '</div>';

        return $html;
    }

    /**
     * Get unread mail count
     *
     * @return int Number of unread mails
     */
    private static function get_mail_count() {
        global $DB, $USER;

        try {
            // Check if local_mail tables exist
            $dbman = $DB->get_manager();
            if (!$dbman->table_exists('local_mail_messages')) {
                return 0;
            }

            $count = $DB->count_records('local_mail_messages', [
                'userid' => $USER->id,
                'type' => 'inbox',
                'unread' => 1
            ]);

            return $count;
        } catch (\Exception $e) {
            // If mail plugin not available or error, return 0
            return 0;
        }
    }

    /**
     * Return structure for get_course_data
     *
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure([
            'courses' => new external_value(PARAM_RAW, 'Course notifications as JSON object', VALUE_DEFAULT, '{}'),
            'all_courses' => new external_value(PARAM_RAW, 'All user courses as JSON array', VALUE_DEFAULT, '[]'),
            'mail' => new external_value(PARAM_INT, 'Unread mail count', VALUE_DEFAULT, 0)
        ]);
    }
}