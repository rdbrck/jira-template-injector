/* Fool jQuery into thinking the service worker has a DOM */
var document = (self.document = {
    parentNode: null,
    nodeType: 9,
    toString: function () {
        return 'FakeDocument';
    },
});
var window = (self.window = self);
var fakeElement = Object.create(document);
fakeElement.nodeType = 1;
fakeElement.toString = function () {
    return 'FakeElement';
};
fakeElement.parentNode = fakeElement.firstChild = fakeElement.lastChild = fakeElement;
fakeElement.ownerDocument = document;

document.head = document.body = fakeElement;
document.ownerDocument = document.documentElement = document;
document.getElementById = document.createElement = function () {
    return fakeElement;
};
document.createDocumentFragment = function () {
    return this;
};
document.getElementsByTagName = document.getElementsByClassName = function () {
    return [fakeElement];
};
document.getAttribute = document.setAttribute = document.removeChild = document.addEventListener = document.removeEventListener = function () {
    return null;
};
document.cloneNode = document.appendChild = function () {
    return this;
};
document.appendChild = function (child) {
    return child;
};

/* Now import jQuery, then the business logic */
try {
    importScripts(
        'lib/jquery/jquery-2.2.3.js',
        'js/utils.js',
        'jti_background.js'
    );
} catch (e) {
    // you saw nothing!
    console.error(e);
}
