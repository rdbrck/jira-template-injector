/* Copyright 2016 Redbrick Technologies, Inc. */
/* https://github.com/rdbrck/jira-description-extension/blob/master/LICENSE */

/* global chrome, browser */

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

var StorageID = 'Jira-Template-Injector';
var DefaultDomainList = [
    {'name': 'atlassian.net'}
];
var DefaultFieldSelectors = [
    {'id': 0, 'name': 'Description', 'cssSelector': '.ak-editor-content-area div[role="textbox"]', 'isWYSIWYG': true, 'WYSIWYGContainerSelector': '#description-container'}
];
var StorageToggleID = 'JTI-Toggle';
var emptyData = {'options': {'limit': [], 'domains': [], 'fieldSelectors': []}, 'templates': {}};
var toggles = {'rateClicked': false};

function saveTemplates (templateJSON, callback, responseData = null) {
    var data = {};
    data[StorageID] = templateJSON;
    chrome.storage.sync.set(data, function () {
        if (chrome.runtime.lastError) {
            callback(false, 'Error saving data. Please try again');
        } else {
            callback(true, null, responseData);
        }
    });
}

function getFieldSelectors (callback) {
    var FieldSelectorListCustom = {};
    // Get the default Field Selectors
    var FieldSelectorList = $.map(DefaultFieldSelectors, function (FieldSelector, index) {
        FieldSelector.default = true;
        return FieldSelector;
    });
    // Get the custom Field Selectors
    chrome.storage.sync.get(StorageID, function (data) {
        if (data[StorageID]) {
            FieldSelectorListCustom = $.map(data[StorageID].options.fieldSelectors, function (FieldSelector, index) {
                FieldSelector.default = false;
                return FieldSelector;
            });
            // Sort them
            FieldSelectorListCustom = utils.sortArrayByProperty(FieldSelectorListCustom, 'name');
            // combine so that the default entries are always at the top
            FieldSelectorList = FieldSelectorList.concat(FieldSelectorListCustom);
        }
        callback(true, null, FieldSelectorList);
    });
}

function getDomains (callback) {
    var domainListCustom = {};
    // Get the default domains
    var domainList = $.map(DefaultDomainList, function (domain, index) {
        domain.default = true;
        return domain;
    });
    // Get the custom domains
    chrome.storage.sync.get(StorageID, function (data) {
        if (data[StorageID]) {
            domainListCustom = $.map(data[StorageID].options.domains, function (domain, index) {
                domain.default = false;
                return domain;
            });
            // Sort them
            domainListCustom = utils.sortArrayByProperty(domainListCustom, 'name');
            // combine so that the default entries are always at top
            domainList = domainList.concat(domainListCustom);
        }
        callback(true, null, domainList);
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

function clearTemplates (callback) {
    // Need to save the domains, then re-add them here.
    chrome.storage.sync.get(StorageID, function (data) {
        var clearedData = emptyData;
        clearedData.options.domains = data[StorageID].options.domains;
        chrome.storage.sync.clear(function () {
            if (chrome.runtime.lastError) {
                callback(false, 'Error clearing data. Please try again');
            } else {
                saveTemplates(clearedData, callback);
                callback(true);
            }
        });
    });
}

function fetchDefaultTemplates (callback) {
    var url = chrome.extension.getURL('data/templates.json');
    fetchJSON(url, function (status, message, data) {
        callback(status, message, data);
    });
}

function getData (callback) {
    chrome.storage.sync.get(StorageID, function (templates) {
        if (templates[StorageID]) {
            var templateJSON = dataToJSON(templates[StorageID]);
            callback(true, '', templateJSON);
        } else {
            callback(false, 'No data is currently loaded');
        }
    });
}

function setDefaultTemplates (callback) {
    fetchDefaultTemplates(function (status, message, data) {
        if (status) {
            saveTemplates(JSONtoData(data), callback);
        } else {
            callback(false, message);
        }
    });
}

function downloadJSONData (url, callback) {
    fetchJSON(url, function (status, message, data) {
        if (status) {
            saveTemplates(JSONtoData(data), callback);
        } else {
            callback(false, message);
        }
    });
}

function loadLocalFile (fileContents, callback) {
    try {
        saveTemplates(JSONtoData(JSON.parse(fileContents)), callback);
    } catch (e) {
        callback(false, 'Error parsing JSON. Please verify file contents');
    }
}

function JSONtoData (JSONData) {
    // copy data provided in JSON file and other data from emptyData object
    var completeData = {};
    $.extend(true, completeData, emptyData, JSONData);
    // convert the JSON data to the proper format and return the formatted data
    completeData.templates = JSONtoTemplateData(completeData.templates);
    completeData.options.domains = JSONtoDomainData(completeData.options.domains);
    completeData.options.fieldSelectors = JSONtoFieldSelectorsData(completeData.options.fieldSelectors);
    return completeData;
}

function dataToJSON (data) {
    data.templates = templateDataToJSON(data.templates);
    data.options.domains = domainDataToJSON(data.options.domains);
    data.options.fieldSelectors = inputIDDataToJSON(data.options.fieldSelectors);
    return data;
}

function removeTemplate (templateID, callback) {
    chrome.storage.sync.get(StorageID, function (templates) {
        if (templates[StorageID]) {
            var templateJSON = templates[StorageID];
            delete templateJSON.templates[templateID];
            saveTemplates(templateJSON, callback);
        } else {
            callback(false, 'No data available to remove');
        }
    });
}

function updateTemplate (templateID, templateName, templateIssueType, templateProjects, templateText, callback) {
    chrome.storage.sync.get(StorageID, function (templates) {
        if (templates[StorageID]) {
            var templateJSON = templates[StorageID];
            var modifiedTemplate = {
                'id': templateID,
                'name': templateName,
                'issueType': templateIssueType,
                'projects': formatProjectsString(templateProjects),
                'text': templateText
            };

            // temporarily remove the template for validation (don't want to compare the template against itself)
            // if validation fails, the deletion will not be saved
            delete templateJSON.templates[templateID];

            if (validateTemplate(modifiedTemplate, templateJSON.templates, callback)) {
                templateJSON.templates[templateID] = modifiedTemplate;
                saveTemplates(templateJSON, callback);
            }
        } else {
            callback(false, 'No data available to update. Please recreate the template');
        }
    });
}

function addTemplate (templateName, issueType, projectsString, text, callback) {
    chrome.storage.sync.get(StorageID, function (templates) {
        var templateJSON = {};

        if (templates[StorageID]) {
            templateJSON = templates[StorageID];
        }

        var templateID = getNextID(templateJSON.templates);
        var newTemplate = {
            'id': templateID,
            'name': templateName,
            'issueType': issueType,
            'projects': formatProjectsString(projectsString),
            'text': text
        };

        if (validateTemplate(newTemplate, templateJSON.templates, callback)) {
            templateJSON.templates[templateID] = newTemplate;
            saveTemplates(templateJSON, callback, templateID);
        }
    });
}

function addFieldSelector (name, cssSelector, isWYSIWYG, WYSIWYGContainerSelector, callback) {
    chrome.storage.sync.get(StorageID, function (data) {
        var JSONData = {};
        if (data[StorageID]) {
            JSONData = data[StorageID];
        }

        var newFieldSelector = {
            'id': getNextID(JSONData.options.fieldSelectors),
            'name': name,
            'cssSelector': cssSelector,
            'isWYSIWYG': isWYSIWYG,
            'WYSIWYGContainerSelector': WYSIWYGContainerSelector
        };

        if (validateFieldSelector(newFieldSelector, JSONData.options.fieldSelectors, callback)) {
            JSONData.options.fieldSelectors[newFieldSelector.id] = newFieldSelector;
            saveTemplates(JSONData, function (status, message, data) {
                reloadMatchingTabs();
                callback(status, message, data);
            }, newFieldSelector.id);
            // function (message) {
            //     if (message) {
            //         callback(false, message);
            //     } else {

        //     }
        };
    });
}

function addDomain (domainName, callback) {
    chrome.storage.sync.get(StorageID, function (data) {
        var JSONData = {};
        if (data[StorageID]) {
            JSONData = data[StorageID];
        }

        var newDomain = {
            'id': getNextID(JSONData.options.domains),
            'name': domainName
        };

        validateDomain(domainName, function (message) {
            if (message) {
                callback(false, message);
            } else {
                JSONData.options.domains[newDomain.id] = newDomain;
                saveTemplates(JSONData, function (status, message, data) {
                    reloadMatchingTabs();
                    callback(status, message, data);
                }, newDomain.id);
            }
        });
    });
}

function removeDomain (domainID, removeAll, callback) {
    chrome.storage.sync.get(StorageID, function (data) {
        if (data[StorageID]) {
            var JSONData = data[StorageID];
            delete JSONData.options.domains[domainID];
            saveTemplates(JSONData, callback);
        } else {
            callback(false, 'No data available to remove');
        }
    });
}

function removeInputID (fieldSelectorID, callback) {
    chrome.storage.sync.get(StorageID, function (data) {
        if (data[StorageID]) {
            var JSONData = data[StorageID];
            delete JSONData.options.fieldSelectors[fieldSelectorID];

            saveTemplates(JSONData, callback);
        } else {
            callback(false, 'No data available to remove');
        }
    });
}

function validateDomain (domainName, callback) {
    getDomains(function (status, msg, response) {
        // Verify that there are no empty domains
        let message = null;
        if (!domainName) {
            message = 'Domain Name is blank';
        }
        // Verify that there are no duplicate domains
        $.each(response, function (index, domain) {
            if (domain.name.localeCompare(domainName) === 0) {
                message = `Domain Name: "${domainName}" already exists`;
                return false;
            }
        });
        callback(message);
    });
}

function validateFieldSelector (newFieldSelector, fieldSelectors, callback) {
    let valid = true;
    let message = null;

    // Must have Selectors
    console.log(newFieldSelector);
    console.log(newFieldSelector.name);
    if (newFieldSelector.name === '' || newFieldSelector.name === null) {
        message = 'Name is blank';
        valid = false;
    }
    if (newFieldSelector.cssSelector === '' || newFieldSelector.cssSelector === null) {
        message = 'CSS Selector is blank';
        valid = false;
    }
    if (newFieldSelector.isWYSIWYG && (newFieldSelector.WYSIWYGContainerSelector === '' || newFieldSelector.WYSIWYGContainerSelector === null)) {
        message = 'WYSIWYG Container Selector is blank';
        valid = false;
    }

    if (message === null) {
        // // Verify that there are no duplicate input IDs
        // $.each(fieldSelectors, function (index, fieldSelector) {
        //     if (inputID.name.localeCompare(IDName) === 0) {
        //         // Can't have two default templates (no issue type, no projects)
        //         message = `Input ID: "${IDName}" already exists`;
        //         return false;
        //     }
        // });
        // callback(message);
    }
    callback(valid, message);
    return valid;
}

// Make sure that the (issue type, project) combination is unique
function validateTemplate (newTemplate, templates, callback) {
    var valid = true;
    var newTemplateProjects = utils.parseProjects(newTemplate['projects']);
    $.each(templates, function (index, template) {
        if (newTemplate['issueType'] === template['issueType']) {
            // Can't have two default templates (no issue type, no projects)
            if (!newTemplate['issueType'] && !newTemplate['projects'] && !template['projects']) {
                callback(false, 'Default template ' + template.name + ' already exists', template.id);
                valid = false;
                return false;
            // Can't have two templates with no issue type that both have the same project in their list of projects
            } else if (!newTemplate['issueType']) {
                let commonProject = utils.commonItemInArrays(newTemplateProjects, utils.parseProjects(template['projects']));
                if (commonProject) {
                    callback(false, 'Template ' + template.name + ' already exists for project ' + commonProject, template.id);
                    valid = false;
                    return false;
                }
            // Can't have two templates with the same issue type and no projects
            } else if (!newTemplate['projects'] && !template['projects']) {
                callback(false, 'Template ' + template.name + ' already exists for issue type ' + newTemplate['issueType'], template.id);
                valid = false;
                return false;
            // Can't have two templates with the same issue type that both have the same project in their list of projects
            } else if (newTemplate['projects'] && template['projects']) {
                let commonProject = utils.commonItemInArrays(newTemplateProjects, utils.parseProjects(template['projects']));
                if (commonProject) {
                    callback(false, 'Template ' + template.name + ' already exists for issue type ' + newTemplate['issueType'] + ' and project ' + commonProject, template.id);
                    valid = false;
                    return false;
                }
            }
        }
    });
    return valid;
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

// Parse projects field and save it as a comma separated list, ensuring common format
function formatProjectsString (projectsString) {
    if (!projectsString) {
        return '';
    }

    // Replace all commas with spaces
    projectsString = projectsString.replace(/,/g, ' ');

    // Remove leading and trailing spaces
    projectsString = $.trim(projectsString);

    // Replace groups of spaces with a comma and a space
    projectsString = projectsString.replace(/\s+/g, ', ');

    return projectsString;
}

function migrateTemplateKeys (callback = null) {
    if (!callback) {
        callback = function (status, message) {};
    }

    chrome.storage.sync.get(StorageID, function (templates) {
        if (!templates[StorageID]) {
            return;
        }

        var templateJSON = templates[StorageID];

        // If data is in old format, migrate it
        $.each(templateJSON.templates, function (key, template) {
            if (!template.name) {
                templateJSON.templates = JSONtoTemplateData(templateJSON.templates);
                saveTemplates(templateJSON, callback);
            }
            return false;
        });
    });
}

function JSONtoTemplateData (templates) {
    var nextID = getNextID(templates);
    var formattedTemplates = {};

    if (templates.constructor === Array) {
        $.each(templates, function (index, template) {
            template.id = nextID;
            formattedTemplates[nextID++] = template;
        });
    } else { // support old template format
        $.each(templates, function (key, template) {
            template.name = key;
            template.id = nextID;
            formattedTemplates[nextID++] = template;
        });
    }

    return formattedTemplates;
}

function JSONtoDomainData (domains, callback) {
    var formattedDomains = {};
    if (domains && domains.constructor === Array) {
        var nextID = getNextID(domains);
        $.each(domains, function (index, domain) {
            validateJSONDomainEntry(domain, callback);
            var newDomain = {
                'id': nextID,
                'name': domain
            };
            formattedDomains[newDomain.id] = newDomain;
            nextID++;
        });
    }

    return formattedDomains;
}

function JSONtoFieldSelectorsData (fieldSelectors, callback) {
    var formattedFieldSelectors = {};
    if (fieldSelectors && fieldSelectors.constructor === Array) {
        var nextID = getNextID(fieldSelectors);
        $.each(fieldSelectors, function (index, fieldSelector) {
            validateJSONInputIDEntry(fieldSelector, callback);
            var newFieldSelector = {
                'id': nextID,
                'name': fieldSelector.name
            };
            formattedFieldSelectors[newFieldSelector.id] = newFieldSelector;
            nextID++;
        });
    }

    return formattedFieldSelectors;
}

function validateJSONDomainEntry (domain, callback) {
    if (!domain || typeof (domain) !== 'string') {
        callback(false, 'Error parsing JSON. Please verify file contents');
    }
}

function validateJSONInputIDEntry (inputID, callback) {
    if (!inputID || typeof (inputID) !== 'string') {
        callback(false, 'Error parsing JSON. Please verify file contents');
    }
}

function templateDataToJSON (templates) {
    var formattedTemplates = [];

    $.each(templates, function (key, template) {
        delete template.id;
        formattedTemplates.push(template);
    });
    return formattedTemplates;
}

function domainDataToJSON (domains) {
    var formattedDomains = [];

    $.each(domains, function (key, domain) {
        formattedDomains.push(domain.name);
    });

    return formattedDomains;
}

function inputIDDataToJSON (fieldSelectors) {
    var formattedFieldSelectors = [];

    $.each(fieldSelectors, function (key, fieldSelector) {
        delete fieldSelector.id;
        formattedFieldSelectors.push(fieldSelector);
    });

    return formattedFieldSelectors;
}

function getNextID (templates) {
    var highestID = 0;
    $.each(templates, function (key, template) {
        var templateID = parseInt(template.id);
        if (templateID && templateID > highestID) {
            highestID = templateID;
        }
    });

    return highestID + 1;
}

// This file will load the default templates into storage on install or update if no previous versions are already loaded.
chrome.storage.sync.get(StorageID, function (templates) {
    // Check if we have any loaded templates in storage.
    if (Object.keys(templates).length === 0 && JSON.stringify(templates) === JSON.stringify({})) {
        // No data in storage yet - Load default templates.
        setDefaultTemplates(function (status, result) {});
    }
});

function reloadMatchingTabs () {
    var urlRegexs = [];
    // Access all of the values in the 'domains', then reload the matching tabs
    getDomains(function (status, msg, response) {
        $.each(response, function (index, domain) {
            urlRegexs.push(matchRegexToJsRegex(domain.name));
        });

        chrome.tabs.query({windowId: chrome.windows.WINDOW_ID_CURRENT}, function (tabs) {
            $.each(tabs, function (tabIndex, tab) {
                $.each(urlRegexs, function (regexIndex, regex) {
                    // So we don't infinitely reload the chrome://extensions page, reloading JTI, reloading...
                    var chromeRegex = new RegExp('chrome://extensions');
                    if (regex.test(tab.url) && (!chromeRegex.test(tab.url))) {
                        chrome.tabs.reload(tab.id);
                    }
                });
            });
        });
    });
}

// Listen for when extension is installed or updated
chrome.runtime.onInstalled.addListener(
    function (details) {
        if (details.reason === 'update') {
            migrateTemplateKeys();
        }

        if (details.reason === 'install' || details.reason === 'update') {
            reloadMatchingTabs();
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
            clearTemplates(function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'delete':
            removeTemplate(request.templateID, function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'save':
            updateTemplate(request.templateID, request.templateName, request.templateIssueType, request.templateProjects, request.templateText, function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'add':
            addTemplate(request.templateName, request.issueType, request.projectsString, request.text, function (status, message = null, data = null) {
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
        case 'addDomain':
            addDomain(request.domainName, function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'addFieldSelector':
            addFieldSelector(request.name, request.cssSelector, request.isWYSIWYG, request.WYSIWYGContainerSelector, function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'removeDomain':
            removeDomain(request.domainID, function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'removeInputID':
            removeInputID(request.inputID, function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'getDomains':
            getDomains(function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'getFieldSelectors':
            getFieldSelectors(function (status, message = null, data = null) {
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
