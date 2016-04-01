//This file will load the default templates into storage on install or update if no previous versions are already loaded
chrome.storage.sync.get("rdbrck-JiraDescriptions-test2", function(templates) {
    //Check if we have any loaded templates in storage
    if (Object.keys(templates).length === 0 && JSON.stringify(templates) === JSON.stringify({})){
        //No data in storage yet - Load default templates
        var url = chrome.extension.getURL('templates.json');
        fetchJSON(url);
    } else {
        console.log("The following templates are currently loaded:\n");
        console.log(templates)
    }
});

function saveTemplates(templateJSON) {
    chrome.storage.sync.set({"rdbrck-JiraDescriptions-test2": templateJSON}, function() {
        // Notify that we saved.
        console.log('Settings were hopefully saved');
    });

}

function fetchJSON(url) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var templateJSON = JSON.parse(xmlhttp.responseText);
            saveTemplates(templateJSON);
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}
