define(['core/ajax'], function(Ajax) {
    'use strict';
    
    var initialized = false;
    var draggedElement = null;
    
    // ==================== DOMAIN OBJECTS ====================
    
    // Base Container class - eliminates code duplication
    class Container {
        constructor(id, type, acceptedTypes = []) {
            this.id = id;
            this.type = type;
            this.acceptedTypes = acceptedTypes;
            this.elements = [];
            this.parentContainer = null;
        }
        
        canAccept(element) {
            return element && this.acceptedTypes.includes(element.type);
        }
        
        addElement(element) {
            if (!this.canAccept(element)) {
                console.warn(`${this.type} cannot accept ${element ? element.type : 'null'} elements`);
                return false;
            }
            element.parentContainer = this;
            this.elements.push(element);
            return true;
        }
        
        removeElement(elementId) {
            const index = this.elements.findIndex(el => el.id === elementId);
            if (index >= 0) {
                const removed = this.elements.splice(index, 1)[0];
                if (removed) removed.parentContainer = null;
                return true;
            }
            return false;
        }
        
        setElements(elements) {
            this.elements = elements;
            elements.forEach(el => el.parentContainer = this);
        }
        
        findElement(elementId) {
            for (let element of this.elements) {
                if (element.id === elementId) return element;
                // If element is also a container, search recursively
                if (element.elements && typeof element.findElement === 'function') {
                    const found = element.findElement(elementId);
                    if (found) return found;
                }
            }
            return null;
        }
    }
    
    class Dashboard {
        constructor(id = 'main', userid = null) {
            this.id = id;
            this.userid = userid;
            this.blocks = [
                new Block('1'), new Block('2'),
                new Block('3'), new Block('4')
            ];
            this.creationZone = new CreationZone();
            this.createdAt = new Date();
            this.updatedAt = new Date();
        }
        
        findElement(elementId) {
            // Search in blocks using Container's findElement
            for (let block of this.blocks) {
                const found = block.findElement(elementId);
                if (found) return found;
            }
            
            // Search in creation zone
            const zones = [
                this.creationZone.zones.categories,
                this.creationZone.zones.links,
                this.creationZone.zones.courses
            ];
            
            for (let zone of zones) {
                const found = zone.findElement(elementId);
                if (found) return found;
            }
            
            return null;
        }
        
        findContainer(containerId) {
            // Check blocks
            for (let block of this.blocks) {
                if (block.id === containerId || block.originalId === containerId) return block;
                for (let category of block.elements) {
                    if (category.id === containerId || `category-${category.originalId}` === containerId) return category;
                }
            }
            
            // Check creation zone
            if (this.creationZone.hasContainer(containerId)) {
                return this.creationZone.getContainer(containerId);
            }
            
            return null;
        }
    }
    
    class Block extends Container {
        constructor(id) {
            // Block is a Container that accepts categories
            super(`block-${id}`, 'block', ['category']);
            
            // Block-specific properties
            this.originalId = id;  // Keep original ID for compatibility
            this.name = `Block ${id}`;
        }
        
        // Backward compatibility methods
        get categories() {
            return this.elements;
        }
        
        addCategory(category) {
            return this.addElement(category);
        }
        
        removeCategory(categoryId) {
            return this.removeElement(categoryId);
        }
    }
    
    class Category extends Container {
        constructor(id, name) {
            // Category is a Container that accepts courses and links
            super(`category-${id}`, 'category', ['course', 'link']);
            
            // Category-specific properties
            this.originalId = id;  // Keep original ID for compatibility
            this.name = name;
            this.description = '';
            this.createdAt = new Date();
            this.updatedAt = new Date();
        }
        
        getLocation() {
            if (this.parentContainer && this.parentContainer.type === 'block') {
                return {
                    type: 'block',
                    blockId: this.parentContainer.id,
                    blockName: this.parentContainer.name
                };
            }
            return { type: 'creation-zone' };
        }
    }
    
    class Course {
        constructor(moodleData) {
            this.id = moodleData.id;
            this.moodleId = moodleData.id;
            this.fullname = moodleData.fullname;
            this.shortname = moodleData.shortname || '';
            this.url = moodleData.url;
            this.summary = moodleData.summary || '';
            this.type = 'course';
            this.parentContainer = null;
        }
        
        canMoveTo(container) {
            return container && (container.type === 'creation-zone' || container.type === 'category');
        }
        
        getBlockLocation() {
            if (this.parentContainer && this.parentContainer.type === 'category') {
                return this.parentContainer.getLocation();
            }
            return null;
        }
    }
    
    class Link {
        constructor(id, name, url) {
            this.id = id;
            this.name = name;
            this.url = url;
            this.description = '';
            this.type = 'link';
            this.parentContainer = null;
            this.createdAt = new Date();
            this.updatedAt = new Date();
        }
        
        canMoveTo(container) {
            return container && (container.type === 'creation-zone' || container.type === 'category');
        }
        
        getBlockLocation() {
            if (this.parentContainer && this.parentContainer.type === 'category') {
                return this.parentContainer.getLocation();
            }
            return null;
        }
    }
    
    class CreationZone {
        constructor() {
            this.id = 'creation-zone';
            this.type = 'creation-zone';
            this.zones = {
                courses: new Container('creation-courses', 'creation-zone', ['course']),
                categories: new Container('creation-categories', 'creation-zone', ['category']),
                links: new Container('creation-links', 'creation-zone', ['link'])
            };
        }
        
        hasContainer(containerId) {
            return containerId === 'creation-courses' ||
                   containerId === 'creation-categories' ||
                   containerId === 'creation-links';
        }
        
        getContainer(containerId) {
            switch(containerId) {
                case 'creation-courses': return this.zones.courses;
                case 'creation-categories': return this.zones.categories;
                case 'creation-links': return this.zones.links;
                default: return null;
            }
        }
    }
    
    
    // ==================== GLOBAL STATE ====================
    
    var dashboard = null;
    var config = { blocks: {}, creation: { courses: [], categories: [], links: [] } }; // Legacy compatibility
    
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
        
        console.log('🚀 Initializing dashboard (Container Architecture)');
        
        // Create dashboard instance
        dashboard = new Dashboard('main');
        
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
        
        var originalId = 'cat-' + Date.now();
        
        // Create Category domain object (it will have id "category-cat-timestamp")
        var category = new Category(originalId, name);
        
        // Add to dashboard creation zone
        dashboard.creationZone.zones.categories.addElement(category);
        
        // Render in UI (maintain compatibility) - use the full category.id
        var categoryHtml = `
            <div class="category element" data-id="${category.id}" data-type="category" draggable="true">
                <div class="category-header">
                    <h4 class="editable">${name}</h4>
                    <button onclick="this.parentElement.parentElement.remove(); saveConfiguration()">×</button>
                </div>
                <div class="category-items" data-drop-zone="${category.id}"></div>
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
        
        // Create Link domain object
        var link = new Link(id, name, url);
        
        // Add to dashboard creation zone
        dashboard.creationZone.zones.links.addElement(link);
        
        // Render in UI (maintain compatibility)
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
                    var coursesData = JSON.parse(data.all_courses || '[]');
                    
                    // Create Course domain objects
                    var courses = coursesData.map(courseData => new Course(courseData));
                    
                    // Add to dashboard creation zone
                    dashboard.creationZone.zones.courses.setElements(courses);
                    
                    // Render in UI (maintain compatibility)
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