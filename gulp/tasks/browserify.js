/**
 * Created by remelpugh on 9/1/2014.
 */
var browserify = require("browserify");
var buffer = require("vinyl-buffer");
var bundleLogger = require("../util/bundleLogger");
var gulp = require("gulp");
var handleErrors = require("../util/handleErrors");
var pkg = require("../../package.json");
var rename = require("gulp-rename");
var source = require("vinyl-source-stream");
var sourcemaps = require("gulp-sourcemaps");
var uglify = require("gulp-uglify");

var production = process.env.NODE_ENV === "production";

function bundleShare(b) {
    "use strict";
    bundleLogger.start();

    b.external("lodash")
        .bundle()
        //        .on("prebundle", function (bundler) {
        //            if (production) {
        //                bundler.external("lodash");
        //                bundler.external("vow");
        //            }
        //
        //            // Export RestClient as 'RestClient'
        //            bundler.require('./RestClient.js', {
        //                expose: "RestClient"
        //            });
        //        })
        .on("error", handleErrors)
        .pipe(source(pkg.name + ".js"))

        // Convert stream
        .pipe(buffer())
        
        // loads map from browserify file
        .pipe(sourcemaps.init({
            loadMaps: true
        }))

        // Output to the build directory
        .pipe(gulp.dest("./dist"))

        // Rename the destination file
        .pipe(rename(pkg.name + ".min.js"))

        // Minify the bundled JavaScript
        .pipe(uglify())
        
        .pipe(sourcemaps.write('./')) // writes .map file

        // Output to the build directory
        .pipe(gulp.dest("./dist"))

        .on("end", bundleLogger.end);
}

gulp.task("browserify", ["compile"], function () {
    "use strict";
    var b = browserify({
        basedir: "./build",
        bundleExternal: true,
        cache: {},
        debug: !production,
        fullPaths: false,
        packageCache: {},
        standalone: "RestClient"
    });

    b.add("./RestClient.js");

    bundleShare(b);

    //gulp.watch(["src/**/*.ts"], ["browserify"]);
});