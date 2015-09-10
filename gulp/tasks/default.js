/**
 * Created by remelpugh on 9/1/2014.
 */
var bump = require("gulp-bump");
var gulp = require("gulp");
var generator = require("dts-generator");

gulp.task("default", ["browserify"], function (callback) {
    "use strict";
    gulp.src(["./package.json", "./bower.json"])
        .pipe(bump())
        .pipe(gulp.dest('./'));
        
    generator.generate({
        name: "",
        baseDir: "./src",
        files: ["RestClient.ts"],
        out: "./dist/RestClient.d.ts"
    }).then(function() {
        callback();
    });
});