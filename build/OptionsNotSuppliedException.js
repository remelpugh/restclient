var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Exception = require("./Exception");
var OptionsNotSuppliedException = (function (_super) {
    __extends(OptionsNotSuppliedException, _super);
    function OptionsNotSuppliedException() {
        _super.call(this, "Options must be supplied.");
    }
    return OptionsNotSuppliedException;
})(Exception);
module.exports = OptionsNotSuppliedException;
