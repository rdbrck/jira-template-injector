
/*
TODO: Instead of hard coding description templates below, create a way to
configure them using a browser action and then put them in some kind of 
persistent store for later recall and use.
*/

const JIRA_DEFAULT = ""

const DEFAULT_BUG_TEMPLATE = "\
*Summary*\n\
_Enter summary of the problem here._\n\
\n\
*Steps to Reproduce*\n\
_Enter detailed steps to reproduce here. More detail is better._\n\
\n\
*Expected Behavior*\n\
_Enter what should happen here._\n\
\n\
*Additional Details*\n\
_Enter any other details such as examples, links to requirements, et cetera that might help with fixing the problem. Attach screenshots if possible. More detail is better._\n\
\n\
*Workaround*\n\
_If there is a way to work around the problem, place that information here._\n"

const DEFAULT_STORY_TEMPLATE = "\
*Story*\n\
As a <_type of user/persona_>, I want <_to perform some task_>, so that I can <_achieve some goal/benefit/value_>.\n\
\n\
*Details*\n\
_Enter functional and non-functional needs here. More detail is better._\n\
\n\
*Additional Information*\n\
_Enter any other information such as examples, use cases, etc. that will help with developing the feature. More detail is better._\n\
\n\
*Acceptance Criteria*\n\
_Enter the conditions of satisfaction here. That is, the conditions that will satisfy the user/persona that the goal/benefit/value has been achieved._\n"

const DEFAULT_TASK_TEMPLATE = ""

const DEFAULT_NEW_FEATURE_TEMPLATE = "\
The Story issue type is preferred over the New Feature issue type.\n\
\n\
Please consider using the Story issue type and writing a user story instead.\n"

const DEFAULT_IMPROVEMENT_TEMPLATE = "\
The Story issue type is preferred over the Improvement issue type.\n\
\n\
Please consider using the Story issue type and writing a user story instead.\n"

const DEFAULT_EPIC_TEMPLATE = "\
*Epic*\n\
As a <_type of user/persona_>, I want <_to perform some task_>, so that I can <_achieve some goal/benefit/value_>.\n\
\n\
*Details*\n\
_Enter any other details such as examples, use cases, etc. that will help with developing the feature. More detail is better._\n"


function isDefaultDescription(value)
{  
    if (value == JIRA_DEFAULT) {
        return true
    }
    if (value == DEFAULT_BUG_TEMPLATE) {
        return true    
    }
    if (value == DEFAULT_TASK_TEMPLATE) {
        return true
    }    
    if (value == DEFAULT_STORY_TEMPLATE) {
        return true
    }
    if (value == DEFAULT_NEW_FEATURE_TEMPLATE) {
        return true
    }
    if (value == DEFAULT_IMPROVEMENT_TEMPLATE) {
        return true
    }
    if (value == DEFAULT_EPIC_TEMPLATE) {
        return true
    }    
    return false
}


function injectDescriptionTemplate(descriptionElement)
{
    // Each issue type can have its own template
    var issueTypeElement = document.getElementById('issuetype-field')
    if (issueTypeElement != null) {
        switch(issueTypeElement.value) 
        {
            case "Bug":
                descriptionElement.value = DEFAULT_BUG_TEMPLATE
                break
               
            case "Story":
                descriptionElement.value = DEFAULT_STORY_TEMPLATE
                break

            case "Task":
                descriptionElement.value = DEFAULT_TASK_TEMPLATE
                break;                            
                
            case "Improvement":
                descriptionElement.value = DEFAULT_IMPROVEMENT_TEMPLATE
                break                        

            case "New Feature":
                descriptionElement.value = DEFAULT_NEW_FEATURE_TEMPLATE
                break

            case "Epic":
                descriptionElement.value = DEFAULT_EPIC_TEMPLATE
                break

            default:
                descriptionElement.value = JIRA_DEFAULT
                break
        }
    } else {
        console.error("*** Error: Element Id 'issuetype-field' not found.")
    }
}

function descriptionChangeEvent(changeEvent)
{
    // the description field has been changed, turn the dirtyDialogMessage back on and remove the listener
    changeEvent.target.className = changeEvent.target.className.replace(" ajs-dirty-warning-exempt", "")
    changeEvent.target.removeEventListener("change", descriptionChangeEvent)
    
}

function observeDocumentBody(mutation) 
{
    console.log(mutation);
    if (document.getElementById("create-issue-dialog") != null) { // only interested in document changes related to Create Issue Dialog box        
        if (mutation.target.id == "description") { // only interested in the description field
            var descriptionElement = mutation.target
            if (isDefaultDescription(descriptionElement.value)) { // only inject if description field has not been modified by the user
                injectDescriptionTemplate(descriptionElement)
                if (descriptionElement.className.indexOf("ajs-dirty-warning-exempt") == -1) { // default template injection should not pop up dirtyDialogMessage
                    descriptionElement.className += " ajs-dirty-warning-exempt"
                    descriptionElement.addEventListener("change", descriptionChangeEvent)
                }
            }
        }
    }
}


var observer = new MutationObserver(function(mutations) {
	mutations.forEach(observeDocumentBody)  
});

observer.observe(document.body, {subtree: true, attributes: true, attributeFilter: ["resolved"]});
