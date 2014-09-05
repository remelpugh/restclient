/**
 * Created by remelpugh on 9/1/2014.
 */
var gulp = require("gulp");
var ts = require("gulp-type");

var project = ts.createProject({
    declarationFiles: true,
    module: "commonjs",
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
        .pipe(ts(project));

    result.dts
        .pipe(gulp.dest("./dist/typings"));

    return result.js
        .pipe(gulp.dest("./build"));
});