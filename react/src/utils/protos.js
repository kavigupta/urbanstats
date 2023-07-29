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
     * @property {number|null} [ordinal] StatisticRow ordinal
     * @property {number|null} [overallOrdinal] StatisticRow overallOrdinal
     * @property {number|null} [percentileByPopulation] StatisticRow percentileByPopulation
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
     * StatisticRow ordinal.
     * @member {number} ordinal
     * @memberof StatisticRow
     * @instance
     */
    StatisticRow.prototype.ordinal = 0;

    /**
     * StatisticRow overallOrdinal.
     * @member {number} overallOrdinal
     * @memberof StatisticRow
     * @instance
     */
    StatisticRow.prototype.overallOrdinal = 0;

    /**
     * StatisticRow percentileByPopulation.
     * @member {number} percentileByPopulation
     * @memberof StatisticRow
     * @instance
     */
    StatisticRow.prototype.percentileByPopulation = 0;

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
        if (message.ordinal != null && Object.hasOwnProperty.call(message, "ordinal"))
            writer.uint32(/* id 2, wireType 0 =*/16).int32(message.ordinal);
        if (message.overallOrdinal != null && Object.hasOwnProperty.call(message, "overallOrdinal"))
            writer.uint32(/* id 3, wireType 0 =*/24).int32(message.overallOrdinal);
        if (message.percentileByPopulation != null && Object.hasOwnProperty.call(message, "percentileByPopulation"))
            writer.uint32(/* id 4, wireType 5 =*/37).float(message.percentileByPopulation);
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
                    message.ordinal = reader.int32();
                    break;
                }
            case 3: {
                    message.overallOrdinal = reader.int32();
                    break;
                }
            case 4: {
                    message.percentileByPopulation = reader.float();
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
        if (message.ordinal != null && message.hasOwnProperty("ordinal"))
            if (!$util.isInteger(message.ordinal))
                return "ordinal: integer expected";
        if (message.overallOrdinal != null && message.hasOwnProperty("overallOrdinal"))
            if (!$util.isInteger(message.overallOrdinal))
                return "overallOrdinal: integer expected";
        if (message.percentileByPopulation != null && message.hasOwnProperty("percentileByPopulation"))
            if (typeof message.percentileByPopulation !== "number")
                return "percentileByPopulation: number expected";
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
        if (object.ordinal != null)
            message.ordinal = object.ordinal | 0;
        if (object.overallOrdinal != null)
            message.overallOrdinal = object.overallOrdinal | 0;
        if (object.percentileByPopulation != null)
            message.percentileByPopulation = Number(object.percentileByPopulation);
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
        if (options.defaults) {
            object.statval = 0;
            object.ordinal = 0;
            object.overallOrdinal = 0;
            object.percentileByPopulation = 0;
        }
        if (message.statval != null && message.hasOwnProperty("statval"))
            object.statval = options.json && !isFinite(message.statval) ? String(message.statval) : message.statval;
        if (message.ordinal != null && message.hasOwnProperty("ordinal"))
            object.ordinal = message.ordinal;
        if (message.overallOrdinal != null && message.hasOwnProperty("overallOrdinal"))
            object.overallOrdinal = message.overallOrdinal;
        if (message.percentileByPopulation != null && message.hasOwnProperty("percentileByPopulation"))
            object.percentileByPopulation = options.json && !isFinite(message.percentileByPopulation) ? String(message.percentileByPopulation) : message.percentileByPopulation;
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

$root.Feature = (function() {

    /**
     * Properties of a Feature.
     * @exports IFeature
     * @interface IFeature
     * @property {string|null} [type] Feature type
     * @property {Array.<IRing>|null} [rings] Feature rings
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
        this.rings = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Feature type.
     * @member {string} type
     * @memberof Feature
     * @instance
     */
    Feature.prototype.type = "";

    /**
     * Feature rings.
     * @member {Array.<IRing>} rings
     * @memberof Feature
     * @instance
     */
    Feature.prototype.rings = $util.emptyArray;

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
        if (message.type != null && Object.hasOwnProperty.call(message, "type"))
            writer.uint32(/* id 1, wireType 2 =*/10).string(message.type);
        if (message.rings != null && message.rings.length)
            for (var i = 0; i < message.rings.length; ++i)
                $root.Ring.encode(message.rings[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
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
                    message.type = reader.string();
                    break;
                }
            case 2: {
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
        if (message.type != null && message.hasOwnProperty("type"))
            if (!$util.isString(message.type))
                return "type: string expected";
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
        if (object.type != null)
            message.type = String(object.type);
        if (object.rings) {
            if (!Array.isArray(object.rings))
                throw TypeError(".Feature.rings: array expected");
            message.rings = [];
            for (var i = 0; i < object.rings.length; ++i) {
                if (typeof object.rings[i] !== "object")
                    throw TypeError(".Feature.rings: object expected");
                message.rings[i] = $root.Ring.fromObject(object.rings[i]);
            }
        }
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
            object.rings = [];
        if (options.defaults)
            object.type = "";
        if (message.type != null && message.hasOwnProperty("type"))
            object.type = message.type;
        if (message.rings && message.rings.length) {
            object.rings = [];
            for (var j = 0; j < message.rings.length; ++j)
                object.rings[j] = $root.Ring.toObject(message.rings[j], options);
        }
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

$root.FeatureCollection = (function() {

    /**
     * Properties of a FeatureCollection.
     * @exports IFeatureCollection
     * @interface IFeatureCollection
     * @property {Array.<IFeature>|null} [features] FeatureCollection features
     */

    /**
     * Constructs a new FeatureCollection.
     * @exports FeatureCollection
     * @classdesc Represents a FeatureCollection.
     * @implements IFeatureCollection
     * @constructor
     * @param {IFeatureCollection=} [properties] Properties to set
     */
    function FeatureCollection(properties) {
        this.features = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * FeatureCollection features.
     * @member {Array.<IFeature>} features
     * @memberof FeatureCollection
     * @instance
     */
    FeatureCollection.prototype.features = $util.emptyArray;

    /**
     * Creates a new FeatureCollection instance using the specified properties.
     * @function create
     * @memberof FeatureCollection
     * @static
     * @param {IFeatureCollection=} [properties] Properties to set
     * @returns {FeatureCollection} FeatureCollection instance
     */
    FeatureCollection.create = function create(properties) {
        return new FeatureCollection(properties);
    };

    /**
     * Encodes the specified FeatureCollection message. Does not implicitly {@link FeatureCollection.verify|verify} messages.
     * @function encode
     * @memberof FeatureCollection
     * @static
     * @param {IFeatureCollection} message FeatureCollection message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FeatureCollection.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.features != null && message.features.length)
            for (var i = 0; i < message.features.length; ++i)
                $root.Feature.encode(message.features[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified FeatureCollection message, length delimited. Does not implicitly {@link FeatureCollection.verify|verify} messages.
     * @function encodeDelimited
     * @memberof FeatureCollection
     * @static
     * @param {IFeatureCollection} message FeatureCollection message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FeatureCollection.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a FeatureCollection message from the specified reader or buffer.
     * @function decode
     * @memberof FeatureCollection
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {FeatureCollection} FeatureCollection
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FeatureCollection.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.FeatureCollection();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.features && message.features.length))
                        message.features = [];
                    message.features.push($root.Feature.decode(reader, reader.uint32()));
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
     * Decodes a FeatureCollection message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof FeatureCollection
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {FeatureCollection} FeatureCollection
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FeatureCollection.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a FeatureCollection message.
     * @function verify
     * @memberof FeatureCollection
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    FeatureCollection.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.features != null && message.hasOwnProperty("features")) {
            if (!Array.isArray(message.features))
                return "features: array expected";
            for (var i = 0; i < message.features.length; ++i) {
                var error = $root.Feature.verify(message.features[i]);
                if (error)
                    return "features." + error;
            }
        }
        return null;
    };

    /**
     * Creates a FeatureCollection message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof FeatureCollection
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {FeatureCollection} FeatureCollection
     */
    FeatureCollection.fromObject = function fromObject(object) {
        if (object instanceof $root.FeatureCollection)
            return object;
        var message = new $root.FeatureCollection();
        if (object.features) {
            if (!Array.isArray(object.features))
                throw TypeError(".FeatureCollection.features: array expected");
            message.features = [];
            for (var i = 0; i < object.features.length; ++i) {
                if (typeof object.features[i] !== "object")
                    throw TypeError(".FeatureCollection.features: object expected");
                message.features[i] = $root.Feature.fromObject(object.features[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a FeatureCollection message. Also converts values to other types if specified.
     * @function toObject
     * @memberof FeatureCollection
     * @static
     * @param {FeatureCollection} message FeatureCollection
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    FeatureCollection.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.arrays || options.defaults)
            object.features = [];
        if (message.features && message.features.length) {
            object.features = [];
            for (var j = 0; j < message.features.length; ++j)
                object.features[j] = $root.Feature.toObject(message.features[j], options);
        }
        return object;
    };

    /**
     * Converts this FeatureCollection to JSON.
     * @function toJSON
     * @memberof FeatureCollection
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    FeatureCollection.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for FeatureCollection
     * @function getTypeUrl
     * @memberof FeatureCollection
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    FeatureCollection.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/FeatureCollection";
    };

    return FeatureCollection;
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

module.exports = $root;
