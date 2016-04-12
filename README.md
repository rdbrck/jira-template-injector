# Jira Description Template Injector

This extension automatically inserts a template of your choosing into the JIRA Create Issue Description field. The template injected is relative to the selected “Issue Type” within the Create Issue modal on JIRA.

On initial install a default list of templates are pre populated for you. These can easily be removed/restored at any time.

You can add templates individually, or bulk add them through a local or remote json file. See [templates.json](https://github.com/rdbrck/jira-description-extension/blob/master/templates.json) for an example JSON file.

The JSON format is:

```javascript
{
	"templates": {
    	"NAME_OF_TEMPLATE": {
        	"issuetype-field":"issue_type_field",
            "text”:”text_to_be_injected"
        },
    	...
    },
    "options": {}
}
```

### Current Features:

* Automatically select text between ```<TI>``` and ```<\TI>``` tags for quick template completion.
* Template Priotiries.
  * Set a default template (DEFAULT TEMPLATE) for all Issue Types.
  * Individual Issue Types will overide the default.
* Reload default templates with one click.
* Load templates from url (json file). Host a single json file and have everyone use the same templates.
* Load templates from local file (json). Easily share templates with other users.
* Add/Remove/Edit individual templates.

### Future Features:

* Disable editing of templates based on options passed in from json.
  * Useful to keep everyone's templates constant if used in an office environment.
* Expand tag detection to include pre population of various options.
  * Example: ```</TI_date>``` would pre populate with 2016-04-11.
