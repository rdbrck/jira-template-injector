function isDefaultDescription(value, callback)
{  
    chrome.storage.sync.get("rdbrck-JiraDescriptions-test2", function(templates) {
        templates = templates['rdbrck-JiraDescriptions-test2'];
        
        if (value == templates['JIRA DEFAULT']) {
            callback(true);
        }
        if (value == templates['BUG TEMPLATE']) {
            callback(true);   
        }
        if (value == templates['TASK TEMPLATE']) {
            callback(true);
        }    
        if (value == templates['STORY TEMPLATE']) {
            callback(true);
        }
        if (value == templates['NEW FEATURE TEMPLATE']) {
            callback(true);
        }
        if (value == templates['IMPROVEMENT TEMPLATE']) {
            callback(true);
        }
        if (value == templates['EPIC TEMPLATE']) {
            callback(true);
        }
        callback(false);
    });
}


function injectDescriptionTemplate(descriptionElement)
{
    // Each issue type can have its own template
    chrome.storage.sync.get("rdbrck-JiraDescriptions-test2", function(templates) {
        templates = templates['rdbrck-JiraDescriptions-test2'];
        var issueTypeElement = document.getElementById('issuetype-field');
        if (issueTypeElement != null) {
            switch(issueTypeElement.value) 
            {
                case "Bug":
                    descriptionElement.value = templates['BUG TEMPLATE'];
                    break
                   
                case "Story":
                    descriptionElement.value = templates['STORY TEMPLATE'];
                    break

                case "Task":
                    descriptionElement.value = templates['TASK TEMPLATE'];
                    break;                            
                    
                case "Improvement":
                    descriptionElement.value = templates['IMPROVEMENT TEMPLATE'];
                    break                        

                case "New Feature":
                    descriptionElement.value = templates['NEW FEATURE TEMPLATE'];
                    break

                case "Epic":
                    descriptionElement.value = templates['EPIC TEMPLATE'];
                    break

                default:
                    descriptionElement.value = templates['JIRA DEFAULT'];
                    break
            }
        } else {
            console.error("*** Error: Element Id 'issuetype-field' not found.");
        }
    });
}

function descriptionChangeEvent(changeEvent)
{
    // the description field has been changed, turn the dirtyDialogMessage back on and remove the listener
    changeEvent.target.className = changeEvent.target.className.replace(" ajs-dirty-warning-exempt", "");
    changeEvent.target.removeEventListener("change", descriptionChangeEvent);
    
}

function observeDocumentBody(mutation) 
{
    if (document.getElementById("create-issue-dialog") != null) { // only interested in document changes related to Create Issue Dialog box        
        if (mutation.target.id == "description") { // only interested in the description field
            var descriptionElement = mutation.target
            isDefaultDescription(descriptionElement.value, function(result){
                if (result) { // only inject if description field has not been modified by the user
                    console.log("We were here!!!");
                    injectDescriptionTemplate(descriptionElement);
                    if (descriptionElement.className.indexOf("ajs-dirty-warning-exempt") == -1) { // default template injection should not pop up dirtyDialogMessage
                        descriptionElement.className += " ajs-dirty-warning-exempt";
                        descriptionElement.addEventListener("change", descriptionChangeEvent);
                    }
                }
            });
        }
    }
}

var observer = new MutationObserver(function(mutations) {
	mutations.forEach(observeDocumentBody);
});

observer.observe(document.body, {subtree: true, attributes: true, attributeFilter: ["resolved"]});
