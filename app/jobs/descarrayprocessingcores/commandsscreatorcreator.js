function createCommandsCreator (lib, dataSuite, arryopslib, mylib) {
  'use strict';

  var DescriptorArrayJobCore = mylib.DescriptorArrayJobCore,
    Command = require('../../commandcreator')(lib),
    FunctionCommand = require('../../functioncommandcreator')(lib);

  function CommandsCreatorJobCore (descriptorloaderjobcore) {
    DescriptorArrayJobCore.call(this, descriptorloaderjobcore, 'commands');
  }
  lib.inherit(CommandsCreatorJobCore, DescriptorArrayJobCore);
  CommandsCreatorJobCore.prototype.doOneItem = function (commdesc) {
    var fc = null, desc, e, c, c_name;
    if (!commdesc.command) throw new Error('No command in '+toString(commdesc));
    desc = this.descriptor();
    fc = this.app().commands.get(commdesc.command);
    if (fc) {
      return;
    }
    if (lib.isFunction(commdesc.handler)){
      return {
        desc:commdesc,
        comm: new FunctionCommand(commdesc.command, commdesc.handler),
        isfunc: true
      };
    }else{
      if (!commdesc.environment) throw new Error('No environment in '+toString(commdesc));
      e = commdesc.environment ? arryopslib.findElementWithProperty(desc.environments, 'name', commdesc.environment) : null;
      if (!e && !lib.isFunction(commdesc.handler)) throw new Error('Unable to find environment '+commdesc.environment);

      c_name = commdesc.ecommand || commdesc.command; 
      c = arryopslib.findElementWithProperty(e.options.commands, 'name', c_name);

      if (!c) {
        c = arryopslib.findElementWithProperty(e.options.datacommands, 'name', c_name);
        if (!c)
          console.warn('Unable to find command '+c_name+' in environment descriptor');
      }
      return {
        desc: commdesc,
        comm: new Command (c_name),
        isfunc: false
      };
    }
  };
  CommandsCreatorJobCore.prototype.parallel = true;

  mylib.CommandsCreatorJobCore = CommandsCreatorJobCore;
}
module.exports = createCommandsCreator;