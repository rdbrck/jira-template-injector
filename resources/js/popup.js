const StorageID = "rdbrck-JiraDescriptions-test2";

$(document).ready(function() {

    document.addEventListener("focusin", onInitialFocus);
    loadTemplateEditor();

    // Click Handlers
    $('.newTabLinks').click(function(){
        chrome.tabs.create({url: $(this).attr('href')});
            return false;
    });

    $('#reset').click(function(){
        chrome.runtime.sendMessage({
            JDTIfunction: "reset"
        }, function(response) {
            if(response.status == "success"){
                loadTemplateEditor();
                Materialize.toast('Default templates successfully loaded', 2000, 'toastNotification');
            } else {
                $('#templateEditor').empty();
                if(response.message){
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
                    Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                }
            }
        });
    });

    $('#upload').click(function(){
        if(!$('input#fileSelector')[0].files[0]){
            Materialize.toast('No file selected. Please select a file and try again', 2000, 'toastNotification');
        } else {
            var reader = new FileReader();
            // Read file into memory
            reader.readAsText($('input#fileSelector')[0].files[0]);
            // Handle success and errors
            reader.onerror = function(){
                Materialize.toast('Error reading file. Please try again', 2000, 'toastNotification');
            };
            reader.onload = function(){
                var data = jQuery.parseJSON(reader.result);
                chrome.runtime.sendMessage({
                    JDTIfunction: "upload",
                    fileContents: data
                }, function(response) {
                    if(response.status == "success"){
                        loadTemplateEditor();
                        Materialize.toast('Templates successfully loaded from file', 2000, 'toastNotification');
                    } else {
                        if(response.message){
                            Materialize.toast(response.message, 2000, 'toastNotification');
                        } else {
                            Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                        }
                    }
                });
            };
        }
    });

    $('#download').click(function(){
        chrome.runtime.sendMessage({
            JDTIfunction: "download",
            "url": $('#jsonURLInput').val()
        }, function(response) {
            if(response.status == "success"){
                loadTemplateEditor();
                Materialize.toast('Templates successfully loaded from URL', 2000, 'toastNotification');
            } else {
                if(response.message){
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
                    Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                }
            }
        });
    });

    $('#delete').click(function(){
        chrome.runtime.sendMessage({
            JDTIfunction: "clear"
        }, function(response) {
            if(response.status == "success"){
                loadTemplateEditor();
                Materialize.toast('All templates deleted', 2000, 'toastNotification');
            } else {
                $('#templateEditor').empty();
                if(response.message){
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
                    Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                }
            }
        });
    });

    $('#addCustomTemplate').click(function(){
        var templateName = $('#customTemplateName').val();
        issueTypeField = $('#customTemplateIssueTypeField').val();

        chrome.runtime.sendMessage({
            JDTIfunction: "add",
            templateName: templateName,
            issueTypeField: issueTypeField,
            text:""
        }, function(response) {
            $('#addTemplateModal').closeModal();
            if(response.status == "success"){
                loadTemplateEditor(function(){
                    openCollapsible(issueTypeField);
                });
                Materialize.toast('Template successfully added', 2000, 'toastNotification');
            } else {
                loadTemplateEditor(function(){
                    if(response.message){
                        Materialize.toast(response.message, 2000, 'toastNotification');
                        if(response.data == 'open'){
                            openCollapsible(issueTypeField);
                        }
                    } else {
                        Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                    }
                });
            }
        });
    });

    $('#addDefaultDropdownButton').click(function(){
        if($( "#addDefaultDropdownButton" ).hasClass( "disabled" )){
            Materialize.toast('All default templates have already been added', 2000, 'toastNotification');
        }
    });

    // Because the template editing section is dynamically build, need to monitor document rather then the classes directly
    $(document).on('click', "a.removeSingleTemplate", function() {
        chrome.runtime.sendMessage({
            JDTIfunction: "delete",
            templateName: $(this).attr("id")
        }, function(response) {
            if(response.status == "success"){
                loadTemplateEditor();
                Materialize.toast('Template successfully removed', 2000, 'toastNotification');
            } else {
                if(response.message){
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
                    Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                }
            }
        });
    });

    $(document).on('click', "a.updateSingleTemplate", function() {
        chrome.runtime.sendMessage({
            JDTIfunction: "save",
            templateName: $(this).attr("id"),
            templateText: $('textarea[name="'+ $(this).attr("id") +'"]').val()
        }, function(response) {
            if(response.status == "success"){
                Materialize.toast('Template successfully updated', 2000, 'toastNotification');
            } else {
                if(response.message){
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
                    Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                }
            }
        });
    });

    $(document).on('click', ".dropdownOption", function() {
        // Close the Modal
        var templateName = $(this).text();
        var issueTypeField = $(this).data('issuefieldtype');
        var text = "";
        if($('#loadDefault').prop('checked')){
            text = $(this).data('text');
        }

        chrome.runtime.sendMessage({
            JDTIfunction: "add",
            templateName: templateName,
            issueTypeField: issueTypeField,
            text: text
        }, function(response) {
            $('#addTemplateModal').closeModal();
            if(response.status == "success"){
                loadTemplateEditor(function(){
                    openCollapsible(issueTypeField);
                });
                Materialize.toast('Template successfully added', 2000, 'toastNotification');
            } else {
                loadTemplateEditor();
                if(response.message){
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
                    Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                }
            }
        });
    });

    // Resize textarea on click of collapsible header because doing it earlier doesn't resize it 100$ correctly.
    $(document).on('click', ".collapsible-header", function() {
        $('html, body').animate({
            scrollTop: $(this).siblings('.collapsible-body').find('textarea').focus().trigger('autoresize').offset().top - 90
        }, 500);

    });

    // Enable Modals
    $('.modal-trigger').leanModal();

    // Onchange Handlers
    $('#fileSelector').change(function(){
        file = $(this)[0].files[0];
        if(file.type !== "application/json"){
            Materialize.toast('File must be of type JSON. Please select a valid file', 4000, 'toastNotification');
            $(this).val('');
        }
    });

});

function loadTemplateEditor(callback = false) {
    // Dynamically build the template editor from stored json
    chrome.storage.sync.get(StorageID, function(templates) {
        dropdownExcludeList = [];

        // Clear previous templates in the Collapsible Template Editor
        $('#templateEditor').empty();
        // Clear the custom template fields
        $('#customTemplateName').val('');
        $('#customTemplateIssueTypeField').val('');
        // Clear the add default template dropdown
        $('#addDefaultDropdown').empty();


        if (templates[StorageID]) {
            templates = templates[StorageID];

            $('#templateEditorTitle').text('Templates:');

            //Sort Alphabetically except with DEFAULT TEMPLATE at the top
            templates = sortObject(templates);

            //Build the Collapsible Template Editor
            $.each(templates, function(key, template){
                if( key == "DEFAULT TEMPLATE"){
                    templateTitle = '<div class="collapsible-header grey lighten-5" data-issueFieldType="'+ template['issuetype-field'] +'" style="font-weight: bold;"><i class="material-icons">expand_less</i>' + key + '</div>';
                } else {
                    templateTitle = '<div class="collapsible-header grey lighten-5" data-issueFieldType="'+ template['issuetype-field'] +'"><i class="material-icons">expand_less</i>' + key + '</div>';
                }

                templateData =
                    '<div class="collapsible-body">' +
                        '<div class="input-field">' +
                            '<i class="material-icons prefix">mode_edit</i>' +
                            '<textarea data-issueFieldType="'+ template['issuetype-field'] +'" class="materialize-textarea" name="' + key + '">' + template['text'] +'</textarea>' +
                        '</div>' +
                        '<div class="row">' +
                            '<div class="col s4 offset-s4">' +
                                '<div class="center-align">' +
                                    '<a class="btn-floating btn-Tiny waves-effect waves-light red darken-4 removeSingleTemplate" id="'+ key +'"><i class="material-icons">delete</i></a>' +
                                    '&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp' +
                                    '<a class="btn-floating btn-Tiny waves-effect waves-light red darken-4 updateSingleTemplate" id="'+ key +'"><i class="material-icons">save</i></a>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                $('#templateEditor').html($('#templateEditor').html() + '<li>' + templateTitle + templateData + '</li>');

                // Add templateName to dropdown exclude list
                dropdownExcludeList.push(template['issuetype-field']);
            });

            $('textarea').each(function(index){
                $(this).trigger('autoresize');
            });
        } else {
            $('#templateEditorTitle').text('No templates are currently loaded');
        }

        // Populate the add default template dropdown - excluding any templates already loaded
        chrome.runtime.sendMessage({JDTIfunction: "fetchDefault"}, function(response) {
            if(response.status == "success"){
                defaultTemplates = response.data;

                // Remove default templates from dropdown list if already added
                $.each(dropdownExcludeList, function(index, issueTypeField){
                    $.each(defaultTemplates, function(name, template){
                        if (issueTypeField == template['issuetype-field']) {
                            delete defaultTemplates[name];
                        }
                    });
                });

                if(!$.isEmptyObject(defaultTemplates)){
                    $('#addDefaultDropdownButton').removeClass('disabled');
                    $('#addDefaultDropdownButton').addClass( "waves-effect waves-light" );

                    $.each(defaultTemplates, function(key, template){
                        dropdownData = '<li><a class="dropdownOption" href="#!" data-issueFieldType="'+ template['issuetype-field'] +'" data-text="'+ template['text'] +'">'+ key +'</a></li>';
                        $('#addDefaultDropdown').html($('#addDefaultDropdown').html() + dropdownData);
                    });
                } else {
                    $('#addDefaultDropdownButton').addClass('disabled');
                    $('#addDefaultDropdownButton').removeClass( "waves-effect waves-light" );
                }

                // Reload the dropdown
                $('.dropdown-button').dropdown({constrain_width: false});
            } else {
                $('#addTemplateDropdown').empty();
                $('#addDefaultDropdownButton').addClass('disabled');
                $('#addDefaultDropdownButton').removeClass( "waves-effect waves-light" );
                Materialize.toast('Error loading default templates please reload the extension', 2000, 'toastNotification');
            }
        });

        if(callback){
            callback();
        }
    });
}

function sortObject(o) {
    var sorted = {}, key, a = [];
    for (key in o) {
        if (o.hasOwnProperty(key)) {
            a.push(key);
        }
    }
    a.sort();
    // Move "DEFAULT TEMPLATE" to top of list
    if(a.indexOf('DEFAULT TEMPLATE') > -1){
        a.splice(a.indexOf('DEFAULT TEMPLATE'), 1);
        a.unshift('DEFAULT TEMPLATE');
    }
    for (key = 0; key < a.length; key++) {
        sorted[a[key]] = o[a[key]];
    }
    return sorted;
}

function openCollapsible(issueFieldType){
    // Click header to open
    $('.collapsible-header[data-issuefieldtype="'+ issueFieldType +'"]').click();
}

function onInitialFocus(event) {
    // If this is an anchor tag, remove focus
    if (event.target.tagName == "A") {
        event.target.blur();
    }
    // remove this event listener after it is triggered,
    document.removeEventListener("focusin", onInitialFocus);
}