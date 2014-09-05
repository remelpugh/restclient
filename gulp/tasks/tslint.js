/**
 * Created by remelpugh on 9/1/2014.
 */
var gulp = require("gulp");
var tslint = require("gulp-tslint");

gulp.task("tslint", ["clean"], function() {
    "use strict";
    return gulp.src("./src/**/*.ts")
        .pipe(tslint())
        .pipe(tslint.report("full"));
});