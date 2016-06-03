# Jira Template Injector

This extension automatically inserts a template of your choosing into the JIRA Create Issue Description field. The template injected is relative to the selected “Issue Type” within the Create Issue modal on JIRA.

On initial install a default list of templates are pre populated for you. These can easily be removed/restored at any time.

You can add templates individually, or bulk add them through a local or remote json file. See [templates.json](https://github.com/rdbrck/jira-description-extension/blob/master/data/templates.json) for an example JSON file.

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
    "options": {
        "limit": ["clear","delete","save"]
    }
}
```

### HELP:

* Why are some buttons disabled?
    * By default no buttons are disabled, but if you were provided a url or a json file to load into the extension, it may have contained some options to limit the interface (see Limit Interface Options below)
    * If you need to use one of the options disabled you can always reset the extension to it's default by clicking the "Reload default templates" button. **Howerver this will override any existing templates**. It is always a good idea to export your current templates first so that you have a backup

### Current Features:

* Automatically select text between ```<TI>``` and ```</TI>``` tags for quick template completion.
* Template Priorities.
  * Set a default template (DEFAULT TEMPLATE) for all Issue Types.
  * Individual Issue Types will override the default.
* Templates are synced across devices.
  * Configure once, use on all chrome devices that support extensions!
* Reload default templates with one click.
* Load templates from url (json file). Host a single json file and have everyone use the same templates.
* Load templates from local file (json). Easily share templates with other users.
* Add/Remove/Edit individual templates.
* Limit interface options (To keep templates consistent across users)
    * Current limit options are:
        * "all"         -> disable all interface actions except reload default
        * "url"         -> disable loading of json from url
        * "file"        -> disable loading of json from local file
        * "clear"       -> disable clearing of all templates
        * "delete"      -> disable deleting single template
        * "save"        -> disable saving/updating single template
        * "add"         -> disable add new template menu
        * "add-custom"  -> disable adding custom template
        * "add-default" -> disable adding default template
* Export Templates to JSON file. Easily share template JSON file.

### Future Features:

* Expand tag detection to include pre population of various options.
  * Example: ```</TI_date>``` would pre populate with 2016-04-11.

### Images
![Default Templates Loaded](https://cloud.githubusercontent.com/assets/6020196/15790179/d64150de-2984-11e6-9909-59d7e9e560fc.png "Default Templates") ![Template Editor](https://cloud.githubusercontent.com/assets/6020196/15790181/d648f8de-2984-11e6-891b-490c34324268.png "Template Editor") ![Add Template](https://cloud.githubusercontent.com/assets/6020196/15790180/d641d6b2-2984-11e6-92d7-8ce12501882f.png "Add Template") ![Create Issue Window with auto Select](https://cloud.githubusercontent.com/assets/6020196/14468227/9a43633e-0093-11e6-913c-9afb16f32acd.png "JIRA Create Issue")
