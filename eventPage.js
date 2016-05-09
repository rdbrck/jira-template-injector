/* Copyright 2016 TBD */
/* https://github.com/rdbrck/jira-description-extension/blob/master/LICENSE */

var StorageID = "rdbrck-JiraDescriptions-test2";

function saveTemplates(templateJSON, callback) {
    var data = {};
    data[StorageID] = templateJSON;
    chrome.storage.sync.set(data, function () {
        if (chrome.runtime.lastError) {
            callback(false, "Error saving data. Please try again");
        } else {
            callback(true);
        }
    });
}

function fetchJSON(url, callback) {
    //noinspection JSUnusedLocalSymbols,JSUnusedLocalSymbols
    $.getJSON(url, function (templateJSON) {
        callback(true, null, templateJSON);
    })
        .error(function () {
            callback(false, "Invalid URL. Please correct the URL and try again", null);
        });
}

function clearStorage(callback) {
    chrome.storage.sync.clear(function () {
        if (chrome.runtime.lastError) {
            callback(false, "Error clearing data. Please try again");
        } else {
            callback(true);
        }
    });
}

function fetchDefaultTemplates(callback) {
    var url = chrome.extension.getURL('templates.json');
    fetchJSON(url, function (status, message, data) {
        if (data.templates) {
            data = data.templates;
        }
        callback(status, message, data);
    });
}

function setDefaultTemplates(callback) {
    fetchDefaultTemplates(function (status, message, data) {
        if (status) {
            saveTemplates(data, callback);
        } else {
            callback(false, message);
        }
    });
}

function downloadJSONData(url, callback) {
    fetchJSON(url, function (status, message, data) {
        if (status) {
            saveTemplates(data.templates, callback);
        } else {
            callback(false, message);
        }
    });
}

function removeTemplate(templateName, callback) {
    chrome.storage.sync.get(StorageID, function (templates) {
        if (templates[StorageID]) {
            var templateJSON = templates[StorageID];
            delete templateJSON[templateName];
            saveTemplates(templateJSON, callback);
        } else {
            callback(false, "No data available to remove");
        }
    });

}
function updateTemplate(templateName, templateText, callback) {
    chrome.storage.sync.get(StorageID, function (templates) {
        if (templates[StorageID]) {
            var templateJSON = templates[StorageID];
            templateJSON[templateName].text = templateText;
            saveTemplates(templateJSON, callback);
        } else {
            callback(false, "No data available to update. Please recreate the template");
        }
    });
}

function addTemplate(templateName, issueTypeField, text, callback) {
    chrome.storage.sync.get(StorageID, function (templates) {
        var templateJSON = {},
            save = true;

        if (templates[StorageID]) {
            templateJSON = templates[StorageID];
        }

        $.each(templateJSON, function (name, template) {
            if (issueTypeField === template['issuetype-field']) {
                save = false;
                callback(false, "Template with same issuetype-field already exists", "open");
            }
        });

        if (save) {
            templateJSON[templateName] = {"issuetype-field": issueTypeField, "text": text};
            saveTemplates(templateJSON, callback);
        }
    });
}

function loadLocalFile(fileContents, callback) {
    try {
        var templateJSON = $.parseJSON(JSON.stringify(fileContents));
        saveTemplates(templateJSON, callback);
    } catch (e) {
        callback(false, "Error parsing JSON. Please verify file contents ");
    }
}

function responseMessage(status, message = null, data = null) {
    var response = {};

    if (status) {
        response = {status: "success", message: message, data: data};
    } else {
        response = {status: "error", message: message, data: data};
    }

    return response;
}

//This file will load the default templates into storage on install or update if no previous versions are already loaded
chrome.storage.sync.get(StorageID, function (templates) {
    //Check if we have any loaded templates in storage
    if (Object.keys(templates).length === 0 && JSON.stringify(templates) === JSON.stringify({})) {
        //No data in storage yet - Load default templates
        setDefaultTemplates(function (status, result) {});
    }
});

// Listen for Messages
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        switch (request.JDTIfunction) {
            case "fetchDefault":
                fetchDefaultTemplates(function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                });
                break;
            case "reset":
                setDefaultTemplates(function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                });
                break;
            case "upload":
                loadLocalFile(request.fileContents, function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                });
                break;
            case "download":
                downloadJSONData(request.url, function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                });
                break;
            case "clear":
                clearStorage(function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                });
                break;
            case "delete":
                removeTemplate(request.templateName, function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                });
                break;
            case "save":
                updateTemplate(request.templateName, request.templateText, function (status, message = null, data = null) {
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                });
                break;
            case "add":
                addTemplate(request.templateName, request.issueTypeField, request.text, function(status, message = null, data = null){
                    var response = responseMessage(status, message, data);
                    sendResponse(response);
                });
                break;
            default:
                sendResponse({status: "error", message: "Invalid Action"});
        }
        return true;
    }
);
