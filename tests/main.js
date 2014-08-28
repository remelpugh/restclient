/**
 * Created by remelpugh on 8/25/2014.
 */
    /// <reference path="../bower_components/requirejs/require.js" />
require.config({
        paths: {
            vow: "../bower_components/vow/vow.min",
            rest: "../src/RestClient.js"
        }
    }
);

require(["rest"], function (RestClient) {
    "use strict";
    var client = new RestClient({
        config: {
            baseApiUri: "http://api.rangelog.dabay6.local",
            cacheData: false
        },
        schema: {
            country: {
                autoGenerateCrud: false,
                url: "/referencedata/country"
            },
            countryPaged: {
                args: ["page", "size", "q"],
                url: "/referencedata/country"
                /*,
                 parse: function(response) {
                 return response.Results;
                 },
                 sort: [
                 {
                 direction: "asc",
                 field: "CountryId"
                 }, {
                 direction: "desc",
                 field: "CountryName"
                 }
                 ]*/
            },
            statesByCountry: {
                args: ["id", "page", "size"],
                url: "/referencedata/country/{0}/stateprovinces"
            }
        }
    });
    window.client = client;

    client.country(1).then(function (data) {
        console.log(data);
    });

    client.countryPaged(0, 5).then(function (data) {
        console.log(data);
    }).fail(function (error) {
        console.log(error);
    });
    client.statesByCountry(1, 0, 5).then(function (data) {
        console.log(data);
    }).fail(function (error) {
        console.log(error);
    });
});