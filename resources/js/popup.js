$(document).ready(function() {

    loadTemplateEditor();

    // Event Handlers
    $('#reset').click(function(){
        chrome.runtime.sendMessage({JDTIfunction: "reset"}, function(response) {
            if(response.status == "success"){
                loadTemplateEditor();
                Materialize.toast('Default templates successfully loaded', 4000, 'toastNotification');
            } else {
                $('#templateEditor').empty();
                Materialize.toast('Something went wrong. Please try again.', 4000, 'toastNotification');
            }
        });
    });

    $('#download').click(function(){
        chrome.runtime.sendMessage({JDTIfunction: "download", "url": $('#jsonURLInput').val()}, function(response) {
            console.log(response);
            if(response.status == "success"){
                loadTemplateEditor();
                Materialize.toast('Templates successfully loaded from URL', 4000, 'toastNotification');
            } else {
                if(response.message){
                    Materialize.toast(response.message, 4000, 'toastNotification');
                } else {
                    Materialize.toast('Something went wrong. Please try again.', 4000, 'toastNotification');
                }
            }
        });
    });

    $('#delete').click(function(){
        chrome.runtime.sendMessage({JDTIfunction: "delete"}, function(response) {
            if(response.status == "success"){
                loadTemplateEditor();
                Materialize.toast('All templates deleted', 4000, 'toastNotification');
            } else {
                $('#templateEditor').empty();
                Materialize.toast('Something went wrong. Please try again.', 4000, 'toastNotification');
            }
        });
    });

    $(document).on('click', "a.updateSingleTemplate", function() {
        console.log("Hello!!!!!");
        console.log($('textarea[name="'+ $(this).attr("id") +'"]').val());
    });
});


function loadTemplateEditor() {
    // Dynamically build the template editor from stored json
    chrome.storage.sync.get("rdbrck-JiraDescriptions-test2", function(templates) {
        if (templates['rdbrck-JiraDescriptions-test2']) {
            templates = templates['rdbrck-JiraDescriptions-test2'];
            $('#templateEditor').empty();
            $('#templateEditorTitle').text('Current Templates:');
            $('#templateEditor').closest('.section').show();
            $.each(templates, function(key, template){
                if (key !== "JIRA DEFAULT") {
                    templateTitle = '<div class="collapsible-header grey lighten-5"><i class="material-icons">expand_less</i>' + key + '</div>';
                    templateData =
                        '<div class="collapsible-body">' +
                            '<textarea class="templateTextArea" name="' + key + '">' + template +'</textarea>' +
                            '<div class="row">' +
                                '<div class="col s4 offset-s4">' +
                                    '<div class="center-align">' +
                                        '<a class="btn-floating btn-Tiny waves-effect waves-light red darken-4 updateSingleTemplate" id="'+ key +'"><i class="material-icons">save</i></a>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>'
                    //templateUpdateButton = '<a id="save" class="btn-floating btn-Tiny waves-effect waves-light red darken-4 right-align"><i class="material-icons">save</i></a>'
                    $('#templateEditor').html($('#templateEditor').html() + '<li>' + templateTitle + templateData + '</li>');
                }
            });
        } else {
            $('#templateEditorTitle').text('No templates are loaded');
            $('#templateEditor').closest('.section').hide();
        }
        
    });
}