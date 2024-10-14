/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.StatisticRow = (function() {

    /**
     * Properties of a StatisticRow.
     * @exports IStatisticRow
     * @interface IStatisticRow
     * @property {number|null} [statval] StatisticRow statval
     * @property {Array.<number>|null} [ordinalByUniverse] StatisticRow ordinalByUniverse
     * @property {Array.<number>|null} [overallOrdinalByUniverse] StatisticRow overallOrdinalByUniverse
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
        this.overallOrdinalByUniverse = [];
        this.percentileByPopulationByUniverse = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
     * StatisticRow overallOrdinalByUniverse.
     * @member {Array.<number>} overallOrdinalByUniverse
     * @memberof StatisticRow
     * @instance
     */
    StatisticRow.prototype.overallOrdinalByUniverse = $util.emptyArray;

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
            for (var i = 0; i < message.ordinalByUniverse.length; ++i)
                writer.int32(message.ordinalByUniverse[i]);
            writer.ldelim();
        }
        if (message.overallOrdinalByUniverse != null && message.overallOrdinalByUniverse.length) {
            writer.uint32(/* id 3, wireType 2 =*/26).fork();
            for (var i = 0; i < message.overallOrdinalByUniverse.length; ++i)
                writer.int32(message.overallOrdinalByUniverse[i]);
            writer.ldelim();
        }
        if (message.percentileByPopulationByUniverse != null && message.percentileByPopulationByUniverse.length) {
            writer.uint32(/* id 4, wireType 2 =*/34).fork();
            for (var i = 0; i < message.percentileByPopulationByUniverse.length; ++i)
                writer.float(message.percentileByPopulationByUniverse[i]);
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.StatisticRow();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.statval = reader.float();
                    break;
                }
            case 2: {
                    if (!(message.ordinalByUniverse && message.ordinalByUniverse.length))
                        message.ordinalByUniverse = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.ordinalByUniverse.push(reader.int32());
                    } else
                        message.ordinalByUniverse.push(reader.int32());
                    break;
                }
            case 3: {
                    if (!(message.overallOrdinalByUniverse && message.overallOrdinalByUniverse.length))
                        message.overallOrdinalByUniverse = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.overallOrdinalByUniverse.push(reader.int32());
                    } else
                        message.overallOrdinalByUniverse.push(reader.int32());
                    break;
                }
            case 4: {
                    if (!(message.percentileByPopulationByUniverse && message.percentileByPopulationByUniverse.length))
                        message.percentileByPopulationByUniverse = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.percentileByPopulationByUniverse.push(reader.float());
                    } else
                        message.percentileByPopulationByUniverse.push(reader.float());
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
            for (var i = 0; i < message.ordinalByUniverse.length; ++i)
                if (!$util.isInteger(message.ordinalByUniverse[i]))
                    return "ordinalByUniverse: integer[] expected";
        }
        if (message.overallOrdinalByUniverse != null && message.hasOwnProperty("overallOrdinalByUniverse")) {
            if (!Array.isArray(message.overallOrdinalByUniverse))
                return "overallOrdinalByUniverse: array expected";
            for (var i = 0; i < message.overallOrdinalByUniverse.length; ++i)
                if (!$util.isInteger(message.overallOrdinalByUniverse[i]))
                    return "overallOrdinalByUniverse: integer[] expected";
        }
        if (message.percentileByPopulationByUniverse != null && message.hasOwnProperty("percentileByPopulationByUniverse")) {
            if (!Array.isArray(message.percentileByPopulationByUniverse))
                return "percentileByPopulationByUniverse: array expected";
            for (var i = 0; i < message.percentileByPopulationByUniverse.length; ++i)
                if (typeof message.percentileByPopulationByUniverse[i] !== "number")
                    return "percentileByPopulationByUniverse: number[] expected";
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
        var message = new $root.StatisticRow();
        if (object.statval != null)
            message.statval = Number(object.statval);
        if (object.ordinalByUniverse) {
            if (!Array.isArray(object.ordinalByUniverse))
                throw TypeError(".StatisticRow.ordinalByUniverse: array expected");
            message.ordinalByUniverse = [];
            for (var i = 0; i < object.ordinalByUniverse.length; ++i)
                message.ordinalByUniverse[i] = object.ordinalByUniverse[i] | 0;
        }
        if (object.overallOrdinalByUniverse) {
            if (!Array.isArray(object.overallOrdinalByUniverse))
                throw TypeError(".StatisticRow.overallOrdinalByUniverse: array expected");
            message.overallOrdinalByUniverse = [];
            for (var i = 0; i < object.overallOrdinalByUniverse.length; ++i)
                message.overallOrdinalByUniverse[i] = object.overallOrdinalByUniverse[i] | 0;
        }
        if (object.percentileByPopulationByUniverse) {
            if (!Array.isArray(object.percentileByPopulationByUniverse))
                throw TypeError(".StatisticRow.percentileByPopulationByUniverse: array expected");
            message.percentileByPopulationByUniverse = [];
            for (var i = 0; i < object.percentileByPopulationByUniverse.length; ++i)
                message.percentileByPopulationByUniverse[i] = Number(object.percentileByPopulationByUniverse[i]);
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
        var object = {};
        if (options.arrays || options.defaults) {
            object.ordinalByUniverse = [];
            object.overallOrdinalByUniverse = [];
            object.percentileByPopulationByUniverse = [];
        }
        if (options.defaults)
            object.statval = 0;
        if (message.statval != null && message.hasOwnProperty("statval"))
            object.statval = options.json && !isFinite(message.statval) ? String(message.statval) : message.statval;
        if (message.ordinalByUniverse && message.ordinalByUniverse.length) {
            object.ordinalByUniverse = [];
            for (var j = 0; j < message.ordinalByUniverse.length; ++j)
                object.ordinalByUniverse[j] = message.ordinalByUniverse[j];
        }
        if (message.overallOrdinalByUniverse && message.overallOrdinalByUniverse.length) {
            object.overallOrdinalByUniverse = [];
            for (var j = 0; j < message.overallOrdinalByUniverse.length; ++j)
                object.overallOrdinalByUniverse[j] = message.overallOrdinalByUniverse[j];
        }
        if (message.percentileByPopulationByUniverse && message.percentileByPopulationByUniverse.length) {
            object.percentileByPopulationByUniverse = [];
            for (var j = 0; j < message.percentileByPopulationByUniverse.length; ++j)
                object.percentileByPopulationByUniverse[j] = options.json && !isFinite(message.percentileByPopulationByUniverse[j]) ? String(message.percentileByPopulationByUniverse[j]) : message.percentileByPopulationByUniverse[j];
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

$root.RelatedButton = (function() {

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
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.RelatedButton();
        while (reader.pos < end) {
            var tag = reader.uint32();
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
        var message = new $root.RelatedButton();
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
        var object = {};
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

$root.RelatedButtons = (function() {

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
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
            for (var i = 0; i < message.buttons.length; ++i)
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.RelatedButtons();
        while (reader.pos < end) {
            var tag = reader.uint32();
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
            for (var i = 0; i < message.buttons.length; ++i) {
                var error = $root.RelatedButton.verify(message.buttons[i]);
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
        var message = new $root.RelatedButtons();
        if (object.relationshipType != null)
            message.relationshipType = String(object.relationshipType);
        if (object.buttons) {
            if (!Array.isArray(object.buttons))
                throw TypeError(".RelatedButtons.buttons: array expected");
            message.buttons = [];
            for (var i = 0; i < object.buttons.length; ++i) {
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
        var object = {};
        if (options.arrays || options.defaults)
            object.buttons = [];
        if (options.defaults)
            object.relationshipType = "";
        if (message.relationshipType != null && message.hasOwnProperty("relationshipType"))
            object.relationshipType = message.relationshipType;
        if (message.buttons && message.buttons.length) {
            object.buttons = [];
            for (var j = 0; j < message.buttons.length; ++j)
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

$root.Histogram = (function() {

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
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
            for (var i = 0; i < message.counts.length; ++i)
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.Histogram();
        while (reader.pos < end) {
            var tag = reader.uint32();
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
                        var end2 = reader.uint32() + reader.pos;
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
            for (var i = 0; i < message.counts.length; ++i)
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
        var message = new $root.Histogram();
        if (object.binMin != null)
            message.binMin = Number(object.binMin);
        if (object.binSize != null)
            message.binSize = Number(object.binSize);
        if (object.counts) {
            if (!Array.isArray(object.counts))
                throw TypeError(".Histogram.counts: array expected");
            message.counts = [];
            for (var i = 0; i < object.counts.length; ++i)
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
        var object = {};
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
            for (var j = 0; j < message.counts.length; ++j)
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

$root.TimeSeries = (function() {

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
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
            for (var i = 0; i < message.values.length; ++i)
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.TimeSeries();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.values && message.values.length))
                        message.values = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
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
            for (var i = 0; i < message.values.length; ++i)
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
        var message = new $root.TimeSeries();
        if (object.values) {
            if (!Array.isArray(object.values))
                throw TypeError(".TimeSeries.values: array expected");
            message.values = [];
            for (var i = 0; i < object.values.length; ++i)
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
        var object = {};
        if (options.arrays || options.defaults)
            object.values = [];
        if (message.values && message.values.length) {
            object.values = [];
            for (var j = 0; j < message.values.length; ++j)
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

$root.ExtraStatistic = (function() {

    /**
     * Properties of an ExtraStatistic.
     * @exports IExtraStatistic
     * @interface IExtraStatistic
     * @property {IHistogram|null} [histogram] ExtraStatistic histogram
     * @property {ITimeSeries|null} [timeseries] ExtraStatistic timeseries
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
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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

    // OneOf field names bound to virtual getters and setters
    var $oneOfFields;

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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.ExtraStatistic();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.histogram = $root.Histogram.decode(reader, reader.uint32());
                    break;
                }
            case 2: {
                    message.timeseries = $root.TimeSeries.decode(reader, reader.uint32());
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
        var properties = {};
        if (message.histogram != null && message.hasOwnProperty("histogram")) {
            properties._histogram = 1;
            {
                var error = $root.Histogram.verify(message.histogram);
                if (error)
                    return "histogram." + error;
            }
        }
        if (message.timeseries != null && message.hasOwnProperty("timeseries")) {
            properties._timeseries = 1;
            {
                var error = $root.TimeSeries.verify(message.timeseries);
                if (error)
                    return "timeseries." + error;
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
        var message = new $root.ExtraStatistic();
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
        var object = {};
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

$root.Article = (function() {

    /**
     * Properties of an Article.
     * @exports IArticle
     * @interface IArticle
     * @property {string|null} [shortname] Article shortname
     * @property {string|null} [longname] Article longname
     * @property {string|null} [source] Article source
     * @property {string|null} [articleType] Article articleType
     * @property {Array.<IStatisticRow>|null} [rows] Article rows
     * @property {Array.<IRelatedButtons>|null} [related] Article related
     * @property {Array.<string>|null} [universes] Article universes
     * @property {Array.<IExtraStatistic>|null} [extraStats] Article extraStats
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
        this.related = [];
        this.universes = [];
        this.extraStats = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
     * Article rows.
     * @member {Array.<IStatisticRow>} rows
     * @memberof Article
     * @instance
     */
    Article.prototype.rows = $util.emptyArray;

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
            for (var i = 0; i < message.rows.length; ++i)
                $root.StatisticRow.encode(message.rows[i], writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
        if (message.related != null && message.related.length)
            for (var i = 0; i < message.related.length; ++i)
                $root.RelatedButtons.encode(message.related[i], writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
        if (message.universes != null && message.universes.length)
            for (var i = 0; i < message.universes.length; ++i)
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.universes[i]);
        if (message.extraStats != null && message.extraStats.length)
            for (var i = 0; i < message.extraStats.length; ++i)
                $root.ExtraStatistic.encode(message.extraStats[i], writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.Article();
        while (reader.pos < end) {
            var tag = reader.uint32();
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
            case 5: {
                    if (!(message.rows && message.rows.length))
                        message.rows = [];
                    message.rows.push($root.StatisticRow.decode(reader, reader.uint32()));
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
        if (message.rows != null && message.hasOwnProperty("rows")) {
            if (!Array.isArray(message.rows))
                return "rows: array expected";
            for (var i = 0; i < message.rows.length; ++i) {
                var error = $root.StatisticRow.verify(message.rows[i]);
                if (error)
                    return "rows." + error;
            }
        }
        if (message.related != null && message.hasOwnProperty("related")) {
            if (!Array.isArray(message.related))
                return "related: array expected";
            for (var i = 0; i < message.related.length; ++i) {
                var error = $root.RelatedButtons.verify(message.related[i]);
                if (error)
                    return "related." + error;
            }
        }
        if (message.universes != null && message.hasOwnProperty("universes")) {
            if (!Array.isArray(message.universes))
                return "universes: array expected";
            for (var i = 0; i < message.universes.length; ++i)
                if (!$util.isString(message.universes[i]))
                    return "universes: string[] expected";
        }
        if (message.extraStats != null && message.hasOwnProperty("extraStats")) {
            if (!Array.isArray(message.extraStats))
                return "extraStats: array expected";
            for (var i = 0; i < message.extraStats.length; ++i) {
                var error = $root.ExtraStatistic.verify(message.extraStats[i]);
                if (error)
                    return "extraStats." + error;
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
        var message = new $root.Article();
        if (object.shortname != null)
            message.shortname = String(object.shortname);
        if (object.longname != null)
            message.longname = String(object.longname);
        if (object.source != null)
            message.source = String(object.source);
        if (object.articleType != null)
            message.articleType = String(object.articleType);
        if (object.rows) {
            if (!Array.isArray(object.rows))
                throw TypeError(".Article.rows: array expected");
            message.rows = [];
            for (var i = 0; i < object.rows.length; ++i) {
                if (typeof object.rows[i] !== "object")
                    throw TypeError(".Article.rows: object expected");
                message.rows[i] = $root.StatisticRow.fromObject(object.rows[i]);
            }
        }
        if (object.related) {
            if (!Array.isArray(object.related))
                throw TypeError(".Article.related: array expected");
            message.related = [];
            for (var i = 0; i < object.related.length; ++i) {
                if (typeof object.related[i] !== "object")
                    throw TypeError(".Article.related: object expected");
                message.related[i] = $root.RelatedButtons.fromObject(object.related[i]);
            }
        }
        if (object.universes) {
            if (!Array.isArray(object.universes))
                throw TypeError(".Article.universes: array expected");
            message.universes = [];
            for (var i = 0; i < object.universes.length; ++i)
                message.universes[i] = String(object.universes[i]);
        }
        if (object.extraStats) {
            if (!Array.isArray(object.extraStats))
                throw TypeError(".Article.extraStats: array expected");
            message.extraStats = [];
            for (var i = 0; i < object.extraStats.length; ++i) {
                if (typeof object.extraStats[i] !== "object")
                    throw TypeError(".Article.extraStats: object expected");
                message.extraStats[i] = $root.ExtraStatistic.fromObject(object.extraStats[i]);
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
        var object = {};
        if (options.arrays || options.defaults) {
            object.rows = [];
            object.related = [];
            object.universes = [];
            object.extraStats = [];
        }
        if (options.defaults) {
            object.shortname = "";
            object.longname = "";
            object.source = "";
            object.articleType = "";
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
            for (var j = 0; j < message.rows.length; ++j)
                object.rows[j] = $root.StatisticRow.toObject(message.rows[j], options);
        }
        if (message.related && message.related.length) {
            object.related = [];
            for (var j = 0; j < message.related.length; ++j)
                object.related[j] = $root.RelatedButtons.toObject(message.related[j], options);
        }
        if (message.universes && message.universes.length) {
            object.universes = [];
            for (var j = 0; j < message.universes.length; ++j)
                object.universes[j] = message.universes[j];
        }
        if (message.extraStats && message.extraStats.length) {
            object.extraStats = [];
            for (var j = 0; j < message.extraStats.length; ++j)
                object.extraStats[j] = $root.ExtraStatistic.toObject(message.extraStats[j], options);
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

$root.Coordinate = (function() {

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
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.Coordinate();
        while (reader.pos < end) {
            var tag = reader.uint32();
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
        var message = new $root.Coordinate();
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
        var object = {};
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

$root.Ring = (function() {

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
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
            for (var i = 0; i < message.coords.length; ++i)
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.Ring();
        while (reader.pos < end) {
            var tag = reader.uint32();
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
            for (var i = 0; i < message.coords.length; ++i) {
                var error = $root.Coordinate.verify(message.coords[i]);
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
        var message = new $root.Ring();
        if (object.coords) {
            if (!Array.isArray(object.coords))
                throw TypeError(".Ring.coords: array expected");
            message.coords = [];
            for (var i = 0; i < object.coords.length; ++i) {
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
        var object = {};
        if (options.arrays || options.defaults)
            object.coords = [];
        if (message.coords && message.coords.length) {
            object.coords = [];
            for (var j = 0; j < message.coords.length; ++j)
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

$root.Polygon = (function() {

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
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
            for (var i = 0; i < message.rings.length; ++i)
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.Polygon();
        while (reader.pos < end) {
            var tag = reader.uint32();
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
            for (var i = 0; i < message.rings.length; ++i) {
                var error = $root.Ring.verify(message.rings[i]);
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
        var message = new $root.Polygon();
        if (object.rings) {
            if (!Array.isArray(object.rings))
                throw TypeError(".Polygon.rings: array expected");
            message.rings = [];
            for (var i = 0; i < object.rings.length; ++i) {
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
        var object = {};
        if (options.arrays || options.defaults)
            object.rings = [];
        if (message.rings && message.rings.length) {
            object.rings = [];
            for (var j = 0; j < message.rings.length; ++j)
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

$root.MultiPolygon = (function() {

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
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
            for (var i = 0; i < message.polygons.length; ++i)
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.MultiPolygon();
        while (reader.pos < end) {
            var tag = reader.uint32();
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
            for (var i = 0; i < message.polygons.length; ++i) {
                var error = $root.Polygon.verify(message.polygons[i]);
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
        var message = new $root.MultiPolygon();
        if (object.polygons) {
            if (!Array.isArray(object.polygons))
                throw TypeError(".MultiPolygon.polygons: array expected");
            message.polygons = [];
            for (var i = 0; i < object.polygons.length; ++i) {
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
        var object = {};
        if (options.arrays || options.defaults)
            object.polygons = [];
        if (message.polygons && message.polygons.length) {
            object.polygons = [];
            for (var j = 0; j < message.polygons.length; ++j)
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

$root.Feature = (function() {

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
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
    var $oneOfFields;

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
            for (var i = 0; i < message.zones.length; ++i)
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.Feature();
        while (reader.pos < end) {
            var tag = reader.uint32();
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
                        var end2 = reader.uint32() + reader.pos;
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
        var properties = {};
        if (message.polygon != null && message.hasOwnProperty("polygon")) {
            properties.geometry = 1;
            {
                var error = $root.Polygon.verify(message.polygon);
                if (error)
                    return "polygon." + error;
            }
        }
        if (message.multipolygon != null && message.hasOwnProperty("multipolygon")) {
            if (properties.geometry === 1)
                return "geometry: multiple values";
            properties.geometry = 1;
            {
                var error = $root.MultiPolygon.verify(message.multipolygon);
                if (error)
                    return "multipolygon." + error;
            }
        }
        if (message.zones != null && message.hasOwnProperty("zones")) {
            if (!Array.isArray(message.zones))
                return "zones: array expected";
            for (var i = 0; i < message.zones.length; ++i)
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
        var message = new $root.Feature();
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
            for (var i = 0; i < object.zones.length; ++i)
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
        var object = {};
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
            for (var j = 0; j < message.zones.length; ++j)
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

$root.StringList = (function() {

    /**
     * Properties of a StringList.
     * @exports IStringList
     * @interface IStringList
     * @property {Array.<string>|null} [elements] StringList elements
     */

    /**
     * Constructs a new StringList.
     * @exports StringList
     * @classdesc Represents a StringList.
     * @implements IStringList
     * @constructor
     * @param {IStringList=} [properties] Properties to set
     */
    function StringList(properties) {
        this.elements = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * StringList elements.
     * @member {Array.<string>} elements
     * @memberof StringList
     * @instance
     */
    StringList.prototype.elements = $util.emptyArray;

    /**
     * Creates a new StringList instance using the specified properties.
     * @function create
     * @memberof StringList
     * @static
     * @param {IStringList=} [properties] Properties to set
     * @returns {StringList} StringList instance
     */
    StringList.create = function create(properties) {
        return new StringList(properties);
    };

    /**
     * Encodes the specified StringList message. Does not implicitly {@link StringList.verify|verify} messages.
     * @function encode
     * @memberof StringList
     * @static
     * @param {IStringList} message StringList message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    StringList.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.elements != null && message.elements.length)
            for (var i = 0; i < message.elements.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.elements[i]);
        return writer;
    };

    /**
     * Encodes the specified StringList message, length delimited. Does not implicitly {@link StringList.verify|verify} messages.
     * @function encodeDelimited
     * @memberof StringList
     * @static
     * @param {IStringList} message StringList message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    StringList.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a StringList message from the specified reader or buffer.
     * @function decode
     * @memberof StringList
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {StringList} StringList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    StringList.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.StringList();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.elements && message.elements.length))
                        message.elements = [];
                    message.elements.push(reader.string());
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
     * Decodes a StringList message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof StringList
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {StringList} StringList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    StringList.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a StringList message.
     * @function verify
     * @memberof StringList
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    StringList.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.elements != null && message.hasOwnProperty("elements")) {
            if (!Array.isArray(message.elements))
                return "elements: array expected";
            for (var i = 0; i < message.elements.length; ++i)
                if (!$util.isString(message.elements[i]))
                    return "elements: string[] expected";
        }
        return null;
    };

    /**
     * Creates a StringList message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof StringList
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {StringList} StringList
     */
    StringList.fromObject = function fromObject(object) {
        if (object instanceof $root.StringList)
            return object;
        var message = new $root.StringList();
        if (object.elements) {
            if (!Array.isArray(object.elements))
                throw TypeError(".StringList.elements: array expected");
            message.elements = [];
            for (var i = 0; i < object.elements.length; ++i)
                message.elements[i] = String(object.elements[i]);
        }
        return message;
    };

    /**
     * Creates a plain object from a StringList message. Also converts values to other types if specified.
     * @function toObject
     * @memberof StringList
     * @static
     * @param {StringList} message StringList
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    StringList.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.arrays || options.defaults)
            object.elements = [];
        if (message.elements && message.elements.length) {
            object.elements = [];
            for (var j = 0; j < message.elements.length; ++j)
                object.elements[j] = message.elements[j];
        }
        return object;
    };

    /**
     * Converts this StringList to JSON.
     * @function toJSON
     * @memberof StringList
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    StringList.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for StringList
     * @function getTypeUrl
     * @memberof StringList
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    StringList.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/StringList";
    };

    return StringList;
})();

$root.SearchIndex = (function() {

    /**
     * Properties of a SearchIndex.
     * @exports ISearchIndex
     * @interface ISearchIndex
     * @property {Array.<string>|null} [elements] SearchIndex elements
     * @property {Array.<number>|null} [priorities] SearchIndex priorities
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
        this.priorities = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
     * SearchIndex priorities.
     * @member {Array.<number>} priorities
     * @memberof SearchIndex
     * @instance
     */
    SearchIndex.prototype.priorities = $util.emptyArray;

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
            for (var i = 0; i < message.elements.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.elements[i]);
        if (message.priorities != null && message.priorities.length) {
            writer.uint32(/* id 2, wireType 2 =*/18).fork();
            for (var i = 0; i < message.priorities.length; ++i)
                writer.uint32(message.priorities[i]);
            writer.ldelim();
        }
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.SearchIndex();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.elements && message.elements.length))
                        message.elements = [];
                    message.elements.push(reader.string());
                    break;
                }
            case 2: {
                    if (!(message.priorities && message.priorities.length))
                        message.priorities = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.priorities.push(reader.uint32());
                    } else
                        message.priorities.push(reader.uint32());
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
            for (var i = 0; i < message.elements.length; ++i)
                if (!$util.isString(message.elements[i]))
                    return "elements: string[] expected";
        }
        if (message.priorities != null && message.hasOwnProperty("priorities")) {
            if (!Array.isArray(message.priorities))
                return "priorities: array expected";
            for (var i = 0; i < message.priorities.length; ++i)
                if (!$util.isInteger(message.priorities[i]))
                    return "priorities: integer[] expected";
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
        var message = new $root.SearchIndex();
        if (object.elements) {
            if (!Array.isArray(object.elements))
                throw TypeError(".SearchIndex.elements: array expected");
            message.elements = [];
            for (var i = 0; i < object.elements.length; ++i)
                message.elements[i] = String(object.elements[i]);
        }
        if (object.priorities) {
            if (!Array.isArray(object.priorities))
                throw TypeError(".SearchIndex.priorities: array expected");
            message.priorities = [];
            for (var i = 0; i < object.priorities.length; ++i)
                message.priorities[i] = object.priorities[i] >>> 0;
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
        var object = {};
        if (options.arrays || options.defaults) {
            object.elements = [];
            object.priorities = [];
        }
        if (message.elements && message.elements.length) {
            object.elements = [];
            for (var j = 0; j < message.elements.length; ++j)
                object.elements[j] = message.elements[j];
        }
        if (message.priorities && message.priorities.length) {
            object.priorities = [];
            for (var j = 0; j < message.priorities.length; ++j)
                object.priorities[j] = message.priorities[j];
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

$root.OrderList = (function() {

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
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
            for (var i = 0; i < message.orderIdxs.length; ++i)
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OrderList();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.orderIdxs && message.orderIdxs.length))
                        message.orderIdxs = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
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
            for (var i = 0; i < message.orderIdxs.length; ++i)
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
        var message = new $root.OrderList();
        if (object.orderIdxs) {
            if (!Array.isArray(object.orderIdxs))
                throw TypeError(".OrderList.orderIdxs: array expected");
            message.orderIdxs = [];
            for (var i = 0; i < object.orderIdxs.length; ++i)
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
        var object = {};
        if (options.arrays || options.defaults)
            object.orderIdxs = [];
        if (message.orderIdxs && message.orderIdxs.length) {
            object.orderIdxs = [];
            for (var j = 0; j < message.orderIdxs.length; ++j)
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

$root.DataList = (function() {

    /**
     * Properties of a DataList.
     * @exports IDataList
     * @interface IDataList
     * @property {Array.<number>|null} [value] DataList value
     * @property {Array.<number>|null} [populationPercentile] DataList populationPercentile
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
        this.populationPercentile = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
     * DataList populationPercentile.
     * @member {Array.<number>} populationPercentile
     * @memberof DataList
     * @instance
     */
    DataList.prototype.populationPercentile = $util.emptyArray;

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
            for (var i = 0; i < message.value.length; ++i)
                writer.float(message.value[i]);
            writer.ldelim();
        }
        if (message.populationPercentile != null && message.populationPercentile.length) {
            writer.uint32(/* id 2, wireType 2 =*/18).fork();
            for (var i = 0; i < message.populationPercentile.length; ++i)
                writer.float(message.populationPercentile[i]);
            writer.ldelim();
        }
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.DataList();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.value && message.value.length))
                        message.value = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.value.push(reader.float());
                    } else
                        message.value.push(reader.float());
                    break;
                }
            case 2: {
                    if (!(message.populationPercentile && message.populationPercentile.length))
                        message.populationPercentile = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.populationPercentile.push(reader.float());
                    } else
                        message.populationPercentile.push(reader.float());
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
            for (var i = 0; i < message.value.length; ++i)
                if (typeof message.value[i] !== "number")
                    return "value: number[] expected";
        }
        if (message.populationPercentile != null && message.hasOwnProperty("populationPercentile")) {
            if (!Array.isArray(message.populationPercentile))
                return "populationPercentile: array expected";
            for (var i = 0; i < message.populationPercentile.length; ++i)
                if (typeof message.populationPercentile[i] !== "number")
                    return "populationPercentile: number[] expected";
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
        var message = new $root.DataList();
        if (object.value) {
            if (!Array.isArray(object.value))
                throw TypeError(".DataList.value: array expected");
            message.value = [];
            for (var i = 0; i < object.value.length; ++i)
                message.value[i] = Number(object.value[i]);
        }
        if (object.populationPercentile) {
            if (!Array.isArray(object.populationPercentile))
                throw TypeError(".DataList.populationPercentile: array expected");
            message.populationPercentile = [];
            for (var i = 0; i < object.populationPercentile.length; ++i)
                message.populationPercentile[i] = Number(object.populationPercentile[i]);
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
        var object = {};
        if (options.arrays || options.defaults) {
            object.value = [];
            object.populationPercentile = [];
        }
        if (message.value && message.value.length) {
            object.value = [];
            for (var j = 0; j < message.value.length; ++j)
                object.value[j] = options.json && !isFinite(message.value[j]) ? String(message.value[j]) : message.value[j];
        }
        if (message.populationPercentile && message.populationPercentile.length) {
            object.populationPercentile = [];
            for (var j = 0; j < message.populationPercentile.length; ++j)
                object.populationPercentile[j] = options.json && !isFinite(message.populationPercentile[j]) ? String(message.populationPercentile[j]) : message.populationPercentile[j];
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

$root.OrderLists = (function() {

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
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
            for (var i = 0; i < message.statnames.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.statnames[i]);
        if (message.orderLists != null && message.orderLists.length)
            for (var i = 0; i < message.orderLists.length; ++i)
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OrderLists();
        while (reader.pos < end) {
            var tag = reader.uint32();
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
            for (var i = 0; i < message.statnames.length; ++i)
                if (!$util.isString(message.statnames[i]))
                    return "statnames: string[] expected";
        }
        if (message.orderLists != null && message.hasOwnProperty("orderLists")) {
            if (!Array.isArray(message.orderLists))
                return "orderLists: array expected";
            for (var i = 0; i < message.orderLists.length; ++i) {
                var error = $root.OrderList.verify(message.orderLists[i]);
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
        var message = new $root.OrderLists();
        if (object.statnames) {
            if (!Array.isArray(object.statnames))
                throw TypeError(".OrderLists.statnames: array expected");
            message.statnames = [];
            for (var i = 0; i < object.statnames.length; ++i)
                message.statnames[i] = String(object.statnames[i]);
        }
        if (object.orderLists) {
            if (!Array.isArray(object.orderLists))
                throw TypeError(".OrderLists.orderLists: array expected");
            message.orderLists = [];
            for (var i = 0; i < object.orderLists.length; ++i) {
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
        var object = {};
        if (options.arrays || options.defaults) {
            object.statnames = [];
            object.orderLists = [];
        }
        if (message.statnames && message.statnames.length) {
            object.statnames = [];
            for (var j = 0; j < message.statnames.length; ++j)
                object.statnames[j] = message.statnames[j];
        }
        if (message.orderLists && message.orderLists.length) {
            object.orderLists = [];
            for (var j = 0; j < message.orderLists.length; ++j)
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

$root.DataLists = (function() {

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
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
            for (var i = 0; i < message.statnames.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.statnames[i]);
        if (message.dataLists != null && message.dataLists.length)
            for (var i = 0; i < message.dataLists.length; ++i)
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.DataLists();
        while (reader.pos < end) {
            var tag = reader.uint32();
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
            for (var i = 0; i < message.statnames.length; ++i)
                if (!$util.isString(message.statnames[i]))
                    return "statnames: string[] expected";
        }
        if (message.dataLists != null && message.hasOwnProperty("dataLists")) {
            if (!Array.isArray(message.dataLists))
                return "dataLists: array expected";
            for (var i = 0; i < message.dataLists.length; ++i) {
                var error = $root.DataList.verify(message.dataLists[i]);
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
        var message = new $root.DataLists();
        if (object.statnames) {
            if (!Array.isArray(object.statnames))
                throw TypeError(".DataLists.statnames: array expected");
            message.statnames = [];
            for (var i = 0; i < object.statnames.length; ++i)
                message.statnames[i] = String(object.statnames[i]);
        }
        if (object.dataLists) {
            if (!Array.isArray(object.dataLists))
                throw TypeError(".DataLists.dataLists: array expected");
            message.dataLists = [];
            for (var i = 0; i < object.dataLists.length; ++i) {
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
        var object = {};
        if (options.arrays || options.defaults) {
            object.statnames = [];
            object.dataLists = [];
        }
        if (message.statnames && message.statnames.length) {
            object.statnames = [];
            for (var j = 0; j < message.statnames.length; ++j)
                object.statnames[j] = message.statnames[j];
        }
        if (message.dataLists && message.dataLists.length) {
            object.dataLists = [];
            for (var j = 0; j < message.dataLists.length; ++j)
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

$root.AllStats = (function() {

    /**
     * Properties of an AllStats.
     * @exports IAllStats
     * @interface IAllStats
     * @property {Array.<number>|null} [stats] AllStats stats
     */

    /**
     * Constructs a new AllStats.
     * @exports AllStats
     * @classdesc Represents an AllStats.
     * @implements IAllStats
     * @constructor
     * @param {IAllStats=} [properties] Properties to set
     */
    function AllStats(properties) {
        this.stats = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * AllStats stats.
     * @member {Array.<number>} stats
     * @memberof AllStats
     * @instance
     */
    AllStats.prototype.stats = $util.emptyArray;

    /**
     * Creates a new AllStats instance using the specified properties.
     * @function create
     * @memberof AllStats
     * @static
     * @param {IAllStats=} [properties] Properties to set
     * @returns {AllStats} AllStats instance
     */
    AllStats.create = function create(properties) {
        return new AllStats(properties);
    };

    /**
     * Encodes the specified AllStats message. Does not implicitly {@link AllStats.verify|verify} messages.
     * @function encode
     * @memberof AllStats
     * @static
     * @param {IAllStats} message AllStats message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    AllStats.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.stats != null && message.stats.length) {
            writer.uint32(/* id 1, wireType 2 =*/10).fork();
            for (var i = 0; i < message.stats.length; ++i)
                writer.float(message.stats[i]);
            writer.ldelim();
        }
        return writer;
    };

    /**
     * Encodes the specified AllStats message, length delimited. Does not implicitly {@link AllStats.verify|verify} messages.
     * @function encodeDelimited
     * @memberof AllStats
     * @static
     * @param {IAllStats} message AllStats message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    AllStats.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an AllStats message from the specified reader or buffer.
     * @function decode
     * @memberof AllStats
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {AllStats} AllStats
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    AllStats.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.AllStats();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.stats && message.stats.length))
                        message.stats = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
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
     * Decodes an AllStats message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof AllStats
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {AllStats} AllStats
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    AllStats.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an AllStats message.
     * @function verify
     * @memberof AllStats
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    AllStats.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.stats != null && message.hasOwnProperty("stats")) {
            if (!Array.isArray(message.stats))
                return "stats: array expected";
            for (var i = 0; i < message.stats.length; ++i)
                if (typeof message.stats[i] !== "number")
                    return "stats: number[] expected";
        }
        return null;
    };

    /**
     * Creates an AllStats message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof AllStats
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {AllStats} AllStats
     */
    AllStats.fromObject = function fromObject(object) {
        if (object instanceof $root.AllStats)
            return object;
        var message = new $root.AllStats();
        if (object.stats) {
            if (!Array.isArray(object.stats))
                throw TypeError(".AllStats.stats: array expected");
            message.stats = [];
            for (var i = 0; i < object.stats.length; ++i)
                message.stats[i] = Number(object.stats[i]);
        }
        return message;
    };

    /**
     * Creates a plain object from an AllStats message. Also converts values to other types if specified.
     * @function toObject
     * @memberof AllStats
     * @static
     * @param {AllStats} message AllStats
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    AllStats.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.arrays || options.defaults)
            object.stats = [];
        if (message.stats && message.stats.length) {
            object.stats = [];
            for (var j = 0; j < message.stats.length; ++j)
                object.stats[j] = options.json && !isFinite(message.stats[j]) ? String(message.stats[j]) : message.stats[j];
        }
        return object;
    };

    /**
     * Converts this AllStats to JSON.
     * @function toJSON
     * @memberof AllStats
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    AllStats.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for AllStats
     * @function getTypeUrl
     * @memberof AllStats
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    AllStats.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/AllStats";
    };

    return AllStats;
})();

$root.ConsolidatedShapes = (function() {

    /**
     * Properties of a ConsolidatedShapes.
     * @exports IConsolidatedShapes
     * @interface IConsolidatedShapes
     * @property {Array.<string>|null} [longnames] ConsolidatedShapes longnames
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
        this.shapes = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
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
            for (var i = 0; i < message.longnames.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.longnames[i]);
        if (message.shapes != null && message.shapes.length)
            for (var i = 0; i < message.shapes.length; ++i)
                $root.Feature.encode(message.shapes[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
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
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.ConsolidatedShapes();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.longnames && message.longnames.length))
                        message.longnames = [];
                    message.longnames.push(reader.string());
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
            for (var i = 0; i < message.longnames.length; ++i)
                if (!$util.isString(message.longnames[i]))
                    return "longnames: string[] expected";
        }
        if (message.shapes != null && message.hasOwnProperty("shapes")) {
            if (!Array.isArray(message.shapes))
                return "shapes: array expected";
            for (var i = 0; i < message.shapes.length; ++i) {
                var error = $root.Feature.verify(message.shapes[i]);
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
        var message = new $root.ConsolidatedShapes();
        if (object.longnames) {
            if (!Array.isArray(object.longnames))
                throw TypeError(".ConsolidatedShapes.longnames: array expected");
            message.longnames = [];
            for (var i = 0; i < object.longnames.length; ++i)
                message.longnames[i] = String(object.longnames[i]);
        }
        if (object.shapes) {
            if (!Array.isArray(object.shapes))
                throw TypeError(".ConsolidatedShapes.shapes: array expected");
            message.shapes = [];
            for (var i = 0; i < object.shapes.length; ++i) {
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
        var object = {};
        if (options.arrays || options.defaults) {
            object.longnames = [];
            object.shapes = [];
        }
        if (message.longnames && message.longnames.length) {
            object.longnames = [];
            for (var j = 0; j < message.longnames.length; ++j)
                object.longnames[j] = message.longnames[j];
        }
        if (message.shapes && message.shapes.length) {
            object.shapes = [];
            for (var j = 0; j < message.shapes.length; ++j)
                object.shapes[j] = $root.Feature.toObject(message.shapes[j], options);
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

$root.ConsolidatedStatistics = (function() {

    /**
     * Properties of a ConsolidatedStatistics.
     * @exports IConsolidatedStatistics
     * @interface IConsolidatedStatistics
     * @property {Array.<string>|null} [longnames] ConsolidatedStatistics longnames
     * @property {Array.<string>|null} [shortnames] ConsolidatedStatistics shortnames
     * @property {Array.<IAllStats>|null} [stats] ConsolidatedStatistics stats
     */

    /**
     * Constructs a new ConsolidatedStatistics.
     * @exports ConsolidatedStatistics
     * @classdesc Represents a ConsolidatedStatistics.
     * @implements IConsolidatedStatistics
     * @constructor
     * @param {IConsolidatedStatistics=} [properties] Properties to set
     */
    function ConsolidatedStatistics(properties) {
        this.longnames = [];
        this.shortnames = [];
        this.stats = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * ConsolidatedStatistics longnames.
     * @member {Array.<string>} longnames
     * @memberof ConsolidatedStatistics
     * @instance
     */
    ConsolidatedStatistics.prototype.longnames = $util.emptyArray;

    /**
     * ConsolidatedStatistics shortnames.
     * @member {Array.<string>} shortnames
     * @memberof ConsolidatedStatistics
     * @instance
     */
    ConsolidatedStatistics.prototype.shortnames = $util.emptyArray;

    /**
     * ConsolidatedStatistics stats.
     * @member {Array.<IAllStats>} stats
     * @memberof ConsolidatedStatistics
     * @instance
     */
    ConsolidatedStatistics.prototype.stats = $util.emptyArray;

    /**
     * Creates a new ConsolidatedStatistics instance using the specified properties.
     * @function create
     * @memberof ConsolidatedStatistics
     * @static
     * @param {IConsolidatedStatistics=} [properties] Properties to set
     * @returns {ConsolidatedStatistics} ConsolidatedStatistics instance
     */
    ConsolidatedStatistics.create = function create(properties) {
        return new ConsolidatedStatistics(properties);
    };

    /**
     * Encodes the specified ConsolidatedStatistics message. Does not implicitly {@link ConsolidatedStatistics.verify|verify} messages.
     * @function encode
     * @memberof ConsolidatedStatistics
     * @static
     * @param {IConsolidatedStatistics} message ConsolidatedStatistics message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ConsolidatedStatistics.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.longnames != null && message.longnames.length)
            for (var i = 0; i < message.longnames.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.longnames[i]);
        if (message.shortnames != null && message.shortnames.length)
            for (var i = 0; i < message.shortnames.length; ++i)
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.shortnames[i]);
        if (message.stats != null && message.stats.length)
            for (var i = 0; i < message.stats.length; ++i)
                $root.AllStats.encode(message.stats[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified ConsolidatedStatistics message, length delimited. Does not implicitly {@link ConsolidatedStatistics.verify|verify} messages.
     * @function encodeDelimited
     * @memberof ConsolidatedStatistics
     * @static
     * @param {IConsolidatedStatistics} message ConsolidatedStatistics message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ConsolidatedStatistics.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a ConsolidatedStatistics message from the specified reader or buffer.
     * @function decode
     * @memberof ConsolidatedStatistics
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {ConsolidatedStatistics} ConsolidatedStatistics
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ConsolidatedStatistics.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.ConsolidatedStatistics();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.longnames && message.longnames.length))
                        message.longnames = [];
                    message.longnames.push(reader.string());
                    break;
                }
            case 2: {
                    if (!(message.shortnames && message.shortnames.length))
                        message.shortnames = [];
                    message.shortnames.push(reader.string());
                    break;
                }
            case 3: {
                    if (!(message.stats && message.stats.length))
                        message.stats = [];
                    message.stats.push($root.AllStats.decode(reader, reader.uint32()));
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
     * Decodes a ConsolidatedStatistics message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof ConsolidatedStatistics
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {ConsolidatedStatistics} ConsolidatedStatistics
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ConsolidatedStatistics.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a ConsolidatedStatistics message.
     * @function verify
     * @memberof ConsolidatedStatistics
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    ConsolidatedStatistics.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.longnames != null && message.hasOwnProperty("longnames")) {
            if (!Array.isArray(message.longnames))
                return "longnames: array expected";
            for (var i = 0; i < message.longnames.length; ++i)
                if (!$util.isString(message.longnames[i]))
                    return "longnames: string[] expected";
        }
        if (message.shortnames != null && message.hasOwnProperty("shortnames")) {
            if (!Array.isArray(message.shortnames))
                return "shortnames: array expected";
            for (var i = 0; i < message.shortnames.length; ++i)
                if (!$util.isString(message.shortnames[i]))
                    return "shortnames: string[] expected";
        }
        if (message.stats != null && message.hasOwnProperty("stats")) {
            if (!Array.isArray(message.stats))
                return "stats: array expected";
            for (var i = 0; i < message.stats.length; ++i) {
                var error = $root.AllStats.verify(message.stats[i]);
                if (error)
                    return "stats." + error;
            }
        }
        return null;
    };

    /**
     * Creates a ConsolidatedStatistics message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ConsolidatedStatistics
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {ConsolidatedStatistics} ConsolidatedStatistics
     */
    ConsolidatedStatistics.fromObject = function fromObject(object) {
        if (object instanceof $root.ConsolidatedStatistics)
            return object;
        var message = new $root.ConsolidatedStatistics();
        if (object.longnames) {
            if (!Array.isArray(object.longnames))
                throw TypeError(".ConsolidatedStatistics.longnames: array expected");
            message.longnames = [];
            for (var i = 0; i < object.longnames.length; ++i)
                message.longnames[i] = String(object.longnames[i]);
        }
        if (object.shortnames) {
            if (!Array.isArray(object.shortnames))
                throw TypeError(".ConsolidatedStatistics.shortnames: array expected");
            message.shortnames = [];
            for (var i = 0; i < object.shortnames.length; ++i)
                message.shortnames[i] = String(object.shortnames[i]);
        }
        if (object.stats) {
            if (!Array.isArray(object.stats))
                throw TypeError(".ConsolidatedStatistics.stats: array expected");
            message.stats = [];
            for (var i = 0; i < object.stats.length; ++i) {
                if (typeof object.stats[i] !== "object")
                    throw TypeError(".ConsolidatedStatistics.stats: object expected");
                message.stats[i] = $root.AllStats.fromObject(object.stats[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a ConsolidatedStatistics message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ConsolidatedStatistics
     * @static
     * @param {ConsolidatedStatistics} message ConsolidatedStatistics
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ConsolidatedStatistics.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.arrays || options.defaults) {
            object.longnames = [];
            object.shortnames = [];
            object.stats = [];
        }
        if (message.longnames && message.longnames.length) {
            object.longnames = [];
            for (var j = 0; j < message.longnames.length; ++j)
                object.longnames[j] = message.longnames[j];
        }
        if (message.shortnames && message.shortnames.length) {
            object.shortnames = [];
            for (var j = 0; j < message.shortnames.length; ++j)
                object.shortnames[j] = message.shortnames[j];
        }
        if (message.stats && message.stats.length) {
            object.stats = [];
            for (var j = 0; j < message.stats.length; ++j)
                object.stats[j] = $root.AllStats.toObject(message.stats[j], options);
        }
        return object;
    };

    /**
     * Converts this ConsolidatedStatistics to JSON.
     * @function toJSON
     * @memberof ConsolidatedStatistics
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ConsolidatedStatistics.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for ConsolidatedStatistics
     * @function getTypeUrl
     * @memberof ConsolidatedStatistics
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    ConsolidatedStatistics.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/ConsolidatedStatistics";
    };

    return ConsolidatedStatistics;
})();

module.exports = $root;
