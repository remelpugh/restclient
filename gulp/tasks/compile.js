/**
 * Created by remelpugh on 9/1/2014.
 */
var gulp = require("gulp");
var ts = require("gulp-typescript");
var concat = require("gulp-concat");
var sourcemaps = require("gulp-sourcemaps");

var project = ts.createProject({
    declaration : true,
    module: "commonjs",
    noEmitOnError: true,
    noExternalResolve: true,
    noImplicitAny: false,
    noLib: false,
    removeComments: true,
    sortOutput: false,
    target: "ES5"
});

gulp.task("compile", ["tslint"], function() {
    "use strict";
    var result = gulp.src(["src/*.ts", "typings/**/*.ts"])
        //.pipe(sourcemaps.init())
        .pipe(ts(project));

    // result.dts
    //     .pipe(concat("RestClient.d.ts"))
    //     .pipe(gulp.dest("./dist"));

    return result.js
        //.pipe(sourcemaps.write())
        .pipe(gulp.dest("./build"));
});