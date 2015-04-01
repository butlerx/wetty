module.exports = function (grunt) {

    require('load-grunt-tasks')(grunt);

    var config = {

    };

    grunt.initConfig(config);

    grunt.registerTask('update-hterm', ['shell:greet:hello']);
};
