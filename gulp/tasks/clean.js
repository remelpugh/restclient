/**
 * Created by remelpugh on 9/2/2014.
 */
var gulp = require("gulp");
var rimraf = require("gulp-rimraf");

gulp.task("clean", function() {
    "use strict";
    return gulp.src("./build/*")
        .pipe(rimraf());
});