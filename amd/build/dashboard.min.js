define(['core/ajax'], function(Ajax) {
    'use strict';
    
    var initialized = false;
    var draggedElement = null;
    var config = { blocks: {}, creation: { courses: [], categories: [], links: [] } };
    
    // Helper function for safe element matching
    function elementMatches(element, selector) {
        return element && 
               element.nodeType === 1 && 
               element.matches && 
               element.matches(selector);
    }
    
    function init() {
        if (initialized) return;
        initialized = true;
        
        console.log('🚀 Initializing dashboard (vanilla JS)');
        
        setupEventHandlers();
        setupDragAndDrop();
        loadCourses();
        loadConfiguration();
    }
    
    function setupEventHandlers() {
        // Create buttons
        const createCategoryBtn = document.getElementById('create-category');
        const createLinkBtn = document.getElementById('create-link');
        
        if (createCategoryBtn) createCategoryBtn.addEventListener('click', createCategory);
        if (createLinkBtn) createLinkBtn.addEventListener('click', createLink);
        
        // Edit functionality with event delegation
        document.addEventListener('dblclick', function(e) {
            if (elementMatches(e.target, '.editable')) {
                enableEdit(e);
            }
        });
        
        document.addEventListener('blur', function(e) {
            if (elementMatches(e.target, '.editable')) {
                saveEdit(e);
            }
        }, true); // Use capture for blur events
        
        document.addEventListener('keydown', function(e) {
            if (elementMatches(e.target, '.editable') && e.key === 'Enter') {
                e.target.blur();
            }
        });
    }
    
    function setupDragAndDrop() {
        console.log('📱 Setting up universal drag & drop');
        
        // Make elements draggable
        document.addEventListener('mousedown', function(e) {
            if (elementMatches(e.target, '.element, .category')) {
                e.target.setAttribute('draggable', 'true');
            }
        });
        
        // Drag start
        document.addEventListener('dragstart', function(e) {
            if (elementMatches(e.target, '.element, .category')) {
                e.stopPropagation();
                draggedElement = e.target;
                e.target.classList.add('dragging');
                console.log('🔥 DRAGSTART:', e.target.textContent.trim());
            }
        });
        
        // Drag end
        document.addEventListener('dragend', function(e) {
            if (elementMatches(e.target, '.element, .category')) {
                e.target.classList.remove('dragging');
                // Remove drop-target class from all elements
                const dropTargets = document.querySelectorAll('.drop-target');
                dropTargets.forEach(el => el.classList.remove('drop-target'));
                draggedElement = null;
                console.log('🏁 DRAGEND');
            }
        });
        
        // Drop zones - ONLY use data-drop-zone to avoid duplicates
        document.addEventListener('dragover', function(e) {
            const target = e.target.closest('[data-drop-zone]');
            if (!target) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            if (!draggedElement) return;
            
            var isValidDrop = validateDrop(draggedElement, target);
            if (isValidDrop) {
                target.classList.add('drop-target');
                console.log('🌊 DRAGOVER valid to zone:', target.dataset.dropZone);
            }
        });
        
        document.addEventListener('dragleave', function(e) {
            const target = e.target.closest('[data-drop-zone]');
            if (!target) return;
            
            e.stopPropagation();
            // Only remove if really leaving
            var rect = target.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right || 
                e.clientY < rect.top || e.clientY > rect.bottom) {
                target.classList.remove('drop-target');
            }
        });
        
        document.addEventListener('drop', function(e) {
            const target = e.target.closest('[data-drop-zone]');
            if (!target) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            if (!draggedElement) return;
            
            var targetZone = target.dataset.dropZone;
            var elementId = draggedElement.dataset.id || draggedElement.textContent.trim();
            var fromParent = draggedElement.parentElement;
            
            console.log('🎯 DROP EVENT:', {
                element: elementId,
                fromParent: fromParent.dataset.dropZone || 'no-zone',
                toZone: targetZone,
                targetElement: target.tagName + (target.className ? '.' + target.className : ''),
                elementsBefore: target.children.length
            });
            
            var isValidDrop = validateDrop(draggedElement, target);
            if (isValidDrop) {
                // Log DOM before
                console.log('📋 DOM BEFORE:', {
                    fromChildren: fromParent.children.length,
                    toChildren: target.children.length
                });
                
                target.appendChild(draggedElement);
                target.classList.remove('drop-target');
                
                // Log DOM after
                console.log('📋 DOM AFTER:', {
                    fromChildren: fromParent.children.length,
                    toChildren: target.children.length,
                    elementMoved: draggedElement.parentElement.dataset.dropZone === targetZone
                });
                
                saveConfiguration();
                console.log('✅ DROP SUCCESSFUL');
            } else {
                console.log('❌ DROP INVALID');
            }
        });
    }
    
    function validateDrop(element, target) {
        var elementType = element.classList.contains('category') ? 'category' : 'element';
        var targetZone = target.dataset.dropZone;
        
        console.log('🔍 Validating drop:', elementType, 'to zone:', targetZone);
        
        // Categories can only go to block zones or creation-categories zone
        if (elementType === 'category') {
            return targetZone && (targetZone.startsWith('block-') || targetZone === 'creation-categories');
        }
        
        // Elements (courses, links) have specific restrictions
        if (elementType === 'element') {
            var elementDataType = element.dataset.type;
            
            // Courses can only go to creation-courses or inside categories
            if (elementDataType === 'course') {
                return targetZone === 'creation-courses' || targetZone.startsWith('category-');
            }
            
            // Links can only go to creation-links or inside categories  
            if (elementDataType === 'link') {
                return targetZone === 'creation-links' || targetZone.startsWith('category-');
            }
            
            // Fallback for other element types
            return !!targetZone;
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
        
        const creationCategories = document.querySelector('[data-drop-zone="creation-categories"]');
        if (creationCategories) {
            creationCategories.insertAdjacentHTML('beforeend', categoryHtml);
        }
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
        
        const creationLinks = document.querySelector('[data-drop-zone="creation-links"]');
        if (creationLinks) {
            creationLinks.insertAdjacentHTML('beforeend', linkHtml);
        }
        saveConfiguration();
        console.log('✅ Created link:', name);
    }
    
    function enableEdit(e) {
        var element = e.target;
        if (!element.classList.contains('editable')) return;
        
        element.setAttribute('contenteditable', 'true');
        element.focus();
        
        // Select all text
        var range = document.createRange();
        range.selectNodeContents(element);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
    
    function saveEdit(e) {
        var element = e.target;
        element.setAttribute('contenteditable', 'false');
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
                    var container = document.querySelector('[data-drop-zone="creation-courses"]');
                    
                    if (container) {
                        container.innerHTML = ''; // Clear container
                        
                        courses.forEach(function(course) {
                            var courseHtml = `
                                <div class="element" data-id="${course.id}" data-type="course" data-url="${course.url}" draggable="true">
                                    <a href="${course.url}" target="_blank">${course.fullname}</a>
                                </div>
                            `;
                            container.insertAdjacentHTML('beforeend', courseHtml);
                        });
                    }
                    
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
        const blocks = document.querySelectorAll('.block');
        blocks.forEach(function(block) {
            var blockId = block.dataset.block;
            config.blocks[blockId] = [];
            
            // Only collect direct children, not nested elements inside categories
            const directChildren = block.querySelectorAll('.block-content > .element, .block-content > .category');
            directChildren.forEach(function(child) {
                var element = collectElementData(child);
                if (element) {
                    config.blocks[blockId].push(element);
                }
            });
        });
        
        // Save creation zone
        const creationZones = document.querySelectorAll('[data-drop-zone^="creation-"]');
        creationZones.forEach(function(zone) {
            var zoneName = zone.dataset.dropZone.replace('creation-', '');
            config.creation[zoneName] = [];
            
            // Only collect direct children, not nested elements inside categories
            const directChildren = zone.querySelectorAll(':scope > .element, :scope > .category');
            directChildren.forEach(function(child) {
                var element = collectElementData(child);
                if (element) {
                    config.creation[zoneName].push(element);
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
        var data = {
            id: element.dataset.id,
            type: element.dataset.type
        };
        
        if (data.type === 'category') {
            const editableEl = element.querySelector('.editable');
            data.name = editableEl ? editableEl.textContent.trim() : '';
            data.items = [];
            
            const categoryItems = element.querySelectorAll('.category-items .element');
            categoryItems.forEach(function(item) {
                var itemData = collectElementData(item);
                if (itemData) {
                    data.items.push(itemData);
                }
            });
        } else if (data.type === 'link') {
            const editableEl = element.querySelector('.editable');
            data.name = editableEl ? editableEl.textContent.trim() : '';
            data.url = element.dataset.url;
        } else if (data.type === 'course') {
            const linkEl = element.querySelector('a');
            data.name = linkEl ? linkEl.textContent.trim() : '';
            data.url = element.dataset.url;
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
        const blockContents = document.querySelectorAll('.block-content');
        blockContents.forEach(el => el.innerHTML = '');
        
        const creationZones = document.querySelectorAll('[data-drop-zone^="creation-categories"], [data-drop-zone^="creation-links"]');
        creationZones.forEach(el => el.innerHTML = '');
        
        // Rebuild blocks
        if (config.blocks) {
            Object.keys(config.blocks).forEach(function(blockId) {
                var blockContent = document.querySelector(`[data-block="${blockId}"] .block-content`);
                if (blockContent) {
                    config.blocks[blockId].forEach(function(item) {
                        var html = createElementHtml(item);
                        blockContent.insertAdjacentHTML('beforeend', html);
                    });
                }
            });
        }
        
        // Rebuild creation zone (except courses)
        if (config.creation) {
            if (config.creation.categories) {
                var container = document.querySelector('[data-drop-zone="creation-categories"]');
                if (container) {
                    config.creation.categories.forEach(function(item) {
                        var html = createElementHtml(item);
                        container.insertAdjacentHTML('beforeend', html);
                    });
                }
            }
            
            if (config.creation.links) {
                var container = document.querySelector('[data-drop-zone="creation-links"]');
                if (container) {
                    config.creation.links.forEach(function(item) {
                        var html = createElementHtml(item);
                        container.insertAdjacentHTML('beforeend', html);
                    });
                }
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