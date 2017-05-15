/* Copyright 2016 Redbrick Technologies, Inc. */
/* https://github.com/rdbrck/jira-description-extension/blob/master/LICENSE */

/* global $dm, chrome, browser */

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

// -------------------------- Desk Metrics ---------------------------------- //
// DeskMetrics JavaScript SDK Currently does not support Firefox.
// It is planned for a future release.
if (browserType !== 'Firefox') {
    // Initialise and start the DeskMetrics (DM) SDK with the appropriate app ID.
    $dm.start({ 'appId': '<appID>' }, function () {
        $dm.setProperty('tracking_id', chrome.runtime.getManifest().version);
        /*
            Set the extension uninstall URL. When the extension is uninstalled DM
            will fire an uninstall event and redirect the user to the supplied URL.
        */
        $dm.setUninstallURL('http://jiratemplate.com/remove');
    });

    /*
    Initialize a chrome message listener for DM events.
    As this is in the extension background page, this message listener will
    continuously run in the background allowing us to send DM events from
    anywhere in our extension.
    */
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
        if (message.type === 'analytics') {
            $dm.send(message.name, message.body);
        }
    });
}

// -------------------------------------------------------------------------- //

var StorageID = 'Jira-Template-Injector';
var StorageToggleID = 'JTI-Toggle';
var emptyData = {'options': {'limit': []}, 'templates': {}};
var toggles = {'rateClicked': false};

function saveTemplates (templateJSON, callback) {
    var data = {};
    data[StorageID] = templateJSON;
    chrome.storage.sync.set(data, function () {
        if (chrome.runtime.lastError) {
            callback(false, 'Error saving data. Please try again');
        } else {
            callback(true);
        }
    });
}

function fetchJSON (url, callback) {
    $.getJSON(url, function (templateJSON) {
        callback(true, null, templateJSON);
    })
        .error(function () {
            callback(false, 'Invalid URL. Please correct the URL and try again', null);
        });
}

function getData (callback) {
    chrome.storage.sync.get(StorageID, function (templates) {
        if (templates[StorageID]) {
            callback(true, '', templates[StorageID]);
        } else {
            callback(false, 'No data is currently loaded');
        }
    });
}

// Get toggle status based on 'toggleType'
function getToggleStatus (toggleType, callback) {
    chrome.storage.sync.get(StorageToggleID, function (toggles) {
        if (jQuery.isEmptyObject(toggles)) { // If user does not have any toggle settings in storage
            callback(false, 'No data is currently loaded');
        } else {
            if (toggles[StorageToggleID][toggleType]) {
                callback(true, '', toggles[StorageToggleID][toggleType]);
            } else {
                callback(false, 'No data is currently loaded');
            }
        }
    });
}

// Set toggle status based on 'toggleType'
function setToggleStatus (toggleType, toggleInput, callback) {
    var data = {};
    toggles[toggleType] = toggleInput;
    data[StorageToggleID] = toggles;
    chrome.storage.sync.set(data, function () {
        if (chrome.runtime.lastError) {
            callback(false, 'Error saving data. Please try again');
        } else {
            callback(true);
        }
    });
}

function clearStorage (callback) {
    chrome.storage.sync.clear(function () {
        if (chrome.runtime.lastError) {
            callback(false, 'Error clearing data. Please try again');
        } else {
            saveTemplates(emptyData, callback);
            callback(true);
        }
    });
}

function fetchDefaultTemplates (callback) {
    var url = chrome.extension.getURL('data/templates.json');
    fetchJSON(url, function (status, message, data) {
        callback(status, message, data);
    });
}

function setDefaultTemplates (callback) {
    fetchDefaultTemplates(function (status, message, data) {
        if (status) {
            saveTemplates(data, callback);
        } else {
            callback(false, message);
        }
    });
}

function downloadJSONData (url, callback) {
    fetchJSON(url, function (status, message, data) {
        if (status) {
            saveTemplates(data, callback);
        } else {
            callback(false, message);
        }
    });
}

function removeTemplate (templateName, callback) {
    chrome.storage.sync.get(StorageID, function (templates) {
        if (templates[StorageID]) {
            var templateJSON = templates[StorageID];
            delete templateJSON.templates[templateName];
            saveTemplates(templateJSON, callback);
        } else {
            callback(false, 'No data available to remove');
        }
    });
}

function updateTemplate (templateName, templateProjects, templateText, callback) {
    chrome.storage.sync.get(StorageID, function (templates) {
        if (templates[StorageID]) {
            var templateJSON = templates[StorageID];
            var template = templateJSON.templates[templateName];
            template.text = templateText;
            template['projects-field'] = formatProjectsField(templateProjects);
            saveTemplates(templateJSON, callback);
        } else {
            callback(false, 'No data available to update. Please recreate the template');
        }
    });
}

function addTemplate (templateName, issueTypeField, projectsField, text, callback) {
    chrome.storage.sync.get(StorageID, function (templates) {
        var templateJSON = {};
        var save = true;
        var formattedProjectsField = formatProjectsField(projectsField);

        if (templates[StorageID]) {
            templateJSON = templates[StorageID];
        }

        $.each(templateJSON.templates, function (name, template) {
            if (issueTypeField === template['issuetype-field']) {
                // Can't have two templates with the same issue type that both apply to ALL projects
                if (!projectsField && !template['projects-field']) {
                    save = false;
                    callback(false, 'Template already exists for issue type ' + issueTypeField, 'open');
                    return false;
                // Can't have two templates with the same issue type that both have the same project in their list of projects
                } else if (projectsField && template['projects-field']) {
                    let commonProject = commonItemInArrays(parseProjects(formattedProjectsField), parseProjects(template['projects-field']));
                    if (commonProject) {
                        save = false;
                        callback(false, 'Template already exists for project ' + commonProject, 'open');
                        return false;
                    }
                }
            }
        });

        if (save) {
            templateJSON.templates[templateName] = {'issuetype-field': issueTypeField, 'projects-field': formattedProjectsField, 'text': text};
            saveTemplates(templateJSON, callback);
        }
    });
}

function loadLocalFile (fileContents, callback) {
    try {
        var templateJSON = $.parseJSON(JSON.stringify(fileContents));
        saveTemplates(templateJSON, callback);
    } catch (e) {
        callback(false, 'Error parsing JSON. Please verify file contents');
    }
}

function responseMessage (status, message = null, data = null) {
    var response = {};

    if (status) {
        response = {status: 'success', message: message, data: data};
    } else {
        response = {status: 'error', message: message, data: data};
    }

    return response;
}

function replaceAllString (originalString, replace, replaceWith) {
    return originalString.split(replace).join(replaceWith);
};

function matchRegexToJsRegex (match) {
    return new RegExp(replaceAllString(match, '*', '\\S*'));
}

function commonItemInArrays (array1, array2) {
    var commonItem = null;
    $.each(array1, function (index, value) {
        if ($.inArray(value, array2) !== -1) {
            commonItem = value;
            return false;
        }
    });
    return commonItem;
}

// Parse projects field and save it as a comma separated list, ensuring common format
function formatProjectsField (projectsField) {
    if (!projectsField) {
        return '';
    }

    // Replace all commas with spaces
    projectsField = projectsField.replace(/,/g, ' ');

    // Remove leading and trailing spaces
    projectsField = $.trim(projectsField);

    // Replace groups of spaces with a comma and a space
    projectsField = projectsField.replace(/\s+/g, ', ');

    return projectsField;
}

// Turn formatted projects field into an array of projects
function parseProjects (projects) {
    return projects.split(', ');
}

// This file will load the default templates into storage on install or update if no previous versions are already loaded.
chrome.storage.sync.get(StorageID, function (templates) {
    // Check if we have any loaded templates in storage.
    if (Object.keys(templates).length === 0 && JSON.stringify(templates) === JSON.stringify({})) {
        // No data in storage yet - Load default templates.
        setDefaultTemplates(function (status, result) {});
    }
});

// Listen for when extension is installed or updated
chrome.runtime.onInstalled.addListener(
    function (details) {
        if (details.reason === 'install' || details.reason === 'update') {
            var contentScripts = chrome.runtime.getManifest().content_scripts;
            var urlRegexs = [];

            $.each(contentScripts, function (index, contentScript) {
                $.each(contentScript.matches, function (matchIndex, match) {
                    urlRegexs.push(matchRegexToJsRegex(match));
                });
            });

            // reload tabs with urls that match content script matches
            chrome.tabs.query({windowId: chrome.windows.WINDOW_ID_CURRENT}, function (tabs) {
                $.each(tabs, function (tabIndex, tab) {
                    $.each(urlRegexs, function (regexIndex, regex) {
                        if (regex.test(tab.url)) {
                            chrome.tabs.reload(tab.id);
                            return false;
                        }
                    });
                });
            });
        }
    }
);

// Listen for Messages.
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        switch (request.JDTIfunction) {
        case 'fetchDefault':
            fetchDefaultTemplates(function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'reset':
            setDefaultTemplates(function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'upload':
            loadLocalFile(request.fileContents, function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'download':
            downloadJSONData(request.url, function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'clear':
            clearStorage(function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'delete':
            removeTemplate(request.templateName, function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'save':
            updateTemplate(request.templateName, request.templateProjects, request.templateText, function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'add':
            addTemplate(request.templateName, request.issueTypeField, request.projectsField, request.text, function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'getData':
            getData(function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'setToggleStatus':
            setToggleStatus(request.toggleType, request.toggleInput, function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'getToggleStatus':
            getToggleStatus(request.toggleType, function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        default:
            sendResponse({status: 'error', message: 'Invalid Action'});
        }
        return true;
    }
);
