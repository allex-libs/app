var expect = require('chai').expect,
  execlib = require('allex'),
  lib = require('../')(execlib);

describe('Testing app', function () {
  it('Remote', function (done) {
    this.timeout(50000);
    var app = lib.createApp({
      type: 'remote',
      options: {
        entrypoint: {
          address: '192.168.1.111',
          port: 8008,
          identity: {
            'username': 'indata',
            'password': '123'
          } 
        }
      }
    });

    app.go();
  });
});




