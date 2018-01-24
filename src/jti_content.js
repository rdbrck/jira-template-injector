/* Copyright 2016 Redbrick Technologies, Inc. */
/* https://github.com/rdbrck/jira-description-extension/blob/master/LICENSE */

/* global chrome, browser */

var StorageID = 'Jira-Template-Injector';
var inputIDs = [];

var browserType = 'Chrome'; // eslint-disable-line no-unused-vars
if (navigator.userAgent.indexOf('Firefox') !== -1 || navigator.userAgent.indexOf('Edge') !== -1) {
    chrome = browser; // eslint-disable-line no-native-reassign
    chrome.storage.sync = browser.storage.local;
    if (navigator.userAgent.indexOf('Firefox') !== -1) {
        browserType = 'Firefox';
    }
    if (navigator.userAgent.indexOf('Edge') !== -1) {
        browserType = 'Edge';
    }
}

// Handle <TI> tag selection.
chrome.runtime.sendMessage({JDTIfunction: 'getInputIDs'}, function (response) {
    $.each(response.data, function (index, inputID) {
        inputIDs.push(inputID.name);
    });

    var idList = inputIDs.join(', #');
    idList = '#' + idList;
    console.log("idlist is:", idList);

    $(document).on('click', idList, function (inputID) {

        console.log("inputid array after selectors:", inputIDs);
        console.log("inputid value:", inputID);
        var id = inputID.currentTarget.id;
        id = "#" + id;
        console.log("id to use later is:", id);

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
        $(`${id}`).keydown(function (e) {
            if (e.keyCode === ctrlKey) ctrlDown = true;
        }).keyup(function (e) {
            if (e.keyCode === ctrlKey) ctrlDown = false;
        });

        // Keypress listener
        $(`${id}`).keydown(function (e) {
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

/*
    When user submits a ticket track the ticket type.
    Send DM event 'issue_type' to learn what the most commonly used ticket types are.
    '${dm.meta:request_ip}' DM Metadata enrichment to pass back the originating IP.
    '${dm.meta:request_geo}' DM Metadata enrichment to pass back standard geo-ip properties.
    '${dm.ua:user_agent}' DM Metadata enrichment to pass back standard user-agent properties.

    Why collect this information?
    This information will allow us to better set the default templates.
    If we find a template is used very often we can add it as a default to simplify peoples' ticket creation.
 */
$(document).on('click', '#create-issue-submit', function () {
    chrome.runtime.sendMessage({type: 'analytics', name: 'issue_type', body:
    {
        'type': $('#issuetype-field').val(),
        'version': chrome.runtime.getManifest().version,
        'ip_address': '${dm.meta:request_ip}',
        'geo': '${dm.meta:request_geo}',
        'ua': '${dm.ua:user_agent}'
    }
    });
});

function isDefaultDescription (value, callback) {
    chrome.storage.sync.get(StorageID, function (templates) {
        templates = templates[StorageID].templates;
        var match = false;

        // Check if it's empty.
        if (value === '') {
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
    var project = projectElement.val();
    return project.substring(project.lastIndexOf('(') + 1, project.length - 1);
}

function injectDescriptionTemplate (descriptionElement) {
    // Each issue type for each project can have its own template.
    chrome.storage.sync.get(StorageID, function (templates) {
        templates = templates[StorageID].templates;

        var templateText = '',
            projectElement = $('#project-field'),
            issueTypeElement = $('#issuetype-field');

        if (issueTypeElement !== null && projectElement !== null) {
            var projectKey = parseProjectKey(projectElement);
            var override = 0;

            $.each(templates, function (key, template) {
                // Default template (no issue type, no project)
                if (!template['issuetype-field'] && !template['projects-field']) {
                    if (override < 1) {
                        override = 1;
                        templateText = template.text;
                    }
                // Override if project, no issue type
                } else if (!template['issuetype-field'] && $.inArray(projectKey, utils.parseProjects(template['projects-field'])) !== -1) {
                    if (override < 2) {
                        override = 2;
                        templateText = template.text;
                    }
                // Override if issue type, no project
                } else if (!template['projects-field'] && template['issuetype-field'] === issueTypeElement.val()) {
                    if (override < 3) {
                        override = 3;
                        templateText = template.text;
                    }
                // Override if issue type and project
                } else if (template['issuetype-field'] === issueTypeElement.val() &&
                        $.inArray(projectKey, utils.parseProjects(template['projects-field'])) !== -1) {
                    templateText = template.text;
                    return false;
                }
            });

            descriptionElement.value = templateText;
        } else {
            if (issueTypeElement === null) {
                console.error('*** Error: Element Id "issuetype-field" not found.');
            } else if (projectElement === null) {
                console.error('*** Error: Element Id "project-field" not found.');
            }
        }
    });
}

function descriptionChangeEvent (changeEvent) {
    // The description field has been changed, turn the dirtyDialogMessage back on and remove the listener.
    changeEvent.target.className = changeEvent.target.className.replace(' ajs-dirty-warning-exempt', '');
    changeEvent.target.removeEventListener('change', descriptionChangeEvent);
}

function observeDocumentBody (mutation) {
    if (document.getElementById('create-issue-dialog') !== null || document.getElementById('create-subtask-dialog') !== null) { // Only interested in document changes related to Create Issue Dialog box or Create Sub-task Dialog box.
        if (inputIDs.includes(mutation.target.id)) { // Only interested in the existing input id fields.
            console.log("entered case successfully with mutation.target.id equalling: ", mutation.target.id);
            var descriptionElement = mutation.target;
            isDefaultDescription(descriptionElement.value, function (result) {
                if (result) { // Only inject if description field has not been modified by the user.
                    injectDescriptionTemplate(descriptionElement);
                    if (descriptionElement.className.indexOf('ajs-dirty-warning-exempt') === -1) { // Default template injection should not pop up dirtyDialogMessage.
                        descriptionElement.className += ' ajs-dirty-warning-exempt';
                        descriptionElement.addEventListener('change', descriptionChangeEvent);
                    }
                }
            });
        }
    }
}

// Create observer to monitor for description field if the domain is a monitored one
chrome.runtime.sendMessage({JDTIfunction: 'getDomains'}, function (response) {
    $.each(response.data, function (index, domain) {
        var pattern = new RegExp(domain.name);
        if (pattern.test(window.location.href)) {
            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(observeDocumentBody);
            });
            observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['resolved'] });
        }
    });
});
