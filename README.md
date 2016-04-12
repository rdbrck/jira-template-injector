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
  * Useful to keep everyone's templates consistent if used in an office/team environment.
* Expand tag detection to include pre population of various options.
  * Example: ```</TI_date>``` would pre populate with 2016-04-11.

### Images
![No Templates Loaded](https://cloud.githubusercontent.com/assets/6020196/14467925/674f9994-0092-11e6-943c-5ee5bf629f3c.png "No Templates") ![Default Templates Loaded](https://cloud.githubusercontent.com/assets/6020196/14467923/673b9afc-0092-11e6-9606-283b0ac7a1b5.png "Default Templates") ![Template Editor](https://cloud.githubusercontent.com/assets/6020196/14467924/6749d450-0092-11e6-97cd-f31c9ede76ef.png "Template Editor") ![Add Template](https://cloud.githubusercontent.com/assets/6020196/14467922/671e9560-0092-11e6-9619-c6064e6b70a7.png "Add Template")
![Create Issue Window with auto Select](https://cloud.githubusercontent.com/assets/6020196/14468227/9a43633e-0093-11e6-913c-9afb16f32acd.png "JIRA Create Issue")
