function createDescriptorApi (lib) {
  var ArryOps = require('allex_arrayoperationslowlevellib')(lib.extend, lib.readPropertyFromDotDelimitedString, lib.isFunction, lib.Map, lib.AllexJSONizingError);

  function ensureDescriptorArrayElementByPropertyName (propertyname, desc, arryname, arryelementname, defaultelement) {
    var arry, elem, mydefault;
    if (!desc) {
      return null;
    }
    arry = desc[arryname];
    if (!arry) {
      arry = [];
      desc[arryname] = arry;
    }
    elem = ArryOps.findElementWithProperty(arry, propertyname, arryelementname);
    if (!elem) {
      mydefault = {};
      mydefault[propertyname] = arryelementname;
      elem = lib.extend(defaultelement || {}, mydefault);
      arry.push(elem);
    }
    return elem;
  }

  function ensureDescriptorArrayElementByName (desc, arryname, arryelementname, defaultelement) {
    return ensureDescriptorArrayElementByPropertyName('name', desc, arryname, arryelementname, defaultelement);
  }

  function ensureDescriptorArrayElementByType (desc, arryname, arryelementname, defaultelement) {
    return ensureDescriptorArrayElementByPropertyName('type', desc, arryname, arryelementname, defaultelement);
  }

  return {
    ensureDescriptorArrayElementByPropertyName: ensureDescriptorArrayElementByPropertyName, 
    ensureDescriptorArrayElementByName: ensureDescriptorArrayElementByName,
    ensureDescriptorArrayElementByType: ensureDescriptorArrayElementByType
  };
}

module.exports = createDescriptorApi;
    
