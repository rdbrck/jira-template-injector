//This file will load the default templates into storage on install or update if no previous versions are already loaded
chrome.storage.sync.get("rdbrck-JiraDescriptions-test2", function(templates) {
    //Check if we have any loaded templates in storage
    if (Object.keys(templates).length === 0 && JSON.stringify(templates) === JSON.stringify({})){
        //No data in storage yet - Load default templates
        loadDefaultTemplates(function(result){});
    } else {
        console.log("The following templates are currently loaded:\n");
        console.log(templates)
    }
});

function saveTemplates(templateJSON, callback) {
    chrome.storage.sync.set({"rdbrck-JiraDescriptions-test2": templateJSON}, function() {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
            callback(false);
        } else {
            console.log('Templates successfully saved');
            callback(true);
        }
    });
}

function fetchJSON(url, callback) {
    $.getJSON(url, function(templateJSON) {
        console.log("I should only see one of these!");
        saveTemplates(templateJSON, callback);
    })
    .error(function(jqXHR, textStatus, errorThrown) {
        callback(false, "Invalid URL. Correct URL and try again")
    });
}

function clearStorage(callback) {
    chrome.storage.sync.clear(function(){
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
            callback(false);
        } else {
            console.log('Successfully cleared storage');
            callback(true);
        }
    });
}

function loadDefaultTemplates(callback){
    var url = chrome.extension.getURL('templates.json');
    fetchJSON(url, callback);
}

function downloadJSONData(url, callback){
    fetchJSON(url, callback);
    /*if (validURL(url)) {
        console.log("Valid URL");
    } else {
        console.log("Invalid URL");
        callback(false, "Invalid URL. Please correct it and try again");
    }*/
}

function reponseMessage(result, message = null){
    reponse = {};

    if(result){
        response = {status: "success", message: message};
    } else {
        response = {status: "error", message: message};
    }

    return response;
}

// Listen for Messages
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(request.JDTIfunction)
        switch(request.JDTIfunction) {
            case "reset":
                loadDefaultTemplates(function(result){
                    response = reponseMessage(result);
                    sendResponse(response);
                });
                break;
            case "download":
                downloadJSONData(request.url, function(result, message = null){
                    response = reponseMessage(result, message);
                    sendResponse(response);
                });
                break;
            case "delete":
                clearStorage(function(result){
                    response = reponseMessage(result);
                    sendResponse(response);
                });
                break;
            default:
                sendResponse({message: "Invalid Command"});
        }
        return true;
    }
);
