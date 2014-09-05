/**
 * Created by remelpugh on 9/2/2014.
 */
var gulp = require("gulp");
var bump = require("gulp-bump");

gulp.task("version-major", function () {
    "use strict";
    gulp.src(["./package.json", "./bower.json"])
        .pipe(bump({
            type: "major"
        }))
        .pipe(gulp.dest('./'));
});