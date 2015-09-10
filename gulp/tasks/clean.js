/**
 * Created by remelpugh on 9/2/2014.
 */
var gulp = require("gulp");
var del = require("del");

gulp.task("clean", function(callback) {
    "use strict";
    del(["./build/*","./dist/*","./docs/*", "./docs/"]).then(function() {
        callback();
    });
});