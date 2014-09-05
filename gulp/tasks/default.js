/**
 * Created by remelpugh on 9/1/2014.
 */
var bump = require("gulp-bump");
var gulp = require("gulp");

gulp.task("default", ["browserify"], function () {
    "use strict";
    gulp.src(["./package.json", "./bower.json"])
        .pipe(bump())
        .pipe(gulp.dest('./'));
});