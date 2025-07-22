<?php
// Simple test page to check AJAX functionality

require_once('../../config.php');
require_login();

$context = context_system::instance();
$PAGE->set_context($context);
$PAGE->set_url('/local/teacher_dashboard/test_ajax.php');
$PAGE->set_title('Test AJAX');

echo $OUTPUT->header();
?>

<h1>Test Teacher Dashboard AJAX</h1>

<button id="test-ajax">Test AJAX Call</button>
<div id="result"></div>

<script>
document.getElementById('test-ajax').addEventListener('click', function() {
    var resultDiv = document.getElementById('result');
    resultDiv.innerHTML = 'Loading...';
    
    // Test direct AJAX call with sesskey
    fetch(M.cfg.wwwroot + '/lib/ajax/service.php?sesskey=' + M.cfg.sesskey + '&info=local_teacher_dashboard_get_course_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
            index: 0,
            methodname: 'local_teacher_dashboard_get_course_data',
            args: {}
        }])
    })
    .then(response => response.json())
    .then(data => {
        resultDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
    })
    .catch(error => {
        resultDiv.innerHTML = '<div style="color: red;">Error: ' + error.message + '</div>';
    });
});
</script>

<?php
echo $OUTPUT->footer();
?>