describe('default configuration', function() {

  var sailsSocket, $rootScope;

  beforeEach(angular.mock.module('bethel.sailsSocket'));
  beforeEach(angular.mock.module('ngMock'));

  beforeEach(angular.mock.inject(function($injector) {
    sailsSocket = $injector.get('sailsSocket');
    $rootScope = $injector.get('$rootScope');
  }));

  it('wraps the Sails socket.io service with default configuration', function() {
    expect(sailsSocket.io).toBeDefined();
    expect(sailsSocket.io.hostname).toBe('localhost');
    expect(sailsSocket.io.transports[0]).toBe('polling');
  });

  it('GET', function() {
    spyOn(sailsSocket.io, 'get').and.callFake(function(url, cb) {
      cb({ _csrf: 'abcd1234' }, { statusCode: (url === '/foo') ? 404 : 200 });
    });

    var result;
    sailsSocket.get('/foo').then(function() {
      result = true;
    }, function() {
      result = false;
    });
    expect(sailsSocket.io.get).toHaveBeenCalled();
    $rootScope.$digest();
    expect(result).toBe(false);

    sailsSocket.get('/bar').then(function() {
      result = true;
    }, function() {
      result = false;
    });
    $rootScope.$digest();
    expect(result).toBe(true);
  });

});

describe('custom configuration', function() {

  var sailsSocket, socketProvider;

  beforeEach(angular.mock.module('bethel.sailsSocket'));

  beforeEach(angular.mock.module(['sailsSocketProvider', function(sailsSocketProvider) {
    socketProvider = sailsSocketProvider;
    socketProvider.csrf = false;
    socketProvider.config = { transports: ['websocket'] };
  }]));

  beforeEach(angular.mock.inject(function($injector) {
    sailsSocket = $injector.get('sailsSocket');
  }));

  it('intiates the Sails socket.io service with custom configuration', function() {
    expect(sailsSocket.io.transports[0]).toBe('websocket');
  });

});
