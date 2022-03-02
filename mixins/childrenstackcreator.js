function createChildrenStackMixin (lib, mylib) {
  'use strict';

  function ChildrenStackElement (actualchangecb, options, index) {
    this.actualChangeCb = actualchangecb;
    this.name = options.name;
    this.title = options.title;
    this.index = index;
    this.elem = null;
    this.elementDestroyedListener = null;
    this.elementActualChangedListener = null;
  }
  ChildrenStackElement.prototype.destroy = function () {
    this.purgeListeners();
    this.elem = null;
    this.index = null;
    this.title = null;
    this.name = null;
    this.actualChangeCb = null;
  };
  ChildrenStackElement.prototype.attachTo = function (elem) {
    if (this.elementDestroyedListener) {
      throw new lib.Error('ALREADY_LISTENING_TO_ACTUAL_CHANGE', 'There is already an elementDestroyedListener');
    }
    if (this.elementActualChangedListener) {
      throw new lib.Error('ALREADY_LISTENING_TO_ACTUAL_CHANGE', 'There is already an elementActualChangedListener');
    }
    this.elem = elem;
    this.elementDestroyedListener = elem.destroyed.attach(this.onElementDestroyed.bind(this));
    this.elementActualChangedListener = elem.attachListener('changed', 'actual', this.onElementActualChanged.bind(this));
  };
  ChildrenStackElement.prototype.onElementDestroyed = function () {
    this.purgeListeners();
  };
  ChildrenStackElement.prototype.onElementActualChanged = function (act) {
    if (lib.isFunction(this.actualChangeCb)) {
      this.actualChangeCb(this, act);
    }
  };
  ChildrenStackElement.prototype.purgeListeners = function () {
    if (this.elementActualChangedListener) {
      this.elementActualChangedListener.destroy();
    }
    this.elementActualChangedListener = null;
    if (this.elementDestroyedListener) {
      this.elementDestroyedListener.destroy();
    }
    this.elementDestroyedListener = null;
  };

  function checkChildOption (childoption) {
    if (!childoption) {
      throw new lib.Error('NO_CHILD_IN_CHILDRENSTACK_CHILDREN', 'There must be a child option in childrenstack.children');
    }
    if (!(lib.isString(childoption.name) && childoption.name)) {
      throw new lib.Error('NO_NAME_IN_CHILDRENSTACK_CHILDREN_CHILD', 'Child option in childrenstack.children must have a name (String)');
    }
    if (!(lib.isString(childoption.title) && childoption.title)) {
      throw new lib.Error('NO_TITLE_IN_CHILDRENSTACK_CHILDREN_CHILD', 'Child option in childrenstack.children must have a title (String)');
    }
  }
  function checkOptions (myoptions) {
    if (!lib.isArray(myoptions.children)) {
      throw new lib.Error('NO_CHILDREN_IN_CHILDRENSTACK');
    }
    myoptions.children.forEach(checkChildOption);
  }
  function ChildrenStackMixin (options) {
    this.childrenStackElementMap = new lib.Map();
    this.childrenStackStack = [];
    this.childrenStackTopChanged = this.createBufferableHookCollection();
    if (options && options.childrenstack) {
      checkOptions(options.childrenstack);
      options.childrenstack.children.forEach(this.addStackElement.bind(this));
    }
  }
  function destroyer (thingy) {
    thingy.destroy();
  }
  ChildrenStackMixin.prototype.destroy = function () {
    if (this.childrenStackTopChanged) {
      this.childrenStackTopChanged.destroy();
    }
    this.childrenStackTopChanged = null;
    this.childrenStackStack = null;
    if (this.childrenStackElementMap) {
      this.childrenStackElementMap.traverse(destroyer);
      this.childrenStackElementMap.destroy();
    }
    this.childrenStackElementMap = null;
  };
  ChildrenStackMixin.prototype.addStackElement = function (options, index) {
    this.childrenStackElementMap.add(
      options.name,
      new ChildrenStackElement(
        this.onStackElementActualChanged.bind(this),
        options,
        index
      )
    );
  };
  ChildrenStackMixin.prototype.popChildrenStack = function () {
    var topel = stackTop.call(this);
    if (topel) {
      topel.elem.set('actual', false);
    }
  };
  ChildrenStackMixin.prototype.onStackElementActualChanged = function (myelem, val) {
    var stack, topel;
    if (!lib.isArray(this.childrenStackStack)) {
      return;
    }
    //console.log('actual changed', myelem, val);
    stack = this.childrenStackStack;
    topel = stackTop.call(this);
    if (val) {
      if (topel == myelem) {
        this.childrenStackTopChanged.fire(myelem, stack.length);
        return;
      }
      stack.push(myelem);
      this.childrenStackTopChanged.fire(myelem, stack.length);
      if (topel) {
        topel.elem.set('actual', false);
      }
      return;
    }
    if (topel == myelem) {
      stack.pop();
      topel = stackTop.call(this);
      if (topel) {
        topel.elem.set('actual', true);
      }
    }
  };

  //statics
  function stackTop () {
    if (!lib.isArray(this.childrenStackStack)) {
      return null;
    }
    if (this.childrenStackStack.length<1) {
      return null;
    }
    return this.childrenStackStack[this.childrenStackStack.length-1];
  }
  function addChild (chld) {
    if (!this.childrenStackElementMap) {
      return;
    }
    var stackelem = this.childrenStackElementMap.get(chld.id);
    if (stackelem) {
      stackelem.attachTo(chld);
    }
  }

  //statics end

  function addChildProducer (klass) {
    return function (chld) {
      addChild.call(this, chld);
      return klass.prototype.addChild.call(this, chld);
    };
  }

  ChildrenStackMixin.addMethods = function (klass, baseklass) {
    lib.inheritMethods(klass, ChildrenStackMixin
      , 'addStackElement'
      , 'popChildrenStack'
      , 'onStackElementActualChanged'
    );
    klass.prototype.addChild = addChildProducer(baseklass);
    baseklass = null;
  };

  mylib.ChildrenStack = ChildrenStackMixin;
}
module.exports = createChildrenStackMixin;