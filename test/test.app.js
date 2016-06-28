var expect = require('chai').expect,
  execlib = require('allex'),
  lib = require('../')(execlib);

describe('Testing app', function () {
  it('Remote', function (done) {
    this.timeout(50000);
    var app = lib.createApp({
        environments: [{
          type: 'allexremote',
          name: 'INDATA',
          options: {
            entrypoint: {
              address: '192.168.1.111',
              port: 8008,
              identity: {
                'username': 'indata',
                'password': '123'
              } 
            },
            datasources: [{
              name: 'fix_statii',
              type: 'allexhash2array',
              options: {
                sink: 'Fix',
                path: 'fix_statii'
              }
            },{
              name: 'name',
              type: 'allexstate',
              options: {
                sink: '.',
                path: 'profile.username'
              }
            }],
            commands: [
              {
                name: 'do_dispose',
                options : {
                  sink : '.'
                }
              },
              {
                name : 'login',
                options : {
                  //TODO
                }
              },
              {
                name: 'establishSession',
                options: {
                  sink: 'Fix',
                  name: 'establishFixSession'
                }
              }
            ]
          }
        }],
        commands : [
          {
            command : 'login',
            environment : 'INDATA'
          },
          {
            command : 'stopSession',
            environment : 'INDATA',
            ecommand : 'do_dispose'
          }
        ],
        datasources: [{
          name: 'statii',
          environment: 'INDATA',
          source: 'fix_statii'
        },{
          name: 'username',
          environment: 'INDATA',
          source: 'name'
        }],
        elements : [
          {
            name : 'indata_login',
            type : 'login_widget',
            actual : true,
            options : {
              environment : 'INDATA',
              fields : [
                {
                  name : 'username'
                },
                {
                  name : 'password'
                }
              ]
            }
          },
          {
            name : 'indata_sessions_grid',
            type : 'dialog_grid',
            options : {
              fields : [
              ],
              datasource : 'stattii',
              itemActions : [
                {
                  command : 'stopSession'
                }
              ]
            }
          }
        ],
        pages : [
          {
            name : 'login',
            options : {
              elements : ['indata_login']
            }
          },
          {
            name : 'sessions',
            options : {
              elements : ['indata_session_grid']
            }
          }
        ]
    });

    app.go();
    done();
  });
});




