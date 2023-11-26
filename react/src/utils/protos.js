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
