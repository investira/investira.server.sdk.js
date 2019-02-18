const {
    isEmpty,
    isNull,
    isArray,
    isMergeable,
    isUndefined
} = require("./validators");

const objects = {
    /**
     * Retorna objeto contendo tendo a propriedade e respectivo valor: ex: {propriedade:'valor'}
     *
     * @param {String} pProperty
     * @param {*} pValue
     * @returns Objeto JS
     */
    objectFromPropertyAndValue: (pProperty, pValue) => {
        if (isEmpty(pProperty)) {
            return {};
        }
        let xO = {};
        xO[pProperty] = pValue;
        return xO;
    },

    /**
     * Exclui as propriedades contidas no objeto cujos nomes NÃO façam parte da lista
     *
     * @param {Object} pObject Objeto origem
     * @param {Array} pProperties Array com os nomes das propriedades válidas: ex: ["client_id", "client_name"]
     * @returns Objeto somente com as propriedades válidas
     */
    objectCleanup: (pObject, pProperties) => {
        if (isEmpty(pObject)) {
            throw Error("Objeto não informado");
        }
        if (isEmpty(pProperties)) {
            return pObject;
        }
        let xObject = { ...pObject };
        Object.keys(xObject).forEach(
            xProperty =>
                pProperties.includes(xProperty) || delete xObject[xProperty]
        );
        return xObject;
    },

    /**
     * Retorna valor definido em default value, caso o valor passado seja nulo.
     *
     * @param {*} pElement Elemento a ser verificado
     * @param {string} [pDefaultValue=""] A ser retornado caso pElement seja nulo
     * @returns Elemento válido
     */

    getNotNull: (pElement, pDefaultValue) => {
        if (isNull(pElement)) {
            return pDefaultValue;
        } else {
            return pElement;
        }
    },

    /**
     * Retorna valor definido em default value, caso o valor passado seja vázio.
     *
     * @param {*} pElement Elemento a ser verificado
     * @param {string} [pDefaultValue=""] A ser retornado caso pElement seja vázio
     * @returns Elemento válido
     */
    getNotEmpty: (pElement, pDefaultValue = "") => {
        if (isEmpty(pElement)) {
            return pDefaultValue;
        } else {
            return pElement;
        }
    },

    /**
     * Copia um elemento para outro.
     *
     * @param {object} pSource Elemento origem
     * @return {object} Copia do elemento
     */
    deepCopy: pSource => {
        return JSON.parse(JSON.stringify(pSource));
    },

    /**
     * Retorna um deep merge dos objetos
     *
     * @param {*} pTarget
     * @param {*} pSource
     * @param {*} pOptionsArgument
     * @returns
     */
    deepMerge: (pTarget, pSource, pOptionsArgument) => {
        const xOptions = pOptionsArgument || {
            arrayMerge: objects.defaultArrayMerge
        };
        const xArrayMerge = xOptions.arrayMerge || objects.defaultArrayMerge;

        if (isArray(pSource)) {
            return isArray(pTarget)
                ? xArrayMerge(pTarget, pSource, pOptionsArgument)
                : cloneIfNecessary(pSource, pOptionsArgument);
        } else {
            return mergeObject(pTarget, pSource, pOptionsArgument);
        }
    },

    deepMergeAll: (pArray, pOptionsArgument) => {
        if (!isArray(pArray) || pArray.length < 2) {
            throw new Error(
                "first argument should be an array with at least two elements"
            );
        }

        // we are sure there are at least 2 values, so it is safe to have no initial value
        return pArray.reduce((prev, next) => {
            return deepMerge(prev, next, pOptionsArgument);
        });
    },

    emptyTarget: pValue => {
        return Array.isArray(pValue) ? [] : {};
    },

    cloneIfNecessary: (pValue, pOptionsArgument) => {
        const xClone = pOptionsArgument && pOptionsArgument.clone === true;
        return xClone && isMergeable(pValue)
            ? deepMerge(emptyTarget(pValue), pValue, pOptionsArgument)
            : pValue;
    },

    defaultArrayMerge: (pTarget, pSource, pOptionsArgument) => {
        let xDestination = pTarget.slice();
        pSource.forEach((e, i) => {
            if (isUndefined(xDestination[i])) {
                xDestination[i] = cloneIfNecessary(e, pOptionsArgument);
            } else if (isMergeable(e)) {
                xDestination[i] = deepMerge(pTarget[i], e, pOptionsArgument);
            } else if (pTarget.indexOf(e) === -1) {
                xDestination.push(cloneIfNecessary(e, pOptionsArgument));
            }
        });
        return xDestination;
    },

    mergeObject: (pTarget, pSource, pOptionsArgument) => {
        let xDestination = {};
        if (isMergeable(pTarget)) {
            Object.keys(pTarget).forEach(xKey => {
                xDestination[xKey] = cloneIfNecessary(
                    pTarget[xKey],
                    pOptionsArgument
                );
            });
        }
        Object.keys(pSource).forEach(xKey => {
            if (!isMergeable(pSource[xKey]) || !pTarget[xKey]) {
                xDestination[xKey] = cloneIfNecessary(
                    pSource[xKey],
                    pOptionsArgument
                );
            } else {
                xDestination[xKey] = deepMerge(
                    pTarget[xKey],
                    pSource[xKey],
                    pOptionsArgument
                );
            }
        });
        return xDestination;
    }
};
module.exports = objects;
