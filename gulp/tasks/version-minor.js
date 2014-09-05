/**
 * Created by remelpugh on 9/2/2014.
 */
var gulp = require("gulp");
var bump = require("gulp-bump");

gulp.task("version-minor", function () {
    "use strict";
    gulp.src(["./package.json", "./bower.json"])
        .pipe(bump({
            type: "minor"
        }))
        .pipe(gulp.dest('./'));
});