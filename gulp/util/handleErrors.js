/**
 * Created by remelpugh on 9/1/2014.
 */
var notify = require("gulp-notify");

module.exports = function () {
    "use strict";
    var args = Array.prototype.slice.call(arguments);

    notify.onError({
        "title": "Compile Errors",
        "message": "<%= error.message %>"
    }).apply(this, args);

    this.emit("end");
};