/**
 * Created by remelpugh on 9/2/2014.
 */
var browserify = require("browserify");
var buffer = require("vinyl-buffer");
var gulp = require("gulp");
var handleErrors = require("../../util/handleErrors");
var rename = require("gulp-rename");
var source = require('vinyl-source-stream');
var uglify = require("gulp-uglify");

gulp.task("vendor", ["bower"], function () {
    "use strict";
    return browserify()
        .require("vow")
        .bundle()
        .on("error", handleErrors)
        .pipe(source("vendor.js"))

        // Convert stream
        .pipe(buffer())
        .pipe(gulp.dest("./dist/"))

        // Rename the destination file
        .pipe(rename("vendor.min.js"))

        // Minify the bundled JavaScript
        .pipe(uglify())

        // Output to the build directory
        .pipe(gulp.dest("./dist"));
});