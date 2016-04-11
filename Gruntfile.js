module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({

    babel: {
      options: {
        presets: ['es2015']
      },
      dist: {
        files: {
          'dist/angular-sails-socket.js': ['src/*.js', '!src/*.spec.js']
        }
      }
    },

    clean: ['dist'],

    eslint: {
      target: ['Gruntfile.js', 'src/*.js', '!src/*.spec.js', 'test/**/*.js']
    },

    pkg: grunt.file.readJSON('package.json'),

    uglify: {
      options: {
        banner: '/*\n' +
                ' * @license <%= pkg.name %> - v<%= pkg.version %>\n' +
                ' * (c) 2015 Bethel Technologies, LLC http://getbethel.com\n' +
                ' * License: <%= pkg.license %>\n' +
                ' */\n' +
                '(function(angular, io) {',
        footer: '})(angular, io);',
        preserveComments: false,
        report: 'min'
      },
      dist: {
        files: {
          'dist/angular-sails-socket.min.js': ['dist/angular-sails-socket.js']
        }
      }
    }

  });

  require('load-grunt-tasks')(grunt);

  grunt.registerTask('test', ['eslint']);
  grunt.registerTask('default', ['eslint', 'babel', 'uglify']);

};
