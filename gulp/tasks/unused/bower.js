/**
 * Created by remelpugh on 9/1/2014.
 */
var bower = require("main-bower-files");
var gulp = require("gulp");

gulp.task("bower", function() {
    "use strict";
    return gulp.src(bower())
        .pipe(gulp.dest("./build"));
});