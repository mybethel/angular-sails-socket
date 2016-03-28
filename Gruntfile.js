module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({

    babel: {
      options: {
        sourceMap: true,
        presets: ['es2015']
      },
      dist: {
        files: {
          'dist/angular-sails-socket.js': 'dist/angular-sails-socket.js'
        }
      }
    },

    clean: ['dist'],

    concat: {
      options: {
        stripBanners: true,
        banner: '/*\n' +
                ' * @license Angular DOM\n' +
                ' * (c) 2015 Bethel Technologies, LLC http://getbethel.com\n' +
                ' * License: MIT\n' +
                ' */\n' +
                '(function(angular) {' +
                "'use strict';",
        footer: '})(angular);'
      },
      dist: {
        src: ['src/*.js', '!src/*.spec.js'],
        dest: 'dist/angular-sails-socket.js'
      }
    },

    eslint: {
      target: ['Gruntfile.js', 'src/*.js', '!src/*.spec.js', 'test/**/*.js']
    },

    pkg: grunt.file.readJSON('package.json'),

    uglify: {
      options: {
        preserveComments: 'some',
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
  grunt.registerTask('default', ['eslint', 'concat', 'babel', 'uglify']);

};
