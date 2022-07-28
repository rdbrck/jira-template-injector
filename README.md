# Jira Template Injector

Chrome Web Store [Link](https://chrome.google.com/webstore/detail/jira-template-injector/hmhpegjieopgbdmpocdmfkafjgcdmhha).
If you find it useful please leave a [review](https://chrome.google.com/webstore/detail/jira-template-injector/hmhpegjieopgbdmpocdmfkafjgcdmhha/reviews)!

### About:

This extension automatically inserts a template of your choosing into the JIRA Create Issue Description field. The template injected is relative to the selected "Project" and “Issue Type” within the Create Issue modal on JIRA.

By default the extension works for cloud hosted JIRA instances (*.atlassian.net domains). If you are using a self hosted JIRA instance or a custom domain, you may add your own custom domains for the extension to check against. When adding custom domains, you do not need to specify the port. Just specifying the domain (XXXX.net or XXXX.com) should cover you for both http and https as well as any port. You may also add any custom input IDs for which you would like your templates to be injected into.

On initial install a default list of templates are pre populated for you. These can easily be removed/restored at any time.

You can add templates individually, or bulk add them through a local or remote json file. See [templates.json](https://github.com/rdbrck/jira-description-extension/blob/master/src/data/templates.json) for an example JSON file.

The JSON format is:

```javascript
{
    "templates": [
        {
            "name":"NAME_OF_TEMPLATE",
            "issueType":"issue_type_field",
            "projects":"comma_separated_project_keys",
            "text":"text_to_be_injected"
        },
        ...
    ],
    "options": {
        "limit": ["clear","delete","save"],
        "domains": ["mydomain.com"],
        "inputIDs": ["custominputID"]
    }
}
```

### Help:

* Why are some buttons disabled?
    * By default no buttons are disabled, but if you were provided a url or a json file to load into the extension, it may have contained some options to limit the interface (see Limit Interface Options below)
    * If you need to use one of the options disabled you can always reset the extension to it's default by clicking the "Reload default templates" button. **Howerver this will override any existing templates**. It is always a good idea to export your current templates first so that you have a backup

### Current Features:

* Automatically select text between ```<TI>``` and ```</TI>``` tags for quick template completion.
  * Quickly jump to the next set of ```<TI>``` elements using the ```Control + back-tick``` key combo.
* Template Priorities.
  * The default template (no Issue Type and no Projects specified) will be used for all Issue Types and Projects.
  * Templates with Projects and no Issue Type will override the default template.
  * Templates with Issue Type and no Projects will override templates with Projects and no Issue Type.
  * Templates with Issue Type and Projects will override all other templates.
* Templates are synced across devices.
  * Configure once, use on all chrome devices that support extensions!
* Reload default templates with one click.
* Load templates from url (json file). Host a single json file and have everyone use the same templates.
* Load templates from local file (json). Easily share templates with other users.
* Add/Remove/Edit individual templates.
* Add/Remove custom domains.
  * Domains (including subdomains) the extension should run on to inject the templates.
* Add/Remove custom input IDs.
  * Custom input IDs (fields of the modal) the extension should run on to inject the templates into.
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
        * "custom-settings"  -> disable access to the custom settings panel
        * "custom-domains"   -> disable adding/removing any custom domains
        * "custom-input"     -> disable adding/removing any custom input ids
* Export Templates to JSON file. Easily share template JSON file.

### Future Features:

* Expand tag detection to include pre population of various options.
  * Example: ```</TI_date>``` would pre populate with 2016-04-11.

### Images
![Default Templates Loaded](https://cloud.githubusercontent.com/assets/6020196/17062770/2cb0d46e-4fe9-11e6-9f04-4daabe32537f.png "Default Templates") ![Template Editor](https://cloud.githubusercontent.com/assets/6020196/26463889/ab94d242-413a-11e7-8a01-661b5a370ac9.png "Template Editor") ![Add Template](https://cloud.githubusercontent.com/assets/6020196/26463883/a9e1dfb2-413a-11e7-9785-322872fe11eb.png "Add Template") ![Create Issue Window with auto Select](https://cloud.githubusercontent.com/assets/6020196/17062735/05e6618c-4fe9-11e6-8c9e-3a43c305c761.png "JIRA Create Issue")

