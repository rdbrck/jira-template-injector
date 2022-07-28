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
        if (!template['issueType'] && !template['projects']) {
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
    // remove all tooltips
    $('[data-toggle="tooltip"]').tooltip('remove');
    // Dynamically build the template editor from stored json.
    chrome.storage.sync.get(StorageID, function (templates) {
        // Clear previous templates in the Collapsible Template Editor.
        $('#templateEditor').empty();
        // Clear the custom template fields.
        $('#customTemplateName').val('');
        $('#customTemplateIssueType').val('');
        $('#customTemplateProjectsString').val('');
        // Clear the add default template dropdown.
        $('#addDefaultDropdown').empty();
        // Clear the Field Selector dropdown in the add template modal.
        $('#fieldSelectDropdown').empty();
        // remove all domains, so that the whole list can be re-added in proper order.
        $('.custom-domain-collection').remove();
        // remove all input ids, so that the whole list can be re-added in proper order.
        $('.custom-inputID-collection').remove();

        templates = templates[StorageID].templates;

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
                        if (excludeTemplate['issueType'] === template['issueType']) {
                            if (!excludeTemplate['projects'] && !template['projects'] ||
                                utils.commonItemInArrays(excludeTemplate['projects'], template['projects'])) {
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
                        var dropdownData = '<li><a class="dropdownOption" href="#!" data-issueFieldType="' + template['issueType'] + '" data-text="' + template.name + '">' + template.name + '</a></li>';
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

        // chrome.runtime.sendMessage({JDTIfunction: 'getFieldSelectors'}, function (response) {
        //     if (response.status === 'success') {
        //         var fieldSelectors = response.data;

        //         $.each(fieldSelectors, function (key, fieldSelector) {
        //             var dropdownData = '<li><a class="dropdownOption" href="#!" data-fieldSelectorID="' + fieldSelector.id + '" data-text="' + fieldSelector.name + '">' + fieldSelector.name + '</a></li>';
        //             $('#fieldSelectDropdown').append(dropdownData);
        //         });
        //         $('#addDefaultDropdownButton').removeClass('emptyDropdown').addClass('waves-effect waves-light');
        //         var validDefaultTemplates = [];

        //         // Only show default templates if a template for that (issue type, projects) combination doesn't already exist.
        //         $.each(defaultTemplates, function (defaultIndex, template) {
        //             var valid = true;
        //             $.each(templatesArray, function (index, excludeTemplate) {
        //                 // if the issue types are the same and (the templates have no projects specified or they have a project in common), then this template is invalid
        //                 if (excludeTemplate['issueType'] === template['issueType']) {
        //                     if (!excludeTemplate['projects'] && !template['projects'] ||
        //                         utils.commonItemInArrays(excludeTemplate['projects'], template['projects'])) {
        //                         valid = false;
        //                         return false;
        //                     }
        //                 }
        //             });
        //             if (valid) {
        //                 validDefaultTemplates.push(template);
        //             }
        //         });

        //         if (!$.isEmptyObject(validDefaultTemplates)) {
        //             $('#addDefaultDropdownButton').removeClass('emptyDropdown').addClass('waves-effect waves-light');

        //             $.each(validDefaultTemplates, function (key, template) {
        //                 var dropdownData = '<li><a class="dropdownOption" href="#!" data-issueFieldType="' + template['issueType'] + '" data-text="' + template.name + '">' + template.name + '</a></li>';
        //                 $('#addDefaultDropdown').append(dropdownData);
        //             });
        //         } else {
        //             $('#addDefaultDropdownButton').addClass('emptyDropdown').removeClass('waves-effect waves-light');
        //         }

        //         // Reload the dropdown.
        //         $('.dropdown-button').dropdown({constrain_width: false});
        //     } else {
        //         $('#addTemplateDropdown').empty();
        //         $('#addDefaultDropdownButton').addClass('emptyDropdown').removeClass('waves-effect waves-light');
        //         Materialize.toast('Error loading default templates please reload the extension', 2000, 'toastNotification');
        //     }
        // });
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
                command: 'renderObject',
                context: { object: response.data, classAddition: 'Domain' },
                type: 'customDomainsList'
            }, '*');
        }
    });

    // Load in the custom Field Selectors.
    chrome.runtime.sendMessage({JDTIfunction: 'getFieldSelectors'}, function (response) {
        if (response.data) {
            // send a message to sandbox.html to build the Field Selectors list
            // once the template is compiled, a 'message' event will be sent to this window with the html
            var sandboxIFrameFieldSelectors = document.getElementById('sandbox_window');
            sandboxIFrameFieldSelectors.contentWindow.postMessage({
                command: 'renderObject',
                context: { object: response.data, classAddition: 'ID' },
                type: 'customIDsList'
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
                    $('#customTemplateIssueType').prop('disabled', true);
                    $('#customTemplateProjectsString').prop('disabled', true);
                    $('#addDefaultDropdownButton').addClass('disabled');
                    $('#customSettings').addClass('disabled');
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
                    $('#customTemplateIssueType').prop('disabled', true);
                    $('#customTemplateProjectsString').prop('disabled', true);
                    break;
                case 'add-default':
                    $('#addDefaultDropdownButton').addClass('disabled');
                    break;
                case 'custom-settings':
                    $('#customSettings').addClass('disabled');
                    break;
                case 'custom-domains':
                    $('.custom-Domain-ui').each(function () {
                        $(this).addClass('disabled');
                    });
                    break;
                case 'custom-input':
                    $('.custom-ID-ui').each(function () {
                        $(this).addClass('disabled');
                    });
                    break;
                }
            });
        }

        if (callback) {
            callback();
        }
    });
}

$(document).ready(function () {
    // set the display:block of the content in a timeout to avoid resizing of popup
    setTimeout(function () {
        const style = document.querySelector('body').style;
        style.display = 'block';
        setTimeout(function () {
            style.opacity = 1;
        });
    }, 150);

    document.addEventListener('focusin', onInitialFocus);
    $('#sandbox_window').load(function () {
        loadTemplateEditor();
    });

    // Click Handlers
    $('#reset').click(function () {
        chrome.runtime.sendMessage({
            JDTIfunction: 'reset'
        }, function (response) {
            if (response.status === 'success') {
                location.reload();
                Materialize.toast('Default templates successfully loaded', 2000, 'toastNotification');
            } else {
                $('#templateEditor').empty();
                if (response.message) {
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
                    Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                }
            }
        });
    });

    $('#customSettings').click(function () {
        if (!$(this).hasClass('disabled')) {
            $('.custom-settings-options').toggle();
            $('main').toggle();
        } else {
            Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
        }
    });

    $('#customSettingsBackButton').click(function () {
        $('.custom-settings-options').toggle();
        $('main').toggle();
    });

    $('#customDomainInput').keyup(function (event) {
        if (event.keyCode === 13) {
            $('#customDomainInputButton').click();
        }
    });

    $('#customDomainInputButton').click(function () {
        if (!$(this).hasClass('disabled')) {
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
                        Materialize.toast(response.message, 2000, 'toastNotification');
                    } else {
                        Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                    }
                }
            });
        } else {
            Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
        }
    });

    // Because the template editing section is dynamically built, need to monitor document rather then the buttons directly
    $(document).on('click', '.custom-Domain-remove-button', function () {
        if (!$(this).hasClass('disabled')) {
            chrome.runtime.sendMessage({
                JDTIfunction: 'removeDomain',
                domainID: event.target.id
            }, function (response) {
                if (response.status === 'success') {
                    loadTemplateEditor();
                    Materialize.toast('Domain successfully removed', 2000, 'toastNotification');
                } else {
                    if (response.message) {
                        Materialize.toast(response.message, 2000, 'toastNotification');
                    } else {
                        Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                    }
                }
            });
        } else {
            Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
        }
    });

    $('#addFieldSelectorButton').click(function () {
        $('#addFieldSelectorModal').openModal();
    });

    $('#saveCustomFieldSelector').click(function () {
        var fieldSelectorName = $('#customFieldSelectorName').val();
        var fieldSelectorCSSSelector = $('#customFieldSelectorCSSSelector').val();
        var fieldSelectorIsWYSIWYG = $('#customFieldSelectorIsWYSIWYG').prop('checked');
        var fieldSelectorWYSIWYGSelector = $('#customFieldSelectorWYSIWYGContainerSelector').val();
        console.log(fieldSelectorName);
        console.log(fieldSelectorCSSSelector);
        console.log(fieldSelectorIsWYSIWYG);
        console.log(fieldSelectorWYSIWYGSelector);

        // var IDName = $('#customIDInput').val();
        chrome.runtime.sendMessage({
            JDTIfunction: 'addFieldSelector',
            name: fieldSelectorName,
            cssSelector: fieldSelectorCSSSelector,
            isWYSIWYG: fieldSelectorIsWYSIWYG,
            WYSIWYGContainerSelector: fieldSelectorIsWYSIWYG ? fieldSelectorWYSIWYGSelector : ''
        }, function (response) {
            if (response.status === 'success') {
                $('#addFieldSelectorModal').closeModal();
                $('#customFieldSelectorName').val('');
                $('#customFieldSelectorCSSSelector').val('');
                $('#customFieldSelectorIsWYSIWYG').prop('checked', true);
                $('#customFieldSelectorWYSIWYGContainerSelector').prop('disabled', false);
                $('#customFieldSelectorWYSIWYGContainerSelector').val('');
                loadTemplateEditor();
                Materialize.toast('Custom Field Selector successfully added', 2000, 'toastNotification');
            } else {
                if (response.message) {
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
                    Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                }
            }
        });
    });

    // $('#addCustomTemplateSave').click(function () {
    //     if (!$(this).hasClass('disabled')) {
    //         var templateName = $('#customTemplateName').val();
    //         var issueType = $('#customTemplateIssueType').val();
    //         var projectsString = $('#customTemplateProjectsString').val();

    //         chrome.runtime.sendMessage({
    //             JDTIfunction: 'add',
    //             templateName: templateName,
    //             issueType: issueType,
    //             projectsString: projectsString,
    //             text: ''
    //         }, function (response) {
    //             if (response.status === 'success') {
    //                 $('#addTemplateModal').closeModal();
    //                 loadTemplateEditor(response.data);
    //                 Materialize.toast('Template successfully added', 2000, 'toastNotification');
    //             } else {
    //                 if (response.message) {
    //                     Materialize.toast(response.message, 2000, 'toastNotification');
    //                 } else {
    //                     Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
    //                 }
    //             }
    //         });
    //     } else {
    //         Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
    //     }
    // });

    $('#customFieldSelectorIsWYSIWYG').change(function () {
        if (!this.checked) {
            $('#customFieldSelectorWYSIWYGContainerSelector').prop('disabled', true);
            return;
        }
        $('#customFieldSelectorWYSIWYGContainerSelector').prop('disabled', false);
    });

    $(document).on('click', '.custom-ID-remove-button', function () {
        if (!$(this).hasClass('disabled')) {
            chrome.runtime.sendMessage({
                JDTIfunction: 'removeInputID',
                inputID: event.target.id
            }, function (response) {
                if (response.status === 'success') {
                    loadTemplateEditor();
                    Materialize.toast('Field Selector successfully removed', 2000, 'toastNotification');
                } else {
                    if (response.message) {
                        Materialize.toast(response.message, 2000, 'toastNotification');
                    } else {
                        Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                    }
                }
            });
        } else {
            Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
        }
    });

    $('#rate').click(function () {
        chrome.runtime.sendMessage({
            JDTIfunction: 'setToggleStatus',
            toggleType: 'rateClicked',
            toggleInput: true
        }, function (response) {
            window.open('https://chrome.google.com/webstore/detail/jira-template-injector/' + chrome.runtime.id + '/reviews?hl=en', '_blank'); // Open extension user reviews page
            if (response.status !== 'success') {
                if (response.message) {
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
                    Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                }
            }
        });
    });

    $('#upload').click(function () {
        if (!$(this).hasClass('disabled')) {
            if (!$('#fileSelector')[0].files[0]) {
                Materialize.toast('No file selected. Please select a file and try again', 2000, 'toastNotification');
            } else {
                var reader = new FileReader();
                // Read file into memory
                reader.readAsText($('input#fileSelector')[0].files[0]);
                // Handle success and errors
                reader.onerror = function () {
                    Materialize.toast('Error reading file. Please try again', 2000, 'toastNotification');
                };
                reader.onload = function () {
                    chrome.runtime.sendMessage({
                        JDTIfunction: 'upload',
                        fileContents: reader.result
                    }, function (response) {
                        if (response.status === 'success') {
                            location.reload();
                            Materialize.toast('Templates successfully loaded from file', 2000, 'toastNotification');
                        } else {
                            if (response.message) {
                                Materialize.toast(response.message, 2000, 'toastNotification');
                            } else {
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
            chrome.runtime.sendMessage({
                JDTIfunction: 'download',
                'url': $('#jsonURLInput').val()
            }, function (response) {
                if (response.status === 'success') {
                    location.reload();
                    Materialize.toast('Templates successfully loaded from URL', 2000, 'toastNotification');
                } else {
                    if (response.message) {
                        Materialize.toast(response.message, 2000, 'toastNotification');
                    } else {
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
            chrome.runtime.sendMessage({
                JDTIfunction: 'clear'
            }, function (response) {
                if (response.status === 'success') {
                    location.reload();
                    Materialize.toast('All templates deleted', 2000, 'toastNotification');
                } else {
                    $('#templateEditor').empty();
                    if (response.message) {
                        Materialize.toast(response.message, 2000, 'toastNotification');
                    } else {
                        Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                    }
                }
            });
        } else {
            Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
        }
    });

    $(document).on('click', '#addCustomTemplateButton', function (event) {
        $('#addTemplateModal').openModal();
    });

    $('#addCustomTemplateSave').click(function () {
        if (!$(this).hasClass('disabled')) {
            var templateName = $('#customTemplateName').val();
            var issueType = $('#customTemplateIssueType').val();
            var projectsString = $('#customTemplateProjectsString').val();

            chrome.runtime.sendMessage({
                JDTIfunction: 'add',
                templateName: templateName,
                issueType: issueType,
                projectsString: projectsString,
                text: ''
            }, function (response) {
                if (response.status === 'success') {
                    $('#addTemplateModal').closeModal();
                    loadTemplateEditor(response.data);
                    Materialize.toast('Template successfully added', 2000, 'toastNotification');
                } else {
                    if (response.message) {
                        Materialize.toast(response.message, 2000, 'toastNotification');
                    } else {
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
                        Materialize.toast(response.message, 2000, 'toastNotification');
                    } else {
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
        } else if (event.data.content === 'settings-list') {
            if (event.data.html) {
                $(`#${event.data.listID}`).append(event.data.html);
            }
        }
        $('[data-toggle="tooltip"]').tooltip();
        limitAccess();
    });

    // Because the template editing section is dynamically build, need to monitor document rather then the classes directly
    $(document).on('click', 'a.removeSingleTemplate', function () {
        if (!$(this).hasClass('disabled')) {
            chrome.runtime.sendMessage({
                JDTIfunction: 'delete',
                templateID: $(this).attr('template')
            }, function (response) {
                if (response.status === 'success') {
                    loadTemplateEditor();
                    Materialize.toast('Template successfully removed', 2000, 'toastNotification');
                } else {
                    if (response.message) {
                        Materialize.toast(response.message, 2000, 'toastNotification');
                    } else {
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
            var templateID = $(this).attr('template');
            var form = $('form[template="' + templateID + '"]');
            chrome.runtime.sendMessage({
                JDTIfunction: 'save',
                templateID: templateID,
                templateName: form.find('[name="nameField"]').val(),
                templateIssueType: form.find('[name="issueType"]').val(),
                templateProjects: form.find('[name="projectsString"]').val(),
                templateText: form.find('[name="textField"]').val()
            }, function (response) {
                if (response.status === 'success') {
                    loadTemplateEditor(templateID);
                    Materialize.toast('Template successfully updated', 2000, 'toastNotification');
                } else {
                    if (response.message) {
                        Materialize.toast(response.message, 2000, 'toastNotification');
                    } else {
                        Materialize.toast('Something went wrong. Please try again.', 2000, 'toastNotification');
                    }
                }
            });
        } else {
            Materialize.toast(disabledOptionToast, 2000, 'toastNotification');
        }
    });

    $(document).on('click', '.dropdownOption', function () {
        // Close the Modal
        var templateName = $(this).text();
        var issueType = $(this).data('issuefieldtype');
        var text = '';
        if ($('#loadDefault').prop('checked')) {
            text = $(this).data('text');
        }

        chrome.runtime.sendMessage({
            JDTIfunction: 'add',
            templateName: templateName,
            issueType: issueType,
            text: text
        }, function (response) {
            $('#addTemplateModal').closeModal();
            if (response.status === 'success') {
                loadTemplateEditor(response.data);
                Materialize.toast('Template successfully added', 2000, 'toastNotification');
            } else {
                loadTemplateEditor();
                if (response.message) {
                    Materialize.toast(response.message, 2000, 'toastNotification');
                } else {
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
        chrome.tabs.create({url: $(this).attr('href')});
        return false;
    });
});
