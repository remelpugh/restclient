/**
 * Created by remelpugh on 9/1/2014.
 */
var util = require("gulp-util");
var prettyHrTime = require("pretty-hrtime");
var startTime;

module.exports = {
    end: function() {
        "use strict";
        var taskTime = process.hrtime(startTime);
        var prettyTime = prettyHrTime(taskTime);

        util.log("Finished", util.colors.green("'bundle'"), "in", util.colors.magenta(prettyTime));
    },

    start: function() {
        "use strict";
        startTime = process.hrtime();
        util.log("Running", util.colors.green("'bundle'") + "...");
    }
}