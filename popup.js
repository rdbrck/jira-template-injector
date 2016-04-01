//var PopupController = function () {
//  this.button_ = document.getElementById('button');
//  this.timeframe_ = document.getElementById('timeframe');
//  this.addListeners_();
//};

//PopupController.prototype = {

    //addListeners_: function () {
    //    this.button_.addEventListener('click', this.handleClick_.bind(this));
    //},

//};

document.addEventListener('DOMContentLoaded', function () {
  //window.PC = new PopupController();
    chrome.storage.sync.get("rdbrck-JiraDescriptions-test2", function(templates) {
        templates = templates['rdbrck-JiraDescriptions-test2'];
        for (var key in templates){
            if (typeof templates[key] !== 'function' && key !== "JIRA DEFAULT") {
                var div = document.getElementById('Current Templates');
                templateTitle = '<h3>' + key + '</h3>'
                templateData = '<textarea class="templateTextArea" name="' + key + '" rows="5">' + templates[key] +'</textarea>'
                //templateUpdateButton = 
                div.innerHTML = div.innerHTML + templateTitle + templateData;
            }
        }
    });
});