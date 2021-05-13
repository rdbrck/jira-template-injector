/* Copyright 2016 Redbrick Technologies, Inc. */
/* https://github.com/rdbrck/jira-description-extension/blob/master/LICENSE */

/* global chrome, browser */

// Check for jQuery.
if (typeof jQuery === 'undefined') {
    var jQuery;
    var $;
    // Check if require is a defined function.
    if (typeof require === 'function') {
        jQuery = $ = require('jquery');
        // Else use the dollar sign alias.
    } else {
        jQuery = $;
    }
}

/* eslint no-global-assign: 0, no-native-reassign: 0 */

var browserType = 'Chrome'; // eslint-disable-line no-unused-vars
if (
    navigator.userAgent.indexOf('Firefox') !== -1 ||
    navigator.userAgent.indexOf('Edge') !== -1
) {
    chrome = browser;
    chrome.storage.sync = browser.storage.local;
    if (navigator.userAgent.indexOf('Firefox') !== -1) {
        browserType = 'Firefox';
    }
    if (navigator.userAgent.indexOf('Edge') !== -1) {
        browserType = 'Edge';
    }
}

var StorageID = 'Jira-Template-Injector';
var DefaultDomainList = [{ name: 'atlassian.net' }];
var DefaultIDList = [{ name: 'description' }];
var StorageToggleID = 'JTI-Toggle';
var emptyData = {
    options: { limit: [], domains: [], inputIDs: [] },
    templates: {},
};
var toggles = { rateClicked: false };

function saveTemplates(templateJSON, callback, responseData = null) {
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

function getInputIDs(callback) {
    var IDListCustom = {};
    // Get the default input IDs
    var IDList = DefaultIDList.map((inputID) => ({
        ...inputID,
        default: true,
    }));
    // Get the custom input IDs
    chrome.storage.sync.get(StorageID, function (data) {
        if (data[StorageID]) {
            IDListCustom = data[StorageID].options.inputIDs.map((inputID) => ({
                ...inputID,
                default: false,
            }));
            // Sort them
            IDListCustom = utils.sortArrayByProperty(IDListCustom, 'name');
            // combine so that the default entries are always at the top
            IDList = IDList.concat(IDListCustom);
        }
        callback(true, null, IDList);
    });
}

function getDomains(callback) {
    var domainListCustom = {};
    // Get the default domains
    var domainList = DefaultDomainList.map((domain) => ({
        ...domain,
        default: true,
    }));
    // Get the custom domains
    chrome.storage.sync.get(StorageID, function (data) {
        if (data[StorageID]) {
            domainListCustom = data[
                StorageID
            ].options.domains.map((domain) => ({ ...domain, default: false }));
            // Sort them
            domainListCustom = utils.sortArrayByProperty(
                domainListCustom,
                'name'
            );
            // combine so that the default entries are always at top
            domainList = domainList.concat(domainListCustom);
        }
        callback(true, null, domainList);
    });
}

function fetchJSON(url, callback) {
    fetch(url)
        .then((res) => callback(true, null, res.json()))
        .catch((err) => callback(false, err, null));
}

// Get toggle status based on 'toggleType'
function getToggleStatus(toggleType, callback) {
    chrome.storage.sync.get(StorageToggleID, function (toggles) {
        if (jQuery.isEmptyObject(toggles)) {
            // If user does not have any toggle settings in storage
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
function setToggleStatus(toggleType, toggleInput, callback) {
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

function clearTemplates(callback) {
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

function fetchDefaultTemplates(callback) {
    var url = chrome.runtime.getURL('data/templates.json');
    fetchJSON(url, function (status, message, data) {
        callback(status, message, data);
    });
}

function getData(callback) {
    chrome.storage.sync.get(StorageID, function (templates) {
        if (templates[StorageID]) {
            var templateJSON = dataToJSON(templates[StorageID]);
            callback(true, '', templateJSON);
        } else {
            callback(false, 'No data is currently loaded');
        }
    });
}

function setDefaultTemplates(callback) {
    fetchDefaultTemplates(function (status, message, data) {
        if (status) {
            saveTemplates(JSONtoData(data), callback);
        } else {
            callback(false, message);
        }
    });
}

function downloadJSONData(url, callback) {
    fetchJSON(url, function (status, message, data) {
        if (status) {
            saveTemplates(JSONtoData(data), callback);
        } else {
            callback(false, message);
        }
    });
}

function loadLocalFile(fileContents, callback) {
    try {
        saveTemplates(JSONtoData(JSON.parse(fileContents)), callback);
    } catch (e) {
        callback(false, 'Error parsing JSON. Please verify file contents');
    }
}

function JSONtoData(JSONData) {
    // copy data provided in JSON file and other data from emptyData object
    var completeData = {};
    $.extend(true, completeData, emptyData, JSONData);
    // convert the JSON data to the proper format and return the formatted data
    completeData.templates = JSONtoTemplateData(completeData.templates);
    completeData.options.domains = JSONtoDomainData(
        completeData.options.domains
    );
    completeData.options.inputIDs = JSONtoInputIDData(
        completeData.options.inputIDs
    );
    return completeData;
}

function dataToJSON(data) {
    data.templates = templateDataToJSON(data.templates);
    data.options.domains = domainDataToJSON(data.options.domains);
    data.options.inputIDs = inputIDDataToJSON(data.options.inputIDs);
    return data;
}

function removeTemplate(templateID, callback) {
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

function updateTemplate(
    templateID,
    templateName,
    templateIssueType,
    templateProjects,
    templateText,
    callback
) {
    chrome.storage.sync.get(StorageID, function (templates) {
        if (templates[StorageID]) {
            var templateJSON = templates[StorageID];
            var modifiedTemplate = {
                id: templateID,
                name: templateName,
                'issuetype-field': templateIssueType,
                'projects-field': formatProjectsField(templateProjects),
                text: templateText,
            };

            // temporarily remove the template for validation (don't want to compare the template against itself)
            // if validation fails, the deletion will not be saved
            delete templateJSON.templates[templateID];

            if (
                validateTemplate(
                    modifiedTemplate,
                    templateJSON.templates,
                    callback
                )
            ) {
                templateJSON.templates[templateID] = modifiedTemplate;
                saveTemplates(templateJSON, callback);
            }
        } else {
            callback(
                false,
                'No data available to update. Please recreate the template'
            );
        }
    });
}

function addTemplate(
    templateName,
    issueTypeField,
    projectsField,
    text,
    callback
) {
    chrome.storage.sync.get(StorageID, function (templates) {
        var templateJSON = {};

        if (templates[StorageID]) {
            templateJSON = templates[StorageID];
        }

        var templateID = getNextID(templateJSON.templates);
        var newTemplate = {
            id: templateID,
            name: templateName,
            'issuetype-field': issueTypeField,
            'projects-field': formatProjectsField(projectsField),
            text: text,
        };

        if (validateTemplate(newTemplate, templateJSON.templates, callback)) {
            templateJSON.templates[templateID] = newTemplate;
            saveTemplates(templateJSON, callback, templateID);
        }
    });
}

function addInputID(IDName, callback) {
    chrome.storage.sync.get(StorageID, function (data) {
        var JSONData = {};
        if (data[StorageID]) {
            JSONData = data[StorageID];
        }

        var newID = {
            id: getNextID(JSONData.options.inputIDs),
            name: IDName,
        };

        validateInputID(IDName, function (message) {
            if (message) {
                callback(false, message);
            } else {
                JSONData.options.inputIDs[newID.id] = newID;
                saveTemplates(
                    JSONData,
                    function (status, message, data) {
                        reloadMatchingTabs();
                        callback(status, message, data);
                    },
                    newID.id
                );
            }
        });
    });
}

function addDomain(domainName, callback) {
    chrome.storage.sync.get(StorageID, function (data) {
        var JSONData = {};
        if (data[StorageID]) {
            JSONData = data[StorageID];
        }

        var newDomain = {
            id: getNextID(JSONData.options.domains),
            name: domainName,
        };

        validateDomain(domainName, function (message) {
            if (message) {
                callback(false, message);
            } else {
                JSONData.options.domains[newDomain.id] = newDomain;
                saveTemplates(
                    JSONData,
                    function (status, message, data) {
                        reloadMatchingTabs();
                        callback(status, message, data);
                    },
                    newDomain.id
                );
            }
        });
    });
}

function removeDomain(domainID, removeAll, callback) {
    chrome.storage.sync.get(StorageID, function (data) {
        if (data[StorageID]) {
            var JSONData = data[StorageID];
            if (removeAll === true) {
                JSONData.options.domains = {};
            } else {
                delete JSONData.options.domains[domainID];
            }
            saveTemplates(JSONData, callback);
        } else {
            callback(false, 'No data available to remove');
        }
    });
}

function removeInputID(inputID, removeAll, callback) {
    chrome.storage.sync.get(StorageID, function (data) {
        if (data[StorageID]) {
            var JSONData = data[StorageID];
            if (removeAll === true) {
                JSONData.options.inputIDs = {};
            } else {
                delete JSONData.options.inputIDs[inputID];
            }
            saveTemplates(JSONData, callback);
        } else {
            callback(false, 'No data available to remove');
        }
    });
}

function validateDomain(domainName, callback) {
    getDomains(function (status, msg, response) {
        // Verify that there are no empty domains
        let message = null;
        if (!domainName) {
            message = 'Domain Name is blank';
        }
        // Verify that there are no duplicate domains
        response.forEach((domain) => {
            if (domain.name.localeCompare(domainName) === 0) {
                message = `Domain Name: "${domainName}" already exists`;
                return false;
            }
        });
        callback(message);
    });
}

function validateInputID(IDName, callback) {
    getInputIDs(function (status, msg, response) {
        // Verify that there are no empty input IDs
        let message = null;
        if (!IDName) {
            message = 'Input ID is blank';
        }
        // Verify that there are no duplicate input IDs
        response.forEach((inputID) => {
            if (inputID.name.localeCompare(IDName) === 0) {
                message = `Input ID: "${IDName}" already exists`;
                return false;
            }
        });
        callback(message);
    });
}

// Make sure that the (issue type, project) combination is unique
function validateTemplate(newTemplate, templates, callback) {
    var valid = true;
    var newTemplateProjects = utils.parseProjects(
        newTemplate['projects-field']
    );
    templates.forEach((template) => {
        if (newTemplate['issuetype-field'] === template['issuetype-field']) {
            // Can't have two default templates (no issue type, no projects)
            if (
                !newTemplate['issuetype-field'] &&
                !newTemplate['projects-field'] &&
                !template['projects-field']
            ) {
                callback(
                    false,
                    'Default template ' + template.name + ' already exists',
                    template.id
                );
                valid = false;
                return false;
                // Can't have two templates with no issue type that both have the same project in their list of projects
            } else if (!newTemplate['issuetype-field']) {
                let commonProject = utils.commonItemInArrays(
                    newTemplateProjects,
                    utils.parseProjects(template['projects-field'])
                );
                if (commonProject) {
                    callback(
                        false,
                        'Template ' +
                            template.name +
                            ' already exists for project ' +
                            commonProject,
                        template.id
                    );
                    valid = false;
                    return false;
                }
                // Can't have two templates with the same issue type and no projects
            } else if (
                !newTemplate['projects-field'] &&
                !template['projects-field']
            ) {
                callback(
                    false,
                    'Template ' +
                        template.name +
                        ' already exists for issue type ' +
                        newTemplate['issuetype-field'],
                    template.id
                );
                valid = false;
                return false;
                // Can't have two templates with the same issue type that both have the same project in their list of projects
            } else if (
                newTemplate['projects-field'] &&
                template['projects-field']
            ) {
                let commonProject = utils.commonItemInArrays(
                    newTemplateProjects,
                    utils.parseProjects(template['projects-field'])
                );
                if (commonProject) {
                    callback(
                        false,
                        'Template ' +
                            template.name +
                            ' already exists for issue type ' +
                            newTemplate['issuetype-field'] +
                            ' and project ' +
                            commonProject,
                        template.id
                    );
                    valid = false;
                    return false;
                }
            }
        }
    });
    return valid;
}

function responseMessage(status, message = null, data = null) {
    var response = {};

    if (status) {
        response = { status: 'success', message: message, data: data };
    } else {
        response = { status: 'error', message: message, data: data };
    }

    return response;
}

function replaceAllString(originalString, replace, replaceWith) {
    return originalString.split(replace).join(replaceWith);
}

function matchRegexToJsRegex(match) {
    return new RegExp(replaceAllString(match, '*', '\\S*'));
}

// Parse projects field and save it as a comma separated list, ensuring common format
function formatProjectsField(projectsField) {
    if (!projectsField) {
        return '';
    }

    // Replace all commas with spaces, trim, and replace runs of multiple whitespace with ', '
    return projectsField
        .replace(/,/g, ' ')
        .trim(projectsField)
        .replace(/\s+/g, ', ');
}

function migrateTemplateKeys(callback = null) {
    if (!callback) {
        callback = function (status, message) {};
    }

    chrome.storage.sync.get(StorageID, function (templates) {
        if (!templates[StorageID]) {
            return;
        }

        var templateJSON = templates[StorageID];

        // If data is in old format, migrate it
        templateJSON.templates.forEach((template) => {
            if (!template.name) {
                templateJSON.templates = JSONtoTemplateData(
                    templateJSON.templates
                );
                saveTemplates(templateJSON, callback);
            }
            return false;
        });
    });
}

function JSONtoTemplateData(templates) {
    var nextID = getNextID(templates);
    var formattedTemplates = {};

    if (templates.constructor === Array) {
        templates.forEach((template) => {
            template.id = nextID;
            formattedTemplates[nextID++] = template;
        });
    } else {
        // support old template format
        templates.forEach((template) => {
            template.name = key;
            template.id = nextID;
            formattedTemplates[nextID++] = template;
        });
    }

    return formattedTemplates;
}

function JSONtoDomainData(domains, callback) {
    var formattedDomains = {};
    if (domains && domains.constructor === Array) {
        var nextID = getNextID(domains);
        domains.forEach((domain) => {
            validateJSONDomainEntry(domain, callback);
            var newDomain = {
                id: nextID,
                name: domain,
            };
            formattedDomains[newDomain.id] = newDomain;
            nextID++;
        });
    }

    return formattedDomains;
}

function JSONtoInputIDData(inputIDs, callback) {
    var formattedInputIDs = {};
    if (inputIDs && inputIDs.constructor === Array) {
        var nextID = getNextID(inputIDs);
        inputIDs.forEach((inputID) => {
            validateJSONInputIDEntry(inputID, callback);
            var newInputID = {
                id: nextID,
                name: inputID,
            };
            formattedInputIDs[newInputID.id] = newInputID;
            nextID++;
        });
    }

    return formattedInputIDs;
}

function validateJSONDomainEntry(domain, callback) {
    if (!domain || typeof domain !== 'string') {
        callback(false, 'Error parsing JSON. Please verify file contents');
    }
}

function validateJSONInputIDEntry(inputID, callback) {
    if (!inputID || typeof inputID !== 'string') {
        callback(false, 'Error parsing JSON. Please verify file contents');
    }
}

function templateDataToJSON(templates) {
    return templates.map((template) => {
        let formattedTemplate = template;
        delete template.id;
        return formattedTemplate;
    });
}

function domainDataToJSON(domains) {
    var formattedDomains = [];

    domains.forEach((domain) => {
        formattedDomains.push(domain.name);
    });

    return formattedDomains;
}

function inputIDDataToJSON(inputIDs) {
    var formattedInputIDs = [];

    inputIDs.forEach((inputID) => {
        formattedInputIDs.push(inputID.name);
    });

    return formattedInputIDs;
}

function getNextID(templates) {
    var highestID = 0;
    templates.forEach((template) => {
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
    if (
        Object.keys(templates).length === 0 &&
        JSON.stringify(templates) === JSON.stringify({})
    ) {
        // No data in storage yet - Load default templates.
        setDefaultTemplates(function (status, result) {});
    }
});

function reloadMatchingTabs() {
    var urlRegexs = [];
    // Access all of the values in the 'domains', then reload the matching tabs
    getDomains(function (status, msg, response) {
        response.forEach((domain) => {
            urlRegexs.push(matchRegexToJsRegex(domain.name));
        });

        chrome.tabs.query(
            { windowId: chrome.windows.WINDOW_ID_CURRENT },
            function (tabs) {
                tabs.forEach((tab) => {
                    urlRegexs.forEach((regex) => {
                        // So we don't infinitely reload the chrome://extensions page, reloading JTI, reloading...
                        var chromeRegex = new RegExp('chrome://extensions');
                        if (regex.test(tab.url) && !chromeRegex.test(tab.url)) {
                            chrome.tabs.reload(tab.id);
                        }
                    });
                });
            }
        );
    });
}

// Listen for when extension is installed or updated
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'update') {
        migrateTemplateKeys();
    }

    if (details.reason === 'install' || details.reason === 'update') {
        reloadMatchingTabs();
    }
});

// Listen for Messages.
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.JDTIfunction) {
        case 'fetchDefault':
            fetchDefaultTemplates(function (
                status,
                message = null,
                data = null
            ) {
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
            loadLocalFile(
                request.fileContents,
                function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                }
            );
            break;
        case 'download':
            downloadJSONData(
                request.url,
                function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                }
            );
            break;
        case 'clear':
            clearTemplates(function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'delete':
            removeTemplate(
                request.templateID,
                function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                }
            );
            break;
        case 'save':
            updateTemplate(
                request.templateID,
                request.templateName,
                request.templateIssueType,
                request.templateProjects,
                request.templateText,
                function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                }
            );
            break;
        case 'add':
            addTemplate(
                request.templateName,
                request.issueTypeField,
                request.projectsField,
                request.text,
                function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                }
            );
            break;
        case 'getData':
            getData(function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'setToggleStatus':
            setToggleStatus(
                request.toggleType,
                request.toggleInput,
                function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                }
            );
            break;
        case 'getToggleStatus':
            getToggleStatus(
                request.toggleType,
                function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                }
            );
            break;
        case 'addDomain':
            addDomain(
                request.domainName,
                function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                }
            );
            break;
        case 'addInputID':
            addInputID(
                request.IDName,
                function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                }
            );
            break;
        case 'removeDomain':
            removeDomain(
                request.domainID,
                request.removeAll,
                function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                }
            );
            break;
        case 'removeInputID':
            removeInputID(
                request.inputID,
                request.removeAll,
                function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                }
            );
            break;
        case 'getDomains':
            getDomains(function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        case 'getInputIDs':
            getInputIDs(function (status, message = null, data = null) {
                var response = responseMessage(status, message, data);
                sendResponse(response);
            });
            break;
        default:
            sendResponse({ status: 'error', message: 'Invalid Action' });
    }
    return true;
});
