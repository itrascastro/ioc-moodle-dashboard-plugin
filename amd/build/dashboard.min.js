define(['jquery', 'core/ajax'], function($, Ajax) {
    'use strict';
    
    var initialized = false;
    var draggedElement = null;
    var config = { blocks: {}, creation: { courses: [], categories: [], links: [] } };
    
    function init() {
        if (initialized) return;
        initialized = true;
        
        console.log('🚀 Initializing clean dashboard');
        
        setupEventHandlers();
        setupDragAndDrop();
        loadCourses();
        loadConfiguration();
    }
    
    function setupEventHandlers() {
        // Create buttons
        $('#create-category').on('click', createCategory);
        $('#create-link').on('click', createLink);
        
        // Edit functionality
        $(document).on('dblclick', '.editable', enableEdit);
        $(document).on('blur', '.editable', saveEdit);
        $(document).on('keydown', '.editable', function(e) {
            if (e.key === 'Enter') {
                $(this).blur();
            }
        });
    }
    
    function setupDragAndDrop() {
        console.log('📱 Setting up universal drag & drop');
        
        // Make elements draggable
        $(document).on('mousedown', '.element, .category', function() {
            $(this).attr('draggable', true);
        });
        
        // Drag start
        $(document).on('dragstart', '.element, .category', function(e) {
            e.stopPropagation();
            draggedElement = this;
            $(this).addClass('dragging');
            console.log('🔥 DRAGSTART:', this.textContent.trim());
        });
        
        // Drag end
        $(document).on('dragend', '.element, .category', function() {
            $(this).removeClass('dragging');
            $('.drop-target').removeClass('drop-target');
            draggedElement = null;
            console.log('🏁 DRAGEND');
        });
        
        // Drop zones - ONLY use data-drop-zone to avoid duplicates
        $(document).on('dragover', '[data-drop-zone]', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (!draggedElement) return;
            
            var isValidDrop = validateDrop(draggedElement, this);
            if (isValidDrop) {
                $(this).addClass('drop-target');
                console.log('🌊 DRAGOVER valid to zone:', $(this).data('drop-zone'));
            }
        });
        
        $(document).on('dragleave', '[data-drop-zone]', function(e) {
            e.stopPropagation();
            // Only remove if really leaving
            var rect = this.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right || 
                e.clientY < rect.top || e.clientY > rect.bottom) {
                $(this).removeClass('drop-target');
            }
        });
        
        $(document).on('drop', '[data-drop-zone]', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (!draggedElement) return;
            
            var targetZone = $(this).data('drop-zone');
            var elementId = $(draggedElement).data('id') || $(draggedElement).text().trim();
            
            console.log('🎯 DROP EVENT:', {
                element: elementId,
                fromParent: $(draggedElement).parent().data('drop-zone') || 'no-zone',
                toZone: targetZone,
                targetElement: this.tagName + (this.className ? '.' + this.className : ''),
                elementsBefore: $(this).children().length
            });
            
            var isValidDrop = validateDrop(draggedElement, this);
            if (isValidDrop) {
                // Log DOM before
                console.log('📋 DOM BEFORE:', {
                    fromChildren: $(draggedElement).parent().children().length,
                    toChildren: $(this).children().length
                });
                
                $(this).append(draggedElement);
                $(this).removeClass('drop-target');
                
                // Log DOM after
                console.log('📋 DOM AFTER:', {
                    fromChildren: $(draggedElement).parent().children().length,
                    toChildren: $(this).children().length,
                    elementMoved: $(draggedElement).parent().data('drop-zone') === targetZone
                });
                
                saveConfiguration();
                console.log('✅ DROP SUCCESSFUL');
            } else {
                console.log('❌ DROP INVALID');
            }
        });
    }
    
    function validateDrop(element, target) {
        var elementType = $(element).hasClass('category') ? 'category' : 'element';
        var targetZone = $(target).data('drop-zone');
        
        console.log('🔍 Validating drop:', elementType, 'to zone:', targetZone);
        
        // Elements (courses, links) can go to any drop zone
        if (elementType === 'element') {
            return !!targetZone; // Any zone with data-drop-zone is valid
        }
        
        // Categories can only go to block zones or creation-categories zone
        if (elementType === 'category') {
            return targetZone && (targetZone.startsWith('block-') || targetZone === 'creation-categories');
        }
        
        return false;
    }
    
    function createCategory() {
        var name = prompt('Nom de la categoria:');
        if (!name) return;
        
        var id = 'cat-' + Date.now();
        var categoryHtml = `
            <div class="category element" data-id="${id}" data-type="category" draggable="true">
                <div class="category-header">
                    <h4 class="editable">${name}</h4>
                    <button onclick="this.parentElement.parentElement.remove(); saveConfiguration()">×</button>
                </div>
                <div class="category-items" data-drop-zone="category-${id}"></div>
            </div>
        `;
        
        $('[data-drop-zone="creation-categories"]').append(categoryHtml);
        saveConfiguration();
        console.log('✅ Created category:', name);
    }
    
    function createLink() {
        var name = prompt('Nom de l\'enllaç:');
        if (!name) return;
        
        var url = prompt('URL de l\'enllaç:');
        if (!url) return;
        
        var id = 'link-' + Date.now();
        var linkHtml = `
            <div class="element" data-id="${id}" data-type="link" data-url="${url}" draggable="true">
                <span class="editable">${name}</span>
                <button onclick="this.parentElement.remove(); saveConfiguration()" style="float: right">×</button>
            </div>
        `;
        
        $('[data-drop-zone="creation-links"]').append(linkHtml);
        saveConfiguration();
        console.log('✅ Created link:', name);
    }
    
    function enableEdit(e) {
        var $element = $(e.target);
        if (!$element.hasClass('editable')) return;
        
        $element.attr('contenteditable', true);
        $element.focus();
        
        // Select all text
        var range = document.createRange();
        range.selectNodeContents($element[0]);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
    
    function saveEdit(e) {
        var $element = $(e.target);
        $element.attr('contenteditable', false);
        saveConfiguration();
    }
    
    function loadCourses() {
        console.log('📚 Loading subscribed courses');
        
        Ajax.call([{
            methodname: 'local_teacher_dashboard_get_course_data',
            args: {},
            done: function(data) {
                try {
                    var courses = JSON.parse(data.all_courses || '[]');
                    var $container = $('[data-drop-zone="creation-courses"]');
                    $container.empty();
                    
                    courses.forEach(function(course) {
                        var courseHtml = `
                            <div class="element" data-id="${course.id}" data-type="course" data-url="${course.url}" draggable="true">
                                <a href="${course.url}" target="_blank">${course.fullname}</a>
                            </div>
                        `;
                        $container.append(courseHtml);
                    });
                    
                    console.log(`✅ Loaded ${courses.length} courses`);
                } catch (e) {
                    console.error('❌ Error loading courses:', e);
                }
            },
            fail: function(error) {
                console.error('❌ AJAX error loading courses:', error);
            }
        }]);
    }
    
    function saveConfiguration() {
        console.log('💾 Saving configuration');
        
        // Collect current state
        config = {
            blocks: {},
            creation: {
                courses: [],
                categories: [],
                links: []
            }
        };
        
        // Save blocks
        $('.block').each(function() {
            var blockId = $(this).data('block');
            config.blocks[blockId] = [];
            
            // Only collect direct children, not nested elements inside categories
            $(this).find('.block-content > .element, .block-content > .category').each(function() {
                var element = collectElementData(this);
                if (element) {
                    config.blocks[blockId].push(element);
                }
            });
        });
        
        // Save creation zone
        $('[data-drop-zone^="creation-"]').each(function() {
            var zone = $(this).data('drop-zone').replace('creation-', '');
            config.creation[zone] = [];
            
            // Only collect direct children, not nested elements inside categories
            $(this).find('> .element, > .category').each(function() {
                var element = collectElementData(this);
                if (element) {
                    config.creation[zone].push(element);
                }
            });
        });
        
        // Save via AJAX
        Ajax.call([{
            methodname: 'local_teacher_dashboard_save_layout',
            args: { layoutdata: JSON.stringify(config) },
            done: function() {
                console.log('✅ Configuration saved');
            },
            fail: function(error) {
                console.error('❌ Error saving configuration:', error);
            }
        }]);
    }
    
    function collectElementData(element) {
        var $el = $(element);
        var data = {
            id: $el.data('id'),
            type: $el.data('type')
        };
        
        if (data.type === 'category') {
            data.name = $el.find('.editable').text().trim();
            data.items = [];
            
            $el.find('.category-items .element').each(function() {
                var item = collectElementData(this);
                if (item) {
                    data.items.push(item);
                }
            });
        } else if (data.type === 'link') {
            data.name = $el.find('.editable').text().trim();
            data.url = $el.data('url');
        } else if (data.type === 'course') {
            data.name = $el.find('a').text().trim();
            data.url = $el.data('url');
        }
        
        return data;
    }
    
    function loadConfiguration() {
        console.log('📁 Loading saved configuration');
        
        Ajax.call([{
            methodname: 'local_teacher_dashboard_get_layout',
            args: {},
            done: function(data) {
                if (data.layoutdata) {
                    try {
                        config = JSON.parse(data.layoutdata);
                        rebuildFromConfig();
                        console.log('✅ Configuration loaded');
                    } catch (e) {
                        console.error('❌ Error parsing configuration:', e);
                    }
                }
            },
            fail: function(error) {
                console.error('❌ Error loading configuration:', error);
            }
        }]);
    }
    
    function rebuildFromConfig() {
        console.log('🔄 Rebuilding from configuration');
        
        // Clear all dynamic content
        $('.block-content').empty();
        $('[data-drop-zone^="creation-categories"], [data-drop-zone^="creation-links"]').empty();
        
        // Rebuild blocks
        if (config.blocks) {
            Object.keys(config.blocks).forEach(function(blockId) {
                var $blockContent = $(`[data-block="${blockId}"] .block-content`);
                config.blocks[blockId].forEach(function(item) {
                    var html = createElementHtml(item);
                    $blockContent.append(html);
                });
            });
        }
        
        // Rebuild creation zone (except courses)
        if (config.creation) {
            if (config.creation.categories) {
                var $container = $('[data-drop-zone="creation-categories"]');
                config.creation.categories.forEach(function(item) {
                    var html = createElementHtml(item);
                    $container.append(html);
                });
            }
            
            if (config.creation.links) {
                var $container = $('[data-drop-zone="creation-links"]');
                config.creation.links.forEach(function(item) {
                    var html = createElementHtml(item);
                    $container.append(html);
                });
            }
        }
    }
    
    function createElementHtml(item) {
        if (item.type === 'category') {
            var itemsHtml = '';
            if (item.items) {
                item.items.forEach(function(subItem) {
                    itemsHtml += createElementHtml(subItem);
                });
            }
            
            return `
                <div class="category element" data-id="${item.id}" data-type="category">
                    <div class="category-header">
                        <h4 class="editable">${item.name}</h4>
                        <button onclick="this.parentElement.parentElement.remove(); saveConfiguration()">×</button>
                    </div>
                    <div class="category-items" data-drop-zone="category-${item.id}">${itemsHtml}</div>
                </div>
            `;
        } else if (item.type === 'link') {
            return `
                <div class="element" data-id="${item.id}" data-type="link" data-url="${item.url}">
                    <span class="editable">${item.name}</span>
                    <button onclick="this.parentElement.remove(); saveConfiguration()" style="float: right">×</button>
                </div>
            `;
        } else if (item.type === 'course') {
            return `
                <div class="element" data-id="${item.id}" data-type="course" data-url="${item.url}">
                    <a href="${item.url}" target="_blank">${item.name}</a>
                </div>
            `;
        }
        
        return '';
    }
    
    // Make saveConfiguration available globally for delete buttons
    window.saveConfiguration = saveConfiguration;
    
    return {
        init: init
    };
});