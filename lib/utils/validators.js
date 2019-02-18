const validators = {
    /**
     * Verifica se elemento é nulo ou undefined.
     *
     * @constructor
     * @param {object} pElement Elemento a ser verificado
     * @return {boolean} Se é nulo
     */
    isNull: pElement => {
        return validators.isUndefined(pElement) || pElement === null;
    },

    /**
     * Verifica se elemento é nulo, undefined ou vazio.
     *
     * @constructor
     * @param {object} pElement Elemento a ser verificado
     * @return {boolean} Se é vazio
     */
    isEmpty: pElement => {
        if (validators.isNull(pElement)) {
            return true;
        } else if (validators.isString(pElement)) {
            if (pElement.trim() === "") {
                return true;
            }
        } else if (validators.isArray(pElement)) {
            if (pElement.length === 0) {
                return true;
            }
        } else if (validators.isObject(pElement)) {
            if (Object.keys(pElement).length === 0) {
                return true;
            }
        }
        return false;
    },

    isObject: toValidate => {
        return (
            toValidate &&
            validators.trueTypeOf(toValidate) === "object" &&
            toValidate.constructor === Object
        );
    },

    isString: toValidate => {
        return validators.trueTypeOf(toValidate) === "string";
    },

    isArray: toValidate => {
        return validators.trueTypeOf(toValidate) === "array";
    },

    isUndefined: toValidate => {
        return validators.trueTypeOf(toValidate) === "undefined";
    },

    isBoolean: toValidate => {
        return validators.trueTypeOf(toValidate) === "boolean";
    },

    isNumber: toValidate => {
        return validators.trueTypeOf(toValidate) === "number";
    },

    isDate: toValidate => {
        return (
            validators.trueTypeOf(toValidate) === "date" &&
            !isNaN(toValidate.valueOf())
        );
    },

    isSymbol: toValidate => {
        return validators.trueTypeOf(toValidate) === "symbol";
    },

    isFunction: toValidate => {
        return validators.trueTypeOf(toValidate) === "function";
        // return typeof toValidate === "function";
    },

    isMergeable: toValidate => {
        var xNonNullObject = toValidate && validators.isObject(toValidate);

        return (
            xNonNullObject &&
            Object.prototype.toString.call(toValidate) !== "[object RegExp]" &&
            Object.prototype.toString.call(toValidate) !== "[object Date]"
        );
    },

    isLengthGreaterThen: length => toValidate => toValidate.length > length,

    trueTypeOf: toValidate => {
        return Object.prototype.toString
            .call(toValidate)
            .slice(8, -1)
            .toLowerCase();
    }
};

module.exports = validators;
