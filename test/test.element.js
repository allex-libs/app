var expect = require('chai').expect,
  lib = require('allexlib'),
  ELib = require('../elements')(lib),
  BasicElement = ELib.BasicElement,
  registerElementType = ELib.registerElementType,
  elementFactory = ELib.elementFactory;


function Type1 (id, options) {
  this.type = 1;
  BasicElement.call(this, id, options);
}
lib.inherit(Type1, BasicElement);

function Type2 (id, options) {
  this.type = 2;
  BasicElement.call(this, id, options);
}
lib.inherit (Type2, BasicElement);


describe ('Simple element registry operations', function () {
  var deep;
  it ('Register a type', function () {
    registerElementType ('type1', Type1);
    registerElementType ('type2', Type2);

    var t1 = elementFactory({
      name : 'jedan',
      type : 'type1',
      options : null
    });

    var t2 = elementFactory ({
      name : 'dva',
      type : 'type2',
      options: null
    });

    expect (t1).to.be.instanceof(BasicElement);
    expect (t1).to.be.instanceof(Type1);

    expect (t2).to.be.instanceof(BasicElement);
    expect (t2).to.be.instanceof(Type2);

    expect (t1.get('id')).to.be.equal('jedan');
    expect (t2.get('id')).to.be.equal('dva');
  });

  it ('create element with two level1 children', function () {
    var t3 = elementFactory ({
      name : 'jedan',
      type : 'type1',
      options : {
        elements : [
          {
            name: 'dva',
            type : 'type2'
          },
          {
            name: 'tri',
            type : 'type2'
          }
        ]
      }
    });

    var dva = t3.childAtPath ('dva');
    expect(dva).to.be.instanceof(Type2);
    expect(dva.get('id')).to.be.equal('dva');

    var tri = t3.childAtPath('tri');
    expect(tri).to.be.instanceof(Type2);
    expect(tri.get('id')).to.be.equal('tri');
  });

  it ('Create a pretty deeep structure', function () {
    deep = elementFactory ({
      name : 'jedan',
      type : 'type1',
      options : {
        elements : [
          {
            name: 'dva',
            type : 'type2',
            options: {
              elements : [
                {
                  name : 'tri',
                  type : 'type1',
                  options : {
                    elements : [
                      {
                        name: 'cetiri',
                        type : 'type2'
                      },
                      {
                        name: 'pet',
                        type : 'type2',
                        options: {
                          elements : [
                            {
                              name : 'sest',
                              type : 'type1',
                              options : {
                                elements : [
                                  {
                                    name: 'sedam',
                                    type : 'type2'
                                  },
                                  {
                                    name: 'osam',
                                    type : 'type2'
                                  }
                                ]
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            name: 'tri',
            type : 'type2'
          }
        ]
      }
    });

    var sedam = deep.childAtPath('dva.tri.pet.sest.sedam');
    expect (sedam).to.be.instanceof(Type2);
    expect (sedam.get('id')).to.be.equal('sedam');
  });

  it ('Test actual setting' , function () {
    var sedam = deep.childAtPath('dva.tri.pet.sest.sedam');
    sedam.set('actual', true);
    expect(sedam.get('actual')).to.be.true;
    expect(deep.get('actual')).to.be.true;

    sedam.set('actual', false);
    expect(sedam.get('actual')).to.be.false;
    expect(deep.get('actual')).to.be.true;
  });
});
