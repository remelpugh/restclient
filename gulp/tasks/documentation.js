/**
 * Created by remelpugh on 9/3/2014.
 */
var gulp = require("gulp");
var typedoc = require("gulp-typedoc");

gulp.task("documentation", function () {
    "use strict";
    return gulp.src(["src/RestClient.ts"])
        .pipe(typedoc({
            module: "commonjs",
            name: "RestClient API Documentation",
            out: "./docs",
            target: "es5"
        }));
});