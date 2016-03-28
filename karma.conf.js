module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],
    files: [
      'node_modules/angular/angular.js',
      'node_modules/angular-mocks/angular-mocks.js',
      'node_modules/sails.io.js-dist/sails.io.js',
      'src/*.js'
    ],
    preprocessors: {
      'src/*!(*.spec).js': 'coverage'
    },
    reporters: ['spec', 'coverage'],
    coverageReporter: {
      reporters: [
        { type: 'json', subdir: 'angular' },
        { type: 'lcov', subdir: 'angular' }
      ]
    },
    autoWatch: false,
    browsers: ['PhantomJS'],
    singleRun: true
  });
};
