/* Copyright 2016 Redbrick Technologies, Inc. */
/* https://github.com/rdbrck/jira-description-extension/blob/master/LICENSE */

/* global chrome, browser */

var StorageID = 'Jira-Template-Injector';
var fieldSelectors = [];
var nonWYSIWYGFieldSelectors = [];

var browserType = 'Chrome'; // eslint-disable-line no-unused-vars
if (navigator.userAgent.indexOf('Firefox') !== -1 || navigator.userAgent.indexOf('Edge') !== -1) {
    chrome = browser; // eslint-disable-line no-native-reassign
    chrome.storage.sync = browser.storage.local;
    if (navigator.userAgent.indexOf('Firefox') !== -1) {
        browserType = 'Firefox';
    }
    if (navigator.userAgent.indexOf('Edge') !== -1) {
        browserType = 'Edge'; // eslint-disable-line no-unused-vars
    }
}

// Handle <TI> tag selection.
chrome.runtime.sendMessage({JDTIfunction: 'getFieldSelectors'}, function (response) {
    $.each(response.data, function (index, fieldSelector) {
        fieldSelectors.push(fieldSelector);
        if (!fieldSelector.isWYSIWYG) {
            nonWYSIWYGFieldSelectors.push(fieldSelector.cssSelector);
        }
    });

    $(document).on('click', `${nonWYSIWYGFieldSelectors.join(', ')}`, function (fieldSelector) {
        var text = $(this).val(),
            ctrlDown = false,
            backtickKey = 192,
            ctrlKey = 17,
            cursorStart = $(this).prop('selectionStart'),
            cursorFinish = $(this).prop('selectionEnd'),
            end = (text.length - 5),
            selectStart = null,
            selectEnd = null,
            i = 0;

        // Only proceed if this is a click. i.e. not a highlight.
        if (cursorStart === cursorFinish) {
            // Look for opening tag '<TI>'.
            for (i = cursorStart; i >= 4; i--) {
                if (i !== 4) {
                    if (text.slice((i - 5), i) === '</TI>') {
                        // Found closing tag before opening tag -> We are not withing any valid tags.
                        break;
                    }
                }
                if (text.slice((i - 4), i) === '<TI>') {
                    // Found opening Tag!
                    selectStart = (i - 4);
                    break;
                }
            }

            if (selectStart) {
                // Look for closing tag '</TI>'
                for (i = cursorStart; i <= end; i++) {
                    if (text.slice(i, (i + 4)) === '<TI>') {
                        // Found another opening bracket before closing bracket. Exit search.
                        break;
                    }
                    if (text.slice(i, (i + 5)) === '</TI>') {
                        // Found closing Tag!
                        selectEnd = (i + 5);
                        break;
                    }
                }
                if (selectEnd) {
                    // Select all the text between the two tags.
                    $(this)[0].setSelectionRange(selectStart, selectEnd);
                    cursorStart = cursorFinish = selectStart; // Set the cursor position to the select start point. This will ensure we find the next <TI> tag when using keyboard shortcut
                } else { // This only happens when user clicks on the the closing <TI> tag. Set selectStart to null so that it wont break the keyborad functionality
                    selectStart = null;
                }
            }
        }

        // Detect ctrl or cmd pressed
        $(`#${fieldSelector.currentTarget.id}`).keydown(function (e) {
            if (e.keyCode === ctrlKey) ctrlDown = true;
        }).keyup(function (e) {
            if (e.keyCode === ctrlKey) ctrlDown = false;
        });

        // Keypress listener
        $(`#${fieldSelector.currentTarget.id}`).keydown(function (e) {
            if (ctrlDown && (e.keyCode === backtickKey)) { // If ctrl is pressed
                let {start: tagStartIndex, end: tagEndIndex} = getAllIndexes($(this).val()); // Find all <TI> and </TI> tags in selected template.
                if (tagStartIndex.length !== 0 && tagEndIndex.length !== 0) { // Works only if the selected template contains any <TI> tag
                    if (selectStart === null && selectEnd === null) { // Start from first <TI>
                        var startPos = selectNextSelectionRange($(this)[0], cursorStart, tagStartIndex, tagEndIndex);
                        selectStart = startPos.start; // Set Start Index
                        selectEnd = startPos.end; // Set End Index
                    } else { // Select next <TI> set
                        if (tagStartIndex.indexOf(selectStart) === tagStartIndex.length - 1 && tagEndIndex.indexOf(selectEnd) === tagEndIndex.length - 1) { // Currently selecting the last set of <TI>, back to first set
                            $(this)[0].setSelectionRange(tagStartIndex[0], tagEndIndex[0]);
                            selectStart = tagStartIndex[0];
                            selectEnd = tagEndIndex[0];
                        } else {
                            if (tagStartIndex.indexOf(selectStart) === -1 && tagEndIndex.indexOf(selectEnd) === -1) { // Highlighted <TI> tag is modified by user. Now we need search for the next <TI>.
                                if (cursorStart < selectStart) cursorStart = selectStart;
                                startPos = selectNextSelectionRange($(this)[0], cursorStart, tagStartIndex, tagEndIndex);
                                selectStart = startPos.start; // Set Start Index
                                selectEnd = startPos.end; // Set End Index
                            } else {
                                $(this)[0].setSelectionRange(tagStartIndex[tagStartIndex.indexOf(selectStart) + 1], tagEndIndex[tagEndIndex.indexOf(selectEnd) + 1]); // Find next set of <TI>
                                selectStart = tagStartIndex[tagStartIndex.indexOf(selectStart) + 1];
                                selectEnd = tagEndIndex[tagEndIndex.indexOf(selectEnd) + 1];
                            }
                        }
                    }
                    cursorStart = cursorFinish = selectStart; // Set the cursor position to the select start point. This will ensure we find the next <TI> tag when using keyboard shortcut
                }
            }
        });
    });
});

function selectNextSelectionRange (selector, cursorStart, tagStartIndex, tagEndIndex) {
    var startPos = FindNextTI(cursorStart, tagStartIndex, tagEndIndex); // Find the starting <TI> tag
    selector.setSelectionRange(startPos.start, startPos.end);
    return startPos;
}

// Helper method. Find next <TI> based on cursor position
function FindNextTI (CursorPos, tagStart, tagEnd) {
    for (var i = 0; i < tagStart.length; i++) {
        if (tagStart[i] >= CursorPos) {
            return { start: tagStart[i], end: tagEnd[i] };
        }
    }
    return { start: tagStart[0], end: tagEnd[0] };
}

// Helper method. Find index(start and end) of all occurrences of a given substring in a string
function getAllIndexes (str) {
    var startIndexes = [],
        endIndexes = [],
        re = /<TI>/g, // Start
        match = re.exec(str);
    while (match) {
        startIndexes.push(match.index);
        match = re.exec(str);
    }

    re = /<\/TI>/g; // End
    match = re.exec(str);
    while (match) {
        endIndexes.push(match.index + 5);
        match = re.exec(str);
    }
    return { start: startIndexes, end: endIndexes };
}

function isDefaultTemplate (value, callback) {
    chrome.storage.sync.get(StorageID, function (templates) {
        templates = templates[StorageID].templates;
        var match = false;

        // Check if it's empty.
        if (value === '') {
            match = true;
        }

        // Check if it's the placeholder
        if (value.includes('class="placeholder')) {
            match = true;
        }

        // Check if we've already loaded a template.
        if (!match) {
            $.each(templates, function (key, template) {
                if (value === template.text) {
                    match = true;
                    return false;
                }
            });
        }

        callback(match);
    });
}

// Given the project name as formatted in JIRA's dropdown "PROJECT (KEY)", parse out the key
function parseProjectKey (projectElement) {
    var project = projectElement.textContent;
    return project.substring(project.lastIndexOf('(') + 1, project.length - 1);
}

function injectTemplate (fieldSelectorID, element, isInput) {
    // Each issue type for each project can have its own template.
    chrome.storage.sync.get(StorageID, function (templates) {
        templates = templates[StorageID].templates;

        var templateText = '',
            projectElement = document.getElementById('issue-create.ui.modal.create-form.project-picker.project-select'),
            issueTypeElement = document.querySelector('#issue-create\\.ui\\.modal\\.create-form\\.type-picker\\.issue-type-select');

        if (issueTypeElement !== null && projectElement !== null) {
            var projectKey = parseProjectKey(projectElement);
            var override = 0;

            $.each(templates, function (key, template) {
                if (parseInt(template.fieldSelector) === parseInt(fieldSelectorID)) {
                    // Default template (no issue type, no project)
                    if (!template['issueType'] && !template['projects']) {
                        if (override < 1) {
                            override = 1;
                            templateText = template.text;
                        }
                        // Override if project, no issue type
                    } else if (!template['issueType'] && $.inArray(projectKey, utils.parseProjects(template['projects'])) !== -1) {
                        if (override < 2) {
                            override = 2;
                            templateText = template.text;
                        }
                        // Override if issue type, no project
                    } else if (!template['projects'] && template['issueType'] === issueTypeElement.textContent) {
                        if (override < 3) {
                            override = 3;
                            templateText = template.text;
                        }
                        // Override if issue type and project
                    } else if (template['issueType'] === issueTypeElement.textContent &&
                        $.inArray(projectKey, utils.parseProjects(template['projects'])) !== -1) {
                        templateText = template.text;
                        return false;
                    }
                }
            });

            if (isInput) {
                element.value = templateText;
            } else {
                element.innerHTML = templateText;
            }
        } else {
            if (issueTypeElement === null) {
                console.error('*** Error: Element Id "issueType" not found.');
            } else if (projectElement === null) {
                console.error('*** Error: Element Id "project" not found.');
            }
        }
    });
}

// function descriptionChangeEvent (changeEvent) {
//     // The description field has been changed, turn the dirtyDialogMessage back on and remove the listener.
//     changeEvent.target.className = changeEvent.target.className.replace(' ajs-dirty-warning-exempt', '');
//     changeEvent.target.removeEventListener('change', descriptionChangeEvent);
// }

function observeDocumentBody (mutation) {
    if (document.getElementById('issue-create.ui.modal.modal-body') !== null || document.getElementById('create-subtask-dialog') !== null) { // Only interested in document changes related to Create Issue Dialog box or Create Sub-task Dialog box.
        $.each(fieldSelectors, function (index, fieldSelector) {
            // Handle non WYSIWYG fields
            if (!fieldSelector.isWYSIWYG && mutation.target.id === fieldSelector.cssSelector) {
                var templateElement = mutation.target;
                isDefaultTemplate(templateElement.value, function (result) {
                    if (result) { // Only inject if the field has not been modified by the user.
                        injectTemplate(fieldSelector.id, templateElement, true);
                    }
                });
            }

            // Handle WYSIWYG fields
            if (fieldSelector.isWYSIWYG) {
                let container = document.querySelector(fieldSelector.WYSIWYGContainerSelector);
                if (container !== null && container.contains(mutation.target)) {
                    let templateElement = document.querySelector(`${fieldSelector.WYSIWYGContainerSelector} ${fieldSelector.cssSelector}`);
                    console.log(templateElement);
                    console.log(`${fieldSelector.WYSIWYGContainerSelector} ${fieldSelector.cssSelector}`);
                    if (templateElement !== null) {
                        console.log('here 2');
                        isDefaultTemplate(templateElement.innerHTML, function (result) {
                            console.log(result);
                            if (result) { // Only inject if description field has not been modified by the user.
                                injectTemplate(fieldSelector.id, templateElement, false);
                            }
                        });
                        return false;
                    }
                }
            }
        });

        // console.log('here!!!!!!!!!!');
        // console.log(descriptionElement);
        // console.log(descriptionElement.innerHTML);
        // console.log(mutation.target);
        // if (descriptionElement !== null) { // Only interested in select input id fields.
        //     // var descriptionElement = mutation.target;
        //     isDefaultTemplate(descriptionElement.innerHTML, function (result) {
        //         if (result) { // Only inject if description field has not been modified by the user.
        //             injectTemplate(descriptionElement);
        //             // descriptionElement.addEventListener('change', descriptionChangeEvent);
        //             // if (descriptionElement.className.indexOf('ajs-dirty-warning-exempt') === -1) { // Default template injection should not pop up dirtyDialogMessage.
        //             //     descriptionElement.className += ' ajs-dirty-warning-exempt';

        //             // }
        //         }
        //     });
        // }
    }

    // if (document.getElementById('create-issue-dialog') !== null || document.getElementById('create-subtask-dialog') !== null) { // Only interested in document changes related to Create Issue Dialog box or Create Sub-task Dialog box.
    //     if (inputIDs.includes(mutation.target.id)) { // Only interested in select input id fields.
    //         var descriptionElement = mutation.target;
    //         isDefaultTemplate(descriptionElement.value, function (result) {
    //             if (result) { // Only inject if description field has not been modified by the user.
    //                 injectTemplate(descriptionElement);
    //                 if (descriptionElement.className.indexOf('ajs-dirty-warning-exempt') === -1) { // Default template injection should not pop up dirtyDialogMessage.
    //                     descriptionElement.className += ' ajs-dirty-warning-exempt';
    //                     descriptionElement.addEventListener('change', descriptionChangeEvent);
    //                 }
    //             }
    //         });
    //     }
}

// Create observer to monitor for description field if the domain is a monitored one
chrome.runtime.sendMessage({JDTIfunction: 'getDomains'}, function (response) {
    $.each(response.data, function (index, domain) {
        var pattern = new RegExp(domain.name);
        if (pattern.test(window.location.href)) {
            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(observeDocumentBody);
            });
            observer.observe(document.body, { subtree: true, attributes: true });
        }
    });
});
