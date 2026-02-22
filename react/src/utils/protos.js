/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const StatisticRow = $root.StatisticRow = (() => {

    /**
     * Properties of a StatisticRow.
     * @exports IStatisticRow
     * @interface IStatisticRow
     * @property {number|null} [statval] StatisticRow statval
     * @property {Array.<number>|null} [ordinalByUniverse] StatisticRow ordinalByUniverse
     * @property {Array.<number>|null} [percentileByPopulationByUniverse] StatisticRow percentileByPopulationByUniverse
     */

    /**
     * Constructs a new StatisticRow.
     * @exports StatisticRow
     * @classdesc Represents a StatisticRow.
     * @implements IStatisticRow
     * @constructor
     * @param {IStatisticRow=} [properties] Properties to set
     */
    function StatisticRow(properties) {
        this.ordinalByUniverse = [];
        this.percentileByPopulationByUniverse = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * StatisticRow statval.
     * @member {number} statval
     * @memberof StatisticRow
     * @instance
     */
    StatisticRow.prototype.statval = 0;

    /**
     * StatisticRow ordinalByUniverse.
     * @member {Array.<number>} ordinalByUniverse
     * @memberof StatisticRow
     * @instance
     */
    StatisticRow.prototype.ordinalByUniverse = $util.emptyArray;

    /**
     * StatisticRow percentileByPopulationByUniverse.
     * @member {Array.<number>} percentileByPopulationByUniverse
     * @memberof StatisticRow
     * @instance
     */
    StatisticRow.prototype.percentileByPopulationByUniverse = $util.emptyArray;

    /**
     * Creates a new StatisticRow instance using the specified properties.
     * @function create
     * @memberof StatisticRow
     * @static
     * @param {IStatisticRow=} [properties] Properties to set
     * @returns {StatisticRow} StatisticRow instance
     */
    StatisticRow.create = function create(properties) {
        return new StatisticRow(properties);
    };

    /**
     * Encodes the specified StatisticRow message. Does not implicitly {@link StatisticRow.verify|verify} messages.
     * @function encode
     * @memberof StatisticRow
     * @static
     * @param {IStatisticRow} message StatisticRow message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    StatisticRow.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.statval != null && Object.hasOwnProperty.call(message, "statval"))
            writer.uint32(/* id 1, wireType 5 =*/13).float(message.statval);
        if (message.ordinalByUniverse != null && message.ordinalByUniverse.length) {
            writer.uint32(/* id 2, wireType 2 =*/18).fork();
            for (let i = 0; i < message.ordinalByUniverse.length; ++i)
                writer.int32(message.ordinalByUniverse[i]);
            writer.ldelim();
        }
        if (message.percentileByPopulationByUniverse != null && message.percentileByPopulationByUniverse.length) {
            writer.uint32(/* id 4, wireType 2 =*/34).fork();
            for (let i = 0; i < message.percentileByPopulationByUniverse.length; ++i)
                writer.int32(message.percentileByPopulationByUniverse[i]);
            writer.ldelim();
        }
        return writer;
    };

    /**
     * Encodes the specified StatisticRow message, length delimited. Does not implicitly {@link StatisticRow.verify|verify} messages.
     * @function encodeDelimited
     * @memberof StatisticRow
     * @static
     * @param {IStatisticRow} message StatisticRow message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    StatisticRow.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a StatisticRow message from the specified reader or buffer.
     * @function decode
     * @memberof StatisticRow
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {StatisticRow} StatisticRow
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    StatisticRow.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.StatisticRow();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.statval = reader.float();
                    break;
                }
            case 2: {
                    if (!(message.ordinalByUniverse && message.ordinalByUniverse.length))
                        message.ordinalByUniverse = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.ordinalByUniverse.push(reader.int32());
                    } else
                        message.ordinalByUniverse.push(reader.int32());
                    break;
                }
            case 4: {
                    if (!(message.percentileByPopulationByUniverse && message.percentileByPopulationByUniverse.length))
                        message.percentileByPopulationByUniverse = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.percentileByPopulationByUniverse.push(reader.int32());
                    } else
                        message.percentileByPopulationByUniverse.push(reader.int32());
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a StatisticRow message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof StatisticRow
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {StatisticRow} StatisticRow
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    StatisticRow.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a StatisticRow message.
     * @function verify
     * @memberof StatisticRow
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    StatisticRow.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.statval != null && message.hasOwnProperty("statval"))
            if (typeof message.statval !== "number")
                return "statval: number expected";
        if (message.ordinalByUniverse != null && message.hasOwnProperty("ordinalByUniverse")) {
            if (!Array.isArray(message.ordinalByUniverse))
                return "ordinalByUniverse: array expected";
            for (let i = 0; i < message.ordinalByUniverse.length; ++i)
                if (!$util.isInteger(message.ordinalByUniverse[i]))
                    return "ordinalByUniverse: integer[] expected";
        }
        if (message.percentileByPopulationByUniverse != null && message.hasOwnProperty("percentileByPopulationByUniverse")) {
            if (!Array.isArray(message.percentileByPopulationByUniverse))
                return "percentileByPopulationByUniverse: array expected";
            for (let i = 0; i < message.percentileByPopulationByUniverse.length; ++i)
                if (!$util.isInteger(message.percentileByPopulationByUniverse[i]))
                    return "percentileByPopulationByUniverse: integer[] expected";
        }
        return null;
    };

    /**
     * Creates a StatisticRow message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof StatisticRow
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {StatisticRow} StatisticRow
     */
    StatisticRow.fromObject = function fromObject(object) {
        if (object instanceof $root.StatisticRow)
            return object;
        let message = new $root.StatisticRow();
        if (object.statval != null)
            message.statval = Number(object.statval);
        if (object.ordinalByUniverse) {
            if (!Array.isArray(object.ordinalByUniverse))
                throw TypeError(".StatisticRow.ordinalByUniverse: array expected");
            message.ordinalByUniverse = [];
            for (let i = 0; i < object.ordinalByUniverse.length; ++i)
                message.ordinalByUniverse[i] = object.ordinalByUniverse[i] | 0;
        }
        if (object.percentileByPopulationByUniverse) {
            if (!Array.isArray(object.percentileByPopulationByUniverse))
                throw TypeError(".StatisticRow.percentileByPopulationByUniverse: array expected");
            message.percentileByPopulationByUniverse = [];
            for (let i = 0; i < object.percentileByPopulationByUniverse.length; ++i)
                message.percentileByPopulationByUniverse[i] = object.percentileByPopulationByUniverse[i] | 0;
        }
        return message;
    };

    /**
     * Creates a plain object from a StatisticRow message. Also converts values to other types if specified.
     * @function toObject
     * @memberof StatisticRow
     * @static
     * @param {StatisticRow} message StatisticRow
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    StatisticRow.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.ordinalByUniverse = [];
            object.percentileByPopulationByUniverse = [];
        }
        if (options.defaults)
            object.statval = 0;
        if (message.statval != null && message.hasOwnProperty("statval"))
            object.statval = options.json && !isFinite(message.statval) ? String(message.statval) : message.statval;
        if (message.ordinalByUniverse && message.ordinalByUniverse.length) {
            object.ordinalByUniverse = [];
            for (let j = 0; j < message.ordinalByUniverse.length; ++j)
                object.ordinalByUniverse[j] = message.ordinalByUniverse[j];
        }
        if (message.percentileByPopulationByUniverse && message.percentileByPopulationByUniverse.length) {
            object.percentileByPopulationByUniverse = [];
            for (let j = 0; j < message.percentileByPopulationByUniverse.length; ++j)
                object.percentileByPopulationByUniverse[j] = message.percentileByPopulationByUniverse[j];
        }
        return object;
    };

    /**
     * Converts this StatisticRow to JSON.
     * @function toJSON
     * @memberof StatisticRow
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    StatisticRow.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for StatisticRow
     * @function getTypeUrl
     * @memberof StatisticRow
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    StatisticRow.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/StatisticRow";
    };

    return StatisticRow;
})();

export const FirstOrLast = $root.FirstOrLast = (() => {

    /**
     * Properties of a FirstOrLast.
     * @exports IFirstOrLast
     * @interface IFirstOrLast
     * @property {number|null} [articleRowIdx] FirstOrLast articleRowIdx
     * @property {number|null} [articleUniversesIdx] FirstOrLast articleUniversesIdx
     * @property {boolean|null} [isFirst] FirstOrLast isFirst
     */

    /**
     * Constructs a new FirstOrLast.
     * @exports FirstOrLast
     * @classdesc Represents a FirstOrLast.
     * @implements IFirstOrLast
     * @constructor
     * @param {IFirstOrLast=} [properties] Properties to set
     */
    function FirstOrLast(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * FirstOrLast articleRowIdx.
     * @member {number} articleRowIdx
     * @memberof FirstOrLast
     * @instance
     */
    FirstOrLast.prototype.articleRowIdx = 0;

    /**
     * FirstOrLast articleUniversesIdx.
     * @member {number} articleUniversesIdx
     * @memberof FirstOrLast
     * @instance
     */
    FirstOrLast.prototype.articleUniversesIdx = 0;

    /**
     * FirstOrLast isFirst.
     * @member {boolean} isFirst
     * @memberof FirstOrLast
     * @instance
     */
    FirstOrLast.prototype.isFirst = false;

    /**
     * Creates a new FirstOrLast instance using the specified properties.
     * @function create
     * @memberof FirstOrLast
     * @static
     * @param {IFirstOrLast=} [properties] Properties to set
     * @returns {FirstOrLast} FirstOrLast instance
     */
    FirstOrLast.create = function create(properties) {
        return new FirstOrLast(properties);
    };

    /**
     * Encodes the specified FirstOrLast message. Does not implicitly {@link FirstOrLast.verify|verify} messages.
     * @function encode
     * @memberof FirstOrLast
     * @static
     * @param {IFirstOrLast} message FirstOrLast message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FirstOrLast.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.articleRowIdx != null && Object.hasOwnProperty.call(message, "articleRowIdx"))
            writer.uint32(/* id 1, wireType 0 =*/8).int32(message.articleRowIdx);
        if (message.articleUniversesIdx != null && Object.hasOwnProperty.call(message, "articleUniversesIdx"))
            writer.uint32(/* id 2, wireType 0 =*/16).int32(message.articleUniversesIdx);
        if (message.isFirst != null && Object.hasOwnProperty.call(message, "isFirst"))
            writer.uint32(/* id 3, wireType 0 =*/24).bool(message.isFirst);
        return writer;
    };

    /**
     * Encodes the specified FirstOrLast message, length delimited. Does not implicitly {@link FirstOrLast.verify|verify} messages.
     * @function encodeDelimited
     * @memberof FirstOrLast
     * @static
     * @param {IFirstOrLast} message FirstOrLast message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FirstOrLast.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a FirstOrLast message from the specified reader or buffer.
     * @function decode
     * @memberof FirstOrLast
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {FirstOrLast} FirstOrLast
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FirstOrLast.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.FirstOrLast();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.articleRowIdx = reader.int32();
                    break;
                }
            case 2: {
                    message.articleUniversesIdx = reader.int32();
                    break;
                }
            case 3: {
                    message.isFirst = reader.bool();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a FirstOrLast message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof FirstOrLast
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {FirstOrLast} FirstOrLast
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FirstOrLast.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a FirstOrLast message.
     * @function verify
     * @memberof FirstOrLast
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    FirstOrLast.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.articleRowIdx != null && message.hasOwnProperty("articleRowIdx"))
            if (!$util.isInteger(message.articleRowIdx))
                return "articleRowIdx: integer expected";
        if (message.articleUniversesIdx != null && message.hasOwnProperty("articleUniversesIdx"))
            if (!$util.isInteger(message.articleUniversesIdx))
                return "articleUniversesIdx: integer expected";
        if (message.isFirst != null && message.hasOwnProperty("isFirst"))
            if (typeof message.isFirst !== "boolean")
                return "isFirst: boolean expected";
        return null;
    };

    /**
     * Creates a FirstOrLast message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof FirstOrLast
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {FirstOrLast} FirstOrLast
     */
    FirstOrLast.fromObject = function fromObject(object) {
        if (object instanceof $root.FirstOrLast)
            return object;
        let message = new $root.FirstOrLast();
        if (object.articleRowIdx != null)
            message.articleRowIdx = object.articleRowIdx | 0;
        if (object.articleUniversesIdx != null)
            message.articleUniversesIdx = object.articleUniversesIdx | 0;
        if (object.isFirst != null)
            message.isFirst = Boolean(object.isFirst);
        return message;
    };

    /**
     * Creates a plain object from a FirstOrLast message. Also converts values to other types if specified.
     * @function toObject
     * @memberof FirstOrLast
     * @static
     * @param {FirstOrLast} message FirstOrLast
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    FirstOrLast.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults) {
            object.articleRowIdx = 0;
            object.articleUniversesIdx = 0;
            object.isFirst = false;
        }
        if (message.articleRowIdx != null && message.hasOwnProperty("articleRowIdx"))
            object.articleRowIdx = message.articleRowIdx;
        if (message.articleUniversesIdx != null && message.hasOwnProperty("articleUniversesIdx"))
            object.articleUniversesIdx = message.articleUniversesIdx;
        if (message.isFirst != null && message.hasOwnProperty("isFirst"))
            object.isFirst = message.isFirst;
        return object;
    };

    /**
     * Converts this FirstOrLast to JSON.
     * @function toJSON
     * @memberof FirstOrLast
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    FirstOrLast.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for FirstOrLast
     * @function getTypeUrl
     * @memberof FirstOrLast
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    FirstOrLast.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/FirstOrLast";
    };

    return FirstOrLast;
})();

export const RelatedButton = $root.RelatedButton = (() => {

    /**
     * Properties of a RelatedButton.
     * @exports IRelatedButton
     * @interface IRelatedButton
     * @property {string|null} [longname] RelatedButton longname
     * @property {string|null} [shortname] RelatedButton shortname
     * @property {string|null} [rowType] RelatedButton rowType
     */

    /**
     * Constructs a new RelatedButton.
     * @exports RelatedButton
     * @classdesc Represents a RelatedButton.
     * @implements IRelatedButton
     * @constructor
     * @param {IRelatedButton=} [properties] Properties to set
     */
    function RelatedButton(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * RelatedButton longname.
     * @member {string} longname
     * @memberof RelatedButton
     * @instance
     */
    RelatedButton.prototype.longname = "";

    /**
     * RelatedButton shortname.
     * @member {string} shortname
     * @memberof RelatedButton
     * @instance
     */
    RelatedButton.prototype.shortname = "";

    /**
     * RelatedButton rowType.
     * @member {string} rowType
     * @memberof RelatedButton
     * @instance
     */
    RelatedButton.prototype.rowType = "";

    /**
     * Creates a new RelatedButton instance using the specified properties.
     * @function create
     * @memberof RelatedButton
     * @static
     * @param {IRelatedButton=} [properties] Properties to set
     * @returns {RelatedButton} RelatedButton instance
     */
    RelatedButton.create = function create(properties) {
        return new RelatedButton(properties);
    };

    /**
     * Encodes the specified RelatedButton message. Does not implicitly {@link RelatedButton.verify|verify} messages.
     * @function encode
     * @memberof RelatedButton
     * @static
     * @param {IRelatedButton} message RelatedButton message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    RelatedButton.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.longname != null && Object.hasOwnProperty.call(message, "longname"))
            writer.uint32(/* id 1, wireType 2 =*/10).string(message.longname);
        if (message.shortname != null && Object.hasOwnProperty.call(message, "shortname"))
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.shortname);
        if (message.rowType != null && Object.hasOwnProperty.call(message, "rowType"))
            writer.uint32(/* id 3, wireType 2 =*/26).string(message.rowType);
        return writer;
    };

    /**
     * Encodes the specified RelatedButton message, length delimited. Does not implicitly {@link RelatedButton.verify|verify} messages.
     * @function encodeDelimited
     * @memberof RelatedButton
     * @static
     * @param {IRelatedButton} message RelatedButton message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    RelatedButton.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a RelatedButton message from the specified reader or buffer.
     * @function decode
     * @memberof RelatedButton
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {RelatedButton} RelatedButton
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    RelatedButton.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.RelatedButton();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.longname = reader.string();
                    break;
                }
            case 2: {
                    message.shortname = reader.string();
                    break;
                }
            case 3: {
                    message.rowType = reader.string();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a RelatedButton message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof RelatedButton
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {RelatedButton} RelatedButton
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    RelatedButton.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a RelatedButton message.
     * @function verify
     * @memberof RelatedButton
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    RelatedButton.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.longname != null && message.hasOwnProperty("longname"))
            if (!$util.isString(message.longname))
                return "longname: string expected";
        if (message.shortname != null && message.hasOwnProperty("shortname"))
            if (!$util.isString(message.shortname))
                return "shortname: string expected";
        if (message.rowType != null && message.hasOwnProperty("rowType"))
            if (!$util.isString(message.rowType))
                return "rowType: string expected";
        return null;
    };

    /**
     * Creates a RelatedButton message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof RelatedButton
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {RelatedButton} RelatedButton
     */
    RelatedButton.fromObject = function fromObject(object) {
        if (object instanceof $root.RelatedButton)
            return object;
        let message = new $root.RelatedButton();
        if (object.longname != null)
            message.longname = String(object.longname);
        if (object.shortname != null)
            message.shortname = String(object.shortname);
        if (object.rowType != null)
            message.rowType = String(object.rowType);
        return message;
    };

    /**
     * Creates a plain object from a RelatedButton message. Also converts values to other types if specified.
     * @function toObject
     * @memberof RelatedButton
     * @static
     * @param {RelatedButton} message RelatedButton
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    RelatedButton.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults) {
            object.longname = "";
            object.shortname = "";
            object.rowType = "";
        }
        if (message.longname != null && message.hasOwnProperty("longname"))
            object.longname = message.longname;
        if (message.shortname != null && message.hasOwnProperty("shortname"))
            object.shortname = message.shortname;
        if (message.rowType != null && message.hasOwnProperty("rowType"))
            object.rowType = message.rowType;
        return object;
    };

    /**
     * Converts this RelatedButton to JSON.
     * @function toJSON
     * @memberof RelatedButton
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    RelatedButton.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for RelatedButton
     * @function getTypeUrl
     * @memberof RelatedButton
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    RelatedButton.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/RelatedButton";
    };

    return RelatedButton;
})();

export const RelatedButtons = $root.RelatedButtons = (() => {

    /**
     * Properties of a RelatedButtons.
     * @exports IRelatedButtons
     * @interface IRelatedButtons
     * @property {string|null} [relationshipType] RelatedButtons relationshipType
     * @property {Array.<IRelatedButton>|null} [buttons] RelatedButtons buttons
     */

    /**
     * Constructs a new RelatedButtons.
     * @exports RelatedButtons
     * @classdesc Represents a RelatedButtons.
     * @implements IRelatedButtons
     * @constructor
     * @param {IRelatedButtons=} [properties] Properties to set
     */
    function RelatedButtons(properties) {
        this.buttons = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * RelatedButtons relationshipType.
     * @member {string} relationshipType
     * @memberof RelatedButtons
     * @instance
     */
    RelatedButtons.prototype.relationshipType = "";

    /**
     * RelatedButtons buttons.
     * @member {Array.<IRelatedButton>} buttons
     * @memberof RelatedButtons
     * @instance
     */
    RelatedButtons.prototype.buttons = $util.emptyArray;

    /**
     * Creates a new RelatedButtons instance using the specified properties.
     * @function create
     * @memberof RelatedButtons
     * @static
     * @param {IRelatedButtons=} [properties] Properties to set
     * @returns {RelatedButtons} RelatedButtons instance
     */
    RelatedButtons.create = function create(properties) {
        return new RelatedButtons(properties);
    };

    /**
     * Encodes the specified RelatedButtons message. Does not implicitly {@link RelatedButtons.verify|verify} messages.
     * @function encode
     * @memberof RelatedButtons
     * @static
     * @param {IRelatedButtons} message RelatedButtons message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    RelatedButtons.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.relationshipType != null && Object.hasOwnProperty.call(message, "relationshipType"))
            writer.uint32(/* id 1, wireType 2 =*/10).string(message.relationshipType);
        if (message.buttons != null && message.buttons.length)
            for (let i = 0; i < message.buttons.length; ++i)
                $root.RelatedButton.encode(message.buttons[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified RelatedButtons message, length delimited. Does not implicitly {@link RelatedButtons.verify|verify} messages.
     * @function encodeDelimited
     * @memberof RelatedButtons
     * @static
     * @param {IRelatedButtons} message RelatedButtons message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    RelatedButtons.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a RelatedButtons message from the specified reader or buffer.
     * @function decode
     * @memberof RelatedButtons
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {RelatedButtons} RelatedButtons
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    RelatedButtons.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.RelatedButtons();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.relationshipType = reader.string();
                    break;
                }
            case 2: {
                    if (!(message.buttons && message.buttons.length))
                        message.buttons = [];
                    message.buttons.push($root.RelatedButton.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a RelatedButtons message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof RelatedButtons
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {RelatedButtons} RelatedButtons
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    RelatedButtons.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a RelatedButtons message.
     * @function verify
     * @memberof RelatedButtons
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    RelatedButtons.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.relationshipType != null && message.hasOwnProperty("relationshipType"))
            if (!$util.isString(message.relationshipType))
                return "relationshipType: string expected";
        if (message.buttons != null && message.hasOwnProperty("buttons")) {
            if (!Array.isArray(message.buttons))
                return "buttons: array expected";
            for (let i = 0; i < message.buttons.length; ++i) {
                let error = $root.RelatedButton.verify(message.buttons[i]);
                if (error)
                    return "buttons." + error;
            }
        }
        return null;
    };

    /**
     * Creates a RelatedButtons message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof RelatedButtons
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {RelatedButtons} RelatedButtons
     */
    RelatedButtons.fromObject = function fromObject(object) {
        if (object instanceof $root.RelatedButtons)
            return object;
        let message = new $root.RelatedButtons();
        if (object.relationshipType != null)
            message.relationshipType = String(object.relationshipType);
        if (object.buttons) {
            if (!Array.isArray(object.buttons))
                throw TypeError(".RelatedButtons.buttons: array expected");
            message.buttons = [];
            for (let i = 0; i < object.buttons.length; ++i) {
                if (typeof object.buttons[i] !== "object")
                    throw TypeError(".RelatedButtons.buttons: object expected");
                message.buttons[i] = $root.RelatedButton.fromObject(object.buttons[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a RelatedButtons message. Also converts values to other types if specified.
     * @function toObject
     * @memberof RelatedButtons
     * @static
     * @param {RelatedButtons} message RelatedButtons
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    RelatedButtons.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.buttons = [];
        if (options.defaults)
            object.relationshipType = "";
        if (message.relationshipType != null && message.hasOwnProperty("relationshipType"))
            object.relationshipType = message.relationshipType;
        if (message.buttons && message.buttons.length) {
            object.buttons = [];
            for (let j = 0; j < message.buttons.length; ++j)
                object.buttons[j] = $root.RelatedButton.toObject(message.buttons[j], options);
        }
        return object;
    };

    /**
     * Converts this RelatedButtons to JSON.
     * @function toJSON
     * @memberof RelatedButtons
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    RelatedButtons.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for RelatedButtons
     * @function getTypeUrl
     * @memberof RelatedButtons
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    RelatedButtons.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/RelatedButtons";
    };

    return RelatedButtons;
})();

export const Histogram = $root.Histogram = (() => {

    /**
     * Properties of a Histogram.
     * @exports IHistogram
     * @interface IHistogram
     * @property {number|null} [binMin] Histogram binMin
     * @property {number|null} [binSize] Histogram binSize
     * @property {Array.<number>|null} [counts] Histogram counts
     */

    /**
     * Constructs a new Histogram.
     * @exports Histogram
     * @classdesc Represents a Histogram.
     * @implements IHistogram
     * @constructor
     * @param {IHistogram=} [properties] Properties to set
     */
    function Histogram(properties) {
        this.counts = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Histogram binMin.
     * @member {number} binMin
     * @memberof Histogram
     * @instance
     */
    Histogram.prototype.binMin = 0;

    /**
     * Histogram binSize.
     * @member {number} binSize
     * @memberof Histogram
     * @instance
     */
    Histogram.prototype.binSize = 0;

    /**
     * Histogram counts.
     * @member {Array.<number>} counts
     * @memberof Histogram
     * @instance
     */
    Histogram.prototype.counts = $util.emptyArray;

    /**
     * Creates a new Histogram instance using the specified properties.
     * @function create
     * @memberof Histogram
     * @static
     * @param {IHistogram=} [properties] Properties to set
     * @returns {Histogram} Histogram instance
     */
    Histogram.create = function create(properties) {
        return new Histogram(properties);
    };

    /**
     * Encodes the specified Histogram message. Does not implicitly {@link Histogram.verify|verify} messages.
     * @function encode
     * @memberof Histogram
     * @static
     * @param {IHistogram} message Histogram message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Histogram.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.binMin != null && Object.hasOwnProperty.call(message, "binMin"))
            writer.uint32(/* id 1, wireType 5 =*/13).float(message.binMin);
        if (message.binSize != null && Object.hasOwnProperty.call(message, "binSize"))
            writer.uint32(/* id 2, wireType 5 =*/21).float(message.binSize);
        if (message.counts != null && message.counts.length) {
            writer.uint32(/* id 3, wireType 2 =*/26).fork();
            for (let i = 0; i < message.counts.length; ++i)
                writer.int32(message.counts[i]);
            writer.ldelim();
        }
        return writer;
    };

    /**
     * Encodes the specified Histogram message, length delimited. Does not implicitly {@link Histogram.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Histogram
     * @static
     * @param {IHistogram} message Histogram message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Histogram.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Histogram message from the specified reader or buffer.
     * @function decode
     * @memberof Histogram
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Histogram} Histogram
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Histogram.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Histogram();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.binMin = reader.float();
                    break;
                }
            case 2: {
                    message.binSize = reader.float();
                    break;
                }
            case 3: {
                    if (!(message.counts && message.counts.length))
                        message.counts = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.counts.push(reader.int32());
                    } else
                        message.counts.push(reader.int32());
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Histogram message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Histogram
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Histogram} Histogram
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Histogram.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Histogram message.
     * @function verify
     * @memberof Histogram
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Histogram.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.binMin != null && message.hasOwnProperty("binMin"))
            if (typeof message.binMin !== "number")
                return "binMin: number expected";
        if (message.binSize != null && message.hasOwnProperty("binSize"))
            if (typeof message.binSize !== "number")
                return "binSize: number expected";
        if (message.counts != null && message.hasOwnProperty("counts")) {
            if (!Array.isArray(message.counts))
                return "counts: array expected";
            for (let i = 0; i < message.counts.length; ++i)
                if (!$util.isInteger(message.counts[i]))
                    return "counts: integer[] expected";
        }
        return null;
    };

    /**
     * Creates a Histogram message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Histogram
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Histogram} Histogram
     */
    Histogram.fromObject = function fromObject(object) {
        if (object instanceof $root.Histogram)
            return object;
        let message = new $root.Histogram();
        if (object.binMin != null)
            message.binMin = Number(object.binMin);
        if (object.binSize != null)
            message.binSize = Number(object.binSize);
        if (object.counts) {
            if (!Array.isArray(object.counts))
                throw TypeError(".Histogram.counts: array expected");
            message.counts = [];
            for (let i = 0; i < object.counts.length; ++i)
                message.counts[i] = object.counts[i] | 0;
        }
        return message;
    };

    /**
     * Creates a plain object from a Histogram message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Histogram
     * @static
     * @param {Histogram} message Histogram
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Histogram.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.counts = [];
        if (options.defaults) {
            object.binMin = 0;
            object.binSize = 0;
        }
        if (message.binMin != null && message.hasOwnProperty("binMin"))
            object.binMin = options.json && !isFinite(message.binMin) ? String(message.binMin) : message.binMin;
        if (message.binSize != null && message.hasOwnProperty("binSize"))
            object.binSize = options.json && !isFinite(message.binSize) ? String(message.binSize) : message.binSize;
        if (message.counts && message.counts.length) {
            object.counts = [];
            for (let j = 0; j < message.counts.length; ++j)
                object.counts[j] = message.counts[j];
        }
        return object;
    };

    /**
     * Converts this Histogram to JSON.
     * @function toJSON
     * @memberof Histogram
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Histogram.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for Histogram
     * @function getTypeUrl
     * @memberof Histogram
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    Histogram.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/Histogram";
    };

    return Histogram;
})();

export const TimeSeries = $root.TimeSeries = (() => {

    /**
     * Properties of a TimeSeries.
     * @exports ITimeSeries
     * @interface ITimeSeries
     * @property {Array.<number>|null} [values] TimeSeries values
     */

    /**
     * Constructs a new TimeSeries.
     * @exports TimeSeries
     * @classdesc Represents a TimeSeries.
     * @implements ITimeSeries
     * @constructor
     * @param {ITimeSeries=} [properties] Properties to set
     */
    function TimeSeries(properties) {
        this.values = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * TimeSeries values.
     * @member {Array.<number>} values
     * @memberof TimeSeries
     * @instance
     */
    TimeSeries.prototype.values = $util.emptyArray;

    /**
     * Creates a new TimeSeries instance using the specified properties.
     * @function create
     * @memberof TimeSeries
     * @static
     * @param {ITimeSeries=} [properties] Properties to set
     * @returns {TimeSeries} TimeSeries instance
     */
    TimeSeries.create = function create(properties) {
        return new TimeSeries(properties);
    };

    /**
     * Encodes the specified TimeSeries message. Does not implicitly {@link TimeSeries.verify|verify} messages.
     * @function encode
     * @memberof TimeSeries
     * @static
     * @param {ITimeSeries} message TimeSeries message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    TimeSeries.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.values != null && message.values.length) {
            writer.uint32(/* id 1, wireType 2 =*/10).fork();
            for (let i = 0; i < message.values.length; ++i)
                writer.float(message.values[i]);
            writer.ldelim();
        }
        return writer;
    };

    /**
     * Encodes the specified TimeSeries message, length delimited. Does not implicitly {@link TimeSeries.verify|verify} messages.
     * @function encodeDelimited
     * @memberof TimeSeries
     * @static
     * @param {ITimeSeries} message TimeSeries message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    TimeSeries.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a TimeSeries message from the specified reader or buffer.
     * @function decode
     * @memberof TimeSeries
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {TimeSeries} TimeSeries
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    TimeSeries.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.TimeSeries();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.values && message.values.length))
                        message.values = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.values.push(reader.float());
                    } else
                        message.values.push(reader.float());
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a TimeSeries message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof TimeSeries
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {TimeSeries} TimeSeries
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    TimeSeries.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a TimeSeries message.
     * @function verify
     * @memberof TimeSeries
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    TimeSeries.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.values != null && message.hasOwnProperty("values")) {
            if (!Array.isArray(message.values))
                return "values: array expected";
            for (let i = 0; i < message.values.length; ++i)
                if (typeof message.values[i] !== "number")
                    return "values: number[] expected";
        }
        return null;
    };

    /**
     * Creates a TimeSeries message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof TimeSeries
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {TimeSeries} TimeSeries
     */
    TimeSeries.fromObject = function fromObject(object) {
        if (object instanceof $root.TimeSeries)
            return object;
        let message = new $root.TimeSeries();
        if (object.values) {
            if (!Array.isArray(object.values))
                throw TypeError(".TimeSeries.values: array expected");
            message.values = [];
            for (let i = 0; i < object.values.length; ++i)
                message.values[i] = Number(object.values[i]);
        }
        return message;
    };

    /**
     * Creates a plain object from a TimeSeries message. Also converts values to other types if specified.
     * @function toObject
     * @memberof TimeSeries
     * @static
     * @param {TimeSeries} message TimeSeries
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    TimeSeries.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.values = [];
        if (message.values && message.values.length) {
            object.values = [];
            for (let j = 0; j < message.values.length; ++j)
                object.values[j] = options.json && !isFinite(message.values[j]) ? String(message.values[j]) : message.values[j];
        }
        return object;
    };

    /**
     * Converts this TimeSeries to JSON.
     * @function toJSON
     * @memberof TimeSeries
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    TimeSeries.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for TimeSeries
     * @function getTypeUrl
     * @memberof TimeSeries
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    TimeSeries.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/TimeSeries";
    };

    return TimeSeries;
})();

export const TemperatureHistogram = $root.TemperatureHistogram = (() => {

    /**
     * Properties of a TemperatureHistogram.
     * @exports ITemperatureHistogram
     * @interface ITemperatureHistogram
     * @property {Array.<number>|null} [counts] TemperatureHistogram counts
     */

    /**
     * Constructs a new TemperatureHistogram.
     * @exports TemperatureHistogram
     * @classdesc Represents a TemperatureHistogram.
     * @implements ITemperatureHistogram
     * @constructor
     * @param {ITemperatureHistogram=} [properties] Properties to set
     */
    function TemperatureHistogram(properties) {
        this.counts = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * TemperatureHistogram counts.
     * @member {Array.<number>} counts
     * @memberof TemperatureHistogram
     * @instance
     */
    TemperatureHistogram.prototype.counts = $util.emptyArray;

    /**
     * Creates a new TemperatureHistogram instance using the specified properties.
     * @function create
     * @memberof TemperatureHistogram
     * @static
     * @param {ITemperatureHistogram=} [properties] Properties to set
     * @returns {TemperatureHistogram} TemperatureHistogram instance
     */
    TemperatureHistogram.create = function create(properties) {
        return new TemperatureHistogram(properties);
    };

    /**
     * Encodes the specified TemperatureHistogram message. Does not implicitly {@link TemperatureHistogram.verify|verify} messages.
     * @function encode
     * @memberof TemperatureHistogram
     * @static
     * @param {ITemperatureHistogram} message TemperatureHistogram message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    TemperatureHistogram.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.counts != null && message.counts.length) {
            writer.uint32(/* id 4, wireType 2 =*/34).fork();
            for (let i = 0; i < message.counts.length; ++i)
                writer.int32(message.counts[i]);
            writer.ldelim();
        }
        return writer;
    };

    /**
     * Encodes the specified TemperatureHistogram message, length delimited. Does not implicitly {@link TemperatureHistogram.verify|verify} messages.
     * @function encodeDelimited
     * @memberof TemperatureHistogram
     * @static
     * @param {ITemperatureHistogram} message TemperatureHistogram message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    TemperatureHistogram.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a TemperatureHistogram message from the specified reader or buffer.
     * @function decode
     * @memberof TemperatureHistogram
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {TemperatureHistogram} TemperatureHistogram
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    TemperatureHistogram.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.TemperatureHistogram();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 4: {
                    if (!(message.counts && message.counts.length))
                        message.counts = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.counts.push(reader.int32());
                    } else
                        message.counts.push(reader.int32());
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a TemperatureHistogram message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof TemperatureHistogram
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {TemperatureHistogram} TemperatureHistogram
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    TemperatureHistogram.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a TemperatureHistogram message.
     * @function verify
     * @memberof TemperatureHistogram
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    TemperatureHistogram.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.counts != null && message.hasOwnProperty("counts")) {
            if (!Array.isArray(message.counts))
                return "counts: array expected";
            for (let i = 0; i < message.counts.length; ++i)
                if (!$util.isInteger(message.counts[i]))
                    return "counts: integer[] expected";
        }
        return null;
    };

    /**
     * Creates a TemperatureHistogram message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof TemperatureHistogram
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {TemperatureHistogram} TemperatureHistogram
     */
    TemperatureHistogram.fromObject = function fromObject(object) {
        if (object instanceof $root.TemperatureHistogram)
            return object;
        let message = new $root.TemperatureHistogram();
        if (object.counts) {
            if (!Array.isArray(object.counts))
                throw TypeError(".TemperatureHistogram.counts: array expected");
            message.counts = [];
            for (let i = 0; i < object.counts.length; ++i)
                message.counts[i] = object.counts[i] | 0;
        }
        return message;
    };

    /**
     * Creates a plain object from a TemperatureHistogram message. Also converts values to other types if specified.
     * @function toObject
     * @memberof TemperatureHistogram
     * @static
     * @param {TemperatureHistogram} message TemperatureHistogram
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    TemperatureHistogram.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.counts = [];
        if (message.counts && message.counts.length) {
            object.counts = [];
            for (let j = 0; j < message.counts.length; ++j)
                object.counts[j] = message.counts[j];
        }
        return object;
    };

    /**
     * Converts this TemperatureHistogram to JSON.
     * @function toJSON
     * @memberof TemperatureHistogram
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    TemperatureHistogram.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for TemperatureHistogram
     * @function getTypeUrl
     * @memberof TemperatureHistogram
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    TemperatureHistogram.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/TemperatureHistogram";
    };

    return TemperatureHistogram;
})();

export const ExtraStatistic = $root.ExtraStatistic = (() => {

    /**
     * Properties of an ExtraStatistic.
     * @exports IExtraStatistic
     * @interface IExtraStatistic
     * @property {IHistogram|null} [histogram] ExtraStatistic histogram
     * @property {ITimeSeries|null} [timeseries] ExtraStatistic timeseries
     * @property {ITemperatureHistogram|null} [temperatureHistogram] ExtraStatistic temperatureHistogram
     */

    /**
     * Constructs a new ExtraStatistic.
     * @exports ExtraStatistic
     * @classdesc Represents an ExtraStatistic.
     * @implements IExtraStatistic
     * @constructor
     * @param {IExtraStatistic=} [properties] Properties to set
     */
    function ExtraStatistic(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * ExtraStatistic histogram.
     * @member {IHistogram|null|undefined} histogram
     * @memberof ExtraStatistic
     * @instance
     */
    ExtraStatistic.prototype.histogram = null;

    /**
     * ExtraStatistic timeseries.
     * @member {ITimeSeries|null|undefined} timeseries
     * @memberof ExtraStatistic
     * @instance
     */
    ExtraStatistic.prototype.timeseries = null;

    /**
     * ExtraStatistic temperatureHistogram.
     * @member {ITemperatureHistogram|null|undefined} temperatureHistogram
     * @memberof ExtraStatistic
     * @instance
     */
    ExtraStatistic.prototype.temperatureHistogram = null;

    // OneOf field names bound to virtual getters and setters
    let $oneOfFields;

    /**
     * ExtraStatistic _histogram.
     * @member {"histogram"|undefined} _histogram
     * @memberof ExtraStatistic
     * @instance
     */
    Object.defineProperty(ExtraStatistic.prototype, "_histogram", {
        get: $util.oneOfGetter($oneOfFields = ["histogram"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * ExtraStatistic _timeseries.
     * @member {"timeseries"|undefined} _timeseries
     * @memberof ExtraStatistic
     * @instance
     */
    Object.defineProperty(ExtraStatistic.prototype, "_timeseries", {
        get: $util.oneOfGetter($oneOfFields = ["timeseries"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * ExtraStatistic _temperatureHistogram.
     * @member {"temperatureHistogram"|undefined} _temperatureHistogram
     * @memberof ExtraStatistic
     * @instance
     */
    Object.defineProperty(ExtraStatistic.prototype, "_temperatureHistogram", {
        get: $util.oneOfGetter($oneOfFields = ["temperatureHistogram"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Creates a new ExtraStatistic instance using the specified properties.
     * @function create
     * @memberof ExtraStatistic
     * @static
     * @param {IExtraStatistic=} [properties] Properties to set
     * @returns {ExtraStatistic} ExtraStatistic instance
     */
    ExtraStatistic.create = function create(properties) {
        return new ExtraStatistic(properties);
    };

    /**
     * Encodes the specified ExtraStatistic message. Does not implicitly {@link ExtraStatistic.verify|verify} messages.
     * @function encode
     * @memberof ExtraStatistic
     * @static
     * @param {IExtraStatistic} message ExtraStatistic message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ExtraStatistic.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.histogram != null && Object.hasOwnProperty.call(message, "histogram"))
            $root.Histogram.encode(message.histogram, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
        if (message.timeseries != null && Object.hasOwnProperty.call(message, "timeseries"))
            $root.TimeSeries.encode(message.timeseries, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        if (message.temperatureHistogram != null && Object.hasOwnProperty.call(message, "temperatureHistogram"))
            $root.TemperatureHistogram.encode(message.temperatureHistogram, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified ExtraStatistic message, length delimited. Does not implicitly {@link ExtraStatistic.verify|verify} messages.
     * @function encodeDelimited
     * @memberof ExtraStatistic
     * @static
     * @param {IExtraStatistic} message ExtraStatistic message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ExtraStatistic.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an ExtraStatistic message from the specified reader or buffer.
     * @function decode
     * @memberof ExtraStatistic
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {ExtraStatistic} ExtraStatistic
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ExtraStatistic.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.ExtraStatistic();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.histogram = $root.Histogram.decode(reader, reader.uint32());
                    break;
                }
            case 2: {
                    message.timeseries = $root.TimeSeries.decode(reader, reader.uint32());
                    break;
                }
            case 3: {
                    message.temperatureHistogram = $root.TemperatureHistogram.decode(reader, reader.uint32());
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes an ExtraStatistic message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof ExtraStatistic
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {ExtraStatistic} ExtraStatistic
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ExtraStatistic.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an ExtraStatistic message.
     * @function verify
     * @memberof ExtraStatistic
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    ExtraStatistic.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        let properties = {};
        if (message.histogram != null && message.hasOwnProperty("histogram")) {
            properties._histogram = 1;
            {
                let error = $root.Histogram.verify(message.histogram);
                if (error)
                    return "histogram." + error;
            }
        }
        if (message.timeseries != null && message.hasOwnProperty("timeseries")) {
            properties._timeseries = 1;
            {
                let error = $root.TimeSeries.verify(message.timeseries);
                if (error)
                    return "timeseries." + error;
            }
        }
        if (message.temperatureHistogram != null && message.hasOwnProperty("temperatureHistogram")) {
            properties._temperatureHistogram = 1;
            {
                let error = $root.TemperatureHistogram.verify(message.temperatureHistogram);
                if (error)
                    return "temperatureHistogram." + error;
            }
        }
        return null;
    };

    /**
     * Creates an ExtraStatistic message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ExtraStatistic
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {ExtraStatistic} ExtraStatistic
     */
    ExtraStatistic.fromObject = function fromObject(object) {
        if (object instanceof $root.ExtraStatistic)
            return object;
        let message = new $root.ExtraStatistic();
        if (object.histogram != null) {
            if (typeof object.histogram !== "object")
                throw TypeError(".ExtraStatistic.histogram: object expected");
            message.histogram = $root.Histogram.fromObject(object.histogram);
        }
        if (object.timeseries != null) {
            if (typeof object.timeseries !== "object")
                throw TypeError(".ExtraStatistic.timeseries: object expected");
            message.timeseries = $root.TimeSeries.fromObject(object.timeseries);
        }
        if (object.temperatureHistogram != null) {
            if (typeof object.temperatureHistogram !== "object")
                throw TypeError(".ExtraStatistic.temperatureHistogram: object expected");
            message.temperatureHistogram = $root.TemperatureHistogram.fromObject(object.temperatureHistogram);
        }
        return message;
    };

    /**
     * Creates a plain object from an ExtraStatistic message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ExtraStatistic
     * @static
     * @param {ExtraStatistic} message ExtraStatistic
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ExtraStatistic.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (message.histogram != null && message.hasOwnProperty("histogram")) {
            object.histogram = $root.Histogram.toObject(message.histogram, options);
            if (options.oneofs)
                object._histogram = "histogram";
        }
        if (message.timeseries != null && message.hasOwnProperty("timeseries")) {
            object.timeseries = $root.TimeSeries.toObject(message.timeseries, options);
            if (options.oneofs)
                object._timeseries = "timeseries";
        }
        if (message.temperatureHistogram != null && message.hasOwnProperty("temperatureHistogram")) {
            object.temperatureHistogram = $root.TemperatureHistogram.toObject(message.temperatureHistogram, options);
            if (options.oneofs)
                object._temperatureHistogram = "temperatureHistogram";
        }
        return object;
    };

    /**
     * Converts this ExtraStatistic to JSON.
     * @function toJSON
     * @memberof ExtraStatistic
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ExtraStatistic.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for ExtraStatistic
     * @function getTypeUrl
     * @memberof ExtraStatistic
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    ExtraStatistic.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/ExtraStatistic";
    };

    return ExtraStatistic;
})();

export const Metadata = $root.Metadata = (() => {

    /**
     * Properties of a Metadata.
     * @exports IMetadata
     * @interface IMetadata
     * @property {number|null} [metadataIndex] Metadata metadataIndex
     * @property {string|null} [stringValue] Metadata stringValue
     */

    /**
     * Constructs a new Metadata.
     * @exports Metadata
     * @classdesc Represents a Metadata.
     * @implements IMetadata
     * @constructor
     * @param {IMetadata=} [properties] Properties to set
     */
    function Metadata(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Metadata metadataIndex.
     * @member {number} metadataIndex
     * @memberof Metadata
     * @instance
     */
    Metadata.prototype.metadataIndex = 0;

    /**
     * Metadata stringValue.
     * @member {string|null|undefined} stringValue
     * @memberof Metadata
     * @instance
     */
    Metadata.prototype.stringValue = null;

    // OneOf field names bound to virtual getters and setters
    let $oneOfFields;

    /**
     * Metadata _stringValue.
     * @member {"stringValue"|undefined} _stringValue
     * @memberof Metadata
     * @instance
     */
    Object.defineProperty(Metadata.prototype, "_stringValue", {
        get: $util.oneOfGetter($oneOfFields = ["stringValue"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Creates a new Metadata instance using the specified properties.
     * @function create
     * @memberof Metadata
     * @static
     * @param {IMetadata=} [properties] Properties to set
     * @returns {Metadata} Metadata instance
     */
    Metadata.create = function create(properties) {
        return new Metadata(properties);
    };

    /**
     * Encodes the specified Metadata message. Does not implicitly {@link Metadata.verify|verify} messages.
     * @function encode
     * @memberof Metadata
     * @static
     * @param {IMetadata} message Metadata message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Metadata.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.metadataIndex != null && Object.hasOwnProperty.call(message, "metadataIndex"))
            writer.uint32(/* id 1, wireType 0 =*/8).int32(message.metadataIndex);
        if (message.stringValue != null && Object.hasOwnProperty.call(message, "stringValue"))
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.stringValue);
        return writer;
    };

    /**
     * Encodes the specified Metadata message, length delimited. Does not implicitly {@link Metadata.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Metadata
     * @static
     * @param {IMetadata} message Metadata message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Metadata.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Metadata message from the specified reader or buffer.
     * @function decode
     * @memberof Metadata
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Metadata} Metadata
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Metadata.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Metadata();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.metadataIndex = reader.int32();
                    break;
                }
            case 2: {
                    message.stringValue = reader.string();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Metadata message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Metadata
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Metadata} Metadata
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Metadata.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Metadata message.
     * @function verify
     * @memberof Metadata
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Metadata.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        let properties = {};
        if (message.metadataIndex != null && message.hasOwnProperty("metadataIndex"))
            if (!$util.isInteger(message.metadataIndex))
                return "metadataIndex: integer expected";
        if (message.stringValue != null && message.hasOwnProperty("stringValue")) {
            properties._stringValue = 1;
            if (!$util.isString(message.stringValue))
                return "stringValue: string expected";
        }
        return null;
    };

    /**
     * Creates a Metadata message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Metadata
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Metadata} Metadata
     */
    Metadata.fromObject = function fromObject(object) {
        if (object instanceof $root.Metadata)
            return object;
        let message = new $root.Metadata();
        if (object.metadataIndex != null)
            message.metadataIndex = object.metadataIndex | 0;
        if (object.stringValue != null)
            message.stringValue = String(object.stringValue);
        return message;
    };

    /**
     * Creates a plain object from a Metadata message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Metadata
     * @static
     * @param {Metadata} message Metadata
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Metadata.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults)
            object.metadataIndex = 0;
        if (message.metadataIndex != null && message.hasOwnProperty("metadataIndex"))
            object.metadataIndex = message.metadataIndex;
        if (message.stringValue != null && message.hasOwnProperty("stringValue")) {
            object.stringValue = message.stringValue;
            if (options.oneofs)
                object._stringValue = "stringValue";
        }
        return object;
    };

    /**
     * Converts this Metadata to JSON.
     * @function toJSON
     * @memberof Metadata
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Metadata.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for Metadata
     * @function getTypeUrl
     * @memberof Metadata
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    Metadata.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/Metadata";
    };

    return Metadata;
})();

export const Article = $root.Article = (() => {

    /**
     * Properties of an Article.
     * @exports IArticle
     * @interface IArticle
     * @property {string|null} [shortname] Article shortname
     * @property {string|null} [longname] Article longname
     * @property {string|null} [source] Article source
     * @property {string|null} [articleType] Article articleType
     * @property {Uint8Array|null} [statisticIndicesPacked] Article statisticIndicesPacked
     * @property {Array.<IStatisticRow>|null} [rows] Article rows
     * @property {Array.<IFirstOrLast>|null} [overallFirstOrLast] Article overallFirstOrLast
     * @property {Array.<IRelatedButtons>|null} [related] Article related
     * @property {Array.<string>|null} [universes] Article universes
     * @property {Array.<IExtraStatistic>|null} [extraStats] Article extraStats
     * @property {Array.<IMetadata>|null} [metadata] Article metadata
     */

    /**
     * Constructs a new Article.
     * @exports Article
     * @classdesc Represents an Article.
     * @implements IArticle
     * @constructor
     * @param {IArticle=} [properties] Properties to set
     */
    function Article(properties) {
        this.rows = [];
        this.overallFirstOrLast = [];
        this.related = [];
        this.universes = [];
        this.extraStats = [];
        this.metadata = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Article shortname.
     * @member {string} shortname
     * @memberof Article
     * @instance
     */
    Article.prototype.shortname = "";

    /**
     * Article longname.
     * @member {string} longname
     * @memberof Article
     * @instance
     */
    Article.prototype.longname = "";

    /**
     * Article source.
     * @member {string} source
     * @memberof Article
     * @instance
     */
    Article.prototype.source = "";

    /**
     * Article articleType.
     * @member {string} articleType
     * @memberof Article
     * @instance
     */
    Article.prototype.articleType = "";

    /**
     * Article statisticIndicesPacked.
     * @member {Uint8Array} statisticIndicesPacked
     * @memberof Article
     * @instance
     */
    Article.prototype.statisticIndicesPacked = $util.newBuffer([]);

    /**
     * Article rows.
     * @member {Array.<IStatisticRow>} rows
     * @memberof Article
     * @instance
     */
    Article.prototype.rows = $util.emptyArray;

    /**
     * Article overallFirstOrLast.
     * @member {Array.<IFirstOrLast>} overallFirstOrLast
     * @memberof Article
     * @instance
     */
    Article.prototype.overallFirstOrLast = $util.emptyArray;

    /**
     * Article related.
     * @member {Array.<IRelatedButtons>} related
     * @memberof Article
     * @instance
     */
    Article.prototype.related = $util.emptyArray;

    /**
     * Article universes.
     * @member {Array.<string>} universes
     * @memberof Article
     * @instance
     */
    Article.prototype.universes = $util.emptyArray;

    /**
     * Article extraStats.
     * @member {Array.<IExtraStatistic>} extraStats
     * @memberof Article
     * @instance
     */
    Article.prototype.extraStats = $util.emptyArray;

    /**
     * Article metadata.
     * @member {Array.<IMetadata>} metadata
     * @memberof Article
     * @instance
     */
    Article.prototype.metadata = $util.emptyArray;

    /**
     * Creates a new Article instance using the specified properties.
     * @function create
     * @memberof Article
     * @static
     * @param {IArticle=} [properties] Properties to set
     * @returns {Article} Article instance
     */
    Article.create = function create(properties) {
        return new Article(properties);
    };

    /**
     * Encodes the specified Article message. Does not implicitly {@link Article.verify|verify} messages.
     * @function encode
     * @memberof Article
     * @static
     * @param {IArticle} message Article message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Article.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.shortname != null && Object.hasOwnProperty.call(message, "shortname"))
            writer.uint32(/* id 1, wireType 2 =*/10).string(message.shortname);
        if (message.longname != null && Object.hasOwnProperty.call(message, "longname"))
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.longname);
        if (message.source != null && Object.hasOwnProperty.call(message, "source"))
            writer.uint32(/* id 3, wireType 2 =*/26).string(message.source);
        if (message.articleType != null && Object.hasOwnProperty.call(message, "articleType"))
            writer.uint32(/* id 4, wireType 2 =*/34).string(message.articleType);
        if (message.rows != null && message.rows.length)
            for (let i = 0; i < message.rows.length; ++i)
                $root.StatisticRow.encode(message.rows[i], writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
        if (message.related != null && message.related.length)
            for (let i = 0; i < message.related.length; ++i)
                $root.RelatedButtons.encode(message.related[i], writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
        if (message.universes != null && message.universes.length)
            for (let i = 0; i < message.universes.length; ++i)
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.universes[i]);
        if (message.extraStats != null && message.extraStats.length)
            for (let i = 0; i < message.extraStats.length; ++i)
                $root.ExtraStatistic.encode(message.extraStats[i], writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
        if (message.statisticIndicesPacked != null && Object.hasOwnProperty.call(message, "statisticIndicesPacked"))
            writer.uint32(/* id 9, wireType 2 =*/74).bytes(message.statisticIndicesPacked);
        if (message.overallFirstOrLast != null && message.overallFirstOrLast.length)
            for (let i = 0; i < message.overallFirstOrLast.length; ++i)
                $root.FirstOrLast.encode(message.overallFirstOrLast[i], writer.uint32(/* id 10, wireType 2 =*/82).fork()).ldelim();
        if (message.metadata != null && message.metadata.length)
            for (let i = 0; i < message.metadata.length; ++i)
                $root.Metadata.encode(message.metadata[i], writer.uint32(/* id 11, wireType 2 =*/90).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified Article message, length delimited. Does not implicitly {@link Article.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Article
     * @static
     * @param {IArticle} message Article message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Article.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an Article message from the specified reader or buffer.
     * @function decode
     * @memberof Article
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Article} Article
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Article.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Article();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.shortname = reader.string();
                    break;
                }
            case 2: {
                    message.longname = reader.string();
                    break;
                }
            case 3: {
                    message.source = reader.string();
                    break;
                }
            case 4: {
                    message.articleType = reader.string();
                    break;
                }
            case 9: {
                    message.statisticIndicesPacked = reader.bytes();
                    break;
                }
            case 5: {
                    if (!(message.rows && message.rows.length))
                        message.rows = [];
                    message.rows.push($root.StatisticRow.decode(reader, reader.uint32()));
                    break;
                }
            case 10: {
                    if (!(message.overallFirstOrLast && message.overallFirstOrLast.length))
                        message.overallFirstOrLast = [];
                    message.overallFirstOrLast.push($root.FirstOrLast.decode(reader, reader.uint32()));
                    break;
                }
            case 6: {
                    if (!(message.related && message.related.length))
                        message.related = [];
                    message.related.push($root.RelatedButtons.decode(reader, reader.uint32()));
                    break;
                }
            case 7: {
                    if (!(message.universes && message.universes.length))
                        message.universes = [];
                    message.universes.push(reader.string());
                    break;
                }
            case 8: {
                    if (!(message.extraStats && message.extraStats.length))
                        message.extraStats = [];
                    message.extraStats.push($root.ExtraStatistic.decode(reader, reader.uint32()));
                    break;
                }
            case 11: {
                    if (!(message.metadata && message.metadata.length))
                        message.metadata = [];
                    message.metadata.push($root.Metadata.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes an Article message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Article
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Article} Article
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Article.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an Article message.
     * @function verify
     * @memberof Article
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Article.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.shortname != null && message.hasOwnProperty("shortname"))
            if (!$util.isString(message.shortname))
                return "shortname: string expected";
        if (message.longname != null && message.hasOwnProperty("longname"))
            if (!$util.isString(message.longname))
                return "longname: string expected";
        if (message.source != null && message.hasOwnProperty("source"))
            if (!$util.isString(message.source))
                return "source: string expected";
        if (message.articleType != null && message.hasOwnProperty("articleType"))
            if (!$util.isString(message.articleType))
                return "articleType: string expected";
        if (message.statisticIndicesPacked != null && message.hasOwnProperty("statisticIndicesPacked"))
            if (!(message.statisticIndicesPacked && typeof message.statisticIndicesPacked.length === "number" || $util.isString(message.statisticIndicesPacked)))
                return "statisticIndicesPacked: buffer expected";
        if (message.rows != null && message.hasOwnProperty("rows")) {
            if (!Array.isArray(message.rows))
                return "rows: array expected";
            for (let i = 0; i < message.rows.length; ++i) {
                let error = $root.StatisticRow.verify(message.rows[i]);
                if (error)
                    return "rows." + error;
            }
        }
        if (message.overallFirstOrLast != null && message.hasOwnProperty("overallFirstOrLast")) {
            if (!Array.isArray(message.overallFirstOrLast))
                return "overallFirstOrLast: array expected";
            for (let i = 0; i < message.overallFirstOrLast.length; ++i) {
                let error = $root.FirstOrLast.verify(message.overallFirstOrLast[i]);
                if (error)
                    return "overallFirstOrLast." + error;
            }
        }
        if (message.related != null && message.hasOwnProperty("related")) {
            if (!Array.isArray(message.related))
                return "related: array expected";
            for (let i = 0; i < message.related.length; ++i) {
                let error = $root.RelatedButtons.verify(message.related[i]);
                if (error)
                    return "related." + error;
            }
        }
        if (message.universes != null && message.hasOwnProperty("universes")) {
            if (!Array.isArray(message.universes))
                return "universes: array expected";
            for (let i = 0; i < message.universes.length; ++i)
                if (!$util.isString(message.universes[i]))
                    return "universes: string[] expected";
        }
        if (message.extraStats != null && message.hasOwnProperty("extraStats")) {
            if (!Array.isArray(message.extraStats))
                return "extraStats: array expected";
            for (let i = 0; i < message.extraStats.length; ++i) {
                let error = $root.ExtraStatistic.verify(message.extraStats[i]);
                if (error)
                    return "extraStats." + error;
            }
        }
        if (message.metadata != null && message.hasOwnProperty("metadata")) {
            if (!Array.isArray(message.metadata))
                return "metadata: array expected";
            for (let i = 0; i < message.metadata.length; ++i) {
                let error = $root.Metadata.verify(message.metadata[i]);
                if (error)
                    return "metadata." + error;
            }
        }
        return null;
    };

    /**
     * Creates an Article message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Article
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Article} Article
     */
    Article.fromObject = function fromObject(object) {
        if (object instanceof $root.Article)
            return object;
        let message = new $root.Article();
        if (object.shortname != null)
            message.shortname = String(object.shortname);
        if (object.longname != null)
            message.longname = String(object.longname);
        if (object.source != null)
            message.source = String(object.source);
        if (object.articleType != null)
            message.articleType = String(object.articleType);
        if (object.statisticIndicesPacked != null)
            if (typeof object.statisticIndicesPacked === "string")
                $util.base64.decode(object.statisticIndicesPacked, message.statisticIndicesPacked = $util.newBuffer($util.base64.length(object.statisticIndicesPacked)), 0);
            else if (object.statisticIndicesPacked.length >= 0)
                message.statisticIndicesPacked = object.statisticIndicesPacked;
        if (object.rows) {
            if (!Array.isArray(object.rows))
                throw TypeError(".Article.rows: array expected");
            message.rows = [];
            for (let i = 0; i < object.rows.length; ++i) {
                if (typeof object.rows[i] !== "object")
                    throw TypeError(".Article.rows: object expected");
                message.rows[i] = $root.StatisticRow.fromObject(object.rows[i]);
            }
        }
        if (object.overallFirstOrLast) {
            if (!Array.isArray(object.overallFirstOrLast))
                throw TypeError(".Article.overallFirstOrLast: array expected");
            message.overallFirstOrLast = [];
            for (let i = 0; i < object.overallFirstOrLast.length; ++i) {
                if (typeof object.overallFirstOrLast[i] !== "object")
                    throw TypeError(".Article.overallFirstOrLast: object expected");
                message.overallFirstOrLast[i] = $root.FirstOrLast.fromObject(object.overallFirstOrLast[i]);
            }
        }
        if (object.related) {
            if (!Array.isArray(object.related))
                throw TypeError(".Article.related: array expected");
            message.related = [];
            for (let i = 0; i < object.related.length; ++i) {
                if (typeof object.related[i] !== "object")
                    throw TypeError(".Article.related: object expected");
                message.related[i] = $root.RelatedButtons.fromObject(object.related[i]);
            }
        }
        if (object.universes) {
            if (!Array.isArray(object.universes))
                throw TypeError(".Article.universes: array expected");
            message.universes = [];
            for (let i = 0; i < object.universes.length; ++i)
                message.universes[i] = String(object.universes[i]);
        }
        if (object.extraStats) {
            if (!Array.isArray(object.extraStats))
                throw TypeError(".Article.extraStats: array expected");
            message.extraStats = [];
            for (let i = 0; i < object.extraStats.length; ++i) {
                if (typeof object.extraStats[i] !== "object")
                    throw TypeError(".Article.extraStats: object expected");
                message.extraStats[i] = $root.ExtraStatistic.fromObject(object.extraStats[i]);
            }
        }
        if (object.metadata) {
            if (!Array.isArray(object.metadata))
                throw TypeError(".Article.metadata: array expected");
            message.metadata = [];
            for (let i = 0; i < object.metadata.length; ++i) {
                if (typeof object.metadata[i] !== "object")
                    throw TypeError(".Article.metadata: object expected");
                message.metadata[i] = $root.Metadata.fromObject(object.metadata[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from an Article message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Article
     * @static
     * @param {Article} message Article
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Article.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.rows = [];
            object.related = [];
            object.universes = [];
            object.extraStats = [];
            object.overallFirstOrLast = [];
            object.metadata = [];
        }
        if (options.defaults) {
            object.shortname = "";
            object.longname = "";
            object.source = "";
            object.articleType = "";
            if (options.bytes === String)
                object.statisticIndicesPacked = "";
            else {
                object.statisticIndicesPacked = [];
                if (options.bytes !== Array)
                    object.statisticIndicesPacked = $util.newBuffer(object.statisticIndicesPacked);
            }
        }
        if (message.shortname != null && message.hasOwnProperty("shortname"))
            object.shortname = message.shortname;
        if (message.longname != null && message.hasOwnProperty("longname"))
            object.longname = message.longname;
        if (message.source != null && message.hasOwnProperty("source"))
            object.source = message.source;
        if (message.articleType != null && message.hasOwnProperty("articleType"))
            object.articleType = message.articleType;
        if (message.rows && message.rows.length) {
            object.rows = [];
            for (let j = 0; j < message.rows.length; ++j)
                object.rows[j] = $root.StatisticRow.toObject(message.rows[j], options);
        }
        if (message.related && message.related.length) {
            object.related = [];
            for (let j = 0; j < message.related.length; ++j)
                object.related[j] = $root.RelatedButtons.toObject(message.related[j], options);
        }
        if (message.universes && message.universes.length) {
            object.universes = [];
            for (let j = 0; j < message.universes.length; ++j)
                object.universes[j] = message.universes[j];
        }
        if (message.extraStats && message.extraStats.length) {
            object.extraStats = [];
            for (let j = 0; j < message.extraStats.length; ++j)
                object.extraStats[j] = $root.ExtraStatistic.toObject(message.extraStats[j], options);
        }
        if (message.statisticIndicesPacked != null && message.hasOwnProperty("statisticIndicesPacked"))
            object.statisticIndicesPacked = options.bytes === String ? $util.base64.encode(message.statisticIndicesPacked, 0, message.statisticIndicesPacked.length) : options.bytes === Array ? Array.prototype.slice.call(message.statisticIndicesPacked) : message.statisticIndicesPacked;
        if (message.overallFirstOrLast && message.overallFirstOrLast.length) {
            object.overallFirstOrLast = [];
            for (let j = 0; j < message.overallFirstOrLast.length; ++j)
                object.overallFirstOrLast[j] = $root.FirstOrLast.toObject(message.overallFirstOrLast[j], options);
        }
        if (message.metadata && message.metadata.length) {
            object.metadata = [];
            for (let j = 0; j < message.metadata.length; ++j)
                object.metadata[j] = $root.Metadata.toObject(message.metadata[j], options);
        }
        return object;
    };

    /**
     * Converts this Article to JSON.
     * @function toJSON
     * @memberof Article
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Article.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for Article
     * @function getTypeUrl
     * @memberof Article
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    Article.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/Article";
    };

    return Article;
})();

export const ConsolidatedArticles = $root.ConsolidatedArticles = (() => {

    /**
     * Properties of a ConsolidatedArticles.
     * @exports IConsolidatedArticles
     * @interface IConsolidatedArticles
     * @property {Array.<string>|null} [longnames] ConsolidatedArticles longnames
     * @property {Array.<IArticle>|null} [articles] ConsolidatedArticles articles
     * @property {Array.<string>|null} [symlinkLinkNames] ConsolidatedArticles symlinkLinkNames
     * @property {Array.<string>|null} [symlinkTargetNames] ConsolidatedArticles symlinkTargetNames
     */

    /**
     * Constructs a new ConsolidatedArticles.
     * @exports ConsolidatedArticles
     * @classdesc Represents a ConsolidatedArticles.
     * @implements IConsolidatedArticles
     * @constructor
     * @param {IConsolidatedArticles=} [properties] Properties to set
     */
    function ConsolidatedArticles(properties) {
        this.longnames = [];
        this.articles = [];
        this.symlinkLinkNames = [];
        this.symlinkTargetNames = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * ConsolidatedArticles longnames.
     * @member {Array.<string>} longnames
     * @memberof ConsolidatedArticles
     * @instance
     */
    ConsolidatedArticles.prototype.longnames = $util.emptyArray;

    /**
     * ConsolidatedArticles articles.
     * @member {Array.<IArticle>} articles
     * @memberof ConsolidatedArticles
     * @instance
     */
    ConsolidatedArticles.prototype.articles = $util.emptyArray;

    /**
     * ConsolidatedArticles symlinkLinkNames.
     * @member {Array.<string>} symlinkLinkNames
     * @memberof ConsolidatedArticles
     * @instance
     */
    ConsolidatedArticles.prototype.symlinkLinkNames = $util.emptyArray;

    /**
     * ConsolidatedArticles symlinkTargetNames.
     * @member {Array.<string>} symlinkTargetNames
     * @memberof ConsolidatedArticles
     * @instance
     */
    ConsolidatedArticles.prototype.symlinkTargetNames = $util.emptyArray;

    /**
     * Creates a new ConsolidatedArticles instance using the specified properties.
     * @function create
     * @memberof ConsolidatedArticles
     * @static
     * @param {IConsolidatedArticles=} [properties] Properties to set
     * @returns {ConsolidatedArticles} ConsolidatedArticles instance
     */
    ConsolidatedArticles.create = function create(properties) {
        return new ConsolidatedArticles(properties);
    };

    /**
     * Encodes the specified ConsolidatedArticles message. Does not implicitly {@link ConsolidatedArticles.verify|verify} messages.
     * @function encode
     * @memberof ConsolidatedArticles
     * @static
     * @param {IConsolidatedArticles} message ConsolidatedArticles message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ConsolidatedArticles.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.longnames != null && message.longnames.length)
            for (let i = 0; i < message.longnames.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.longnames[i]);
        if (message.articles != null && message.articles.length)
            for (let i = 0; i < message.articles.length; ++i)
                $root.Article.encode(message.articles[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        if (message.symlinkLinkNames != null && message.symlinkLinkNames.length)
            for (let i = 0; i < message.symlinkLinkNames.length; ++i)
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.symlinkLinkNames[i]);
        if (message.symlinkTargetNames != null && message.symlinkTargetNames.length)
            for (let i = 0; i < message.symlinkTargetNames.length; ++i)
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.symlinkTargetNames[i]);
        return writer;
    };

    /**
     * Encodes the specified ConsolidatedArticles message, length delimited. Does not implicitly {@link ConsolidatedArticles.verify|verify} messages.
     * @function encodeDelimited
     * @memberof ConsolidatedArticles
     * @static
     * @param {IConsolidatedArticles} message ConsolidatedArticles message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ConsolidatedArticles.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a ConsolidatedArticles message from the specified reader or buffer.
     * @function decode
     * @memberof ConsolidatedArticles
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {ConsolidatedArticles} ConsolidatedArticles
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ConsolidatedArticles.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.ConsolidatedArticles();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.longnames && message.longnames.length))
                        message.longnames = [];
                    message.longnames.push(reader.string());
                    break;
                }
            case 2: {
                    if (!(message.articles && message.articles.length))
                        message.articles = [];
                    message.articles.push($root.Article.decode(reader, reader.uint32()));
                    break;
                }
            case 3: {
                    if (!(message.symlinkLinkNames && message.symlinkLinkNames.length))
                        message.symlinkLinkNames = [];
                    message.symlinkLinkNames.push(reader.string());
                    break;
                }
            case 4: {
                    if (!(message.symlinkTargetNames && message.symlinkTargetNames.length))
                        message.symlinkTargetNames = [];
                    message.symlinkTargetNames.push(reader.string());
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a ConsolidatedArticles message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof ConsolidatedArticles
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {ConsolidatedArticles} ConsolidatedArticles
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ConsolidatedArticles.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a ConsolidatedArticles message.
     * @function verify
     * @memberof ConsolidatedArticles
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    ConsolidatedArticles.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.longnames != null && message.hasOwnProperty("longnames")) {
            if (!Array.isArray(message.longnames))
                return "longnames: array expected";
            for (let i = 0; i < message.longnames.length; ++i)
                if (!$util.isString(message.longnames[i]))
                    return "longnames: string[] expected";
        }
        if (message.articles != null && message.hasOwnProperty("articles")) {
            if (!Array.isArray(message.articles))
                return "articles: array expected";
            for (let i = 0; i < message.articles.length; ++i) {
                let error = $root.Article.verify(message.articles[i]);
                if (error)
                    return "articles." + error;
            }
        }
        if (message.symlinkLinkNames != null && message.hasOwnProperty("symlinkLinkNames")) {
            if (!Array.isArray(message.symlinkLinkNames))
                return "symlinkLinkNames: array expected";
            for (let i = 0; i < message.symlinkLinkNames.length; ++i)
                if (!$util.isString(message.symlinkLinkNames[i]))
                    return "symlinkLinkNames: string[] expected";
        }
        if (message.symlinkTargetNames != null && message.hasOwnProperty("symlinkTargetNames")) {
            if (!Array.isArray(message.symlinkTargetNames))
                return "symlinkTargetNames: array expected";
            for (let i = 0; i < message.symlinkTargetNames.length; ++i)
                if (!$util.isString(message.symlinkTargetNames[i]))
                    return "symlinkTargetNames: string[] expected";
        }
        return null;
    };

    /**
     * Creates a ConsolidatedArticles message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ConsolidatedArticles
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {ConsolidatedArticles} ConsolidatedArticles
     */
    ConsolidatedArticles.fromObject = function fromObject(object) {
        if (object instanceof $root.ConsolidatedArticles)
            return object;
        let message = new $root.ConsolidatedArticles();
        if (object.longnames) {
            if (!Array.isArray(object.longnames))
                throw TypeError(".ConsolidatedArticles.longnames: array expected");
            message.longnames = [];
            for (let i = 0; i < object.longnames.length; ++i)
                message.longnames[i] = String(object.longnames[i]);
        }
        if (object.articles) {
            if (!Array.isArray(object.articles))
                throw TypeError(".ConsolidatedArticles.articles: array expected");
            message.articles = [];
            for (let i = 0; i < object.articles.length; ++i) {
                if (typeof object.articles[i] !== "object")
                    throw TypeError(".ConsolidatedArticles.articles: object expected");
                message.articles[i] = $root.Article.fromObject(object.articles[i]);
            }
        }
        if (object.symlinkLinkNames) {
            if (!Array.isArray(object.symlinkLinkNames))
                throw TypeError(".ConsolidatedArticles.symlinkLinkNames: array expected");
            message.symlinkLinkNames = [];
            for (let i = 0; i < object.symlinkLinkNames.length; ++i)
                message.symlinkLinkNames[i] = String(object.symlinkLinkNames[i]);
        }
        if (object.symlinkTargetNames) {
            if (!Array.isArray(object.symlinkTargetNames))
                throw TypeError(".ConsolidatedArticles.symlinkTargetNames: array expected");
            message.symlinkTargetNames = [];
            for (let i = 0; i < object.symlinkTargetNames.length; ++i)
                message.symlinkTargetNames[i] = String(object.symlinkTargetNames[i]);
        }
        return message;
    };

    /**
     * Creates a plain object from a ConsolidatedArticles message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ConsolidatedArticles
     * @static
     * @param {ConsolidatedArticles} message ConsolidatedArticles
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ConsolidatedArticles.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.longnames = [];
            object.articles = [];
            object.symlinkLinkNames = [];
            object.symlinkTargetNames = [];
        }
        if (message.longnames && message.longnames.length) {
            object.longnames = [];
            for (let j = 0; j < message.longnames.length; ++j)
                object.longnames[j] = message.longnames[j];
        }
        if (message.articles && message.articles.length) {
            object.articles = [];
            for (let j = 0; j < message.articles.length; ++j)
                object.articles[j] = $root.Article.toObject(message.articles[j], options);
        }
        if (message.symlinkLinkNames && message.symlinkLinkNames.length) {
            object.symlinkLinkNames = [];
            for (let j = 0; j < message.symlinkLinkNames.length; ++j)
                object.symlinkLinkNames[j] = message.symlinkLinkNames[j];
        }
        if (message.symlinkTargetNames && message.symlinkTargetNames.length) {
            object.symlinkTargetNames = [];
            for (let j = 0; j < message.symlinkTargetNames.length; ++j)
                object.symlinkTargetNames[j] = message.symlinkTargetNames[j];
        }
        return object;
    };

    /**
     * Converts this ConsolidatedArticles to JSON.
     * @function toJSON
     * @memberof ConsolidatedArticles
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ConsolidatedArticles.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for ConsolidatedArticles
     * @function getTypeUrl
     * @memberof ConsolidatedArticles
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    ConsolidatedArticles.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/ConsolidatedArticles";
    };

    return ConsolidatedArticles;
})();

export const Coordinate = $root.Coordinate = (() => {

    /**
     * Properties of a Coordinate.
     * @exports ICoordinate
     * @interface ICoordinate
     * @property {number|null} [lon] Coordinate lon
     * @property {number|null} [lat] Coordinate lat
     */

    /**
     * Constructs a new Coordinate.
     * @exports Coordinate
     * @classdesc Represents a Coordinate.
     * @implements ICoordinate
     * @constructor
     * @param {ICoordinate=} [properties] Properties to set
     */
    function Coordinate(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Coordinate lon.
     * @member {number} lon
     * @memberof Coordinate
     * @instance
     */
    Coordinate.prototype.lon = 0;

    /**
     * Coordinate lat.
     * @member {number} lat
     * @memberof Coordinate
     * @instance
     */
    Coordinate.prototype.lat = 0;

    /**
     * Creates a new Coordinate instance using the specified properties.
     * @function create
     * @memberof Coordinate
     * @static
     * @param {ICoordinate=} [properties] Properties to set
     * @returns {Coordinate} Coordinate instance
     */
    Coordinate.create = function create(properties) {
        return new Coordinate(properties);
    };

    /**
     * Encodes the specified Coordinate message. Does not implicitly {@link Coordinate.verify|verify} messages.
     * @function encode
     * @memberof Coordinate
     * @static
     * @param {ICoordinate} message Coordinate message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Coordinate.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.lon != null && Object.hasOwnProperty.call(message, "lon"))
            writer.uint32(/* id 1, wireType 5 =*/13).float(message.lon);
        if (message.lat != null && Object.hasOwnProperty.call(message, "lat"))
            writer.uint32(/* id 2, wireType 5 =*/21).float(message.lat);
        return writer;
    };

    /**
     * Encodes the specified Coordinate message, length delimited. Does not implicitly {@link Coordinate.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Coordinate
     * @static
     * @param {ICoordinate} message Coordinate message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Coordinate.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Coordinate message from the specified reader or buffer.
     * @function decode
     * @memberof Coordinate
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Coordinate} Coordinate
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Coordinate.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Coordinate();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.lon = reader.float();
                    break;
                }
            case 2: {
                    message.lat = reader.float();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Coordinate message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Coordinate
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Coordinate} Coordinate
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Coordinate.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Coordinate message.
     * @function verify
     * @memberof Coordinate
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Coordinate.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.lon != null && message.hasOwnProperty("lon"))
            if (typeof message.lon !== "number")
                return "lon: number expected";
        if (message.lat != null && message.hasOwnProperty("lat"))
            if (typeof message.lat !== "number")
                return "lat: number expected";
        return null;
    };

    /**
     * Creates a Coordinate message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Coordinate
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Coordinate} Coordinate
     */
    Coordinate.fromObject = function fromObject(object) {
        if (object instanceof $root.Coordinate)
            return object;
        let message = new $root.Coordinate();
        if (object.lon != null)
            message.lon = Number(object.lon);
        if (object.lat != null)
            message.lat = Number(object.lat);
        return message;
    };

    /**
     * Creates a plain object from a Coordinate message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Coordinate
     * @static
     * @param {Coordinate} message Coordinate
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Coordinate.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults) {
            object.lon = 0;
            object.lat = 0;
        }
        if (message.lon != null && message.hasOwnProperty("lon"))
            object.lon = options.json && !isFinite(message.lon) ? String(message.lon) : message.lon;
        if (message.lat != null && message.hasOwnProperty("lat"))
            object.lat = options.json && !isFinite(message.lat) ? String(message.lat) : message.lat;
        return object;
    };

    /**
     * Converts this Coordinate to JSON.
     * @function toJSON
     * @memberof Coordinate
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Coordinate.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for Coordinate
     * @function getTypeUrl
     * @memberof Coordinate
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    Coordinate.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/Coordinate";
    };

    return Coordinate;
})();

export const Ring = $root.Ring = (() => {

    /**
     * Properties of a Ring.
     * @exports IRing
     * @interface IRing
     * @property {Array.<ICoordinate>|null} [coords] Ring coords
     */

    /**
     * Constructs a new Ring.
     * @exports Ring
     * @classdesc Represents a Ring.
     * @implements IRing
     * @constructor
     * @param {IRing=} [properties] Properties to set
     */
    function Ring(properties) {
        this.coords = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Ring coords.
     * @member {Array.<ICoordinate>} coords
     * @memberof Ring
     * @instance
     */
    Ring.prototype.coords = $util.emptyArray;

    /**
     * Creates a new Ring instance using the specified properties.
     * @function create
     * @memberof Ring
     * @static
     * @param {IRing=} [properties] Properties to set
     * @returns {Ring} Ring instance
     */
    Ring.create = function create(properties) {
        return new Ring(properties);
    };

    /**
     * Encodes the specified Ring message. Does not implicitly {@link Ring.verify|verify} messages.
     * @function encode
     * @memberof Ring
     * @static
     * @param {IRing} message Ring message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Ring.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.coords != null && message.coords.length)
            for (let i = 0; i < message.coords.length; ++i)
                $root.Coordinate.encode(message.coords[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified Ring message, length delimited. Does not implicitly {@link Ring.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Ring
     * @static
     * @param {IRing} message Ring message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Ring.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Ring message from the specified reader or buffer.
     * @function decode
     * @memberof Ring
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Ring} Ring
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Ring.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Ring();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.coords && message.coords.length))
                        message.coords = [];
                    message.coords.push($root.Coordinate.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Ring message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Ring
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Ring} Ring
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Ring.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Ring message.
     * @function verify
     * @memberof Ring
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Ring.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.coords != null && message.hasOwnProperty("coords")) {
            if (!Array.isArray(message.coords))
                return "coords: array expected";
            for (let i = 0; i < message.coords.length; ++i) {
                let error = $root.Coordinate.verify(message.coords[i]);
                if (error)
                    return "coords." + error;
            }
        }
        return null;
    };

    /**
     * Creates a Ring message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Ring
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Ring} Ring
     */
    Ring.fromObject = function fromObject(object) {
        if (object instanceof $root.Ring)
            return object;
        let message = new $root.Ring();
        if (object.coords) {
            if (!Array.isArray(object.coords))
                throw TypeError(".Ring.coords: array expected");
            message.coords = [];
            for (let i = 0; i < object.coords.length; ++i) {
                if (typeof object.coords[i] !== "object")
                    throw TypeError(".Ring.coords: object expected");
                message.coords[i] = $root.Coordinate.fromObject(object.coords[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a Ring message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Ring
     * @static
     * @param {Ring} message Ring
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Ring.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.coords = [];
        if (message.coords && message.coords.length) {
            object.coords = [];
            for (let j = 0; j < message.coords.length; ++j)
                object.coords[j] = $root.Coordinate.toObject(message.coords[j], options);
        }
        return object;
    };

    /**
     * Converts this Ring to JSON.
     * @function toJSON
     * @memberof Ring
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Ring.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for Ring
     * @function getTypeUrl
     * @memberof Ring
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    Ring.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/Ring";
    };

    return Ring;
})();

export const Polygon = $root.Polygon = (() => {

    /**
     * Properties of a Polygon.
     * @exports IPolygon
     * @interface IPolygon
     * @property {Array.<IRing>|null} [rings] Polygon rings
     */

    /**
     * Constructs a new Polygon.
     * @exports Polygon
     * @classdesc Represents a Polygon.
     * @implements IPolygon
     * @constructor
     * @param {IPolygon=} [properties] Properties to set
     */
    function Polygon(properties) {
        this.rings = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Polygon rings.
     * @member {Array.<IRing>} rings
     * @memberof Polygon
     * @instance
     */
    Polygon.prototype.rings = $util.emptyArray;

    /**
     * Creates a new Polygon instance using the specified properties.
     * @function create
     * @memberof Polygon
     * @static
     * @param {IPolygon=} [properties] Properties to set
     * @returns {Polygon} Polygon instance
     */
    Polygon.create = function create(properties) {
        return new Polygon(properties);
    };

    /**
     * Encodes the specified Polygon message. Does not implicitly {@link Polygon.verify|verify} messages.
     * @function encode
     * @memberof Polygon
     * @static
     * @param {IPolygon} message Polygon message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Polygon.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.rings != null && message.rings.length)
            for (let i = 0; i < message.rings.length; ++i)
                $root.Ring.encode(message.rings[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified Polygon message, length delimited. Does not implicitly {@link Polygon.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Polygon
     * @static
     * @param {IPolygon} message Polygon message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Polygon.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Polygon message from the specified reader or buffer.
     * @function decode
     * @memberof Polygon
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Polygon} Polygon
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Polygon.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Polygon();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.rings && message.rings.length))
                        message.rings = [];
                    message.rings.push($root.Ring.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Polygon message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Polygon
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Polygon} Polygon
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Polygon.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Polygon message.
     * @function verify
     * @memberof Polygon
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Polygon.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.rings != null && message.hasOwnProperty("rings")) {
            if (!Array.isArray(message.rings))
                return "rings: array expected";
            for (let i = 0; i < message.rings.length; ++i) {
                let error = $root.Ring.verify(message.rings[i]);
                if (error)
                    return "rings." + error;
            }
        }
        return null;
    };

    /**
     * Creates a Polygon message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Polygon
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Polygon} Polygon
     */
    Polygon.fromObject = function fromObject(object) {
        if (object instanceof $root.Polygon)
            return object;
        let message = new $root.Polygon();
        if (object.rings) {
            if (!Array.isArray(object.rings))
                throw TypeError(".Polygon.rings: array expected");
            message.rings = [];
            for (let i = 0; i < object.rings.length; ++i) {
                if (typeof object.rings[i] !== "object")
                    throw TypeError(".Polygon.rings: object expected");
                message.rings[i] = $root.Ring.fromObject(object.rings[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a Polygon message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Polygon
     * @static
     * @param {Polygon} message Polygon
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Polygon.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.rings = [];
        if (message.rings && message.rings.length) {
            object.rings = [];
            for (let j = 0; j < message.rings.length; ++j)
                object.rings[j] = $root.Ring.toObject(message.rings[j], options);
        }
        return object;
    };

    /**
     * Converts this Polygon to JSON.
     * @function toJSON
     * @memberof Polygon
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Polygon.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for Polygon
     * @function getTypeUrl
     * @memberof Polygon
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    Polygon.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/Polygon";
    };

    return Polygon;
})();

export const MultiPolygon = $root.MultiPolygon = (() => {

    /**
     * Properties of a MultiPolygon.
     * @exports IMultiPolygon
     * @interface IMultiPolygon
     * @property {Array.<IPolygon>|null} [polygons] MultiPolygon polygons
     */

    /**
     * Constructs a new MultiPolygon.
     * @exports MultiPolygon
     * @classdesc Represents a MultiPolygon.
     * @implements IMultiPolygon
     * @constructor
     * @param {IMultiPolygon=} [properties] Properties to set
     */
    function MultiPolygon(properties) {
        this.polygons = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * MultiPolygon polygons.
     * @member {Array.<IPolygon>} polygons
     * @memberof MultiPolygon
     * @instance
     */
    MultiPolygon.prototype.polygons = $util.emptyArray;

    /**
     * Creates a new MultiPolygon instance using the specified properties.
     * @function create
     * @memberof MultiPolygon
     * @static
     * @param {IMultiPolygon=} [properties] Properties to set
     * @returns {MultiPolygon} MultiPolygon instance
     */
    MultiPolygon.create = function create(properties) {
        return new MultiPolygon(properties);
    };

    /**
     * Encodes the specified MultiPolygon message. Does not implicitly {@link MultiPolygon.verify|verify} messages.
     * @function encode
     * @memberof MultiPolygon
     * @static
     * @param {IMultiPolygon} message MultiPolygon message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    MultiPolygon.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.polygons != null && message.polygons.length)
            for (let i = 0; i < message.polygons.length; ++i)
                $root.Polygon.encode(message.polygons[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified MultiPolygon message, length delimited. Does not implicitly {@link MultiPolygon.verify|verify} messages.
     * @function encodeDelimited
     * @memberof MultiPolygon
     * @static
     * @param {IMultiPolygon} message MultiPolygon message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    MultiPolygon.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a MultiPolygon message from the specified reader or buffer.
     * @function decode
     * @memberof MultiPolygon
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {MultiPolygon} MultiPolygon
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    MultiPolygon.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.MultiPolygon();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.polygons && message.polygons.length))
                        message.polygons = [];
                    message.polygons.push($root.Polygon.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a MultiPolygon message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof MultiPolygon
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {MultiPolygon} MultiPolygon
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    MultiPolygon.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a MultiPolygon message.
     * @function verify
     * @memberof MultiPolygon
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    MultiPolygon.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.polygons != null && message.hasOwnProperty("polygons")) {
            if (!Array.isArray(message.polygons))
                return "polygons: array expected";
            for (let i = 0; i < message.polygons.length; ++i) {
                let error = $root.Polygon.verify(message.polygons[i]);
                if (error)
                    return "polygons." + error;
            }
        }
        return null;
    };

    /**
     * Creates a MultiPolygon message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof MultiPolygon
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {MultiPolygon} MultiPolygon
     */
    MultiPolygon.fromObject = function fromObject(object) {
        if (object instanceof $root.MultiPolygon)
            return object;
        let message = new $root.MultiPolygon();
        if (object.polygons) {
            if (!Array.isArray(object.polygons))
                throw TypeError(".MultiPolygon.polygons: array expected");
            message.polygons = [];
            for (let i = 0; i < object.polygons.length; ++i) {
                if (typeof object.polygons[i] !== "object")
                    throw TypeError(".MultiPolygon.polygons: object expected");
                message.polygons[i] = $root.Polygon.fromObject(object.polygons[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a MultiPolygon message. Also converts values to other types if specified.
     * @function toObject
     * @memberof MultiPolygon
     * @static
     * @param {MultiPolygon} message MultiPolygon
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    MultiPolygon.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.polygons = [];
        if (message.polygons && message.polygons.length) {
            object.polygons = [];
            for (let j = 0; j < message.polygons.length; ++j)
                object.polygons[j] = $root.Polygon.toObject(message.polygons[j], options);
        }
        return object;
    };

    /**
     * Converts this MultiPolygon to JSON.
     * @function toJSON
     * @memberof MultiPolygon
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    MultiPolygon.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for MultiPolygon
     * @function getTypeUrl
     * @memberof MultiPolygon
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    MultiPolygon.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/MultiPolygon";
    };

    return MultiPolygon;
})();

export const Feature = $root.Feature = (() => {

    /**
     * Properties of a Feature.
     * @exports IFeature
     * @interface IFeature
     * @property {IPolygon|null} [polygon] Feature polygon
     * @property {IMultiPolygon|null} [multipolygon] Feature multipolygon
     * @property {Array.<number>|null} [zones] Feature zones
     * @property {number|null} [centerLon] Feature centerLon
     */

    /**
     * Constructs a new Feature.
     * @exports Feature
     * @classdesc Represents a Feature.
     * @implements IFeature
     * @constructor
     * @param {IFeature=} [properties] Properties to set
     */
    function Feature(properties) {
        this.zones = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Feature polygon.
     * @member {IPolygon|null|undefined} polygon
     * @memberof Feature
     * @instance
     */
    Feature.prototype.polygon = null;

    /**
     * Feature multipolygon.
     * @member {IMultiPolygon|null|undefined} multipolygon
     * @memberof Feature
     * @instance
     */
    Feature.prototype.multipolygon = null;

    /**
     * Feature zones.
     * @member {Array.<number>} zones
     * @memberof Feature
     * @instance
     */
    Feature.prototype.zones = $util.emptyArray;

    /**
     * Feature centerLon.
     * @member {number} centerLon
     * @memberof Feature
     * @instance
     */
    Feature.prototype.centerLon = 0;

    // OneOf field names bound to virtual getters and setters
    let $oneOfFields;

    /**
     * Feature geometry.
     * @member {"polygon"|"multipolygon"|undefined} geometry
     * @memberof Feature
     * @instance
     */
    Object.defineProperty(Feature.prototype, "geometry", {
        get: $util.oneOfGetter($oneOfFields = ["polygon", "multipolygon"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Creates a new Feature instance using the specified properties.
     * @function create
     * @memberof Feature
     * @static
     * @param {IFeature=} [properties] Properties to set
     * @returns {Feature} Feature instance
     */
    Feature.create = function create(properties) {
        return new Feature(properties);
    };

    /**
     * Encodes the specified Feature message. Does not implicitly {@link Feature.verify|verify} messages.
     * @function encode
     * @memberof Feature
     * @static
     * @param {IFeature} message Feature message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Feature.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.polygon != null && Object.hasOwnProperty.call(message, "polygon"))
            $root.Polygon.encode(message.polygon, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
        if (message.multipolygon != null && Object.hasOwnProperty.call(message, "multipolygon"))
            $root.MultiPolygon.encode(message.multipolygon, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        if (message.zones != null && message.zones.length) {
            writer.uint32(/* id 3, wireType 2 =*/26).fork();
            for (let i = 0; i < message.zones.length; ++i)
                writer.int32(message.zones[i]);
            writer.ldelim();
        }
        if (message.centerLon != null && Object.hasOwnProperty.call(message, "centerLon"))
            writer.uint32(/* id 4, wireType 5 =*/37).float(message.centerLon);
        return writer;
    };

    /**
     * Encodes the specified Feature message, length delimited. Does not implicitly {@link Feature.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Feature
     * @static
     * @param {IFeature} message Feature message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Feature.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Feature message from the specified reader or buffer.
     * @function decode
     * @memberof Feature
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Feature} Feature
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Feature.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Feature();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.polygon = $root.Polygon.decode(reader, reader.uint32());
                    break;
                }
            case 2: {
                    message.multipolygon = $root.MultiPolygon.decode(reader, reader.uint32());
                    break;
                }
            case 3: {
                    if (!(message.zones && message.zones.length))
                        message.zones = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.zones.push(reader.int32());
                    } else
                        message.zones.push(reader.int32());
                    break;
                }
            case 4: {
                    message.centerLon = reader.float();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Feature message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Feature
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Feature} Feature
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Feature.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Feature message.
     * @function verify
     * @memberof Feature
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Feature.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        let properties = {};
        if (message.polygon != null && message.hasOwnProperty("polygon")) {
            properties.geometry = 1;
            {
                let error = $root.Polygon.verify(message.polygon);
                if (error)
                    return "polygon." + error;
            }
        }
        if (message.multipolygon != null && message.hasOwnProperty("multipolygon")) {
            if (properties.geometry === 1)
                return "geometry: multiple values";
            properties.geometry = 1;
            {
                let error = $root.MultiPolygon.verify(message.multipolygon);
                if (error)
                    return "multipolygon." + error;
            }
        }
        if (message.zones != null && message.hasOwnProperty("zones")) {
            if (!Array.isArray(message.zones))
                return "zones: array expected";
            for (let i = 0; i < message.zones.length; ++i)
                if (!$util.isInteger(message.zones[i]))
                    return "zones: integer[] expected";
        }
        if (message.centerLon != null && message.hasOwnProperty("centerLon"))
            if (typeof message.centerLon !== "number")
                return "centerLon: number expected";
        return null;
    };

    /**
     * Creates a Feature message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Feature
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Feature} Feature
     */
    Feature.fromObject = function fromObject(object) {
        if (object instanceof $root.Feature)
            return object;
        let message = new $root.Feature();
        if (object.polygon != null) {
            if (typeof object.polygon !== "object")
                throw TypeError(".Feature.polygon: object expected");
            message.polygon = $root.Polygon.fromObject(object.polygon);
        }
        if (object.multipolygon != null) {
            if (typeof object.multipolygon !== "object")
                throw TypeError(".Feature.multipolygon: object expected");
            message.multipolygon = $root.MultiPolygon.fromObject(object.multipolygon);
        }
        if (object.zones) {
            if (!Array.isArray(object.zones))
                throw TypeError(".Feature.zones: array expected");
            message.zones = [];
            for (let i = 0; i < object.zones.length; ++i)
                message.zones[i] = object.zones[i] | 0;
        }
        if (object.centerLon != null)
            message.centerLon = Number(object.centerLon);
        return message;
    };

    /**
     * Creates a plain object from a Feature message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Feature
     * @static
     * @param {Feature} message Feature
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Feature.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.zones = [];
        if (options.defaults)
            object.centerLon = 0;
        if (message.polygon != null && message.hasOwnProperty("polygon")) {
            object.polygon = $root.Polygon.toObject(message.polygon, options);
            if (options.oneofs)
                object.geometry = "polygon";
        }
        if (message.multipolygon != null && message.hasOwnProperty("multipolygon")) {
            object.multipolygon = $root.MultiPolygon.toObject(message.multipolygon, options);
            if (options.oneofs)
                object.geometry = "multipolygon";
        }
        if (message.zones && message.zones.length) {
            object.zones = [];
            for (let j = 0; j < message.zones.length; ++j)
                object.zones[j] = message.zones[j];
        }
        if (message.centerLon != null && message.hasOwnProperty("centerLon"))
            object.centerLon = options.json && !isFinite(message.centerLon) ? String(message.centerLon) : message.centerLon;
        return object;
    };

    /**
     * Converts this Feature to JSON.
     * @function toJSON
     * @memberof Feature
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Feature.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for Feature
     * @function getTypeUrl
     * @memberof Feature
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    Feature.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/Feature";
    };

    return Feature;
})();

export const PointSeries = $root.PointSeries = (() => {

    /**
     * Properties of a PointSeries.
     * @exports IPointSeries
     * @interface IPointSeries
     * @property {Array.<ICoordinate>|null} [coords] PointSeries coords
     */

    /**
     * Constructs a new PointSeries.
     * @exports PointSeries
     * @classdesc Represents a PointSeries.
     * @implements IPointSeries
     * @constructor
     * @param {IPointSeries=} [properties] Properties to set
     */
    function PointSeries(properties) {
        this.coords = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * PointSeries coords.
     * @member {Array.<ICoordinate>} coords
     * @memberof PointSeries
     * @instance
     */
    PointSeries.prototype.coords = $util.emptyArray;

    /**
     * Creates a new PointSeries instance using the specified properties.
     * @function create
     * @memberof PointSeries
     * @static
     * @param {IPointSeries=} [properties] Properties to set
     * @returns {PointSeries} PointSeries instance
     */
    PointSeries.create = function create(properties) {
        return new PointSeries(properties);
    };

    /**
     * Encodes the specified PointSeries message. Does not implicitly {@link PointSeries.verify|verify} messages.
     * @function encode
     * @memberof PointSeries
     * @static
     * @param {IPointSeries} message PointSeries message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    PointSeries.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.coords != null && message.coords.length)
            for (let i = 0; i < message.coords.length; ++i)
                $root.Coordinate.encode(message.coords[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified PointSeries message, length delimited. Does not implicitly {@link PointSeries.verify|verify} messages.
     * @function encodeDelimited
     * @memberof PointSeries
     * @static
     * @param {IPointSeries} message PointSeries message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    PointSeries.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a PointSeries message from the specified reader or buffer.
     * @function decode
     * @memberof PointSeries
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {PointSeries} PointSeries
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    PointSeries.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.PointSeries();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.coords && message.coords.length))
                        message.coords = [];
                    message.coords.push($root.Coordinate.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a PointSeries message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof PointSeries
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {PointSeries} PointSeries
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    PointSeries.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a PointSeries message.
     * @function verify
     * @memberof PointSeries
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    PointSeries.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.coords != null && message.hasOwnProperty("coords")) {
            if (!Array.isArray(message.coords))
                return "coords: array expected";
            for (let i = 0; i < message.coords.length; ++i) {
                let error = $root.Coordinate.verify(message.coords[i]);
                if (error)
                    return "coords." + error;
            }
        }
        return null;
    };

    /**
     * Creates a PointSeries message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof PointSeries
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {PointSeries} PointSeries
     */
    PointSeries.fromObject = function fromObject(object) {
        if (object instanceof $root.PointSeries)
            return object;
        let message = new $root.PointSeries();
        if (object.coords) {
            if (!Array.isArray(object.coords))
                throw TypeError(".PointSeries.coords: array expected");
            message.coords = [];
            for (let i = 0; i < object.coords.length; ++i) {
                if (typeof object.coords[i] !== "object")
                    throw TypeError(".PointSeries.coords: object expected");
                message.coords[i] = $root.Coordinate.fromObject(object.coords[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a PointSeries message. Also converts values to other types if specified.
     * @function toObject
     * @memberof PointSeries
     * @static
     * @param {PointSeries} message PointSeries
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    PointSeries.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.coords = [];
        if (message.coords && message.coords.length) {
            object.coords = [];
            for (let j = 0; j < message.coords.length; ++j)
                object.coords[j] = $root.Coordinate.toObject(message.coords[j], options);
        }
        return object;
    };

    /**
     * Converts this PointSeries to JSON.
     * @function toJSON
     * @memberof PointSeries
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    PointSeries.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for PointSeries
     * @function getTypeUrl
     * @memberof PointSeries
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    PointSeries.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/PointSeries";
    };

    return PointSeries;
})();

export const ArticleOrderingList = $root.ArticleOrderingList = (() => {

    /**
     * Properties of an ArticleOrderingList.
     * @exports IArticleOrderingList
     * @interface IArticleOrderingList
     * @property {Array.<string>|null} [longnames] ArticleOrderingList longnames
     * @property {Array.<number>|null} [types] ArticleOrderingList types
     */

    /**
     * Constructs a new ArticleOrderingList.
     * @exports ArticleOrderingList
     * @classdesc Represents an ArticleOrderingList.
     * @implements IArticleOrderingList
     * @constructor
     * @param {IArticleOrderingList=} [properties] Properties to set
     */
    function ArticleOrderingList(properties) {
        this.longnames = [];
        this.types = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * ArticleOrderingList longnames.
     * @member {Array.<string>} longnames
     * @memberof ArticleOrderingList
     * @instance
     */
    ArticleOrderingList.prototype.longnames = $util.emptyArray;

    /**
     * ArticleOrderingList types.
     * @member {Array.<number>} types
     * @memberof ArticleOrderingList
     * @instance
     */
    ArticleOrderingList.prototype.types = $util.emptyArray;

    /**
     * Creates a new ArticleOrderingList instance using the specified properties.
     * @function create
     * @memberof ArticleOrderingList
     * @static
     * @param {IArticleOrderingList=} [properties] Properties to set
     * @returns {ArticleOrderingList} ArticleOrderingList instance
     */
    ArticleOrderingList.create = function create(properties) {
        return new ArticleOrderingList(properties);
    };

    /**
     * Encodes the specified ArticleOrderingList message. Does not implicitly {@link ArticleOrderingList.verify|verify} messages.
     * @function encode
     * @memberof ArticleOrderingList
     * @static
     * @param {IArticleOrderingList} message ArticleOrderingList message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ArticleOrderingList.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.longnames != null && message.longnames.length)
            for (let i = 0; i < message.longnames.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.longnames[i]);
        if (message.types != null && message.types.length) {
            writer.uint32(/* id 2, wireType 2 =*/18).fork();
            for (let i = 0; i < message.types.length; ++i)
                writer.int32(message.types[i]);
            writer.ldelim();
        }
        return writer;
    };

    /**
     * Encodes the specified ArticleOrderingList message, length delimited. Does not implicitly {@link ArticleOrderingList.verify|verify} messages.
     * @function encodeDelimited
     * @memberof ArticleOrderingList
     * @static
     * @param {IArticleOrderingList} message ArticleOrderingList message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ArticleOrderingList.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an ArticleOrderingList message from the specified reader or buffer.
     * @function decode
     * @memberof ArticleOrderingList
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {ArticleOrderingList} ArticleOrderingList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ArticleOrderingList.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.ArticleOrderingList();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.longnames && message.longnames.length))
                        message.longnames = [];
                    message.longnames.push(reader.string());
                    break;
                }
            case 2: {
                    if (!(message.types && message.types.length))
                        message.types = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.types.push(reader.int32());
                    } else
                        message.types.push(reader.int32());
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes an ArticleOrderingList message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof ArticleOrderingList
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {ArticleOrderingList} ArticleOrderingList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ArticleOrderingList.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an ArticleOrderingList message.
     * @function verify
     * @memberof ArticleOrderingList
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    ArticleOrderingList.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.longnames != null && message.hasOwnProperty("longnames")) {
            if (!Array.isArray(message.longnames))
                return "longnames: array expected";
            for (let i = 0; i < message.longnames.length; ++i)
                if (!$util.isString(message.longnames[i]))
                    return "longnames: string[] expected";
        }
        if (message.types != null && message.hasOwnProperty("types")) {
            if (!Array.isArray(message.types))
                return "types: array expected";
            for (let i = 0; i < message.types.length; ++i)
                if (!$util.isInteger(message.types[i]))
                    return "types: integer[] expected";
        }
        return null;
    };

    /**
     * Creates an ArticleOrderingList message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ArticleOrderingList
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {ArticleOrderingList} ArticleOrderingList
     */
    ArticleOrderingList.fromObject = function fromObject(object) {
        if (object instanceof $root.ArticleOrderingList)
            return object;
        let message = new $root.ArticleOrderingList();
        if (object.longnames) {
            if (!Array.isArray(object.longnames))
                throw TypeError(".ArticleOrderingList.longnames: array expected");
            message.longnames = [];
            for (let i = 0; i < object.longnames.length; ++i)
                message.longnames[i] = String(object.longnames[i]);
        }
        if (object.types) {
            if (!Array.isArray(object.types))
                throw TypeError(".ArticleOrderingList.types: array expected");
            message.types = [];
            for (let i = 0; i < object.types.length; ++i)
                message.types[i] = object.types[i] | 0;
        }
        return message;
    };

    /**
     * Creates a plain object from an ArticleOrderingList message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ArticleOrderingList
     * @static
     * @param {ArticleOrderingList} message ArticleOrderingList
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ArticleOrderingList.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.longnames = [];
            object.types = [];
        }
        if (message.longnames && message.longnames.length) {
            object.longnames = [];
            for (let j = 0; j < message.longnames.length; ++j)
                object.longnames[j] = message.longnames[j];
        }
        if (message.types && message.types.length) {
            object.types = [];
            for (let j = 0; j < message.types.length; ++j)
                object.types[j] = message.types[j];
        }
        return object;
    };

    /**
     * Converts this ArticleOrderingList to JSON.
     * @function toJSON
     * @memberof ArticleOrderingList
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ArticleOrderingList.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for ArticleOrderingList
     * @function getTypeUrl
     * @memberof ArticleOrderingList
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    ArticleOrderingList.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/ArticleOrderingList";
    };

    return ArticleOrderingList;
})();

export const ArticleUniverseList = $root.ArticleUniverseList = (() => {

    /**
     * Properties of an ArticleUniverseList.
     * @exports IArticleUniverseList
     * @interface IArticleUniverseList
     * @property {Array.<IUniverses>|null} [universes] ArticleUniverseList universes
     */

    /**
     * Constructs a new ArticleUniverseList.
     * @exports ArticleUniverseList
     * @classdesc Represents an ArticleUniverseList.
     * @implements IArticleUniverseList
     * @constructor
     * @param {IArticleUniverseList=} [properties] Properties to set
     */
    function ArticleUniverseList(properties) {
        this.universes = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * ArticleUniverseList universes.
     * @member {Array.<IUniverses>} universes
     * @memberof ArticleUniverseList
     * @instance
     */
    ArticleUniverseList.prototype.universes = $util.emptyArray;

    /**
     * Creates a new ArticleUniverseList instance using the specified properties.
     * @function create
     * @memberof ArticleUniverseList
     * @static
     * @param {IArticleUniverseList=} [properties] Properties to set
     * @returns {ArticleUniverseList} ArticleUniverseList instance
     */
    ArticleUniverseList.create = function create(properties) {
        return new ArticleUniverseList(properties);
    };

    /**
     * Encodes the specified ArticleUniverseList message. Does not implicitly {@link ArticleUniverseList.verify|verify} messages.
     * @function encode
     * @memberof ArticleUniverseList
     * @static
     * @param {IArticleUniverseList} message ArticleUniverseList message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ArticleUniverseList.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.universes != null && message.universes.length)
            for (let i = 0; i < message.universes.length; ++i)
                $root.Universes.encode(message.universes[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified ArticleUniverseList message, length delimited. Does not implicitly {@link ArticleUniverseList.verify|verify} messages.
     * @function encodeDelimited
     * @memberof ArticleUniverseList
     * @static
     * @param {IArticleUniverseList} message ArticleUniverseList message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ArticleUniverseList.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an ArticleUniverseList message from the specified reader or buffer.
     * @function decode
     * @memberof ArticleUniverseList
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {ArticleUniverseList} ArticleUniverseList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ArticleUniverseList.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.ArticleUniverseList();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 3: {
                    if (!(message.universes && message.universes.length))
                        message.universes = [];
                    message.universes.push($root.Universes.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes an ArticleUniverseList message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof ArticleUniverseList
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {ArticleUniverseList} ArticleUniverseList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ArticleUniverseList.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an ArticleUniverseList message.
     * @function verify
     * @memberof ArticleUniverseList
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    ArticleUniverseList.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.universes != null && message.hasOwnProperty("universes")) {
            if (!Array.isArray(message.universes))
                return "universes: array expected";
            for (let i = 0; i < message.universes.length; ++i) {
                let error = $root.Universes.verify(message.universes[i]);
                if (error)
                    return "universes." + error;
            }
        }
        return null;
    };

    /**
     * Creates an ArticleUniverseList message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ArticleUniverseList
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {ArticleUniverseList} ArticleUniverseList
     */
    ArticleUniverseList.fromObject = function fromObject(object) {
        if (object instanceof $root.ArticleUniverseList)
            return object;
        let message = new $root.ArticleUniverseList();
        if (object.universes) {
            if (!Array.isArray(object.universes))
                throw TypeError(".ArticleUniverseList.universes: array expected");
            message.universes = [];
            for (let i = 0; i < object.universes.length; ++i) {
                if (typeof object.universes[i] !== "object")
                    throw TypeError(".ArticleUniverseList.universes: object expected");
                message.universes[i] = $root.Universes.fromObject(object.universes[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from an ArticleUniverseList message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ArticleUniverseList
     * @static
     * @param {ArticleUniverseList} message ArticleUniverseList
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ArticleUniverseList.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.universes = [];
        if (message.universes && message.universes.length) {
            object.universes = [];
            for (let j = 0; j < message.universes.length; ++j)
                object.universes[j] = $root.Universes.toObject(message.universes[j], options);
        }
        return object;
    };

    /**
     * Converts this ArticleUniverseList to JSON.
     * @function toJSON
     * @memberof ArticleUniverseList
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ArticleUniverseList.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for ArticleUniverseList
     * @function getTypeUrl
     * @memberof ArticleUniverseList
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    ArticleUniverseList.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/ArticleUniverseList";
    };

    return ArticleUniverseList;
})();

export const SearchIndexMetadata = $root.SearchIndexMetadata = (() => {

    /**
     * Properties of a SearchIndexMetadata.
     * @exports ISearchIndexMetadata
     * @interface ISearchIndexMetadata
     * @property {number|null} [type] SearchIndexMetadata type
     * @property {number|null} [isUsa] SearchIndexMetadata isUsa
     * @property {number|null} [isSymlink] SearchIndexMetadata isSymlink
     */

    /**
     * Constructs a new SearchIndexMetadata.
     * @exports SearchIndexMetadata
     * @classdesc Represents a SearchIndexMetadata.
     * @implements ISearchIndexMetadata
     * @constructor
     * @param {ISearchIndexMetadata=} [properties] Properties to set
     */
    function SearchIndexMetadata(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * SearchIndexMetadata type.
     * @member {number} type
     * @memberof SearchIndexMetadata
     * @instance
     */
    SearchIndexMetadata.prototype.type = 0;

    /**
     * SearchIndexMetadata isUsa.
     * @member {number} isUsa
     * @memberof SearchIndexMetadata
     * @instance
     */
    SearchIndexMetadata.prototype.isUsa = 0;

    /**
     * SearchIndexMetadata isSymlink.
     * @member {number} isSymlink
     * @memberof SearchIndexMetadata
     * @instance
     */
    SearchIndexMetadata.prototype.isSymlink = 0;

    /**
     * Creates a new SearchIndexMetadata instance using the specified properties.
     * @function create
     * @memberof SearchIndexMetadata
     * @static
     * @param {ISearchIndexMetadata=} [properties] Properties to set
     * @returns {SearchIndexMetadata} SearchIndexMetadata instance
     */
    SearchIndexMetadata.create = function create(properties) {
        return new SearchIndexMetadata(properties);
    };

    /**
     * Encodes the specified SearchIndexMetadata message. Does not implicitly {@link SearchIndexMetadata.verify|verify} messages.
     * @function encode
     * @memberof SearchIndexMetadata
     * @static
     * @param {ISearchIndexMetadata} message SearchIndexMetadata message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SearchIndexMetadata.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.type != null && Object.hasOwnProperty.call(message, "type"))
            writer.uint32(/* id 1, wireType 0 =*/8).int32(message.type);
        if (message.isUsa != null && Object.hasOwnProperty.call(message, "isUsa"))
            writer.uint32(/* id 2, wireType 0 =*/16).int32(message.isUsa);
        if (message.isSymlink != null && Object.hasOwnProperty.call(message, "isSymlink"))
            writer.uint32(/* id 3, wireType 0 =*/24).int32(message.isSymlink);
        return writer;
    };

    /**
     * Encodes the specified SearchIndexMetadata message, length delimited. Does not implicitly {@link SearchIndexMetadata.verify|verify} messages.
     * @function encodeDelimited
     * @memberof SearchIndexMetadata
     * @static
     * @param {ISearchIndexMetadata} message SearchIndexMetadata message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SearchIndexMetadata.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a SearchIndexMetadata message from the specified reader or buffer.
     * @function decode
     * @memberof SearchIndexMetadata
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {SearchIndexMetadata} SearchIndexMetadata
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SearchIndexMetadata.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.SearchIndexMetadata();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.type = reader.int32();
                    break;
                }
            case 2: {
                    message.isUsa = reader.int32();
                    break;
                }
            case 3: {
                    message.isSymlink = reader.int32();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a SearchIndexMetadata message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof SearchIndexMetadata
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {SearchIndexMetadata} SearchIndexMetadata
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SearchIndexMetadata.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a SearchIndexMetadata message.
     * @function verify
     * @memberof SearchIndexMetadata
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    SearchIndexMetadata.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.type != null && message.hasOwnProperty("type"))
            if (!$util.isInteger(message.type))
                return "type: integer expected";
        if (message.isUsa != null && message.hasOwnProperty("isUsa"))
            if (!$util.isInteger(message.isUsa))
                return "isUsa: integer expected";
        if (message.isSymlink != null && message.hasOwnProperty("isSymlink"))
            if (!$util.isInteger(message.isSymlink))
                return "isSymlink: integer expected";
        return null;
    };

    /**
     * Creates a SearchIndexMetadata message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof SearchIndexMetadata
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {SearchIndexMetadata} SearchIndexMetadata
     */
    SearchIndexMetadata.fromObject = function fromObject(object) {
        if (object instanceof $root.SearchIndexMetadata)
            return object;
        let message = new $root.SearchIndexMetadata();
        if (object.type != null)
            message.type = object.type | 0;
        if (object.isUsa != null)
            message.isUsa = object.isUsa | 0;
        if (object.isSymlink != null)
            message.isSymlink = object.isSymlink | 0;
        return message;
    };

    /**
     * Creates a plain object from a SearchIndexMetadata message. Also converts values to other types if specified.
     * @function toObject
     * @memberof SearchIndexMetadata
     * @static
     * @param {SearchIndexMetadata} message SearchIndexMetadata
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    SearchIndexMetadata.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults) {
            object.type = 0;
            object.isUsa = 0;
            object.isSymlink = 0;
        }
        if (message.type != null && message.hasOwnProperty("type"))
            object.type = message.type;
        if (message.isUsa != null && message.hasOwnProperty("isUsa"))
            object.isUsa = message.isUsa;
        if (message.isSymlink != null && message.hasOwnProperty("isSymlink"))
            object.isSymlink = message.isSymlink;
        return object;
    };

    /**
     * Converts this SearchIndexMetadata to JSON.
     * @function toJSON
     * @memberof SearchIndexMetadata
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    SearchIndexMetadata.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for SearchIndexMetadata
     * @function getTypeUrl
     * @memberof SearchIndexMetadata
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    SearchIndexMetadata.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/SearchIndexMetadata";
    };

    return SearchIndexMetadata;
})();

export const SearchIndex = $root.SearchIndex = (() => {

    /**
     * Properties of a SearchIndex.
     * @exports ISearchIndex
     * @interface ISearchIndex
     * @property {Array.<string>|null} [elements] SearchIndex elements
     * @property {Array.<ISearchIndexMetadata>|null} [metadata] SearchIndex metadata
     */

    /**
     * Constructs a new SearchIndex.
     * @exports SearchIndex
     * @classdesc Represents a SearchIndex.
     * @implements ISearchIndex
     * @constructor
     * @param {ISearchIndex=} [properties] Properties to set
     */
    function SearchIndex(properties) {
        this.elements = [];
        this.metadata = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * SearchIndex elements.
     * @member {Array.<string>} elements
     * @memberof SearchIndex
     * @instance
     */
    SearchIndex.prototype.elements = $util.emptyArray;

    /**
     * SearchIndex metadata.
     * @member {Array.<ISearchIndexMetadata>} metadata
     * @memberof SearchIndex
     * @instance
     */
    SearchIndex.prototype.metadata = $util.emptyArray;

    /**
     * Creates a new SearchIndex instance using the specified properties.
     * @function create
     * @memberof SearchIndex
     * @static
     * @param {ISearchIndex=} [properties] Properties to set
     * @returns {SearchIndex} SearchIndex instance
     */
    SearchIndex.create = function create(properties) {
        return new SearchIndex(properties);
    };

    /**
     * Encodes the specified SearchIndex message. Does not implicitly {@link SearchIndex.verify|verify} messages.
     * @function encode
     * @memberof SearchIndex
     * @static
     * @param {ISearchIndex} message SearchIndex message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SearchIndex.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.elements != null && message.elements.length)
            for (let i = 0; i < message.elements.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.elements[i]);
        if (message.metadata != null && message.metadata.length)
            for (let i = 0; i < message.metadata.length; ++i)
                $root.SearchIndexMetadata.encode(message.metadata[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified SearchIndex message, length delimited. Does not implicitly {@link SearchIndex.verify|verify} messages.
     * @function encodeDelimited
     * @memberof SearchIndex
     * @static
     * @param {ISearchIndex} message SearchIndex message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    SearchIndex.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a SearchIndex message from the specified reader or buffer.
     * @function decode
     * @memberof SearchIndex
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {SearchIndex} SearchIndex
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SearchIndex.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.SearchIndex();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.elements && message.elements.length))
                        message.elements = [];
                    message.elements.push(reader.string());
                    break;
                }
            case 2: {
                    if (!(message.metadata && message.metadata.length))
                        message.metadata = [];
                    message.metadata.push($root.SearchIndexMetadata.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a SearchIndex message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof SearchIndex
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {SearchIndex} SearchIndex
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    SearchIndex.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a SearchIndex message.
     * @function verify
     * @memberof SearchIndex
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    SearchIndex.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.elements != null && message.hasOwnProperty("elements")) {
            if (!Array.isArray(message.elements))
                return "elements: array expected";
            for (let i = 0; i < message.elements.length; ++i)
                if (!$util.isString(message.elements[i]))
                    return "elements: string[] expected";
        }
        if (message.metadata != null && message.hasOwnProperty("metadata")) {
            if (!Array.isArray(message.metadata))
                return "metadata: array expected";
            for (let i = 0; i < message.metadata.length; ++i) {
                let error = $root.SearchIndexMetadata.verify(message.metadata[i]);
                if (error)
                    return "metadata." + error;
            }
        }
        return null;
    };

    /**
     * Creates a SearchIndex message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof SearchIndex
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {SearchIndex} SearchIndex
     */
    SearchIndex.fromObject = function fromObject(object) {
        if (object instanceof $root.SearchIndex)
            return object;
        let message = new $root.SearchIndex();
        if (object.elements) {
            if (!Array.isArray(object.elements))
                throw TypeError(".SearchIndex.elements: array expected");
            message.elements = [];
            for (let i = 0; i < object.elements.length; ++i)
                message.elements[i] = String(object.elements[i]);
        }
        if (object.metadata) {
            if (!Array.isArray(object.metadata))
                throw TypeError(".SearchIndex.metadata: array expected");
            message.metadata = [];
            for (let i = 0; i < object.metadata.length; ++i) {
                if (typeof object.metadata[i] !== "object")
                    throw TypeError(".SearchIndex.metadata: object expected");
                message.metadata[i] = $root.SearchIndexMetadata.fromObject(object.metadata[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a SearchIndex message. Also converts values to other types if specified.
     * @function toObject
     * @memberof SearchIndex
     * @static
     * @param {SearchIndex} message SearchIndex
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    SearchIndex.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.elements = [];
            object.metadata = [];
        }
        if (message.elements && message.elements.length) {
            object.elements = [];
            for (let j = 0; j < message.elements.length; ++j)
                object.elements[j] = message.elements[j];
        }
        if (message.metadata && message.metadata.length) {
            object.metadata = [];
            for (let j = 0; j < message.metadata.length; ++j)
                object.metadata[j] = $root.SearchIndexMetadata.toObject(message.metadata[j], options);
        }
        return object;
    };

    /**
     * Converts this SearchIndex to JSON.
     * @function toJSON
     * @memberof SearchIndex
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    SearchIndex.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for SearchIndex
     * @function getTypeUrl
     * @memberof SearchIndex
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    SearchIndex.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/SearchIndex";
    };

    return SearchIndex;
})();

export const OrderList = $root.OrderList = (() => {

    /**
     * Properties of an OrderList.
     * @exports IOrderList
     * @interface IOrderList
     * @property {Array.<number>|null} [orderIdxs] OrderList orderIdxs
     */

    /**
     * Constructs a new OrderList.
     * @exports OrderList
     * @classdesc Represents an OrderList.
     * @implements IOrderList
     * @constructor
     * @param {IOrderList=} [properties] Properties to set
     */
    function OrderList(properties) {
        this.orderIdxs = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * OrderList orderIdxs.
     * @member {Array.<number>} orderIdxs
     * @memberof OrderList
     * @instance
     */
    OrderList.prototype.orderIdxs = $util.emptyArray;

    /**
     * Creates a new OrderList instance using the specified properties.
     * @function create
     * @memberof OrderList
     * @static
     * @param {IOrderList=} [properties] Properties to set
     * @returns {OrderList} OrderList instance
     */
    OrderList.create = function create(properties) {
        return new OrderList(properties);
    };

    /**
     * Encodes the specified OrderList message. Does not implicitly {@link OrderList.verify|verify} messages.
     * @function encode
     * @memberof OrderList
     * @static
     * @param {IOrderList} message OrderList message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    OrderList.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.orderIdxs != null && message.orderIdxs.length) {
            writer.uint32(/* id 1, wireType 2 =*/10).fork();
            for (let i = 0; i < message.orderIdxs.length; ++i)
                writer.int32(message.orderIdxs[i]);
            writer.ldelim();
        }
        return writer;
    };

    /**
     * Encodes the specified OrderList message, length delimited. Does not implicitly {@link OrderList.verify|verify} messages.
     * @function encodeDelimited
     * @memberof OrderList
     * @static
     * @param {IOrderList} message OrderList message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    OrderList.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an OrderList message from the specified reader or buffer.
     * @function decode
     * @memberof OrderList
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {OrderList} OrderList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    OrderList.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.OrderList();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.orderIdxs && message.orderIdxs.length))
                        message.orderIdxs = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.orderIdxs.push(reader.int32());
                    } else
                        message.orderIdxs.push(reader.int32());
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes an OrderList message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof OrderList
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {OrderList} OrderList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    OrderList.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an OrderList message.
     * @function verify
     * @memberof OrderList
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    OrderList.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.orderIdxs != null && message.hasOwnProperty("orderIdxs")) {
            if (!Array.isArray(message.orderIdxs))
                return "orderIdxs: array expected";
            for (let i = 0; i < message.orderIdxs.length; ++i)
                if (!$util.isInteger(message.orderIdxs[i]))
                    return "orderIdxs: integer[] expected";
        }
        return null;
    };

    /**
     * Creates an OrderList message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof OrderList
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {OrderList} OrderList
     */
    OrderList.fromObject = function fromObject(object) {
        if (object instanceof $root.OrderList)
            return object;
        let message = new $root.OrderList();
        if (object.orderIdxs) {
            if (!Array.isArray(object.orderIdxs))
                throw TypeError(".OrderList.orderIdxs: array expected");
            message.orderIdxs = [];
            for (let i = 0; i < object.orderIdxs.length; ++i)
                message.orderIdxs[i] = object.orderIdxs[i] | 0;
        }
        return message;
    };

    /**
     * Creates a plain object from an OrderList message. Also converts values to other types if specified.
     * @function toObject
     * @memberof OrderList
     * @static
     * @param {OrderList} message OrderList
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    OrderList.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.orderIdxs = [];
        if (message.orderIdxs && message.orderIdxs.length) {
            object.orderIdxs = [];
            for (let j = 0; j < message.orderIdxs.length; ++j)
                object.orderIdxs[j] = message.orderIdxs[j];
        }
        return object;
    };

    /**
     * Converts this OrderList to JSON.
     * @function toJSON
     * @memberof OrderList
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    OrderList.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for OrderList
     * @function getTypeUrl
     * @memberof OrderList
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    OrderList.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/OrderList";
    };

    return OrderList;
})();

export const PopulationPercentileByUniverse = $root.PopulationPercentileByUniverse = (() => {

    /**
     * Properties of a PopulationPercentileByUniverse.
     * @exports IPopulationPercentileByUniverse
     * @interface IPopulationPercentileByUniverse
     * @property {Array.<number>|null} [populationPercentile] PopulationPercentileByUniverse populationPercentile
     */

    /**
     * Constructs a new PopulationPercentileByUniverse.
     * @exports PopulationPercentileByUniverse
     * @classdesc Represents a PopulationPercentileByUniverse.
     * @implements IPopulationPercentileByUniverse
     * @constructor
     * @param {IPopulationPercentileByUniverse=} [properties] Properties to set
     */
    function PopulationPercentileByUniverse(properties) {
        this.populationPercentile = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * PopulationPercentileByUniverse populationPercentile.
     * @member {Array.<number>} populationPercentile
     * @memberof PopulationPercentileByUniverse
     * @instance
     */
    PopulationPercentileByUniverse.prototype.populationPercentile = $util.emptyArray;

    /**
     * Creates a new PopulationPercentileByUniverse instance using the specified properties.
     * @function create
     * @memberof PopulationPercentileByUniverse
     * @static
     * @param {IPopulationPercentileByUniverse=} [properties] Properties to set
     * @returns {PopulationPercentileByUniverse} PopulationPercentileByUniverse instance
     */
    PopulationPercentileByUniverse.create = function create(properties) {
        return new PopulationPercentileByUniverse(properties);
    };

    /**
     * Encodes the specified PopulationPercentileByUniverse message. Does not implicitly {@link PopulationPercentileByUniverse.verify|verify} messages.
     * @function encode
     * @memberof PopulationPercentileByUniverse
     * @static
     * @param {IPopulationPercentileByUniverse} message PopulationPercentileByUniverse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    PopulationPercentileByUniverse.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.populationPercentile != null && message.populationPercentile.length) {
            writer.uint32(/* id 1, wireType 2 =*/10).fork();
            for (let i = 0; i < message.populationPercentile.length; ++i)
                writer.int32(message.populationPercentile[i]);
            writer.ldelim();
        }
        return writer;
    };

    /**
     * Encodes the specified PopulationPercentileByUniverse message, length delimited. Does not implicitly {@link PopulationPercentileByUniverse.verify|verify} messages.
     * @function encodeDelimited
     * @memberof PopulationPercentileByUniverse
     * @static
     * @param {IPopulationPercentileByUniverse} message PopulationPercentileByUniverse message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    PopulationPercentileByUniverse.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a PopulationPercentileByUniverse message from the specified reader or buffer.
     * @function decode
     * @memberof PopulationPercentileByUniverse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {PopulationPercentileByUniverse} PopulationPercentileByUniverse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    PopulationPercentileByUniverse.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.PopulationPercentileByUniverse();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.populationPercentile && message.populationPercentile.length))
                        message.populationPercentile = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.populationPercentile.push(reader.int32());
                    } else
                        message.populationPercentile.push(reader.int32());
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a PopulationPercentileByUniverse message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof PopulationPercentileByUniverse
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {PopulationPercentileByUniverse} PopulationPercentileByUniverse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    PopulationPercentileByUniverse.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a PopulationPercentileByUniverse message.
     * @function verify
     * @memberof PopulationPercentileByUniverse
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    PopulationPercentileByUniverse.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.populationPercentile != null && message.hasOwnProperty("populationPercentile")) {
            if (!Array.isArray(message.populationPercentile))
                return "populationPercentile: array expected";
            for (let i = 0; i < message.populationPercentile.length; ++i)
                if (!$util.isInteger(message.populationPercentile[i]))
                    return "populationPercentile: integer[] expected";
        }
        return null;
    };

    /**
     * Creates a PopulationPercentileByUniverse message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof PopulationPercentileByUniverse
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {PopulationPercentileByUniverse} PopulationPercentileByUniverse
     */
    PopulationPercentileByUniverse.fromObject = function fromObject(object) {
        if (object instanceof $root.PopulationPercentileByUniverse)
            return object;
        let message = new $root.PopulationPercentileByUniverse();
        if (object.populationPercentile) {
            if (!Array.isArray(object.populationPercentile))
                throw TypeError(".PopulationPercentileByUniverse.populationPercentile: array expected");
            message.populationPercentile = [];
            for (let i = 0; i < object.populationPercentile.length; ++i)
                message.populationPercentile[i] = object.populationPercentile[i] | 0;
        }
        return message;
    };

    /**
     * Creates a plain object from a PopulationPercentileByUniverse message. Also converts values to other types if specified.
     * @function toObject
     * @memberof PopulationPercentileByUniverse
     * @static
     * @param {PopulationPercentileByUniverse} message PopulationPercentileByUniverse
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    PopulationPercentileByUniverse.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.populationPercentile = [];
        if (message.populationPercentile && message.populationPercentile.length) {
            object.populationPercentile = [];
            for (let j = 0; j < message.populationPercentile.length; ++j)
                object.populationPercentile[j] = message.populationPercentile[j];
        }
        return object;
    };

    /**
     * Converts this PopulationPercentileByUniverse to JSON.
     * @function toJSON
     * @memberof PopulationPercentileByUniverse
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    PopulationPercentileByUniverse.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for PopulationPercentileByUniverse
     * @function getTypeUrl
     * @memberof PopulationPercentileByUniverse
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    PopulationPercentileByUniverse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/PopulationPercentileByUniverse";
    };

    return PopulationPercentileByUniverse;
})();

export const DataList = $root.DataList = (() => {

    /**
     * Properties of a DataList.
     * @exports IDataList
     * @interface IDataList
     * @property {Array.<number>|null} [value] DataList value
     * @property {Array.<IPopulationPercentileByUniverse>|null} [populationPercentileByUniverse] DataList populationPercentileByUniverse
     */

    /**
     * Constructs a new DataList.
     * @exports DataList
     * @classdesc Represents a DataList.
     * @implements IDataList
     * @constructor
     * @param {IDataList=} [properties] Properties to set
     */
    function DataList(properties) {
        this.value = [];
        this.populationPercentileByUniverse = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * DataList value.
     * @member {Array.<number>} value
     * @memberof DataList
     * @instance
     */
    DataList.prototype.value = $util.emptyArray;

    /**
     * DataList populationPercentileByUniverse.
     * @member {Array.<IPopulationPercentileByUniverse>} populationPercentileByUniverse
     * @memberof DataList
     * @instance
     */
    DataList.prototype.populationPercentileByUniverse = $util.emptyArray;

    /**
     * Creates a new DataList instance using the specified properties.
     * @function create
     * @memberof DataList
     * @static
     * @param {IDataList=} [properties] Properties to set
     * @returns {DataList} DataList instance
     */
    DataList.create = function create(properties) {
        return new DataList(properties);
    };

    /**
     * Encodes the specified DataList message. Does not implicitly {@link DataList.verify|verify} messages.
     * @function encode
     * @memberof DataList
     * @static
     * @param {IDataList} message DataList message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    DataList.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.value != null && message.value.length) {
            writer.uint32(/* id 1, wireType 2 =*/10).fork();
            for (let i = 0; i < message.value.length; ++i)
                writer.float(message.value[i]);
            writer.ldelim();
        }
        if (message.populationPercentileByUniverse != null && message.populationPercentileByUniverse.length)
            for (let i = 0; i < message.populationPercentileByUniverse.length; ++i)
                $root.PopulationPercentileByUniverse.encode(message.populationPercentileByUniverse[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified DataList message, length delimited. Does not implicitly {@link DataList.verify|verify} messages.
     * @function encodeDelimited
     * @memberof DataList
     * @static
     * @param {IDataList} message DataList message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    DataList.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a DataList message from the specified reader or buffer.
     * @function decode
     * @memberof DataList
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {DataList} DataList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    DataList.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.DataList();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.value && message.value.length))
                        message.value = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.value.push(reader.float());
                    } else
                        message.value.push(reader.float());
                    break;
                }
            case 2: {
                    if (!(message.populationPercentileByUniverse && message.populationPercentileByUniverse.length))
                        message.populationPercentileByUniverse = [];
                    message.populationPercentileByUniverse.push($root.PopulationPercentileByUniverse.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a DataList message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof DataList
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {DataList} DataList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    DataList.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a DataList message.
     * @function verify
     * @memberof DataList
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    DataList.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.value != null && message.hasOwnProperty("value")) {
            if (!Array.isArray(message.value))
                return "value: array expected";
            for (let i = 0; i < message.value.length; ++i)
                if (typeof message.value[i] !== "number")
                    return "value: number[] expected";
        }
        if (message.populationPercentileByUniverse != null && message.hasOwnProperty("populationPercentileByUniverse")) {
            if (!Array.isArray(message.populationPercentileByUniverse))
                return "populationPercentileByUniverse: array expected";
            for (let i = 0; i < message.populationPercentileByUniverse.length; ++i) {
                let error = $root.PopulationPercentileByUniverse.verify(message.populationPercentileByUniverse[i]);
                if (error)
                    return "populationPercentileByUniverse." + error;
            }
        }
        return null;
    };

    /**
     * Creates a DataList message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof DataList
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {DataList} DataList
     */
    DataList.fromObject = function fromObject(object) {
        if (object instanceof $root.DataList)
            return object;
        let message = new $root.DataList();
        if (object.value) {
            if (!Array.isArray(object.value))
                throw TypeError(".DataList.value: array expected");
            message.value = [];
            for (let i = 0; i < object.value.length; ++i)
                message.value[i] = Number(object.value[i]);
        }
        if (object.populationPercentileByUniverse) {
            if (!Array.isArray(object.populationPercentileByUniverse))
                throw TypeError(".DataList.populationPercentileByUniverse: array expected");
            message.populationPercentileByUniverse = [];
            for (let i = 0; i < object.populationPercentileByUniverse.length; ++i) {
                if (typeof object.populationPercentileByUniverse[i] !== "object")
                    throw TypeError(".DataList.populationPercentileByUniverse: object expected");
                message.populationPercentileByUniverse[i] = $root.PopulationPercentileByUniverse.fromObject(object.populationPercentileByUniverse[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a DataList message. Also converts values to other types if specified.
     * @function toObject
     * @memberof DataList
     * @static
     * @param {DataList} message DataList
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    DataList.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.value = [];
            object.populationPercentileByUniverse = [];
        }
        if (message.value && message.value.length) {
            object.value = [];
            for (let j = 0; j < message.value.length; ++j)
                object.value[j] = options.json && !isFinite(message.value[j]) ? String(message.value[j]) : message.value[j];
        }
        if (message.populationPercentileByUniverse && message.populationPercentileByUniverse.length) {
            object.populationPercentileByUniverse = [];
            for (let j = 0; j < message.populationPercentileByUniverse.length; ++j)
                object.populationPercentileByUniverse[j] = $root.PopulationPercentileByUniverse.toObject(message.populationPercentileByUniverse[j], options);
        }
        return object;
    };

    /**
     * Converts this DataList to JSON.
     * @function toJSON
     * @memberof DataList
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    DataList.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for DataList
     * @function getTypeUrl
     * @memberof DataList
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    DataList.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/DataList";
    };

    return DataList;
})();

export const OrderLists = $root.OrderLists = (() => {

    /**
     * Properties of an OrderLists.
     * @exports IOrderLists
     * @interface IOrderLists
     * @property {Array.<string>|null} [statnames] OrderLists statnames
     * @property {Array.<IOrderList>|null} [orderLists] OrderLists orderLists
     */

    /**
     * Constructs a new OrderLists.
     * @exports OrderLists
     * @classdesc Represents an OrderLists.
     * @implements IOrderLists
     * @constructor
     * @param {IOrderLists=} [properties] Properties to set
     */
    function OrderLists(properties) {
        this.statnames = [];
        this.orderLists = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * OrderLists statnames.
     * @member {Array.<string>} statnames
     * @memberof OrderLists
     * @instance
     */
    OrderLists.prototype.statnames = $util.emptyArray;

    /**
     * OrderLists orderLists.
     * @member {Array.<IOrderList>} orderLists
     * @memberof OrderLists
     * @instance
     */
    OrderLists.prototype.orderLists = $util.emptyArray;

    /**
     * Creates a new OrderLists instance using the specified properties.
     * @function create
     * @memberof OrderLists
     * @static
     * @param {IOrderLists=} [properties] Properties to set
     * @returns {OrderLists} OrderLists instance
     */
    OrderLists.create = function create(properties) {
        return new OrderLists(properties);
    };

    /**
     * Encodes the specified OrderLists message. Does not implicitly {@link OrderLists.verify|verify} messages.
     * @function encode
     * @memberof OrderLists
     * @static
     * @param {IOrderLists} message OrderLists message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    OrderLists.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.statnames != null && message.statnames.length)
            for (let i = 0; i < message.statnames.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.statnames[i]);
        if (message.orderLists != null && message.orderLists.length)
            for (let i = 0; i < message.orderLists.length; ++i)
                $root.OrderList.encode(message.orderLists[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified OrderLists message, length delimited. Does not implicitly {@link OrderLists.verify|verify} messages.
     * @function encodeDelimited
     * @memberof OrderLists
     * @static
     * @param {IOrderLists} message OrderLists message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    OrderLists.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an OrderLists message from the specified reader or buffer.
     * @function decode
     * @memberof OrderLists
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {OrderLists} OrderLists
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    OrderLists.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.OrderLists();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.statnames && message.statnames.length))
                        message.statnames = [];
                    message.statnames.push(reader.string());
                    break;
                }
            case 2: {
                    if (!(message.orderLists && message.orderLists.length))
                        message.orderLists = [];
                    message.orderLists.push($root.OrderList.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes an OrderLists message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof OrderLists
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {OrderLists} OrderLists
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    OrderLists.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an OrderLists message.
     * @function verify
     * @memberof OrderLists
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    OrderLists.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.statnames != null && message.hasOwnProperty("statnames")) {
            if (!Array.isArray(message.statnames))
                return "statnames: array expected";
            for (let i = 0; i < message.statnames.length; ++i)
                if (!$util.isString(message.statnames[i]))
                    return "statnames: string[] expected";
        }
        if (message.orderLists != null && message.hasOwnProperty("orderLists")) {
            if (!Array.isArray(message.orderLists))
                return "orderLists: array expected";
            for (let i = 0; i < message.orderLists.length; ++i) {
                let error = $root.OrderList.verify(message.orderLists[i]);
                if (error)
                    return "orderLists." + error;
            }
        }
        return null;
    };

    /**
     * Creates an OrderLists message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof OrderLists
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {OrderLists} OrderLists
     */
    OrderLists.fromObject = function fromObject(object) {
        if (object instanceof $root.OrderLists)
            return object;
        let message = new $root.OrderLists();
        if (object.statnames) {
            if (!Array.isArray(object.statnames))
                throw TypeError(".OrderLists.statnames: array expected");
            message.statnames = [];
            for (let i = 0; i < object.statnames.length; ++i)
                message.statnames[i] = String(object.statnames[i]);
        }
        if (object.orderLists) {
            if (!Array.isArray(object.orderLists))
                throw TypeError(".OrderLists.orderLists: array expected");
            message.orderLists = [];
            for (let i = 0; i < object.orderLists.length; ++i) {
                if (typeof object.orderLists[i] !== "object")
                    throw TypeError(".OrderLists.orderLists: object expected");
                message.orderLists[i] = $root.OrderList.fromObject(object.orderLists[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from an OrderLists message. Also converts values to other types if specified.
     * @function toObject
     * @memberof OrderLists
     * @static
     * @param {OrderLists} message OrderLists
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    OrderLists.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.statnames = [];
            object.orderLists = [];
        }
        if (message.statnames && message.statnames.length) {
            object.statnames = [];
            for (let j = 0; j < message.statnames.length; ++j)
                object.statnames[j] = message.statnames[j];
        }
        if (message.orderLists && message.orderLists.length) {
            object.orderLists = [];
            for (let j = 0; j < message.orderLists.length; ++j)
                object.orderLists[j] = $root.OrderList.toObject(message.orderLists[j], options);
        }
        return object;
    };

    /**
     * Converts this OrderLists to JSON.
     * @function toJSON
     * @memberof OrderLists
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    OrderLists.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for OrderLists
     * @function getTypeUrl
     * @memberof OrderLists
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    OrderLists.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/OrderLists";
    };

    return OrderLists;
})();

export const DataLists = $root.DataLists = (() => {

    /**
     * Properties of a DataLists.
     * @exports IDataLists
     * @interface IDataLists
     * @property {Array.<string>|null} [statnames] DataLists statnames
     * @property {Array.<IDataList>|null} [dataLists] DataLists dataLists
     */

    /**
     * Constructs a new DataLists.
     * @exports DataLists
     * @classdesc Represents a DataLists.
     * @implements IDataLists
     * @constructor
     * @param {IDataLists=} [properties] Properties to set
     */
    function DataLists(properties) {
        this.statnames = [];
        this.dataLists = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * DataLists statnames.
     * @member {Array.<string>} statnames
     * @memberof DataLists
     * @instance
     */
    DataLists.prototype.statnames = $util.emptyArray;

    /**
     * DataLists dataLists.
     * @member {Array.<IDataList>} dataLists
     * @memberof DataLists
     * @instance
     */
    DataLists.prototype.dataLists = $util.emptyArray;

    /**
     * Creates a new DataLists instance using the specified properties.
     * @function create
     * @memberof DataLists
     * @static
     * @param {IDataLists=} [properties] Properties to set
     * @returns {DataLists} DataLists instance
     */
    DataLists.create = function create(properties) {
        return new DataLists(properties);
    };

    /**
     * Encodes the specified DataLists message. Does not implicitly {@link DataLists.verify|verify} messages.
     * @function encode
     * @memberof DataLists
     * @static
     * @param {IDataLists} message DataLists message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    DataLists.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.statnames != null && message.statnames.length)
            for (let i = 0; i < message.statnames.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.statnames[i]);
        if (message.dataLists != null && message.dataLists.length)
            for (let i = 0; i < message.dataLists.length; ++i)
                $root.DataList.encode(message.dataLists[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified DataLists message, length delimited. Does not implicitly {@link DataLists.verify|verify} messages.
     * @function encodeDelimited
     * @memberof DataLists
     * @static
     * @param {IDataLists} message DataLists message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    DataLists.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a DataLists message from the specified reader or buffer.
     * @function decode
     * @memberof DataLists
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {DataLists} DataLists
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    DataLists.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.DataLists();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.statnames && message.statnames.length))
                        message.statnames = [];
                    message.statnames.push(reader.string());
                    break;
                }
            case 2: {
                    if (!(message.dataLists && message.dataLists.length))
                        message.dataLists = [];
                    message.dataLists.push($root.DataList.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a DataLists message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof DataLists
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {DataLists} DataLists
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    DataLists.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a DataLists message.
     * @function verify
     * @memberof DataLists
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    DataLists.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.statnames != null && message.hasOwnProperty("statnames")) {
            if (!Array.isArray(message.statnames))
                return "statnames: array expected";
            for (let i = 0; i < message.statnames.length; ++i)
                if (!$util.isString(message.statnames[i]))
                    return "statnames: string[] expected";
        }
        if (message.dataLists != null && message.hasOwnProperty("dataLists")) {
            if (!Array.isArray(message.dataLists))
                return "dataLists: array expected";
            for (let i = 0; i < message.dataLists.length; ++i) {
                let error = $root.DataList.verify(message.dataLists[i]);
                if (error)
                    return "dataLists." + error;
            }
        }
        return null;
    };

    /**
     * Creates a DataLists message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof DataLists
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {DataLists} DataLists
     */
    DataLists.fromObject = function fromObject(object) {
        if (object instanceof $root.DataLists)
            return object;
        let message = new $root.DataLists();
        if (object.statnames) {
            if (!Array.isArray(object.statnames))
                throw TypeError(".DataLists.statnames: array expected");
            message.statnames = [];
            for (let i = 0; i < object.statnames.length; ++i)
                message.statnames[i] = String(object.statnames[i]);
        }
        if (object.dataLists) {
            if (!Array.isArray(object.dataLists))
                throw TypeError(".DataLists.dataLists: array expected");
            message.dataLists = [];
            for (let i = 0; i < object.dataLists.length; ++i) {
                if (typeof object.dataLists[i] !== "object")
                    throw TypeError(".DataLists.dataLists: object expected");
                message.dataLists[i] = $root.DataList.fromObject(object.dataLists[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a DataLists message. Also converts values to other types if specified.
     * @function toObject
     * @memberof DataLists
     * @static
     * @param {DataLists} message DataLists
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    DataLists.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.statnames = [];
            object.dataLists = [];
        }
        if (message.statnames && message.statnames.length) {
            object.statnames = [];
            for (let j = 0; j < message.statnames.length; ++j)
                object.statnames[j] = message.statnames[j];
        }
        if (message.dataLists && message.dataLists.length) {
            object.dataLists = [];
            for (let j = 0; j < message.dataLists.length; ++j)
                object.dataLists[j] = $root.DataList.toObject(message.dataLists[j], options);
        }
        return object;
    };

    /**
     * Converts this DataLists to JSON.
     * @function toJSON
     * @memberof DataLists
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    DataLists.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for DataLists
     * @function getTypeUrl
     * @memberof DataLists
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    DataLists.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/DataLists";
    };

    return DataLists;
})();

export const Universes = $root.Universes = (() => {

    /**
     * Properties of an Universes.
     * @exports IUniverses
     * @interface IUniverses
     * @property {Array.<number>|null} [universeIdxs] Universes universeIdxs
     */

    /**
     * Constructs a new Universes.
     * @exports Universes
     * @classdesc Represents an Universes.
     * @implements IUniverses
     * @constructor
     * @param {IUniverses=} [properties] Properties to set
     */
    function Universes(properties) {
        this.universeIdxs = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Universes universeIdxs.
     * @member {Array.<number>} universeIdxs
     * @memberof Universes
     * @instance
     */
    Universes.prototype.universeIdxs = $util.emptyArray;

    /**
     * Creates a new Universes instance using the specified properties.
     * @function create
     * @memberof Universes
     * @static
     * @param {IUniverses=} [properties] Properties to set
     * @returns {Universes} Universes instance
     */
    Universes.create = function create(properties) {
        return new Universes(properties);
    };

    /**
     * Encodes the specified Universes message. Does not implicitly {@link Universes.verify|verify} messages.
     * @function encode
     * @memberof Universes
     * @static
     * @param {IUniverses} message Universes message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Universes.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.universeIdxs != null && message.universeIdxs.length) {
            writer.uint32(/* id 1, wireType 2 =*/10).fork();
            for (let i = 0; i < message.universeIdxs.length; ++i)
                writer.int32(message.universeIdxs[i]);
            writer.ldelim();
        }
        return writer;
    };

    /**
     * Encodes the specified Universes message, length delimited. Does not implicitly {@link Universes.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Universes
     * @static
     * @param {IUniverses} message Universes message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Universes.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an Universes message from the specified reader or buffer.
     * @function decode
     * @memberof Universes
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Universes} Universes
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Universes.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Universes();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.universeIdxs && message.universeIdxs.length))
                        message.universeIdxs = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.universeIdxs.push(reader.int32());
                    } else
                        message.universeIdxs.push(reader.int32());
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes an Universes message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Universes
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Universes} Universes
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Universes.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an Universes message.
     * @function verify
     * @memberof Universes
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Universes.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.universeIdxs != null && message.hasOwnProperty("universeIdxs")) {
            if (!Array.isArray(message.universeIdxs))
                return "universeIdxs: array expected";
            for (let i = 0; i < message.universeIdxs.length; ++i)
                if (!$util.isInteger(message.universeIdxs[i]))
                    return "universeIdxs: integer[] expected";
        }
        return null;
    };

    /**
     * Creates an Universes message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Universes
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Universes} Universes
     */
    Universes.fromObject = function fromObject(object) {
        if (object instanceof $root.Universes)
            return object;
        let message = new $root.Universes();
        if (object.universeIdxs) {
            if (!Array.isArray(object.universeIdxs))
                throw TypeError(".Universes.universeIdxs: array expected");
            message.universeIdxs = [];
            for (let i = 0; i < object.universeIdxs.length; ++i)
                message.universeIdxs[i] = object.universeIdxs[i] | 0;
        }
        return message;
    };

    /**
     * Creates a plain object from an Universes message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Universes
     * @static
     * @param {Universes} message Universes
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Universes.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.universeIdxs = [];
        if (message.universeIdxs && message.universeIdxs.length) {
            object.universeIdxs = [];
            for (let j = 0; j < message.universeIdxs.length; ++j)
                object.universeIdxs[j] = message.universeIdxs[j];
        }
        return object;
    };

    /**
     * Converts this Universes to JSON.
     * @function toJSON
     * @memberof Universes
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Universes.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for Universes
     * @function getTypeUrl
     * @memberof Universes
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    Universes.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/Universes";
    };

    return Universes;
})();

export const ConsolidatedShapes = $root.ConsolidatedShapes = (() => {

    /**
     * Properties of a ConsolidatedShapes.
     * @exports IConsolidatedShapes
     * @interface IConsolidatedShapes
     * @property {Array.<string>|null} [longnames] ConsolidatedShapes longnames
     * @property {Array.<IUniverses>|null} [universes] ConsolidatedShapes universes
     * @property {Array.<IFeature>|null} [shapes] ConsolidatedShapes shapes
     */

    /**
     * Constructs a new ConsolidatedShapes.
     * @exports ConsolidatedShapes
     * @classdesc Represents a ConsolidatedShapes.
     * @implements IConsolidatedShapes
     * @constructor
     * @param {IConsolidatedShapes=} [properties] Properties to set
     */
    function ConsolidatedShapes(properties) {
        this.longnames = [];
        this.universes = [];
        this.shapes = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * ConsolidatedShapes longnames.
     * @member {Array.<string>} longnames
     * @memberof ConsolidatedShapes
     * @instance
     */
    ConsolidatedShapes.prototype.longnames = $util.emptyArray;

    /**
     * ConsolidatedShapes universes.
     * @member {Array.<IUniverses>} universes
     * @memberof ConsolidatedShapes
     * @instance
     */
    ConsolidatedShapes.prototype.universes = $util.emptyArray;

    /**
     * ConsolidatedShapes shapes.
     * @member {Array.<IFeature>} shapes
     * @memberof ConsolidatedShapes
     * @instance
     */
    ConsolidatedShapes.prototype.shapes = $util.emptyArray;

    /**
     * Creates a new ConsolidatedShapes instance using the specified properties.
     * @function create
     * @memberof ConsolidatedShapes
     * @static
     * @param {IConsolidatedShapes=} [properties] Properties to set
     * @returns {ConsolidatedShapes} ConsolidatedShapes instance
     */
    ConsolidatedShapes.create = function create(properties) {
        return new ConsolidatedShapes(properties);
    };

    /**
     * Encodes the specified ConsolidatedShapes message. Does not implicitly {@link ConsolidatedShapes.verify|verify} messages.
     * @function encode
     * @memberof ConsolidatedShapes
     * @static
     * @param {IConsolidatedShapes} message ConsolidatedShapes message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ConsolidatedShapes.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.longnames != null && message.longnames.length)
            for (let i = 0; i < message.longnames.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.longnames[i]);
        if (message.shapes != null && message.shapes.length)
            for (let i = 0; i < message.shapes.length; ++i)
                $root.Feature.encode(message.shapes[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        if (message.universes != null && message.universes.length)
            for (let i = 0; i < message.universes.length; ++i)
                $root.Universes.encode(message.universes[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified ConsolidatedShapes message, length delimited. Does not implicitly {@link ConsolidatedShapes.verify|verify} messages.
     * @function encodeDelimited
     * @memberof ConsolidatedShapes
     * @static
     * @param {IConsolidatedShapes} message ConsolidatedShapes message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ConsolidatedShapes.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a ConsolidatedShapes message from the specified reader or buffer.
     * @function decode
     * @memberof ConsolidatedShapes
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {ConsolidatedShapes} ConsolidatedShapes
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ConsolidatedShapes.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.ConsolidatedShapes();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.longnames && message.longnames.length))
                        message.longnames = [];
                    message.longnames.push(reader.string());
                    break;
                }
            case 3: {
                    if (!(message.universes && message.universes.length))
                        message.universes = [];
                    message.universes.push($root.Universes.decode(reader, reader.uint32()));
                    break;
                }
            case 2: {
                    if (!(message.shapes && message.shapes.length))
                        message.shapes = [];
                    message.shapes.push($root.Feature.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a ConsolidatedShapes message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof ConsolidatedShapes
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {ConsolidatedShapes} ConsolidatedShapes
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ConsolidatedShapes.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a ConsolidatedShapes message.
     * @function verify
     * @memberof ConsolidatedShapes
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    ConsolidatedShapes.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.longnames != null && message.hasOwnProperty("longnames")) {
            if (!Array.isArray(message.longnames))
                return "longnames: array expected";
            for (let i = 0; i < message.longnames.length; ++i)
                if (!$util.isString(message.longnames[i]))
                    return "longnames: string[] expected";
        }
        if (message.universes != null && message.hasOwnProperty("universes")) {
            if (!Array.isArray(message.universes))
                return "universes: array expected";
            for (let i = 0; i < message.universes.length; ++i) {
                let error = $root.Universes.verify(message.universes[i]);
                if (error)
                    return "universes." + error;
            }
        }
        if (message.shapes != null && message.hasOwnProperty("shapes")) {
            if (!Array.isArray(message.shapes))
                return "shapes: array expected";
            for (let i = 0; i < message.shapes.length; ++i) {
                let error = $root.Feature.verify(message.shapes[i]);
                if (error)
                    return "shapes." + error;
            }
        }
        return null;
    };

    /**
     * Creates a ConsolidatedShapes message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ConsolidatedShapes
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {ConsolidatedShapes} ConsolidatedShapes
     */
    ConsolidatedShapes.fromObject = function fromObject(object) {
        if (object instanceof $root.ConsolidatedShapes)
            return object;
        let message = new $root.ConsolidatedShapes();
        if (object.longnames) {
            if (!Array.isArray(object.longnames))
                throw TypeError(".ConsolidatedShapes.longnames: array expected");
            message.longnames = [];
            for (let i = 0; i < object.longnames.length; ++i)
                message.longnames[i] = String(object.longnames[i]);
        }
        if (object.universes) {
            if (!Array.isArray(object.universes))
                throw TypeError(".ConsolidatedShapes.universes: array expected");
            message.universes = [];
            for (let i = 0; i < object.universes.length; ++i) {
                if (typeof object.universes[i] !== "object")
                    throw TypeError(".ConsolidatedShapes.universes: object expected");
                message.universes[i] = $root.Universes.fromObject(object.universes[i]);
            }
        }
        if (object.shapes) {
            if (!Array.isArray(object.shapes))
                throw TypeError(".ConsolidatedShapes.shapes: array expected");
            message.shapes = [];
            for (let i = 0; i < object.shapes.length; ++i) {
                if (typeof object.shapes[i] !== "object")
                    throw TypeError(".ConsolidatedShapes.shapes: object expected");
                message.shapes[i] = $root.Feature.fromObject(object.shapes[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a ConsolidatedShapes message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ConsolidatedShapes
     * @static
     * @param {ConsolidatedShapes} message ConsolidatedShapes
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ConsolidatedShapes.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.longnames = [];
            object.shapes = [];
            object.universes = [];
        }
        if (message.longnames && message.longnames.length) {
            object.longnames = [];
            for (let j = 0; j < message.longnames.length; ++j)
                object.longnames[j] = message.longnames[j];
        }
        if (message.shapes && message.shapes.length) {
            object.shapes = [];
            for (let j = 0; j < message.shapes.length; ++j)
                object.shapes[j] = $root.Feature.toObject(message.shapes[j], options);
        }
        if (message.universes && message.universes.length) {
            object.universes = [];
            for (let j = 0; j < message.universes.length; ++j)
                object.universes[j] = $root.Universes.toObject(message.universes[j], options);
        }
        return object;
    };

    /**
     * Converts this ConsolidatedShapes to JSON.
     * @function toJSON
     * @memberof ConsolidatedShapes
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ConsolidatedShapes.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for ConsolidatedShapes
     * @function getTypeUrl
     * @memberof ConsolidatedShapes
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    ConsolidatedShapes.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/ConsolidatedShapes";
    };

    return ConsolidatedShapes;
})();

export const QuizDataForStat = $root.QuizDataForStat = (() => {

    /**
     * Properties of a QuizDataForStat.
     * @exports IQuizDataForStat
     * @interface IQuizDataForStat
     * @property {Array.<number>|null} [stats] QuizDataForStat stats
     */

    /**
     * Constructs a new QuizDataForStat.
     * @exports QuizDataForStat
     * @classdesc Represents a QuizDataForStat.
     * @implements IQuizDataForStat
     * @constructor
     * @param {IQuizDataForStat=} [properties] Properties to set
     */
    function QuizDataForStat(properties) {
        this.stats = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * QuizDataForStat stats.
     * @member {Array.<number>} stats
     * @memberof QuizDataForStat
     * @instance
     */
    QuizDataForStat.prototype.stats = $util.emptyArray;

    /**
     * Creates a new QuizDataForStat instance using the specified properties.
     * @function create
     * @memberof QuizDataForStat
     * @static
     * @param {IQuizDataForStat=} [properties] Properties to set
     * @returns {QuizDataForStat} QuizDataForStat instance
     */
    QuizDataForStat.create = function create(properties) {
        return new QuizDataForStat(properties);
    };

    /**
     * Encodes the specified QuizDataForStat message. Does not implicitly {@link QuizDataForStat.verify|verify} messages.
     * @function encode
     * @memberof QuizDataForStat
     * @static
     * @param {IQuizDataForStat} message QuizDataForStat message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    QuizDataForStat.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.stats != null && message.stats.length) {
            writer.uint32(/* id 1, wireType 2 =*/10).fork();
            for (let i = 0; i < message.stats.length; ++i)
                writer.float(message.stats[i]);
            writer.ldelim();
        }
        return writer;
    };

    /**
     * Encodes the specified QuizDataForStat message, length delimited. Does not implicitly {@link QuizDataForStat.verify|verify} messages.
     * @function encodeDelimited
     * @memberof QuizDataForStat
     * @static
     * @param {IQuizDataForStat} message QuizDataForStat message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    QuizDataForStat.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a QuizDataForStat message from the specified reader or buffer.
     * @function decode
     * @memberof QuizDataForStat
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {QuizDataForStat} QuizDataForStat
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    QuizDataForStat.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.QuizDataForStat();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.stats && message.stats.length))
                        message.stats = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.stats.push(reader.float());
                    } else
                        message.stats.push(reader.float());
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a QuizDataForStat message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof QuizDataForStat
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {QuizDataForStat} QuizDataForStat
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    QuizDataForStat.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a QuizDataForStat message.
     * @function verify
     * @memberof QuizDataForStat
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    QuizDataForStat.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.stats != null && message.hasOwnProperty("stats")) {
            if (!Array.isArray(message.stats))
                return "stats: array expected";
            for (let i = 0; i < message.stats.length; ++i)
                if (typeof message.stats[i] !== "number")
                    return "stats: number[] expected";
        }
        return null;
    };

    /**
     * Creates a QuizDataForStat message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof QuizDataForStat
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {QuizDataForStat} QuizDataForStat
     */
    QuizDataForStat.fromObject = function fromObject(object) {
        if (object instanceof $root.QuizDataForStat)
            return object;
        let message = new $root.QuizDataForStat();
        if (object.stats) {
            if (!Array.isArray(object.stats))
                throw TypeError(".QuizDataForStat.stats: array expected");
            message.stats = [];
            for (let i = 0; i < object.stats.length; ++i)
                message.stats[i] = Number(object.stats[i]);
        }
        return message;
    };

    /**
     * Creates a plain object from a QuizDataForStat message. Also converts values to other types if specified.
     * @function toObject
     * @memberof QuizDataForStat
     * @static
     * @param {QuizDataForStat} message QuizDataForStat
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    QuizDataForStat.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.stats = [];
        if (message.stats && message.stats.length) {
            object.stats = [];
            for (let j = 0; j < message.stats.length; ++j)
                object.stats[j] = options.json && !isFinite(message.stats[j]) ? String(message.stats[j]) : message.stats[j];
        }
        return object;
    };

    /**
     * Converts this QuizDataForStat to JSON.
     * @function toJSON
     * @memberof QuizDataForStat
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    QuizDataForStat.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for QuizDataForStat
     * @function getTypeUrl
     * @memberof QuizDataForStat
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    QuizDataForStat.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/QuizDataForStat";
    };

    return QuizDataForStat;
})();

export const QuizFullData = $root.QuizFullData = (() => {

    /**
     * Properties of a QuizFullData.
     * @exports IQuizFullData
     * @interface IQuizFullData
     * @property {Array.<IQuizDataForStat>|null} [stats] QuizFullData stats
     */

    /**
     * Constructs a new QuizFullData.
     * @exports QuizFullData
     * @classdesc Represents a QuizFullData.
     * @implements IQuizFullData
     * @constructor
     * @param {IQuizFullData=} [properties] Properties to set
     */
    function QuizFullData(properties) {
        this.stats = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * QuizFullData stats.
     * @member {Array.<IQuizDataForStat>} stats
     * @memberof QuizFullData
     * @instance
     */
    QuizFullData.prototype.stats = $util.emptyArray;

    /**
     * Creates a new QuizFullData instance using the specified properties.
     * @function create
     * @memberof QuizFullData
     * @static
     * @param {IQuizFullData=} [properties] Properties to set
     * @returns {QuizFullData} QuizFullData instance
     */
    QuizFullData.create = function create(properties) {
        return new QuizFullData(properties);
    };

    /**
     * Encodes the specified QuizFullData message. Does not implicitly {@link QuizFullData.verify|verify} messages.
     * @function encode
     * @memberof QuizFullData
     * @static
     * @param {IQuizFullData} message QuizFullData message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    QuizFullData.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.stats != null && message.stats.length)
            for (let i = 0; i < message.stats.length; ++i)
                $root.QuizDataForStat.encode(message.stats[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified QuizFullData message, length delimited. Does not implicitly {@link QuizFullData.verify|verify} messages.
     * @function encodeDelimited
     * @memberof QuizFullData
     * @static
     * @param {IQuizFullData} message QuizFullData message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    QuizFullData.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a QuizFullData message from the specified reader or buffer.
     * @function decode
     * @memberof QuizFullData
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {QuizFullData} QuizFullData
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    QuizFullData.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.QuizFullData();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.stats && message.stats.length))
                        message.stats = [];
                    message.stats.push($root.QuizDataForStat.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a QuizFullData message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof QuizFullData
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {QuizFullData} QuizFullData
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    QuizFullData.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a QuizFullData message.
     * @function verify
     * @memberof QuizFullData
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    QuizFullData.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.stats != null && message.hasOwnProperty("stats")) {
            if (!Array.isArray(message.stats))
                return "stats: array expected";
            for (let i = 0; i < message.stats.length; ++i) {
                let error = $root.QuizDataForStat.verify(message.stats[i]);
                if (error)
                    return "stats." + error;
            }
        }
        return null;
    };

    /**
     * Creates a QuizFullData message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof QuizFullData
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {QuizFullData} QuizFullData
     */
    QuizFullData.fromObject = function fromObject(object) {
        if (object instanceof $root.QuizFullData)
            return object;
        let message = new $root.QuizFullData();
        if (object.stats) {
            if (!Array.isArray(object.stats))
                throw TypeError(".QuizFullData.stats: array expected");
            message.stats = [];
            for (let i = 0; i < object.stats.length; ++i) {
                if (typeof object.stats[i] !== "object")
                    throw TypeError(".QuizFullData.stats: object expected");
                message.stats[i] = $root.QuizDataForStat.fromObject(object.stats[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a QuizFullData message. Also converts values to other types if specified.
     * @function toObject
     * @memberof QuizFullData
     * @static
     * @param {QuizFullData} message QuizFullData
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    QuizFullData.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.stats = [];
        if (message.stats && message.stats.length) {
            object.stats = [];
            for (let j = 0; j < message.stats.length; ++j)
                object.stats[j] = $root.QuizDataForStat.toObject(message.stats[j], options);
        }
        return object;
    };

    /**
     * Converts this QuizFullData to JSON.
     * @function toJSON
     * @memberof QuizFullData
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    QuizFullData.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for QuizFullData
     * @function getTypeUrl
     * @memberof QuizFullData
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    QuizFullData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/QuizFullData";
    };

    return QuizFullData;
})();

export const QuizQuestionTronche = $root.QuizQuestionTronche = (() => {

    /**
     * Properties of a QuizQuestionTronche.
     * @exports IQuizQuestionTronche
     * @interface IQuizQuestionTronche
     * @property {Array.<number>|null} [geographyA] QuizQuestionTronche geographyA
     * @property {Array.<number>|null} [geographyB] QuizQuestionTronche geographyB
     * @property {Array.<number>|null} [stat] QuizQuestionTronche stat
     * @property {number|null} [negLogProbX10Basis] QuizQuestionTronche negLogProbX10Basis
     * @property {Array.<number>|null} [negLogProbX10MinusBasis] QuizQuestionTronche negLogProbX10MinusBasis
     */

    /**
     * Constructs a new QuizQuestionTronche.
     * @exports QuizQuestionTronche
     * @classdesc Represents a QuizQuestionTronche.
     * @implements IQuizQuestionTronche
     * @constructor
     * @param {IQuizQuestionTronche=} [properties] Properties to set
     */
    function QuizQuestionTronche(properties) {
        this.geographyA = [];
        this.geographyB = [];
        this.stat = [];
        this.negLogProbX10MinusBasis = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * QuizQuestionTronche geographyA.
     * @member {Array.<number>} geographyA
     * @memberof QuizQuestionTronche
     * @instance
     */
    QuizQuestionTronche.prototype.geographyA = $util.emptyArray;

    /**
     * QuizQuestionTronche geographyB.
     * @member {Array.<number>} geographyB
     * @memberof QuizQuestionTronche
     * @instance
     */
    QuizQuestionTronche.prototype.geographyB = $util.emptyArray;

    /**
     * QuizQuestionTronche stat.
     * @member {Array.<number>} stat
     * @memberof QuizQuestionTronche
     * @instance
     */
    QuizQuestionTronche.prototype.stat = $util.emptyArray;

    /**
     * QuizQuestionTronche negLogProbX10Basis.
     * @member {number} negLogProbX10Basis
     * @memberof QuizQuestionTronche
     * @instance
     */
    QuizQuestionTronche.prototype.negLogProbX10Basis = 0;

    /**
     * QuizQuestionTronche negLogProbX10MinusBasis.
     * @member {Array.<number>} negLogProbX10MinusBasis
     * @memberof QuizQuestionTronche
     * @instance
     */
    QuizQuestionTronche.prototype.negLogProbX10MinusBasis = $util.emptyArray;

    /**
     * Creates a new QuizQuestionTronche instance using the specified properties.
     * @function create
     * @memberof QuizQuestionTronche
     * @static
     * @param {IQuizQuestionTronche=} [properties] Properties to set
     * @returns {QuizQuestionTronche} QuizQuestionTronche instance
     */
    QuizQuestionTronche.create = function create(properties) {
        return new QuizQuestionTronche(properties);
    };

    /**
     * Encodes the specified QuizQuestionTronche message. Does not implicitly {@link QuizQuestionTronche.verify|verify} messages.
     * @function encode
     * @memberof QuizQuestionTronche
     * @static
     * @param {IQuizQuestionTronche} message QuizQuestionTronche message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    QuizQuestionTronche.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.geographyA != null && message.geographyA.length) {
            writer.uint32(/* id 1, wireType 2 =*/10).fork();
            for (let i = 0; i < message.geographyA.length; ++i)
                writer.int32(message.geographyA[i]);
            writer.ldelim();
        }
        if (message.geographyB != null && message.geographyB.length) {
            writer.uint32(/* id 2, wireType 2 =*/18).fork();
            for (let i = 0; i < message.geographyB.length; ++i)
                writer.int32(message.geographyB[i]);
            writer.ldelim();
        }
        if (message.stat != null && message.stat.length) {
            writer.uint32(/* id 3, wireType 2 =*/26).fork();
            for (let i = 0; i < message.stat.length; ++i)
                writer.int32(message.stat[i]);
            writer.ldelim();
        }
        if (message.negLogProbX10Basis != null && Object.hasOwnProperty.call(message, "negLogProbX10Basis"))
            writer.uint32(/* id 4, wireType 0 =*/32).int32(message.negLogProbX10Basis);
        if (message.negLogProbX10MinusBasis != null && message.negLogProbX10MinusBasis.length) {
            writer.uint32(/* id 5, wireType 2 =*/42).fork();
            for (let i = 0; i < message.negLogProbX10MinusBasis.length; ++i)
                writer.int32(message.negLogProbX10MinusBasis[i]);
            writer.ldelim();
        }
        return writer;
    };

    /**
     * Encodes the specified QuizQuestionTronche message, length delimited. Does not implicitly {@link QuizQuestionTronche.verify|verify} messages.
     * @function encodeDelimited
     * @memberof QuizQuestionTronche
     * @static
     * @param {IQuizQuestionTronche} message QuizQuestionTronche message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    QuizQuestionTronche.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a QuizQuestionTronche message from the specified reader or buffer.
     * @function decode
     * @memberof QuizQuestionTronche
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {QuizQuestionTronche} QuizQuestionTronche
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    QuizQuestionTronche.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.QuizQuestionTronche();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.geographyA && message.geographyA.length))
                        message.geographyA = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.geographyA.push(reader.int32());
                    } else
                        message.geographyA.push(reader.int32());
                    break;
                }
            case 2: {
                    if (!(message.geographyB && message.geographyB.length))
                        message.geographyB = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.geographyB.push(reader.int32());
                    } else
                        message.geographyB.push(reader.int32());
                    break;
                }
            case 3: {
                    if (!(message.stat && message.stat.length))
                        message.stat = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.stat.push(reader.int32());
                    } else
                        message.stat.push(reader.int32());
                    break;
                }
            case 4: {
                    message.negLogProbX10Basis = reader.int32();
                    break;
                }
            case 5: {
                    if (!(message.negLogProbX10MinusBasis && message.negLogProbX10MinusBasis.length))
                        message.negLogProbX10MinusBasis = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.negLogProbX10MinusBasis.push(reader.int32());
                    } else
                        message.negLogProbX10MinusBasis.push(reader.int32());
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a QuizQuestionTronche message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof QuizQuestionTronche
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {QuizQuestionTronche} QuizQuestionTronche
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    QuizQuestionTronche.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a QuizQuestionTronche message.
     * @function verify
     * @memberof QuizQuestionTronche
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    QuizQuestionTronche.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.geographyA != null && message.hasOwnProperty("geographyA")) {
            if (!Array.isArray(message.geographyA))
                return "geographyA: array expected";
            for (let i = 0; i < message.geographyA.length; ++i)
                if (!$util.isInteger(message.geographyA[i]))
                    return "geographyA: integer[] expected";
        }
        if (message.geographyB != null && message.hasOwnProperty("geographyB")) {
            if (!Array.isArray(message.geographyB))
                return "geographyB: array expected";
            for (let i = 0; i < message.geographyB.length; ++i)
                if (!$util.isInteger(message.geographyB[i]))
                    return "geographyB: integer[] expected";
        }
        if (message.stat != null && message.hasOwnProperty("stat")) {
            if (!Array.isArray(message.stat))
                return "stat: array expected";
            for (let i = 0; i < message.stat.length; ++i)
                if (!$util.isInteger(message.stat[i]))
                    return "stat: integer[] expected";
        }
        if (message.negLogProbX10Basis != null && message.hasOwnProperty("negLogProbX10Basis"))
            if (!$util.isInteger(message.negLogProbX10Basis))
                return "negLogProbX10Basis: integer expected";
        if (message.negLogProbX10MinusBasis != null && message.hasOwnProperty("negLogProbX10MinusBasis")) {
            if (!Array.isArray(message.negLogProbX10MinusBasis))
                return "negLogProbX10MinusBasis: array expected";
            for (let i = 0; i < message.negLogProbX10MinusBasis.length; ++i)
                if (!$util.isInteger(message.negLogProbX10MinusBasis[i]))
                    return "negLogProbX10MinusBasis: integer[] expected";
        }
        return null;
    };

    /**
     * Creates a QuizQuestionTronche message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof QuizQuestionTronche
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {QuizQuestionTronche} QuizQuestionTronche
     */
    QuizQuestionTronche.fromObject = function fromObject(object) {
        if (object instanceof $root.QuizQuestionTronche)
            return object;
        let message = new $root.QuizQuestionTronche();
        if (object.geographyA) {
            if (!Array.isArray(object.geographyA))
                throw TypeError(".QuizQuestionTronche.geographyA: array expected");
            message.geographyA = [];
            for (let i = 0; i < object.geographyA.length; ++i)
                message.geographyA[i] = object.geographyA[i] | 0;
        }
        if (object.geographyB) {
            if (!Array.isArray(object.geographyB))
                throw TypeError(".QuizQuestionTronche.geographyB: array expected");
            message.geographyB = [];
            for (let i = 0; i < object.geographyB.length; ++i)
                message.geographyB[i] = object.geographyB[i] | 0;
        }
        if (object.stat) {
            if (!Array.isArray(object.stat))
                throw TypeError(".QuizQuestionTronche.stat: array expected");
            message.stat = [];
            for (let i = 0; i < object.stat.length; ++i)
                message.stat[i] = object.stat[i] | 0;
        }
        if (object.negLogProbX10Basis != null)
            message.negLogProbX10Basis = object.negLogProbX10Basis | 0;
        if (object.negLogProbX10MinusBasis) {
            if (!Array.isArray(object.negLogProbX10MinusBasis))
                throw TypeError(".QuizQuestionTronche.negLogProbX10MinusBasis: array expected");
            message.negLogProbX10MinusBasis = [];
            for (let i = 0; i < object.negLogProbX10MinusBasis.length; ++i)
                message.negLogProbX10MinusBasis[i] = object.negLogProbX10MinusBasis[i] | 0;
        }
        return message;
    };

    /**
     * Creates a plain object from a QuizQuestionTronche message. Also converts values to other types if specified.
     * @function toObject
     * @memberof QuizQuestionTronche
     * @static
     * @param {QuizQuestionTronche} message QuizQuestionTronche
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    QuizQuestionTronche.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.geographyA = [];
            object.geographyB = [];
            object.stat = [];
            object.negLogProbX10MinusBasis = [];
        }
        if (options.defaults)
            object.negLogProbX10Basis = 0;
        if (message.geographyA && message.geographyA.length) {
            object.geographyA = [];
            for (let j = 0; j < message.geographyA.length; ++j)
                object.geographyA[j] = message.geographyA[j];
        }
        if (message.geographyB && message.geographyB.length) {
            object.geographyB = [];
            for (let j = 0; j < message.geographyB.length; ++j)
                object.geographyB[j] = message.geographyB[j];
        }
        if (message.stat && message.stat.length) {
            object.stat = [];
            for (let j = 0; j < message.stat.length; ++j)
                object.stat[j] = message.stat[j];
        }
        if (message.negLogProbX10Basis != null && message.hasOwnProperty("negLogProbX10Basis"))
            object.negLogProbX10Basis = message.negLogProbX10Basis;
        if (message.negLogProbX10MinusBasis && message.negLogProbX10MinusBasis.length) {
            object.negLogProbX10MinusBasis = [];
            for (let j = 0; j < message.negLogProbX10MinusBasis.length; ++j)
                object.negLogProbX10MinusBasis[j] = message.negLogProbX10MinusBasis[j];
        }
        return object;
    };

    /**
     * Converts this QuizQuestionTronche to JSON.
     * @function toJSON
     * @memberof QuizQuestionTronche
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    QuizQuestionTronche.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for QuizQuestionTronche
     * @function getTypeUrl
     * @memberof QuizQuestionTronche
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    QuizQuestionTronche.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/QuizQuestionTronche";
    };

    return QuizQuestionTronche;
})();

export const CountsByColumnCompressed = $root.CountsByColumnCompressed = (() => {

    /**
     * Properties of a CountsByColumnCompressed.
     * @exports ICountsByColumnCompressed
     * @interface ICountsByColumnCompressed
     * @property {Array.<number>|null} [count] CountsByColumnCompressed count
     * @property {Array.<number>|null} [countRepeat] CountsByColumnCompressed countRepeat
     */

    /**
     * Constructs a new CountsByColumnCompressed.
     * @exports CountsByColumnCompressed
     * @classdesc Represents a CountsByColumnCompressed.
     * @implements ICountsByColumnCompressed
     * @constructor
     * @param {ICountsByColumnCompressed=} [properties] Properties to set
     */
    function CountsByColumnCompressed(properties) {
        this.count = [];
        this.countRepeat = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * CountsByColumnCompressed count.
     * @member {Array.<number>} count
     * @memberof CountsByColumnCompressed
     * @instance
     */
    CountsByColumnCompressed.prototype.count = $util.emptyArray;

    /**
     * CountsByColumnCompressed countRepeat.
     * @member {Array.<number>} countRepeat
     * @memberof CountsByColumnCompressed
     * @instance
     */
    CountsByColumnCompressed.prototype.countRepeat = $util.emptyArray;

    /**
     * Creates a new CountsByColumnCompressed instance using the specified properties.
     * @function create
     * @memberof CountsByColumnCompressed
     * @static
     * @param {ICountsByColumnCompressed=} [properties] Properties to set
     * @returns {CountsByColumnCompressed} CountsByColumnCompressed instance
     */
    CountsByColumnCompressed.create = function create(properties) {
        return new CountsByColumnCompressed(properties);
    };

    /**
     * Encodes the specified CountsByColumnCompressed message. Does not implicitly {@link CountsByColumnCompressed.verify|verify} messages.
     * @function encode
     * @memberof CountsByColumnCompressed
     * @static
     * @param {ICountsByColumnCompressed} message CountsByColumnCompressed message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    CountsByColumnCompressed.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.count != null && message.count.length) {
            writer.uint32(/* id 1, wireType 2 =*/10).fork();
            for (let i = 0; i < message.count.length; ++i)
                writer.int32(message.count[i]);
            writer.ldelim();
        }
        if (message.countRepeat != null && message.countRepeat.length) {
            writer.uint32(/* id 2, wireType 2 =*/18).fork();
            for (let i = 0; i < message.countRepeat.length; ++i)
                writer.int32(message.countRepeat[i]);
            writer.ldelim();
        }
        return writer;
    };

    /**
     * Encodes the specified CountsByColumnCompressed message, length delimited. Does not implicitly {@link CountsByColumnCompressed.verify|verify} messages.
     * @function encodeDelimited
     * @memberof CountsByColumnCompressed
     * @static
     * @param {ICountsByColumnCompressed} message CountsByColumnCompressed message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    CountsByColumnCompressed.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a CountsByColumnCompressed message from the specified reader or buffer.
     * @function decode
     * @memberof CountsByColumnCompressed
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {CountsByColumnCompressed} CountsByColumnCompressed
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    CountsByColumnCompressed.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.CountsByColumnCompressed();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.count && message.count.length))
                        message.count = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.count.push(reader.int32());
                    } else
                        message.count.push(reader.int32());
                    break;
                }
            case 2: {
                    if (!(message.countRepeat && message.countRepeat.length))
                        message.countRepeat = [];
                    if ((tag & 7) === 2) {
                        let end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.countRepeat.push(reader.int32());
                    } else
                        message.countRepeat.push(reader.int32());
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a CountsByColumnCompressed message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof CountsByColumnCompressed
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {CountsByColumnCompressed} CountsByColumnCompressed
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    CountsByColumnCompressed.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a CountsByColumnCompressed message.
     * @function verify
     * @memberof CountsByColumnCompressed
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    CountsByColumnCompressed.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.count != null && message.hasOwnProperty("count")) {
            if (!Array.isArray(message.count))
                return "count: array expected";
            for (let i = 0; i < message.count.length; ++i)
                if (!$util.isInteger(message.count[i]))
                    return "count: integer[] expected";
        }
        if (message.countRepeat != null && message.hasOwnProperty("countRepeat")) {
            if (!Array.isArray(message.countRepeat))
                return "countRepeat: array expected";
            for (let i = 0; i < message.countRepeat.length; ++i)
                if (!$util.isInteger(message.countRepeat[i]))
                    return "countRepeat: integer[] expected";
        }
        return null;
    };

    /**
     * Creates a CountsByColumnCompressed message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof CountsByColumnCompressed
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {CountsByColumnCompressed} CountsByColumnCompressed
     */
    CountsByColumnCompressed.fromObject = function fromObject(object) {
        if (object instanceof $root.CountsByColumnCompressed)
            return object;
        let message = new $root.CountsByColumnCompressed();
        if (object.count) {
            if (!Array.isArray(object.count))
                throw TypeError(".CountsByColumnCompressed.count: array expected");
            message.count = [];
            for (let i = 0; i < object.count.length; ++i)
                message.count[i] = object.count[i] | 0;
        }
        if (object.countRepeat) {
            if (!Array.isArray(object.countRepeat))
                throw TypeError(".CountsByColumnCompressed.countRepeat: array expected");
            message.countRepeat = [];
            for (let i = 0; i < object.countRepeat.length; ++i)
                message.countRepeat[i] = object.countRepeat[i] | 0;
        }
        return message;
    };

    /**
     * Creates a plain object from a CountsByColumnCompressed message. Also converts values to other types if specified.
     * @function toObject
     * @memberof CountsByColumnCompressed
     * @static
     * @param {CountsByColumnCompressed} message CountsByColumnCompressed
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    CountsByColumnCompressed.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.count = [];
            object.countRepeat = [];
        }
        if (message.count && message.count.length) {
            object.count = [];
            for (let j = 0; j < message.count.length; ++j)
                object.count[j] = message.count[j];
        }
        if (message.countRepeat && message.countRepeat.length) {
            object.countRepeat = [];
            for (let j = 0; j < message.countRepeat.length; ++j)
                object.countRepeat[j] = message.countRepeat[j];
        }
        return object;
    };

    /**
     * Converts this CountsByColumnCompressed to JSON.
     * @function toJSON
     * @memberof CountsByColumnCompressed
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    CountsByColumnCompressed.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for CountsByColumnCompressed
     * @function getTypeUrl
     * @memberof CountsByColumnCompressed
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    CountsByColumnCompressed.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/CountsByColumnCompressed";
    };

    return CountsByColumnCompressed;
})();

export const CountsByArticleType = $root.CountsByArticleType = (() => {

    /**
     * Properties of a CountsByArticleType.
     * @exports ICountsByArticleType
     * @interface ICountsByArticleType
     * @property {Array.<string>|null} [articleType] CountsByArticleType articleType
     * @property {Array.<ICountsByColumnCompressed>|null} [counts] CountsByArticleType counts
     */

    /**
     * Constructs a new CountsByArticleType.
     * @exports CountsByArticleType
     * @classdesc Represents a CountsByArticleType.
     * @implements ICountsByArticleType
     * @constructor
     * @param {ICountsByArticleType=} [properties] Properties to set
     */
    function CountsByArticleType(properties) {
        this.articleType = [];
        this.counts = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * CountsByArticleType articleType.
     * @member {Array.<string>} articleType
     * @memberof CountsByArticleType
     * @instance
     */
    CountsByArticleType.prototype.articleType = $util.emptyArray;

    /**
     * CountsByArticleType counts.
     * @member {Array.<ICountsByColumnCompressed>} counts
     * @memberof CountsByArticleType
     * @instance
     */
    CountsByArticleType.prototype.counts = $util.emptyArray;

    /**
     * Creates a new CountsByArticleType instance using the specified properties.
     * @function create
     * @memberof CountsByArticleType
     * @static
     * @param {ICountsByArticleType=} [properties] Properties to set
     * @returns {CountsByArticleType} CountsByArticleType instance
     */
    CountsByArticleType.create = function create(properties) {
        return new CountsByArticleType(properties);
    };

    /**
     * Encodes the specified CountsByArticleType message. Does not implicitly {@link CountsByArticleType.verify|verify} messages.
     * @function encode
     * @memberof CountsByArticleType
     * @static
     * @param {ICountsByArticleType} message CountsByArticleType message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    CountsByArticleType.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.articleType != null && message.articleType.length)
            for (let i = 0; i < message.articleType.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.articleType[i]);
        if (message.counts != null && message.counts.length)
            for (let i = 0; i < message.counts.length; ++i)
                $root.CountsByColumnCompressed.encode(message.counts[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified CountsByArticleType message, length delimited. Does not implicitly {@link CountsByArticleType.verify|verify} messages.
     * @function encodeDelimited
     * @memberof CountsByArticleType
     * @static
     * @param {ICountsByArticleType} message CountsByArticleType message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    CountsByArticleType.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a CountsByArticleType message from the specified reader or buffer.
     * @function decode
     * @memberof CountsByArticleType
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {CountsByArticleType} CountsByArticleType
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    CountsByArticleType.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.CountsByArticleType();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.articleType && message.articleType.length))
                        message.articleType = [];
                    message.articleType.push(reader.string());
                    break;
                }
            case 2: {
                    if (!(message.counts && message.counts.length))
                        message.counts = [];
                    message.counts.push($root.CountsByColumnCompressed.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a CountsByArticleType message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof CountsByArticleType
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {CountsByArticleType} CountsByArticleType
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    CountsByArticleType.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a CountsByArticleType message.
     * @function verify
     * @memberof CountsByArticleType
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    CountsByArticleType.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.articleType != null && message.hasOwnProperty("articleType")) {
            if (!Array.isArray(message.articleType))
                return "articleType: array expected";
            for (let i = 0; i < message.articleType.length; ++i)
                if (!$util.isString(message.articleType[i]))
                    return "articleType: string[] expected";
        }
        if (message.counts != null && message.hasOwnProperty("counts")) {
            if (!Array.isArray(message.counts))
                return "counts: array expected";
            for (let i = 0; i < message.counts.length; ++i) {
                let error = $root.CountsByColumnCompressed.verify(message.counts[i]);
                if (error)
                    return "counts." + error;
            }
        }
        return null;
    };

    /**
     * Creates a CountsByArticleType message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof CountsByArticleType
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {CountsByArticleType} CountsByArticleType
     */
    CountsByArticleType.fromObject = function fromObject(object) {
        if (object instanceof $root.CountsByArticleType)
            return object;
        let message = new $root.CountsByArticleType();
        if (object.articleType) {
            if (!Array.isArray(object.articleType))
                throw TypeError(".CountsByArticleType.articleType: array expected");
            message.articleType = [];
            for (let i = 0; i < object.articleType.length; ++i)
                message.articleType[i] = String(object.articleType[i]);
        }
        if (object.counts) {
            if (!Array.isArray(object.counts))
                throw TypeError(".CountsByArticleType.counts: array expected");
            message.counts = [];
            for (let i = 0; i < object.counts.length; ++i) {
                if (typeof object.counts[i] !== "object")
                    throw TypeError(".CountsByArticleType.counts: object expected");
                message.counts[i] = $root.CountsByColumnCompressed.fromObject(object.counts[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a CountsByArticleType message. Also converts values to other types if specified.
     * @function toObject
     * @memberof CountsByArticleType
     * @static
     * @param {CountsByArticleType} message CountsByArticleType
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    CountsByArticleType.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.articleType = [];
            object.counts = [];
        }
        if (message.articleType && message.articleType.length) {
            object.articleType = [];
            for (let j = 0; j < message.articleType.length; ++j)
                object.articleType[j] = message.articleType[j];
        }
        if (message.counts && message.counts.length) {
            object.counts = [];
            for (let j = 0; j < message.counts.length; ++j)
                object.counts[j] = $root.CountsByColumnCompressed.toObject(message.counts[j], options);
        }
        return object;
    };

    /**
     * Converts this CountsByArticleType to JSON.
     * @function toJSON
     * @memberof CountsByArticleType
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    CountsByArticleType.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for CountsByArticleType
     * @function getTypeUrl
     * @memberof CountsByArticleType
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    CountsByArticleType.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/CountsByArticleType";
    };

    return CountsByArticleType;
})();

export const CountsByArticleUniverseAndType = $root.CountsByArticleUniverseAndType = (() => {

    /**
     * Properties of a CountsByArticleUniverseAndType.
     * @exports ICountsByArticleUniverseAndType
     * @interface ICountsByArticleUniverseAndType
     * @property {Array.<string>|null} [universe] CountsByArticleUniverseAndType universe
     * @property {Array.<ICountsByArticleType>|null} [countsByType] CountsByArticleUniverseAndType countsByType
     */

    /**
     * Constructs a new CountsByArticleUniverseAndType.
     * @exports CountsByArticleUniverseAndType
     * @classdesc Represents a CountsByArticleUniverseAndType.
     * @implements ICountsByArticleUniverseAndType
     * @constructor
     * @param {ICountsByArticleUniverseAndType=} [properties] Properties to set
     */
    function CountsByArticleUniverseAndType(properties) {
        this.universe = [];
        this.countsByType = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * CountsByArticleUniverseAndType universe.
     * @member {Array.<string>} universe
     * @memberof CountsByArticleUniverseAndType
     * @instance
     */
    CountsByArticleUniverseAndType.prototype.universe = $util.emptyArray;

    /**
     * CountsByArticleUniverseAndType countsByType.
     * @member {Array.<ICountsByArticleType>} countsByType
     * @memberof CountsByArticleUniverseAndType
     * @instance
     */
    CountsByArticleUniverseAndType.prototype.countsByType = $util.emptyArray;

    /**
     * Creates a new CountsByArticleUniverseAndType instance using the specified properties.
     * @function create
     * @memberof CountsByArticleUniverseAndType
     * @static
     * @param {ICountsByArticleUniverseAndType=} [properties] Properties to set
     * @returns {CountsByArticleUniverseAndType} CountsByArticleUniverseAndType instance
     */
    CountsByArticleUniverseAndType.create = function create(properties) {
        return new CountsByArticleUniverseAndType(properties);
    };

    /**
     * Encodes the specified CountsByArticleUniverseAndType message. Does not implicitly {@link CountsByArticleUniverseAndType.verify|verify} messages.
     * @function encode
     * @memberof CountsByArticleUniverseAndType
     * @static
     * @param {ICountsByArticleUniverseAndType} message CountsByArticleUniverseAndType message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    CountsByArticleUniverseAndType.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.universe != null && message.universe.length)
            for (let i = 0; i < message.universe.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.universe[i]);
        if (message.countsByType != null && message.countsByType.length)
            for (let i = 0; i < message.countsByType.length; ++i)
                $root.CountsByArticleType.encode(message.countsByType[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified CountsByArticleUniverseAndType message, length delimited. Does not implicitly {@link CountsByArticleUniverseAndType.verify|verify} messages.
     * @function encodeDelimited
     * @memberof CountsByArticleUniverseAndType
     * @static
     * @param {ICountsByArticleUniverseAndType} message CountsByArticleUniverseAndType message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    CountsByArticleUniverseAndType.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a CountsByArticleUniverseAndType message from the specified reader or buffer.
     * @function decode
     * @memberof CountsByArticleUniverseAndType
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {CountsByArticleUniverseAndType} CountsByArticleUniverseAndType
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    CountsByArticleUniverseAndType.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.CountsByArticleUniverseAndType();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.universe && message.universe.length))
                        message.universe = [];
                    message.universe.push(reader.string());
                    break;
                }
            case 2: {
                    if (!(message.countsByType && message.countsByType.length))
                        message.countsByType = [];
                    message.countsByType.push($root.CountsByArticleType.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a CountsByArticleUniverseAndType message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof CountsByArticleUniverseAndType
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {CountsByArticleUniverseAndType} CountsByArticleUniverseAndType
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    CountsByArticleUniverseAndType.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a CountsByArticleUniverseAndType message.
     * @function verify
     * @memberof CountsByArticleUniverseAndType
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    CountsByArticleUniverseAndType.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.universe != null && message.hasOwnProperty("universe")) {
            if (!Array.isArray(message.universe))
                return "universe: array expected";
            for (let i = 0; i < message.universe.length; ++i)
                if (!$util.isString(message.universe[i]))
                    return "universe: string[] expected";
        }
        if (message.countsByType != null && message.hasOwnProperty("countsByType")) {
            if (!Array.isArray(message.countsByType))
                return "countsByType: array expected";
            for (let i = 0; i < message.countsByType.length; ++i) {
                let error = $root.CountsByArticleType.verify(message.countsByType[i]);
                if (error)
                    return "countsByType." + error;
            }
        }
        return null;
    };

    /**
     * Creates a CountsByArticleUniverseAndType message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof CountsByArticleUniverseAndType
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {CountsByArticleUniverseAndType} CountsByArticleUniverseAndType
     */
    CountsByArticleUniverseAndType.fromObject = function fromObject(object) {
        if (object instanceof $root.CountsByArticleUniverseAndType)
            return object;
        let message = new $root.CountsByArticleUniverseAndType();
        if (object.universe) {
            if (!Array.isArray(object.universe))
                throw TypeError(".CountsByArticleUniverseAndType.universe: array expected");
            message.universe = [];
            for (let i = 0; i < object.universe.length; ++i)
                message.universe[i] = String(object.universe[i]);
        }
        if (object.countsByType) {
            if (!Array.isArray(object.countsByType))
                throw TypeError(".CountsByArticleUniverseAndType.countsByType: array expected");
            message.countsByType = [];
            for (let i = 0; i < object.countsByType.length; ++i) {
                if (typeof object.countsByType[i] !== "object")
                    throw TypeError(".CountsByArticleUniverseAndType.countsByType: object expected");
                message.countsByType[i] = $root.CountsByArticleType.fromObject(object.countsByType[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a CountsByArticleUniverseAndType message. Also converts values to other types if specified.
     * @function toObject
     * @memberof CountsByArticleUniverseAndType
     * @static
     * @param {CountsByArticleUniverseAndType} message CountsByArticleUniverseAndType
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    CountsByArticleUniverseAndType.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.universe = [];
            object.countsByType = [];
        }
        if (message.universe && message.universe.length) {
            object.universe = [];
            for (let j = 0; j < message.universe.length; ++j)
                object.universe[j] = message.universe[j];
        }
        if (message.countsByType && message.countsByType.length) {
            object.countsByType = [];
            for (let j = 0; j < message.countsByType.length; ++j)
                object.countsByType[j] = $root.CountsByArticleType.toObject(message.countsByType[j], options);
        }
        return object;
    };

    /**
     * Converts this CountsByArticleUniverseAndType to JSON.
     * @function toJSON
     * @memberof CountsByArticleUniverseAndType
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    CountsByArticleUniverseAndType.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for CountsByArticleUniverseAndType
     * @function getTypeUrl
     * @memberof CountsByArticleUniverseAndType
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    CountsByArticleUniverseAndType.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/CountsByArticleUniverseAndType";
    };

    return CountsByArticleUniverseAndType;
})();

export const Symlinks = $root.Symlinks = (() => {

    /**
     * Properties of a Symlinks.
     * @exports ISymlinks
     * @interface ISymlinks
     * @property {Array.<string>|null} [linkName] Symlinks linkName
     * @property {Array.<string>|null} [targetName] Symlinks targetName
     */

    /**
     * Constructs a new Symlinks.
     * @exports Symlinks
     * @classdesc Represents a Symlinks.
     * @implements ISymlinks
     * @constructor
     * @param {ISymlinks=} [properties] Properties to set
     */
    function Symlinks(properties) {
        this.linkName = [];
        this.targetName = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Symlinks linkName.
     * @member {Array.<string>} linkName
     * @memberof Symlinks
     * @instance
     */
    Symlinks.prototype.linkName = $util.emptyArray;

    /**
     * Symlinks targetName.
     * @member {Array.<string>} targetName
     * @memberof Symlinks
     * @instance
     */
    Symlinks.prototype.targetName = $util.emptyArray;

    /**
     * Creates a new Symlinks instance using the specified properties.
     * @function create
     * @memberof Symlinks
     * @static
     * @param {ISymlinks=} [properties] Properties to set
     * @returns {Symlinks} Symlinks instance
     */
    Symlinks.create = function create(properties) {
        return new Symlinks(properties);
    };

    /**
     * Encodes the specified Symlinks message. Does not implicitly {@link Symlinks.verify|verify} messages.
     * @function encode
     * @memberof Symlinks
     * @static
     * @param {ISymlinks} message Symlinks message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Symlinks.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.linkName != null && message.linkName.length)
            for (let i = 0; i < message.linkName.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.linkName[i]);
        if (message.targetName != null && message.targetName.length)
            for (let i = 0; i < message.targetName.length; ++i)
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.targetName[i]);
        return writer;
    };

    /**
     * Encodes the specified Symlinks message, length delimited. Does not implicitly {@link Symlinks.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Symlinks
     * @static
     * @param {ISymlinks} message Symlinks message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Symlinks.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Symlinks message from the specified reader or buffer.
     * @function decode
     * @memberof Symlinks
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Symlinks} Symlinks
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Symlinks.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Symlinks();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.linkName && message.linkName.length))
                        message.linkName = [];
                    message.linkName.push(reader.string());
                    break;
                }
            case 2: {
                    if (!(message.targetName && message.targetName.length))
                        message.targetName = [];
                    message.targetName.push(reader.string());
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Symlinks message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Symlinks
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Symlinks} Symlinks
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Symlinks.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Symlinks message.
     * @function verify
     * @memberof Symlinks
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Symlinks.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.linkName != null && message.hasOwnProperty("linkName")) {
            if (!Array.isArray(message.linkName))
                return "linkName: array expected";
            for (let i = 0; i < message.linkName.length; ++i)
                if (!$util.isString(message.linkName[i]))
                    return "linkName: string[] expected";
        }
        if (message.targetName != null && message.hasOwnProperty("targetName")) {
            if (!Array.isArray(message.targetName))
                return "targetName: array expected";
            for (let i = 0; i < message.targetName.length; ++i)
                if (!$util.isString(message.targetName[i]))
                    return "targetName: string[] expected";
        }
        return null;
    };

    /**
     * Creates a Symlinks message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Symlinks
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Symlinks} Symlinks
     */
    Symlinks.fromObject = function fromObject(object) {
        if (object instanceof $root.Symlinks)
            return object;
        let message = new $root.Symlinks();
        if (object.linkName) {
            if (!Array.isArray(object.linkName))
                throw TypeError(".Symlinks.linkName: array expected");
            message.linkName = [];
            for (let i = 0; i < object.linkName.length; ++i)
                message.linkName[i] = String(object.linkName[i]);
        }
        if (object.targetName) {
            if (!Array.isArray(object.targetName))
                throw TypeError(".Symlinks.targetName: array expected");
            message.targetName = [];
            for (let i = 0; i < object.targetName.length; ++i)
                message.targetName[i] = String(object.targetName[i]);
        }
        return message;
    };

    /**
     * Creates a plain object from a Symlinks message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Symlinks
     * @static
     * @param {Symlinks} message Symlinks
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Symlinks.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.linkName = [];
            object.targetName = [];
        }
        if (message.linkName && message.linkName.length) {
            object.linkName = [];
            for (let j = 0; j < message.linkName.length; ++j)
                object.linkName[j] = message.linkName[j];
        }
        if (message.targetName && message.targetName.length) {
            object.targetName = [];
            for (let j = 0; j < message.targetName.length; ++j)
                object.targetName[j] = message.targetName[j];
        }
        return object;
    };

    /**
     * Converts this Symlinks to JSON.
     * @function toJSON
     * @memberof Symlinks
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Symlinks.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for Symlinks
     * @function getTypeUrl
     * @memberof Symlinks
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    Symlinks.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/Symlinks";
    };

    return Symlinks;
})();

export const DefaultUniverseTriple = $root.DefaultUniverseTriple = (() => {

    /**
     * Properties of a DefaultUniverseTriple.
     * @exports IDefaultUniverseTriple
     * @interface IDefaultUniverseTriple
     * @property {number|null} [typeIdx] DefaultUniverseTriple typeIdx
     * @property {number|null} [statIdx] DefaultUniverseTriple statIdx
     * @property {number|null} [universeIdx] DefaultUniverseTriple universeIdx
     */

    /**
     * Constructs a new DefaultUniverseTriple.
     * @exports DefaultUniverseTriple
     * @classdesc Represents a DefaultUniverseTriple.
     * @implements IDefaultUniverseTriple
     * @constructor
     * @param {IDefaultUniverseTriple=} [properties] Properties to set
     */
    function DefaultUniverseTriple(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * DefaultUniverseTriple typeIdx.
     * @member {number|null|undefined} typeIdx
     * @memberof DefaultUniverseTriple
     * @instance
     */
    DefaultUniverseTriple.prototype.typeIdx = null;

    /**
     * DefaultUniverseTriple statIdx.
     * @member {number|null|undefined} statIdx
     * @memberof DefaultUniverseTriple
     * @instance
     */
    DefaultUniverseTriple.prototype.statIdx = null;

    /**
     * DefaultUniverseTriple universeIdx.
     * @member {number|null|undefined} universeIdx
     * @memberof DefaultUniverseTriple
     * @instance
     */
    DefaultUniverseTriple.prototype.universeIdx = null;

    // OneOf field names bound to virtual getters and setters
    let $oneOfFields;

    /**
     * DefaultUniverseTriple _typeIdx.
     * @member {"typeIdx"|undefined} _typeIdx
     * @memberof DefaultUniverseTriple
     * @instance
     */
    Object.defineProperty(DefaultUniverseTriple.prototype, "_typeIdx", {
        get: $util.oneOfGetter($oneOfFields = ["typeIdx"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * DefaultUniverseTriple _statIdx.
     * @member {"statIdx"|undefined} _statIdx
     * @memberof DefaultUniverseTriple
     * @instance
     */
    Object.defineProperty(DefaultUniverseTriple.prototype, "_statIdx", {
        get: $util.oneOfGetter($oneOfFields = ["statIdx"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * DefaultUniverseTriple _universeIdx.
     * @member {"universeIdx"|undefined} _universeIdx
     * @memberof DefaultUniverseTriple
     * @instance
     */
    Object.defineProperty(DefaultUniverseTriple.prototype, "_universeIdx", {
        get: $util.oneOfGetter($oneOfFields = ["universeIdx"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Creates a new DefaultUniverseTriple instance using the specified properties.
     * @function create
     * @memberof DefaultUniverseTriple
     * @static
     * @param {IDefaultUniverseTriple=} [properties] Properties to set
     * @returns {DefaultUniverseTriple} DefaultUniverseTriple instance
     */
    DefaultUniverseTriple.create = function create(properties) {
        return new DefaultUniverseTriple(properties);
    };

    /**
     * Encodes the specified DefaultUniverseTriple message. Does not implicitly {@link DefaultUniverseTriple.verify|verify} messages.
     * @function encode
     * @memberof DefaultUniverseTriple
     * @static
     * @param {IDefaultUniverseTriple} message DefaultUniverseTriple message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    DefaultUniverseTriple.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.typeIdx != null && Object.hasOwnProperty.call(message, "typeIdx"))
            writer.uint32(/* id 1, wireType 0 =*/8).int32(message.typeIdx);
        if (message.statIdx != null && Object.hasOwnProperty.call(message, "statIdx"))
            writer.uint32(/* id 2, wireType 0 =*/16).int32(message.statIdx);
        if (message.universeIdx != null && Object.hasOwnProperty.call(message, "universeIdx"))
            writer.uint32(/* id 3, wireType 0 =*/24).int32(message.universeIdx);
        return writer;
    };

    /**
     * Encodes the specified DefaultUniverseTriple message, length delimited. Does not implicitly {@link DefaultUniverseTriple.verify|verify} messages.
     * @function encodeDelimited
     * @memberof DefaultUniverseTriple
     * @static
     * @param {IDefaultUniverseTriple} message DefaultUniverseTriple message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    DefaultUniverseTriple.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a DefaultUniverseTriple message from the specified reader or buffer.
     * @function decode
     * @memberof DefaultUniverseTriple
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {DefaultUniverseTriple} DefaultUniverseTriple
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    DefaultUniverseTriple.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.DefaultUniverseTriple();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.typeIdx = reader.int32();
                    break;
                }
            case 2: {
                    message.statIdx = reader.int32();
                    break;
                }
            case 3: {
                    message.universeIdx = reader.int32();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a DefaultUniverseTriple message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof DefaultUniverseTriple
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {DefaultUniverseTriple} DefaultUniverseTriple
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    DefaultUniverseTriple.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a DefaultUniverseTriple message.
     * @function verify
     * @memberof DefaultUniverseTriple
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    DefaultUniverseTriple.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        let properties = {};
        if (message.typeIdx != null && message.hasOwnProperty("typeIdx")) {
            properties._typeIdx = 1;
            if (!$util.isInteger(message.typeIdx))
                return "typeIdx: integer expected";
        }
        if (message.statIdx != null && message.hasOwnProperty("statIdx")) {
            properties._statIdx = 1;
            if (!$util.isInteger(message.statIdx))
                return "statIdx: integer expected";
        }
        if (message.universeIdx != null && message.hasOwnProperty("universeIdx")) {
            properties._universeIdx = 1;
            if (!$util.isInteger(message.universeIdx))
                return "universeIdx: integer expected";
        }
        return null;
    };

    /**
     * Creates a DefaultUniverseTriple message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof DefaultUniverseTriple
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {DefaultUniverseTriple} DefaultUniverseTriple
     */
    DefaultUniverseTriple.fromObject = function fromObject(object) {
        if (object instanceof $root.DefaultUniverseTriple)
            return object;
        let message = new $root.DefaultUniverseTriple();
        if (object.typeIdx != null)
            message.typeIdx = object.typeIdx | 0;
        if (object.statIdx != null)
            message.statIdx = object.statIdx | 0;
        if (object.universeIdx != null)
            message.universeIdx = object.universeIdx | 0;
        return message;
    };

    /**
     * Creates a plain object from a DefaultUniverseTriple message. Also converts values to other types if specified.
     * @function toObject
     * @memberof DefaultUniverseTriple
     * @static
     * @param {DefaultUniverseTriple} message DefaultUniverseTriple
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    DefaultUniverseTriple.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (message.typeIdx != null && message.hasOwnProperty("typeIdx")) {
            object.typeIdx = message.typeIdx;
            if (options.oneofs)
                object._typeIdx = "typeIdx";
        }
        if (message.statIdx != null && message.hasOwnProperty("statIdx")) {
            object.statIdx = message.statIdx;
            if (options.oneofs)
                object._statIdx = "statIdx";
        }
        if (message.universeIdx != null && message.hasOwnProperty("universeIdx")) {
            object.universeIdx = message.universeIdx;
            if (options.oneofs)
                object._universeIdx = "universeIdx";
        }
        return object;
    };

    /**
     * Converts this DefaultUniverseTriple to JSON.
     * @function toJSON
     * @memberof DefaultUniverseTriple
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    DefaultUniverseTriple.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for DefaultUniverseTriple
     * @function getTypeUrl
     * @memberof DefaultUniverseTriple
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    DefaultUniverseTriple.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/DefaultUniverseTriple";
    };

    return DefaultUniverseTriple;
})();

export const DefaultUniverseTable = $root.DefaultUniverseTable = (() => {

    /**
     * Properties of a DefaultUniverseTable.
     * @exports IDefaultUniverseTable
     * @interface IDefaultUniverseTable
     * @property {number|null} [mostCommonUniverseIdx] DefaultUniverseTable mostCommonUniverseIdx
     * @property {Array.<IDefaultUniverseTriple>|null} [exceptions] DefaultUniverseTable exceptions
     */

    /**
     * Constructs a new DefaultUniverseTable.
     * @exports DefaultUniverseTable
     * @classdesc Represents a DefaultUniverseTable.
     * @implements IDefaultUniverseTable
     * @constructor
     * @param {IDefaultUniverseTable=} [properties] Properties to set
     */
    function DefaultUniverseTable(properties) {
        this.exceptions = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * DefaultUniverseTable mostCommonUniverseIdx.
     * @member {number|null|undefined} mostCommonUniverseIdx
     * @memberof DefaultUniverseTable
     * @instance
     */
    DefaultUniverseTable.prototype.mostCommonUniverseIdx = null;

    /**
     * DefaultUniverseTable exceptions.
     * @member {Array.<IDefaultUniverseTriple>} exceptions
     * @memberof DefaultUniverseTable
     * @instance
     */
    DefaultUniverseTable.prototype.exceptions = $util.emptyArray;

    // OneOf field names bound to virtual getters and setters
    let $oneOfFields;

    /**
     * DefaultUniverseTable _mostCommonUniverseIdx.
     * @member {"mostCommonUniverseIdx"|undefined} _mostCommonUniverseIdx
     * @memberof DefaultUniverseTable
     * @instance
     */
    Object.defineProperty(DefaultUniverseTable.prototype, "_mostCommonUniverseIdx", {
        get: $util.oneOfGetter($oneOfFields = ["mostCommonUniverseIdx"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Creates a new DefaultUniverseTable instance using the specified properties.
     * @function create
     * @memberof DefaultUniverseTable
     * @static
     * @param {IDefaultUniverseTable=} [properties] Properties to set
     * @returns {DefaultUniverseTable} DefaultUniverseTable instance
     */
    DefaultUniverseTable.create = function create(properties) {
        return new DefaultUniverseTable(properties);
    };

    /**
     * Encodes the specified DefaultUniverseTable message. Does not implicitly {@link DefaultUniverseTable.verify|verify} messages.
     * @function encode
     * @memberof DefaultUniverseTable
     * @static
     * @param {IDefaultUniverseTable} message DefaultUniverseTable message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    DefaultUniverseTable.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.mostCommonUniverseIdx != null && Object.hasOwnProperty.call(message, "mostCommonUniverseIdx"))
            writer.uint32(/* id 1, wireType 0 =*/8).int32(message.mostCommonUniverseIdx);
        if (message.exceptions != null && message.exceptions.length)
            for (let i = 0; i < message.exceptions.length; ++i)
                $root.DefaultUniverseTriple.encode(message.exceptions[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified DefaultUniverseTable message, length delimited. Does not implicitly {@link DefaultUniverseTable.verify|verify} messages.
     * @function encodeDelimited
     * @memberof DefaultUniverseTable
     * @static
     * @param {IDefaultUniverseTable} message DefaultUniverseTable message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    DefaultUniverseTable.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a DefaultUniverseTable message from the specified reader or buffer.
     * @function decode
     * @memberof DefaultUniverseTable
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {DefaultUniverseTable} DefaultUniverseTable
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    DefaultUniverseTable.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.DefaultUniverseTable();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.mostCommonUniverseIdx = reader.int32();
                    break;
                }
            case 2: {
                    if (!(message.exceptions && message.exceptions.length))
                        message.exceptions = [];
                    message.exceptions.push($root.DefaultUniverseTriple.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a DefaultUniverseTable message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof DefaultUniverseTable
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {DefaultUniverseTable} DefaultUniverseTable
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    DefaultUniverseTable.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a DefaultUniverseTable message.
     * @function verify
     * @memberof DefaultUniverseTable
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    DefaultUniverseTable.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        let properties = {};
        if (message.mostCommonUniverseIdx != null && message.hasOwnProperty("mostCommonUniverseIdx")) {
            properties._mostCommonUniverseIdx = 1;
            if (!$util.isInteger(message.mostCommonUniverseIdx))
                return "mostCommonUniverseIdx: integer expected";
        }
        if (message.exceptions != null && message.hasOwnProperty("exceptions")) {
            if (!Array.isArray(message.exceptions))
                return "exceptions: array expected";
            for (let i = 0; i < message.exceptions.length; ++i) {
                let error = $root.DefaultUniverseTriple.verify(message.exceptions[i]);
                if (error)
                    return "exceptions." + error;
            }
        }
        return null;
    };

    /**
     * Creates a DefaultUniverseTable message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof DefaultUniverseTable
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {DefaultUniverseTable} DefaultUniverseTable
     */
    DefaultUniverseTable.fromObject = function fromObject(object) {
        if (object instanceof $root.DefaultUniverseTable)
            return object;
        let message = new $root.DefaultUniverseTable();
        if (object.mostCommonUniverseIdx != null)
            message.mostCommonUniverseIdx = object.mostCommonUniverseIdx | 0;
        if (object.exceptions) {
            if (!Array.isArray(object.exceptions))
                throw TypeError(".DefaultUniverseTable.exceptions: array expected");
            message.exceptions = [];
            for (let i = 0; i < object.exceptions.length; ++i) {
                if (typeof object.exceptions[i] !== "object")
                    throw TypeError(".DefaultUniverseTable.exceptions: object expected");
                message.exceptions[i] = $root.DefaultUniverseTriple.fromObject(object.exceptions[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a DefaultUniverseTable message. Also converts values to other types if specified.
     * @function toObject
     * @memberof DefaultUniverseTable
     * @static
     * @param {DefaultUniverseTable} message DefaultUniverseTable
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    DefaultUniverseTable.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.exceptions = [];
        if (message.mostCommonUniverseIdx != null && message.hasOwnProperty("mostCommonUniverseIdx")) {
            object.mostCommonUniverseIdx = message.mostCommonUniverseIdx;
            if (options.oneofs)
                object._mostCommonUniverseIdx = "mostCommonUniverseIdx";
        }
        if (message.exceptions && message.exceptions.length) {
            object.exceptions = [];
            for (let j = 0; j < message.exceptions.length; ++j)
                object.exceptions[j] = $root.DefaultUniverseTriple.toObject(message.exceptions[j], options);
        }
        return object;
    };

    /**
     * Converts this DefaultUniverseTable to JSON.
     * @function toJSON
     * @memberof DefaultUniverseTable
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    DefaultUniverseTable.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for DefaultUniverseTable
     * @function getTypeUrl
     * @memberof DefaultUniverseTable
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    DefaultUniverseTable.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/DefaultUniverseTable";
    };

    return DefaultUniverseTable;
})();

export { $root as default };
