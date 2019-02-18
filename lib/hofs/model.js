const model = pSource => {
    return new Proxy(pSource, {
        get: (pObj, pProp, pReceiver) => {
            // console.log(`GET ${pProp}`);
            //Restritivo
            if (pProp in pObj) {
                return Reflect.get(pObj, pProp, pReceiver);
            }
            return "Oops! Propriedade " + pProp.toString() + " não existe.";
        },
        set: (pObj, pProp, pReceiver) => {
            console.log(`SET ${pProp}`);
            //Restritivo
            if (pProp in pObj) {
                return Reflect.set(pObj, pProp, pReceiver);
            }
        },
        deleteProperty(pObj, pProp) {
            return Reflect.deleteProperty(pObj, pProp);
        },
        has(pObj, pProp) {
            if (key[0] === "_") {
                return false;
            }
            return pProp in pObj;
        },
        ownKeys(pObj) {
            // Object.getOwnPropertyNames(object1)
            return Reflect.ownKeys(pObj);
        },
        apply: function(pObj, thisArg, argumentsList) {
            console.log("called: " + argumentsList.join(", "));
            return argumentsList[0] + argumentsList[1] + argumentsList[2];
        }
    });
};

module.exports = model;
