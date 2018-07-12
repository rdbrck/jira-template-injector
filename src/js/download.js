/* global chrome, browser, saveAs */

var browserType = 'Chrome'; // eslint-disable-line no-unused-vars
if (navigator.userAgent.indexOf('Firefox') !== -1 || navigator.userAgent.indexOf('Edge') !== -1) {
    chrome = browser; // eslint-disable-line no-native-reassign
    chrome.storage.local = browser.storage.local;
    if (navigator.userAgent.indexOf('Firefox') !== -1) {
        browserType = 'Firefox';
    }
    if (navigator.userAgent.indexOf('Edge') !== -1) {
        browserType = 'Edge';
    }
}

(function (view) {
    var document = view.document,
        getBlob = function () {
            return view.Blob;
        };

    chrome.runtime.sendMessage({
        JDTIfunction: 'getData'
    }, function (response) {
        if (response.status === 'success') {
            var data = JSON.stringify(response.data, undefined, 4);
            var BB = getBlob();
            saveAs(
                new BB([data], {type: 'application/json;charset=' + document.characterSet})
                , 'templates.json'
            );
        } else {
            console.log('Error fetching data');
        }
    });
}(self));
