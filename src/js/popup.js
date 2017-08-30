/* Copyright 2016 Redbrick Technologies, Inc. */
/* https://github.com/rdbrck/jira-description-extension/blob/master/LICENSE */

/* global chrome, browser, saveAs, Materialize */

var StorageID = 'Jira-Template-Injector';
var disabledOptionToast =
    '<span>Option is currently disabled. See ' +
    '<a class="newTabLinks" href="https://github.com/rdbrck/jira-description-extension">Help?</a>' +
    ' for details</span>';

var browserType = 'Chrome'; // eslint-disable-line no-unused-vars
if (navigator.userAgent.indexOf('Firefox') !== -1 || navigator.userAgent.indexOf('Edge') !== -1) {
    chrome = browser; // eslint-disable-line no-native-reassign
    chrome.storage.sync = browser.storage.local;
    if (navigator.userAgent.indexOf('Firefox') !== -1) {
        browserType = 'Firefox';
    }
    if (navigator.userAgent.indexOf('Edge') !== -1) {
        browserType = 'Edge';
    }
}

function sortTemplates (templates) {
    var templateArray = $.map(templates, function (template, key) {
        return template;
    });

    var sorted = utils.sortArrayByProperty(templateArray, 'name');

    // Move "DEFAULT TEMPLATE" to top of list.
    $.each(sorted, function (index, template) {
        if (!template['issuetype-field'] && !template['projects-field']) {
            let defaultTemplate = sorted.splice(index, 1)[0];
            sorted.unshift(defaultTemplate);
            return false;
        }
    });

    return sorted;
}

function openCollapsible (templateID) {
    // Click header to open.
    $('.collapsible-header[data-templateid="' + templateID + '"]').click();
}

function onInitialFocus (event) {
    // If this is an anchor tag, remove focus.
    if (event.target.tagName === 'A') {
        event.target.blur();
    }
    // Remove this event listener after it is triggered.
    document.removeEventListener('focusin', onInitialFocus);
}

function loadTemplateEditor (openTemplate = null) {
    // Dynamically build the template editor from stored json.
    chrome.storage.sync.get(StorageID, function (templates) {
        // Clear previous templates in the Collapsible Template Editor.
        $('#templateEditor').empty();
        // Clear the custom template fields.
        $('#customTemplateName').val('');
        $('#customTemplateIssueTypeField').val('');
        $('#customTemplateProjectsField').val('');
        // Clear the add default template dropdown.
        $('#addDefaultDropdown').empty();
        // remove all domains, so that the whole list can be re-added in proper order.
        $('.custom-domain-collection').remove();

        if (templates[StorageID].templates) {
            templates = templates[StorageID].templates;

            $('#templateEditorTitle').text('Templates:');

            // Sort Alphabetically except with DEFAULT TEMPLATE at the top.
            var templatesArray = sortTemplates(templates);

            // Send a message to sandbox.html to build the collapsible template editor
            // Once the template is compiled, a 'message' event will be sent to this window with the html
            var sandboxIFrame = document.getElementById('sandbox_window');
            sandboxIFrame.contentWindow.postMessage({
                command: 'renderTemplates',
                context: { templates: templatesArray },
                openTemplate: openTemplate
            }, '*');
        } else {
            $('#templateEditorTitle').text('No templates are currently loaded');
        }

        // Populate the add default template dropdown - excluding any templates already loaded.
        chrome.runtime.sendMessage({JDTIfunction: 'fetchDefault'}, function (response) {
            if (response.status === 'success') {
                var defaultTemplates = response.data.templates;
                var validDefaultTemplates = [];

                // Only show default templates if a template for that (issue type, projects) combination doesn't already exist.
                $.each(defaultTemplates, function (defaultIndex, template) {
                    var valid = true;
                    $.each(templatesArray, function (index, excludeTemplate) {
                        // if the issue types are the same and (the templates have no projects specified or they have a project in common), then this template is invalid
                        if (excludeTemplate['issuetype-field'] === template['issuetype-field']) {
                            if (!excludeTemplate['projects-field'] && !template['projects-field'] ||
                                utils.commonItemInArrays(excludeTemplate['projects-field'], template['projects-field'])) {
                                valid = false;
                                return false;
                            }
                        }
                    });
                    if (valid) {
                        validDefaultTemplates.push(template);
                    }
                });

                if (!$.isEmptyObject(validDefaultTemplates)) {
                    $('#addDefaultDropdownButton').removeClass('emptyDropdown').addClass('waves-effect waves-light');

                    $.each(validDefaultTemplates, function (key, template) {
                        var dropdownData = '<li><a class="dropdownOption" href="#!" data-issueFieldType="' + template['issuetype-field'] + '" data-text="' + template.name + '">' + template.name + '</a></li>';
                        $('#addDefaultDropdown').append(dropdownData);
                    });
                } else {
                    $('#addDefaultDropdownButton').addClass('emptyDropdown').removeClass('waves-effect waves-light');
                }

                // Reload the dropdown.
                $('.dropdown-button').dropdown({constrain_width: false});
            } else {
                $('#addTemplateDropdown').empty();
                $('#addDefaultDropdownButton').addClass('emptyDropdown').removeClass('waves-effect waves-light');
                Materialize.toast('Error loading default templates please reload the extension', 2000, 'toastNotification');
            }
        });

        limitAccess();
    });

    // Check the "rate" flag. If the flag is not set, display "rate it now" button
    chrome.runtime.sendMessage({JDTIfunction: 'getToggleStatus', toggleType: 'rateClicked'}, function (response) {
        if (response.data !== true) {
            $('#rateSection').fadeIn(); // Show button
        }
    });

    // Load in the custom domains.
    chrome.runtime.sendMessage({JDTIfunction: 'getDomains'}, function (response) {
        if (response.data) {
            // Send a message to sandbox.html to build the domains list
            // Once the template is compiled, a 'message' event will be sent to this window with the html
            var sandboxIFrameDomains = document.getElementById('sandbox_window');
            sandboxIFrameDomains.contentWindow.postMessage({
                command: 'renderDomain',
                context: { domains: response.data }
            }, '*');
        }
    });
}

function limitAccess (callback = false) {
    // Limit interface actions from parameters passed in through json.
    chrome.storage.sync.get(StorageID, function (data) {
        if (data[StorageID].options.limit) {
            var limits = data[StorageID].options.limit;
            $.each(limits, function (key, limit) {
                switch (limit) {
                case 'all':
                    $('#jsonURLInput').prop('disabled', true);
                    $('#download').addClass('disabled');
                    $('#fileSelectorButton').addClass('disabled');
                    $("input[title='filePath']").prop('disabled', true);
                    $('#upload').addClass('disabled');
                    $('#clear').addClass('disabled');
                    $('.removeSingleTemplate').addClass('disabled');
                    $('.updateSingleTemplate').addClass('disabled');
                    $('#add').addClass('disabled');
                    $('#addCustomTemplate').addClass('disabled');
                    $('#customTemplateName').prop('disabled', true);
                    $('#customTemplateIssueTypeField').prop('disabled', true);
                    $('#customTemplateProjectsField').prop('disabled', true);
                    $('#addDefaultDropdownButton').addClass('disabled');
                    $('#customDomains').addClass('disabled');
                    break;
                case 'url':
                    $('#jsonURLInput').prop('disabled', true);
                    $('#download').addClass('disabled');
                    break;
                case 'file':
                    $('#fileSelectorButton').addClass('disabled');
                    $('input[title="filePath"]').prop('disabled', true);
                    $('#upload').addClass('disabled');
                    break;
                case 'clear':
                    $('#clear').addClass('disabled');
                    break;
                case 'delete':
                    $('.removeSingleTemplate').addClass('disabled');
                    break;
                case 'save':
                    $('.updateSingleTemplate').addClass('disabled');
                    break;
                case 'add':
                    $('#add').addClass('disabled');
                    break;
                case 'add-custom':
                    $('#addCustomTemplate').addClass('disabled');
                    $('#customTemplateName').prop('disabled', true);
                    $('#customTemplateIssueTypeField').prop('disabled', true);
                    $('#customTemplateProjectsField').prop('disabled', true);
                    break;
                case 'add-default':
                    $('#addDefaultDropdownButton').addClass('disabled');
                    break;
                case 'add-domain':
                    $('#customDomains').addClass('disabled');
                    break;
                }
            });
        }

        if (callback) {
            callback();
        }
    });
}

/*
    For this extension we have broken down the DM events into three categories.
    1. UI events (when the user interacts with a UI element)
    2. Template Update events (when the user updates the templates)
    3. Errors (when something goes wrong)

    The following three functions minimises code redundancy allowing simple one line DM
    events to be placed throughout the code.
 */

/*
    Simple function to fire DM 'ui_click' events.
    Arguments: UI element that was interacted with.
    In this extension this is generally the DOM element ID.

    Why collect this information?
    We are collecting this information to determine which UI elements are most used
    and are least used. With this information we can determine how best to improve
    UI design. I.E simplifying the UI by removing rarely used elements
 */
function dmUIClick (element) {
    chrome.runtime.sendMessage({
        type: 'analytics', name: 'ui_click', body: {
            'element': element,
            'ip_address': '${dm.meta:request_ip}',
            'geo': '${dm.meta:request_geo}',
            'ua': '${dm.ua:user_agent}'
        }
    });
}

/*
    Simple function to fire DM 'template_update' events.
    Arguments: Action performed on the template.
    Currently the extension performs the following actions:
        'reset'         - Templates were reset to their default state.
        'upload'        - Templates were loaded from local json file.
        'download'      - Templates were loaded from remote json file.
        'clear'         - All templates were deleted.
        'add-custom'    - A custom template was created for a ticket type
                            not included with the default templates.
        'add-default'   - A default template was added back.
        'remove-single' - A single template (custom or default) was removed.
        'update-single' - A single template was updated.

        Why collect this information?
        We are collecting this information to better understand how users use the
        extension. Is a feature heavily used? Maybe we can improve it. Is a feature
        hardly used? Maybe it is not needed.
 */
function dmTemplateUpdate (action) {
    chrome.runtime.sendMessage({
        type: 'analytics', name: 'template_update', body: {
            'action': action,
            'ip_address': '${dm.meta:request_ip}',
            'geo': '${dm.meta:request_geo}',
            'ua': '${dm.ua:user_agent}'
        }
    });
}

/*
    Simple function to fire DM 'error' events.
    Arguments:
        Action performed resulting in error.
        Error message.

    Why collect this information?
    If errors are occurring we need to fix them.
 */
function dmError (action, message) {
    chrome.runtime.sendMessage({
        type: 'analytics', name: 'error', body: {
            'action': action,
            'message': message,
            'ip_address': '${dm.meta:request_ip}',
            'geo': '${dm.meta:request_geo}',
            'ua': '${dm.ua:user_agent}'
        }
    });
}

$(document).ready(function () {
    chrome.runtime.sendMessage({
        type: 'analytics', name: 'launch', body: {
            'ip_address': '${dm.meta:request_ip}',
            'geo': '${dm.meta:request_geo}',
            'ua': '${dm.ua:user_agent}'
        }
    });

    document.addEventListener('focusin', onInitialFocus);
    $('#sandbox_window').load(function () {
        loadTemplateEditor();
    });

    // Click Handlers
    $('#reset').click(function () {
        dmUIClick('reset');
        chrome.runtime.sendMessage({
            JDTIfunction: 'reset'
        }, function (response) {
            if (response.status === 'success') {
                location.reload();
                Materialize.toast('Default templates successfully loaded', 2000, 'toastNotification');
                dmTemplateUpdate('reset');
            } else {
                $('#templateEditor').empty();
                if (response.message) {
                    dmError('reset', response.message);
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
                    dmError('reset', 'generic');
                    Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                }
            }
        });
    });

    $('#customDomains').click(function () {
        dmUIClick('customDomains');
        if (!$(this).hasClass('disabled')) {
            $('.custom-domain-list').toggle();
            $('main').toggle();
        } else {
            Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
        }
    });

    $('#customDomainsBackButton').click(function () {
        dmUIClick('customDomainsBackButton');
        $('.custom-domain-list').toggle();
        $('main').toggle();
    });

    $('#clearCustomDomains').click(function () {
        dmUIClick('clearCustomDomains');
        // remove all added domains:
        chrome.runtime.sendMessage({
            JDTIfunction: 'removeDomain',
            domainName: '',
            removeAll: true
        }, function (response) {
            if (response.status === 'success') {
                loadTemplateEditor();
                Materialize.toast('Domains successfully removed', 2000, 'toastNotification');
            } else {
                if (response.message) {
                    dmError('clearCustomDomains', response.message);
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
                    dmError('clearCustomDomains', 'generic');
                    Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                }
            }
        });
    });

    $('#customDomainInput').keyup(function (event) {
        if (event.keyCode === 13) {
            $('#customDomainInputButton').click();
        }
    });

    $('#customDomainInputButton').click(function () {
        dmUIClick('customDomainInputButton');
        var domainName = $('#customDomainInput').val();

        chrome.runtime.sendMessage({
            JDTIfunction: 'addDomain',
            domainName: domainName
        }, function (response) {
            if (response.status === 'success') {
                $('#customDomainInput').val('');
                loadTemplateEditor();
                Materialize.toast('Domain successfully added', 2000, 'toastNotification');
            } else {
                if (response.message) {
                    dmError('customDomainInputButton', response.message);
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
                    dmError('customDomainInputButton', 'generic');
                    Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                }
            }
        });
    });

    $(document).on('click', '#customDomainRemoveButton', function () {
        dmUIClick('customDomainRemoveButton');
        chrome.runtime.sendMessage({
            JDTIfunction: 'removeDomain',
            domainID: domainID,
            removeAll: false
        }, function (response) {
            if (response.status === 'success') {
                loadTemplateEditor();
                Materialize.toast('Domain successfully removed', 2000, 'toastNotification');
            } else {
                if (response.message) {
                    dmError('customDomainRemoveButton', response.message);
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
                    dmError('customDomainRemoveButton', 'generic');
                    Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                }
            }
        });
    });

    $('#rate').click(function () {
        dmUIClick('rate');
        chrome.runtime.sendMessage({
            JDTIfunction: 'setToggleStatus',
            toggleType: 'rateClicked',
            toggleInput: true
        }, function (response) {
            window.open('https://chrome.google.com/webstore/detail/jira-template-injector/' + chrome.runtime.id + '/reviews?hl=en', '_blank'); // Open extension user reviews page
            if (response.status !== 'success') {
                if (response.message) {
                    dmError('rate', response.message);
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
                    dmError('rate', 'Error saving Rate Now click status');
                    Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                }
            }
        });
    });

    $('#upload').click(function () {
        if (!$(this).hasClass('disabled')) {
            dmUIClick('upload');
            if (!$('#fileSelector')[0].files[0]) {
                Materialize.toast('No file selected. Please select a file and try again', 2000, 'toastNotification');
            } else {
                var reader = new FileReader();
                // Read file into memory
                reader.readAsText($('input#fileSelector')[0].files[0]);
                // Handle success and errors
                reader.onerror = function () {
                    dmError('upload', 'Error reading file');
                    Materialize.toast('Error reading file. Please try again', 2000, 'toastNotification');
                };
                reader.onload = function () {
                    var data = $.parseJSON(reader.result);
                    chrome.runtime.sendMessage({
                        JDTIfunction: 'upload',
                        fileContents: data
                    }, function (response) {
                        if (response.status === 'success') {
                            location.reload();
                            Materialize.toast('Templates successfully loaded from file', 2000, 'toastNotification');
                            dmTemplateUpdate('upload');
                        } else {
                            if (response.message) {
                                dmError('upload', response.message);
                                Materialize.toast(response.message, 2000, 'toastNotification');
                            } else {
                                dmError('upload', 'generic');
                                Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                            }
                        }
                    });
                };
            }
        } else {
            Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
        }
    });

    $('#download').click(function () {
        if (!$(this).hasClass('disabled')) {
            dmUIClick('download');
            chrome.runtime.sendMessage({
                JDTIfunction: 'download',
                'url': $('#jsonURLInput').val()
            }, function (response) {
                if (response.status === 'success') {
                    location.reload();
                    Materialize.toast('Templates successfully loaded from URL', 2000, 'toastNotification');
                    dmTemplateUpdate('download');
                } else {
                    if (response.message) {
                        dmError('download', response.message);
                        Materialize.toast(response.message, 2000, 'toastNotification');
                    } else {
                        dmError('download', 'generic');
                        Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                    }
                }
            });
        } else {
            Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
        }
    });

    $('#clear').click(function () {
        if (!$(this).hasClass('disabled')) {
            dmUIClick('clear');
            chrome.runtime.sendMessage({
                JDTIfunction: 'clear'
            }, function (response) {
                if (response.status === 'success') {
                    location.reload();
                    Materialize.toast('All templates deleted', 2000, 'toastNotification');
                    dmTemplateUpdate('clear');
                } else {
                    $('#templateEditor').empty();
                    if (response.message) {
                        dmError('clear', response.message);
                        Materialize.toast(response.message, 2000, 'toastNotification');
                    } else {
                        dmError('clear', 'generic');
                        Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                    }
                }
            });
        } else {
            Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
        }
    });

    $('#add').click(function (event) {
        event.preventDefault();
        dmUIClick('add');
        if (!$(this).hasClass('disabled')) {
            $('#addTemplateModal').openModal();
        } else {
            Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
        }
    });

    $('#addCustomTemplate').click(function () {
        if (!$(this).hasClass('disabled')) {
            dmUIClick('add-custom');
            var templateName = $('#customTemplateName').val();
            var issueTypeField = $('#customTemplateIssueTypeField').val();
            var projectsField = $('#customTemplateProjectsField').val();

            chrome.runtime.sendMessage({
                JDTIfunction: 'add',
                templateName: templateName,
                issueTypeField: issueTypeField,
                projectsField: projectsField,
                text: ''
            }, function (response) {
                if (response.status === 'success') {
                    $('#addTemplateModal').closeModal();
                    loadTemplateEditor(response.data);
                    Materialize.toast('Template successfully added', 2000, 'toastNotification');
                    dmTemplateUpdate('add-custom');
                } else {
                    if (response.message) {
                        dmError('add-custom', response.message);
                        Materialize.toast(response.message, 2000, 'toastNotification');
                    } else {
                        dmError('add-custom', 'generic');
                        Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                    }
                }
            });
        } else {
            Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
        }
    });

    $('#addDefaultDropdownButton').click(function () {
        if ($('#addDefaultDropdownButton').hasClass('emptyDropdown')) {
            Materialize.toast('All default templates have already been added', 2000, 'toastNotification');
        } else if ($('#addDefaultDropdownButton').hasClass('disabled')) {
            Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
        } else {
            dmUIClick('add-default-dropdown');
            // Dropdown is not initialized on load to support disabling through json options
            // If it's not disabled initialize it on click
            var attr = $(this).attr('data-activates');
            if (typeof attr === typeof undefined || attr === false) {
                $(this).attr('data-activates', 'addDefaultDropdown');
                $('.dropdown-button').dropdown({constrain_width: false});
                $(this).click();
            }
        }
    });

    $('#export').click(function () {
        dmUIClick('export');
        if (browserType !== 'Edge') {
            chrome.runtime.sendMessage({
                JDTIfunction: 'getData'
            }, function (response) {
                if (response.status === 'success') {
                    var data = JSON.stringify(response.data, undefined, 4);
                    var blob = new Blob([data], {type: 'text/json;charset=utf-8'});
                    saveAs(blob, 'templates.json');
                } else {
                    if (response.message) {
                        dmError('export', response.message);
                        Materialize.toast(response.message, 2000, 'toastNotification');
                    } else {
                        dmError('export', 'generic');
                        Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                    }
                }
            });
        } else {
            chrome.tabs.create({'url': chrome.extension.getURL('/html/download.html')}, function (tab) {
                // Tab opened.
            });
        }
    });

    // When the sandbox compiles a template
    $(window).on('message', function (event) {
        event = event.originalEvent;
        if (event.data.content === 'template-editor') {
            if (event.data.html) {
                $('#templateEditor').append(event.data.html);

                $('textarea').each(function (index) {
                    if ($(this).val()) {
                        $(this).trigger('autoresize');
                    }
                });

                if (event.data.openTemplate) {
                    openCollapsible(event.data.openTemplate);
                }
            }
        } else if (event.data.content === 'domain-list') {
            $('.collection').append(event.data.html);
        }
    });

    // Because the template editing section is dynamically build, need to monitor document rather then the classes directly
    $(document).on('click', 'a.removeSingleTemplate', function () {
        if (!$(this).hasClass('disabled')) {
            dmUIClick('remove-single');
            chrome.runtime.sendMessage({
                JDTIfunction: 'delete',
                templateID: $(this).attr('template')
            }, function (response) {
                if (response.status === 'success') {
                    loadTemplateEditor();
                    Materialize.toast('Template successfully removed', 2000, 'toastNotification');
                    dmTemplateUpdate('remove-single');
                } else {
                    if (response.message) {
                        dmError('remove-single', response.message);
                        Materialize.toast(response.message, 2000, 'toastNotification');
                    } else {
                        dmError('remove-single', 'generic');
                        Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                    }
                }
            });
        } else {
            Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
        }
    });

    $(document).on('click', 'a.updateSingleTemplate', function () {
        if (!$(this).hasClass('disabled')) {
            dmUIClick('update-single');
            var templateID = $(this).attr('template');
            var form = $('form[template="' + templateID + '"]');
            chrome.runtime.sendMessage({
                JDTIfunction: 'save',
                templateID: templateID,
                templateName: form.find('[name="nameField"]').val(),
                templateIssueType: form.find('[name="issueTypeField"]').val(),
                templateProjects: form.find('[name="projectsField"]').val(),
                templateText: form.find('[name="textField"]').val()
            }, function (response) {
                if (response.status === 'success') {
                    loadTemplateEditor(templateID);
                    Materialize.toast('Template successfully updated', 2000, 'toastNotification');
                    dmTemplateUpdate('update-single');
                } else {
                    if (response.message) {
                        dmError('update-single', response.message);
                        Materialize.toast(response.message, 2000, 'toastNotification');
                    } else {
                        dmError('update-single', 'generic');
                        Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                    }
                }
            });
        } else {
            Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
        }
    });

    $(document).on('click', '.dropdownOption', function () {
        dmUIClick('add-default-dropdown-selection');
        // Close the Modal
        var templateName = $(this).text();
        var issueTypeField = $(this).data('issuefieldtype');
        var text = '';
        if ($('#loadDefault').prop('checked')) {
            text = $(this).data('text');
        }

        chrome.runtime.sendMessage({
            JDTIfunction: 'add',
            templateName: templateName,
            issueTypeField: issueTypeField,
            text: text
        }, function (response) {
            $('#addTemplateModal').closeModal();
            if (response.status === 'success') {
                loadTemplateEditor(response.data);
                Materialize.toast('Template successfully added', 2000, 'toastNotification');
                dmTemplateUpdate('add-default');
            } else {
                loadTemplateEditor();
                if (response.message) {
                    dmError('add-default-dropdown-selection', response.message);
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
                    dmError('add-default-dropdown-selection', 'generic');
                    Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                }
            }
        });
    });

    // Resize textarea on click of collapsible header because doing it earlier doesn't resize it 100$ correctly.
    $(document).on('click', '.collapsible-header', function () {
        var collapsibleBody = $(this).siblings('.collapsible-body');
        var textArea = collapsibleBody.find('textarea');
        if (textArea.val()) {
            textArea.trigger('autoresize');
        }
        $('html, body').animate({
            scrollTop: collapsibleBody.find('[name="nameField"]').focus().offset().top - 100
        }, 500);
    });

    // Force links to open in new tab
    $(document).on('click', '.newTabLinks', function () {
        dmUIClick('help');
        chrome.tabs.create({url: $(this).attr('href')});
        return false;
    });

    // Onchange Handlers
    $('#fileSelector').change(function () {
        var file = $(this)[0].files[0];
        if (browserType !== 'Edge') {
            if (file.type !== 'application/json' && file.type) {
                Materialize.toast('File must be of type JSON. Please select a valid file', 4000, 'toastNotification');
                $(this).val('');
            }
        } else {
            if (file.name.split('.').pop() !== 'json') {
                Materialize.toast('File must be of type JSON. Please select a valid file', 4000, 'toastNotification');
                $(this).val('');
            }
        }
    });
});
