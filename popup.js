var PopupController = function () {
  this.button_ = document.getElementById('button');
  this.timeframe_ = document.getElementById('timeframe');
  this.addListeners_();
};

PopupController.prototype = {

    addListeners_: function () {
        this.button_.addEventListener('click', this.handleClick_.bind(this));
    },

};

document.addEventListener('DOMContentLoaded', function () {
  window.PC = new PopupController();
});