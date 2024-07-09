import * as $protobuf from "protobufjs";
import Long = require("long");
/** Properties of a StatisticRow. */
export interface IStatisticRow {

    /** StatisticRow statval */
    statval?: (number|null);

    /** StatisticRow ordinalByUniverse */
    ordinalByUniverse?: (number[]|null);

    /** StatisticRow overallOrdinalByUniverse */
    overallOrdinalByUniverse?: (number[]|null);

    /** StatisticRow percentileByPopulationByUniverse */
    percentileByPopulationByUniverse?: (number[]|null);
}

/** Represents a StatisticRow. */
export class StatisticRow implements IStatisticRow {

    /**
     * Constructs a new StatisticRow.
     * @param [properties] Properties to set
     */
    constructor(properties?: IStatisticRow);

    /** StatisticRow statval. */
    public statval: number;

    /** StatisticRow ordinalByUniverse. */
    public ordinalByUniverse: number[];

    /** StatisticRow overallOrdinalByUniverse. */
    public overallOrdinalByUniverse: number[];

    /** StatisticRow percentileByPopulationByUniverse. */
    public percentileByPopulationByUniverse: number[];

    /**
     * Creates a new StatisticRow instance using the specified properties.
     * @param [properties] Properties to set
     * @returns StatisticRow instance
     */
    public static create(properties?: IStatisticRow): StatisticRow;

    /**
     * Encodes the specified StatisticRow message. Does not implicitly {@link StatisticRow.verify|verify} messages.
     * @param message StatisticRow message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IStatisticRow, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified StatisticRow message, length delimited. Does not implicitly {@link StatisticRow.verify|verify} messages.
     * @param message StatisticRow message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IStatisticRow, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a StatisticRow message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns StatisticRow
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): StatisticRow;

    /**
     * Decodes a StatisticRow message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns StatisticRow
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): StatisticRow;

    /**
     * Verifies a StatisticRow message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a StatisticRow message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns StatisticRow
     */
    public static fromObject(object: { [k: string]: any }): StatisticRow;

    /**
     * Creates a plain object from a StatisticRow message. Also converts values to other types if specified.
     * @param message StatisticRow
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: StatisticRow, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this StatisticRow to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for StatisticRow
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a RelatedButton. */
export interface IRelatedButton {

    /** RelatedButton longname */
    longname?: (string|null);

    /** RelatedButton shortname */
    shortname?: (string|null);

    /** RelatedButton rowType */
    rowType?: (string|null);
}

/** Represents a RelatedButton. */
export class RelatedButton implements IRelatedButton {

    /**
     * Constructs a new RelatedButton.
     * @param [properties] Properties to set
     */
    constructor(properties?: IRelatedButton);

    /** RelatedButton longname. */
    public longname: string;

    /** RelatedButton shortname. */
    public shortname: string;

    /** RelatedButton rowType. */
    public rowType: string;

    /**
     * Creates a new RelatedButton instance using the specified properties.
     * @param [properties] Properties to set
     * @returns RelatedButton instance
     */
    public static create(properties?: IRelatedButton): RelatedButton;

    /**
     * Encodes the specified RelatedButton message. Does not implicitly {@link RelatedButton.verify|verify} messages.
     * @param message RelatedButton message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IRelatedButton, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified RelatedButton message, length delimited. Does not implicitly {@link RelatedButton.verify|verify} messages.
     * @param message RelatedButton message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IRelatedButton, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a RelatedButton message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns RelatedButton
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): RelatedButton;

    /**
     * Decodes a RelatedButton message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns RelatedButton
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): RelatedButton;

    /**
     * Verifies a RelatedButton message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a RelatedButton message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns RelatedButton
     */
    public static fromObject(object: { [k: string]: any }): RelatedButton;

    /**
     * Creates a plain object from a RelatedButton message. Also converts values to other types if specified.
     * @param message RelatedButton
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: RelatedButton, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this RelatedButton to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for RelatedButton
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a RelatedButtons. */
export interface IRelatedButtons {

    /** RelatedButtons relationshipType */
    relationshipType?: (string|null);

    /** RelatedButtons buttons */
    buttons?: (IRelatedButton[]|null);
}

/** Represents a RelatedButtons. */
export class RelatedButtons implements IRelatedButtons {

    /**
     * Constructs a new RelatedButtons.
     * @param [properties] Properties to set
     */
    constructor(properties?: IRelatedButtons);

    /** RelatedButtons relationshipType. */
    public relationshipType: string;

    /** RelatedButtons buttons. */
    public buttons: IRelatedButton[];

    /**
     * Creates a new RelatedButtons instance using the specified properties.
     * @param [properties] Properties to set
     * @returns RelatedButtons instance
     */
    public static create(properties?: IRelatedButtons): RelatedButtons;

    /**
     * Encodes the specified RelatedButtons message. Does not implicitly {@link RelatedButtons.verify|verify} messages.
     * @param message RelatedButtons message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IRelatedButtons, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified RelatedButtons message, length delimited. Does not implicitly {@link RelatedButtons.verify|verify} messages.
     * @param message RelatedButtons message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IRelatedButtons, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a RelatedButtons message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns RelatedButtons
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): RelatedButtons;

    /**
     * Decodes a RelatedButtons message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns RelatedButtons
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): RelatedButtons;

    /**
     * Verifies a RelatedButtons message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a RelatedButtons message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns RelatedButtons
     */
    public static fromObject(object: { [k: string]: any }): RelatedButtons;

    /**
     * Creates a plain object from a RelatedButtons message. Also converts values to other types if specified.
     * @param message RelatedButtons
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: RelatedButtons, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this RelatedButtons to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for RelatedButtons
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of an Article. */
export interface IArticle {

    /** Article shortname */
    shortname?: (string|null);

    /** Article longname */
    longname?: (string|null);

    /** Article source */
    source?: (string|null);

    /** Article articleType */
    articleType?: (string|null);

    /** Article rows */
    rows?: (IStatisticRow[]|null);

    /** Article related */
    related?: (IRelatedButtons[]|null);

    /** Article universes */
    universes?: (string[]|null);
}

/** Represents an Article. */
export class Article implements IArticle {

    /**
     * Constructs a new Article.
     * @param [properties] Properties to set
     */
    constructor(properties?: IArticle);

    /** Article shortname. */
    public shortname: string;

    /** Article longname. */
    public longname: string;

    /** Article source. */
    public source: string;

    /** Article articleType. */
    public articleType: string;

    /** Article rows. */
    public rows: IStatisticRow[];

    /** Article related. */
    public related: IRelatedButtons[];

    /** Article universes. */
    public universes: string[];

    /**
     * Creates a new Article instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Article instance
     */
    public static create(properties?: IArticle): Article;

    /**
     * Encodes the specified Article message. Does not implicitly {@link Article.verify|verify} messages.
     * @param message Article message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IArticle, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Article message, length delimited. Does not implicitly {@link Article.verify|verify} messages.
     * @param message Article message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IArticle, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an Article message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Article
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Article;

    /**
     * Decodes an Article message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Article
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Article;

    /**
     * Verifies an Article message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates an Article message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Article
     */
    public static fromObject(object: { [k: string]: any }): Article;

    /**
     * Creates a plain object from an Article message. Also converts values to other types if specified.
     * @param message Article
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: Article, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Article to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Article
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a Coordinate. */
export interface ICoordinate {

    /** Coordinate lon */
    lon?: (number|null);

    /** Coordinate lat */
    lat?: (number|null);
}

/** Represents a Coordinate. */
export class Coordinate implements ICoordinate {

    /**
     * Constructs a new Coordinate.
     * @param [properties] Properties to set
     */
    constructor(properties?: ICoordinate);

    /** Coordinate lon. */
    public lon: number;

    /** Coordinate lat. */
    public lat: number;

    /**
     * Creates a new Coordinate instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Coordinate instance
     */
    public static create(properties?: ICoordinate): Coordinate;

    /**
     * Encodes the specified Coordinate message. Does not implicitly {@link Coordinate.verify|verify} messages.
     * @param message Coordinate message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ICoordinate, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Coordinate message, length delimited. Does not implicitly {@link Coordinate.verify|verify} messages.
     * @param message Coordinate message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ICoordinate, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Coordinate message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Coordinate
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Coordinate;

    /**
     * Decodes a Coordinate message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Coordinate
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Coordinate;

    /**
     * Verifies a Coordinate message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a Coordinate message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Coordinate
     */
    public static fromObject(object: { [k: string]: any }): Coordinate;

    /**
     * Creates a plain object from a Coordinate message. Also converts values to other types if specified.
     * @param message Coordinate
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: Coordinate, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Coordinate to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Coordinate
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a Ring. */
export interface IRing {

    /** Ring coords */
    coords?: (ICoordinate[]|null);
}

/** Represents a Ring. */
export class Ring implements IRing {

    /**
     * Constructs a new Ring.
     * @param [properties] Properties to set
     */
    constructor(properties?: IRing);

    /** Ring coords. */
    public coords: ICoordinate[];

    /**
     * Creates a new Ring instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Ring instance
     */
    public static create(properties?: IRing): Ring;

    /**
     * Encodes the specified Ring message. Does not implicitly {@link Ring.verify|verify} messages.
     * @param message Ring message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IRing, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Ring message, length delimited. Does not implicitly {@link Ring.verify|verify} messages.
     * @param message Ring message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IRing, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Ring message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Ring
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Ring;

    /**
     * Decodes a Ring message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Ring
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Ring;

    /**
     * Verifies a Ring message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a Ring message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Ring
     */
    public static fromObject(object: { [k: string]: any }): Ring;

    /**
     * Creates a plain object from a Ring message. Also converts values to other types if specified.
     * @param message Ring
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: Ring, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Ring to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Ring
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a Polygon. */
export interface IPolygon {

    /** Polygon rings */
    rings?: (IRing[]|null);
}

/** Represents a Polygon. */
export class Polygon implements IPolygon {

    /**
     * Constructs a new Polygon.
     * @param [properties] Properties to set
     */
    constructor(properties?: IPolygon);

    /** Polygon rings. */
    public rings: IRing[];

    /**
     * Creates a new Polygon instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Polygon instance
     */
    public static create(properties?: IPolygon): Polygon;

    /**
     * Encodes the specified Polygon message. Does not implicitly {@link Polygon.verify|verify} messages.
     * @param message Polygon message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IPolygon, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Polygon message, length delimited. Does not implicitly {@link Polygon.verify|verify} messages.
     * @param message Polygon message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IPolygon, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Polygon message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Polygon
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Polygon;

    /**
     * Decodes a Polygon message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Polygon
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Polygon;

    /**
     * Verifies a Polygon message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a Polygon message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Polygon
     */
    public static fromObject(object: { [k: string]: any }): Polygon;

    /**
     * Creates a plain object from a Polygon message. Also converts values to other types if specified.
     * @param message Polygon
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: Polygon, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Polygon to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Polygon
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a MultiPolygon. */
export interface IMultiPolygon {

    /** MultiPolygon polygons */
    polygons?: (IPolygon[]|null);
}

/** Represents a MultiPolygon. */
export class MultiPolygon implements IMultiPolygon {

    /**
     * Constructs a new MultiPolygon.
     * @param [properties] Properties to set
     */
    constructor(properties?: IMultiPolygon);

    /** MultiPolygon polygons. */
    public polygons: IPolygon[];

    /**
     * Creates a new MultiPolygon instance using the specified properties.
     * @param [properties] Properties to set
     * @returns MultiPolygon instance
     */
    public static create(properties?: IMultiPolygon): MultiPolygon;

    /**
     * Encodes the specified MultiPolygon message. Does not implicitly {@link MultiPolygon.verify|verify} messages.
     * @param message MultiPolygon message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IMultiPolygon, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified MultiPolygon message, length delimited. Does not implicitly {@link MultiPolygon.verify|verify} messages.
     * @param message MultiPolygon message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IMultiPolygon, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a MultiPolygon message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns MultiPolygon
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): MultiPolygon;

    /**
     * Decodes a MultiPolygon message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns MultiPolygon
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): MultiPolygon;

    /**
     * Verifies a MultiPolygon message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a MultiPolygon message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns MultiPolygon
     */
    public static fromObject(object: { [k: string]: any }): MultiPolygon;

    /**
     * Creates a plain object from a MultiPolygon message. Also converts values to other types if specified.
     * @param message MultiPolygon
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: MultiPolygon, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this MultiPolygon to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for MultiPolygon
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a Feature. */
export interface IFeature {

    /** Feature polygon */
    polygon?: (IPolygon|null);

    /** Feature multipolygon */
    multipolygon?: (IMultiPolygon|null);
}

/** Represents a Feature. */
export class Feature implements IFeature {

    /**
     * Constructs a new Feature.
     * @param [properties] Properties to set
     */
    constructor(properties?: IFeature);

    /** Feature polygon. */
    public polygon?: (IPolygon|null);

    /** Feature multipolygon. */
    public multipolygon?: (IMultiPolygon|null);

    /** Feature geometry. */
    public geometry?: ("polygon"|"multipolygon");

    /**
     * Creates a new Feature instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Feature instance
     */
    public static create(properties?: IFeature): Feature;

    /**
     * Encodes the specified Feature message. Does not implicitly {@link Feature.verify|verify} messages.
     * @param message Feature message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IFeature, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Feature message, length delimited. Does not implicitly {@link Feature.verify|verify} messages.
     * @param message Feature message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IFeature, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Feature message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Feature
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Feature;

    /**
     * Decodes a Feature message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Feature
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Feature;

    /**
     * Verifies a Feature message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a Feature message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Feature
     */
    public static fromObject(object: { [k: string]: any }): Feature;

    /**
     * Creates a plain object from a Feature message. Also converts values to other types if specified.
     * @param message Feature
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: Feature, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Feature to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Feature
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a StringList. */
export interface IStringList {

    /** StringList elements */
    elements?: (string[]|null);
}

/** Represents a StringList. */
export class StringList implements IStringList {

    /**
     * Constructs a new StringList.
     * @param [properties] Properties to set
     */
    constructor(properties?: IStringList);

    /** StringList elements. */
    public elements: string[];

    /**
     * Creates a new StringList instance using the specified properties.
     * @param [properties] Properties to set
     * @returns StringList instance
     */
    public static create(properties?: IStringList): StringList;

    /**
     * Encodes the specified StringList message. Does not implicitly {@link StringList.verify|verify} messages.
     * @param message StringList message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IStringList, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified StringList message, length delimited. Does not implicitly {@link StringList.verify|verify} messages.
     * @param message StringList message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IStringList, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a StringList message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns StringList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): StringList;

    /**
     * Decodes a StringList message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns StringList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): StringList;

    /**
     * Verifies a StringList message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a StringList message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns StringList
     */
    public static fromObject(object: { [k: string]: any }): StringList;

    /**
     * Creates a plain object from a StringList message. Also converts values to other types if specified.
     * @param message StringList
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: StringList, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this StringList to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for StringList
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a SearchIndex. */
export interface ISearchIndex {

    /** SearchIndex elements */
    elements?: (string[]|null);

    /** SearchIndex priorities */
    priorities?: (number[]|null);
}

/** Represents a SearchIndex. */
export class SearchIndex implements ISearchIndex {

    /**
     * Constructs a new SearchIndex.
     * @param [properties] Properties to set
     */
    constructor(properties?: ISearchIndex);

    /** SearchIndex elements. */
    public elements: string[];

    /** SearchIndex priorities. */
    public priorities: number[];

    /**
     * Creates a new SearchIndex instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SearchIndex instance
     */
    public static create(properties?: ISearchIndex): SearchIndex;

    /**
     * Encodes the specified SearchIndex message. Does not implicitly {@link SearchIndex.verify|verify} messages.
     * @param message SearchIndex message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ISearchIndex, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified SearchIndex message, length delimited. Does not implicitly {@link SearchIndex.verify|verify} messages.
     * @param message SearchIndex message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ISearchIndex, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a SearchIndex message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SearchIndex
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): SearchIndex;

    /**
     * Decodes a SearchIndex message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SearchIndex
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): SearchIndex;

    /**
     * Verifies a SearchIndex message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a SearchIndex message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SearchIndex
     */
    public static fromObject(object: { [k: string]: any }): SearchIndex;

    /**
     * Creates a plain object from a SearchIndex message. Also converts values to other types if specified.
     * @param message SearchIndex
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: SearchIndex, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this SearchIndex to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for SearchIndex
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of an OrderList. */
export interface IOrderList {

    /** OrderList orderIdxs */
    orderIdxs?: (number[]|null);
}

/** Represents an OrderList. */
export class OrderList implements IOrderList {

    /**
     * Constructs a new OrderList.
     * @param [properties] Properties to set
     */
    constructor(properties?: IOrderList);

    /** OrderList orderIdxs. */
    public orderIdxs: number[];

    /**
     * Creates a new OrderList instance using the specified properties.
     * @param [properties] Properties to set
     * @returns OrderList instance
     */
    public static create(properties?: IOrderList): OrderList;

    /**
     * Encodes the specified OrderList message. Does not implicitly {@link OrderList.verify|verify} messages.
     * @param message OrderList message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IOrderList, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified OrderList message, length delimited. Does not implicitly {@link OrderList.verify|verify} messages.
     * @param message OrderList message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IOrderList, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an OrderList message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns OrderList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): OrderList;

    /**
     * Decodes an OrderList message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns OrderList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): OrderList;

    /**
     * Verifies an OrderList message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates an OrderList message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns OrderList
     */
    public static fromObject(object: { [k: string]: any }): OrderList;

    /**
     * Creates a plain object from an OrderList message. Also converts values to other types if specified.
     * @param message OrderList
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: OrderList, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this OrderList to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for OrderList
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a DataList. */
export interface IDataList {

    /** DataList value */
    value?: (number[]|null);

    /** DataList populationPercentile */
    populationPercentile?: (number[]|null);
}

/** Represents a DataList. */
export class DataList implements IDataList {

    /**
     * Constructs a new DataList.
     * @param [properties] Properties to set
     */
    constructor(properties?: IDataList);

    /** DataList value. */
    public value: number[];

    /** DataList populationPercentile. */
    public populationPercentile: number[];

    /**
     * Creates a new DataList instance using the specified properties.
     * @param [properties] Properties to set
     * @returns DataList instance
     */
    public static create(properties?: IDataList): DataList;

    /**
     * Encodes the specified DataList message. Does not implicitly {@link DataList.verify|verify} messages.
     * @param message DataList message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IDataList, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified DataList message, length delimited. Does not implicitly {@link DataList.verify|verify} messages.
     * @param message DataList message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IDataList, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a DataList message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns DataList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): DataList;

    /**
     * Decodes a DataList message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns DataList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): DataList;

    /**
     * Verifies a DataList message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a DataList message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns DataList
     */
    public static fromObject(object: { [k: string]: any }): DataList;

    /**
     * Creates a plain object from a DataList message. Also converts values to other types if specified.
     * @param message DataList
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: DataList, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this DataList to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for DataList
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of an OrderLists. */
export interface IOrderLists {

    /** OrderLists statnames */
    statnames?: (string[]|null);

    /** OrderLists orderLists */
    orderLists?: (IOrderList[]|null);
}

/** Represents an OrderLists. */
export class OrderLists implements IOrderLists {

    /**
     * Constructs a new OrderLists.
     * @param [properties] Properties to set
     */
    constructor(properties?: IOrderLists);

    /** OrderLists statnames. */
    public statnames: string[];

    /** OrderLists orderLists. */
    public orderLists: IOrderList[];

    /**
     * Creates a new OrderLists instance using the specified properties.
     * @param [properties] Properties to set
     * @returns OrderLists instance
     */
    public static create(properties?: IOrderLists): OrderLists;

    /**
     * Encodes the specified OrderLists message. Does not implicitly {@link OrderLists.verify|verify} messages.
     * @param message OrderLists message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IOrderLists, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified OrderLists message, length delimited. Does not implicitly {@link OrderLists.verify|verify} messages.
     * @param message OrderLists message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IOrderLists, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an OrderLists message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns OrderLists
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): OrderLists;

    /**
     * Decodes an OrderLists message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns OrderLists
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): OrderLists;

    /**
     * Verifies an OrderLists message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates an OrderLists message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns OrderLists
     */
    public static fromObject(object: { [k: string]: any }): OrderLists;

    /**
     * Creates a plain object from an OrderLists message. Also converts values to other types if specified.
     * @param message OrderLists
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: OrderLists, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this OrderLists to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for OrderLists
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a DataLists. */
export interface IDataLists {

    /** DataLists statnames */
    statnames?: (string[]|null);

    /** DataLists dataLists */
    dataLists?: (IDataList[]|null);
}

/** Represents a DataLists. */
export class DataLists implements IDataLists {

    /**
     * Constructs a new DataLists.
     * @param [properties] Properties to set
     */
    constructor(properties?: IDataLists);

    /** DataLists statnames. */
    public statnames: string[];

    /** DataLists dataLists. */
    public dataLists: IDataList[];

    /**
     * Creates a new DataLists instance using the specified properties.
     * @param [properties] Properties to set
     * @returns DataLists instance
     */
    public static create(properties?: IDataLists): DataLists;

    /**
     * Encodes the specified DataLists message. Does not implicitly {@link DataLists.verify|verify} messages.
     * @param message DataLists message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IDataLists, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified DataLists message, length delimited. Does not implicitly {@link DataLists.verify|verify} messages.
     * @param message DataLists message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IDataLists, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a DataLists message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns DataLists
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): DataLists;

    /**
     * Decodes a DataLists message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns DataLists
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): DataLists;

    /**
     * Verifies a DataLists message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a DataLists message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns DataLists
     */
    public static fromObject(object: { [k: string]: any }): DataLists;

    /**
     * Creates a plain object from a DataLists message. Also converts values to other types if specified.
     * @param message DataLists
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: DataLists, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this DataLists to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for DataLists
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of an AllStats. */
export interface IAllStats {

    /** AllStats stats */
    stats?: (number[]|null);
}

/** Represents an AllStats. */
export class AllStats implements IAllStats {

    /**
     * Constructs a new AllStats.
     * @param [properties] Properties to set
     */
    constructor(properties?: IAllStats);

    /** AllStats stats. */
    public stats: number[];

    /**
     * Creates a new AllStats instance using the specified properties.
     * @param [properties] Properties to set
     * @returns AllStats instance
     */
    public static create(properties?: IAllStats): AllStats;

    /**
     * Encodes the specified AllStats message. Does not implicitly {@link AllStats.verify|verify} messages.
     * @param message AllStats message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IAllStats, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified AllStats message, length delimited. Does not implicitly {@link AllStats.verify|verify} messages.
     * @param message AllStats message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IAllStats, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an AllStats message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns AllStats
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): AllStats;

    /**
     * Decodes an AllStats message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns AllStats
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): AllStats;

    /**
     * Verifies an AllStats message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates an AllStats message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns AllStats
     */
    public static fromObject(object: { [k: string]: any }): AllStats;

    /**
     * Creates a plain object from an AllStats message. Also converts values to other types if specified.
     * @param message AllStats
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: AllStats, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this AllStats to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for AllStats
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a ConsolidatedShapes. */
export interface IConsolidatedShapes {

    /** ConsolidatedShapes longnames */
    longnames?: (string[]|null);

    /** ConsolidatedShapes shapes */
    shapes?: (IFeature[]|null);
}

/** Represents a ConsolidatedShapes. */
export class ConsolidatedShapes implements IConsolidatedShapes {

    /**
     * Constructs a new ConsolidatedShapes.
     * @param [properties] Properties to set
     */
    constructor(properties?: IConsolidatedShapes);

    /** ConsolidatedShapes longnames. */
    public longnames: string[];

    /** ConsolidatedShapes shapes. */
    public shapes: IFeature[];

    /**
     * Creates a new ConsolidatedShapes instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ConsolidatedShapes instance
     */
    public static create(properties?: IConsolidatedShapes): ConsolidatedShapes;

    /**
     * Encodes the specified ConsolidatedShapes message. Does not implicitly {@link ConsolidatedShapes.verify|verify} messages.
     * @param message ConsolidatedShapes message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IConsolidatedShapes, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified ConsolidatedShapes message, length delimited. Does not implicitly {@link ConsolidatedShapes.verify|verify} messages.
     * @param message ConsolidatedShapes message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IConsolidatedShapes, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a ConsolidatedShapes message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ConsolidatedShapes
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): ConsolidatedShapes;

    /**
     * Decodes a ConsolidatedShapes message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ConsolidatedShapes
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): ConsolidatedShapes;

    /**
     * Verifies a ConsolidatedShapes message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a ConsolidatedShapes message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ConsolidatedShapes
     */
    public static fromObject(object: { [k: string]: any }): ConsolidatedShapes;

    /**
     * Creates a plain object from a ConsolidatedShapes message. Also converts values to other types if specified.
     * @param message ConsolidatedShapes
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: ConsolidatedShapes, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this ConsolidatedShapes to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ConsolidatedShapes
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a ConsolidatedStatistics. */
export interface IConsolidatedStatistics {

    /** ConsolidatedStatistics longnames */
    longnames?: (string[]|null);

    /** ConsolidatedStatistics shortnames */
    shortnames?: (string[]|null);

    /** ConsolidatedStatistics stats */
    stats?: (IAllStats[]|null);
}

/** Represents a ConsolidatedStatistics. */
export class ConsolidatedStatistics implements IConsolidatedStatistics {

    /**
     * Constructs a new ConsolidatedStatistics.
     * @param [properties] Properties to set
     */
    constructor(properties?: IConsolidatedStatistics);

    /** ConsolidatedStatistics longnames. */
    public longnames: string[];

    /** ConsolidatedStatistics shortnames. */
    public shortnames: string[];

    /** ConsolidatedStatistics stats. */
    public stats: IAllStats[];

    /**
     * Creates a new ConsolidatedStatistics instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ConsolidatedStatistics instance
     */
    public static create(properties?: IConsolidatedStatistics): ConsolidatedStatistics;

    /**
     * Encodes the specified ConsolidatedStatistics message. Does not implicitly {@link ConsolidatedStatistics.verify|verify} messages.
     * @param message ConsolidatedStatistics message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IConsolidatedStatistics, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified ConsolidatedStatistics message, length delimited. Does not implicitly {@link ConsolidatedStatistics.verify|verify} messages.
     * @param message ConsolidatedStatistics message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IConsolidatedStatistics, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a ConsolidatedStatistics message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ConsolidatedStatistics
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): ConsolidatedStatistics;

    /**
     * Decodes a ConsolidatedStatistics message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ConsolidatedStatistics
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): ConsolidatedStatistics;

    /**
     * Verifies a ConsolidatedStatistics message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a ConsolidatedStatistics message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ConsolidatedStatistics
     */
    public static fromObject(object: { [k: string]: any }): ConsolidatedStatistics;

    /**
     * Creates a plain object from a ConsolidatedStatistics message. Also converts values to other types if specified.
     * @param message ConsolidatedStatistics
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: ConsolidatedStatistics, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this ConsolidatedStatistics to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ConsolidatedStatistics
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}
