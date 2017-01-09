/* Copyright 2016 Redbrick Technologies, Inc. */
/* https://github.com/rdbrck/jira-description-extension/blob/master/LICENSE */

/* global chrome, browser */

var StorageID = 'Jira-Template-Injector';

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
$(document).on('click', '#description', function () {
    var text = $(this).val(),
        ctrlDown = false,
        ctrlKey = 17,
        cmdKey = 91,
        backtickKey = 192,
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
            }
        }
    }

    // detect ctrl or cmd pressed
    $('#description').keydown(function (e) {
        if (e.keyCode === ctrlKey || e.keyCode === cmdKey) ctrlDown = true;
    }).keyup(function (e) {
        if (e.keyCode === ctrlKey || e.keyCode === cmdKey) ctrlDown = false;
    });

    // keypree listener
    $('#description').keydown(function (e) {
        if (ctrlDown && (e.keyCode === backtickKey)) { // if ctrl is pressed
            var tagStartIndex = []; // store index of <TI>
            var tagEndIndex = []; // store index of </TI>
            var tagindex = getAllIndexes($(this).val(), tagStartIndex, tagEndIndex); // find all <TI> and </TI> tags in selected template.
            tagStartIndex = tagindex.start;
            tagEndIndex = tagindex.end;
            if (tagStartIndex.length !== 0 && tagEndIndex.length !== 0) { // works only if the selected template contains any <TI> tag
                if (selectStart === null && selectEnd === null) { // start from first <TI>
                    var StartPos = FindNextTI(cursorStart, tagStartIndex, tagEndIndex); // find the starting <TI> tag
                    $(this)[0].setSelectionRange(StartPos.start, StartPos.end);
                    selectStart = StartPos.start; // set Start Index
                    selectEnd = StartPos.end; // set End Index
                } else { // select next <TI> set
                    if (tagStartIndex.indexOf(selectStart) === tagStartIndex.length - 1 && tagEndIndex.indexOf(selectEnd) === tagEndIndex.length - 1) { // currently selecting the last set of <TI>,back to first set
                        $(this)[0].setSelectionRange(tagStartIndex[0], tagEndIndex[0]);
                        selectStart = tagStartIndex[0];
                        selectEnd = tagEndIndex[0];
                    } else {
                        if (tagStartIndex.indexOf(selectStart) === -1 && tagEndIndex.indexOf(selectEnd) === -1) { // highlighted <TI> tag is modified by user. Now we need search for the next <TI>.
                            StartPos = FindNextTI(cursorStart, tagStartIndex, tagEndIndex); // find the starting <TI> tag
                            $(this)[0].setSelectionRange(StartPos.start, StartPos.end);
                            selectStart = StartPos.start; // set Start Index
                            selectEnd = StartPos.end; // set End Index
                        } else {
                            $(this)[0].setSelectionRange(tagStartIndex[tagStartIndex.indexOf(selectStart) + 1], tagEndIndex[tagEndIndex.indexOf(selectEnd) + 1]); // find next set of <TI>
                            selectStart = tagStartIndex[tagStartIndex.indexOf(selectStart) + 1];
                            selectEnd = tagEndIndex[tagEndIndex.indexOf(selectEnd) + 1];
                        }
                    }
                }
            }
        }
    });
});

// Helper method. Find next <TI> based on cursor position
function FindNextTI (CursorPos, tagStart, tagEnd) {
    for (var i = 0; i < tagStart.length; i++) {
        if (tagStart[i] >= CursorPos) {
            return { start: tagStart[i], end: tagEnd[i] };
        }
    }
}

// Helper method. Find index(start and end) of all occurrences of a given substring in a string
function getAllIndexes (str, arr1, arr2) {
    var re = /<TI>/g, // start
        match = re.exec(str);
    while (match) {
        arr1.push(match.index);
        match = re.exec(str);
    }

    var re2 = /<\/TI>/g, // end
        match2 = re2.exec(str);
    while (match2) {
        arr2.push(match2.index + 5);
        match2 = re2.exec(str);
    }
    return { start: arr1, end: arr2 };
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
    chrome.runtime.sendMessage({
        type: 'analytics', name: 'issue_type', body:
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

function injectDescriptionTemplate (descriptionElement) {
    // Each issue type can have its own template.
    chrome.storage.sync.get(StorageID, function (templates) {
        templates = templates[StorageID].templates;

        // Load default template if set. Individual Templates will over ride it.
        var templateText = '',
            issueTypeElement = $('#issuetype-field');

        if (templates['DEFAULT TEMPLATE']) {
            templateText = templates['DEFAULT TEMPLATE'].text;
        }

        if (issueTypeElement !== null) {
            $.each(templates, function (key, template) {
                if (issueTypeElement.val() === template['issuetype-field']) {
                    templateText = template.text;
                    return false;
                }
            });
            descriptionElement.value = templateText;
        } else {
            console.error('*** Error: Element Id "issuetype-field" not found.');
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
        if (mutation.target.id === 'description') { // Only interested in the description field.
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

// Create observer to monitor for description field
var observer = new MutationObserver(function (mutations) {
    mutations.forEach(observeDocumentBody);
});
observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['resolved'] });
