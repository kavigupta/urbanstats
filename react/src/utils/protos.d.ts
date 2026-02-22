import * as $protobuf from "protobufjs";
import Long = require("long");
/** Properties of a StatisticRow. */
export interface IStatisticRow {

    /** StatisticRow statval */
    statval?: (number|null);

    /** StatisticRow ordinalByUniverse */
    ordinalByUniverse?: (number[]|null);

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

/** Properties of a FirstOrLast. */
export interface IFirstOrLast {

    /** FirstOrLast articleRowIdx */
    articleRowIdx?: (number|null);

    /** FirstOrLast articleUniversesIdx */
    articleUniversesIdx?: (number|null);

    /** FirstOrLast isFirst */
    isFirst?: (boolean|null);
}

/** Represents a FirstOrLast. */
export class FirstOrLast implements IFirstOrLast {

    /**
     * Constructs a new FirstOrLast.
     * @param [properties] Properties to set
     */
    constructor(properties?: IFirstOrLast);

    /** FirstOrLast articleRowIdx. */
    public articleRowIdx: number;

    /** FirstOrLast articleUniversesIdx. */
    public articleUniversesIdx: number;

    /** FirstOrLast isFirst. */
    public isFirst: boolean;

    /**
     * Creates a new FirstOrLast instance using the specified properties.
     * @param [properties] Properties to set
     * @returns FirstOrLast instance
     */
    public static create(properties?: IFirstOrLast): FirstOrLast;

    /**
     * Encodes the specified FirstOrLast message. Does not implicitly {@link FirstOrLast.verify|verify} messages.
     * @param message FirstOrLast message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IFirstOrLast, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified FirstOrLast message, length delimited. Does not implicitly {@link FirstOrLast.verify|verify} messages.
     * @param message FirstOrLast message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IFirstOrLast, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a FirstOrLast message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns FirstOrLast
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): FirstOrLast;

    /**
     * Decodes a FirstOrLast message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns FirstOrLast
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): FirstOrLast;

    /**
     * Verifies a FirstOrLast message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a FirstOrLast message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns FirstOrLast
     */
    public static fromObject(object: { [k: string]: any }): FirstOrLast;

    /**
     * Creates a plain object from a FirstOrLast message. Also converts values to other types if specified.
     * @param message FirstOrLast
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: FirstOrLast, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this FirstOrLast to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for FirstOrLast
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

/** Properties of a Histogram. */
export interface IHistogram {

    /** Histogram binMin */
    binMin?: (number|null);

    /** Histogram binSize */
    binSize?: (number|null);

    /** Histogram counts */
    counts?: (number[]|null);
}

/** Represents a Histogram. */
export class Histogram implements IHistogram {

    /**
     * Constructs a new Histogram.
     * @param [properties] Properties to set
     */
    constructor(properties?: IHistogram);

    /** Histogram binMin. */
    public binMin: number;

    /** Histogram binSize. */
    public binSize: number;

    /** Histogram counts. */
    public counts: number[];

    /**
     * Creates a new Histogram instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Histogram instance
     */
    public static create(properties?: IHistogram): Histogram;

    /**
     * Encodes the specified Histogram message. Does not implicitly {@link Histogram.verify|verify} messages.
     * @param message Histogram message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IHistogram, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Histogram message, length delimited. Does not implicitly {@link Histogram.verify|verify} messages.
     * @param message Histogram message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IHistogram, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Histogram message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Histogram
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Histogram;

    /**
     * Decodes a Histogram message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Histogram
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Histogram;

    /**
     * Verifies a Histogram message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a Histogram message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Histogram
     */
    public static fromObject(object: { [k: string]: any }): Histogram;

    /**
     * Creates a plain object from a Histogram message. Also converts values to other types if specified.
     * @param message Histogram
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: Histogram, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Histogram to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Histogram
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a TimeSeries. */
export interface ITimeSeries {

    /** TimeSeries values */
    values?: (number[]|null);
}

/** Represents a TimeSeries. */
export class TimeSeries implements ITimeSeries {

    /**
     * Constructs a new TimeSeries.
     * @param [properties] Properties to set
     */
    constructor(properties?: ITimeSeries);

    /** TimeSeries values. */
    public values: number[];

    /**
     * Creates a new TimeSeries instance using the specified properties.
     * @param [properties] Properties to set
     * @returns TimeSeries instance
     */
    public static create(properties?: ITimeSeries): TimeSeries;

    /**
     * Encodes the specified TimeSeries message. Does not implicitly {@link TimeSeries.verify|verify} messages.
     * @param message TimeSeries message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ITimeSeries, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified TimeSeries message, length delimited. Does not implicitly {@link TimeSeries.verify|verify} messages.
     * @param message TimeSeries message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ITimeSeries, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a TimeSeries message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns TimeSeries
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): TimeSeries;

    /**
     * Decodes a TimeSeries message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns TimeSeries
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): TimeSeries;

    /**
     * Verifies a TimeSeries message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a TimeSeries message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns TimeSeries
     */
    public static fromObject(object: { [k: string]: any }): TimeSeries;

    /**
     * Creates a plain object from a TimeSeries message. Also converts values to other types if specified.
     * @param message TimeSeries
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: TimeSeries, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this TimeSeries to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for TimeSeries
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a TemperatureHistogram. */
export interface ITemperatureHistogram {

    /** TemperatureHistogram counts */
    counts?: (number[]|null);
}

/** Represents a TemperatureHistogram. */
export class TemperatureHistogram implements ITemperatureHistogram {

    /**
     * Constructs a new TemperatureHistogram.
     * @param [properties] Properties to set
     */
    constructor(properties?: ITemperatureHistogram);

    /** TemperatureHistogram counts. */
    public counts: number[];

    /**
     * Creates a new TemperatureHistogram instance using the specified properties.
     * @param [properties] Properties to set
     * @returns TemperatureHistogram instance
     */
    public static create(properties?: ITemperatureHistogram): TemperatureHistogram;

    /**
     * Encodes the specified TemperatureHistogram message. Does not implicitly {@link TemperatureHistogram.verify|verify} messages.
     * @param message TemperatureHistogram message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ITemperatureHistogram, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified TemperatureHistogram message, length delimited. Does not implicitly {@link TemperatureHistogram.verify|verify} messages.
     * @param message TemperatureHistogram message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ITemperatureHistogram, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a TemperatureHistogram message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns TemperatureHistogram
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): TemperatureHistogram;

    /**
     * Decodes a TemperatureHistogram message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns TemperatureHistogram
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): TemperatureHistogram;

    /**
     * Verifies a TemperatureHistogram message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a TemperatureHistogram message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns TemperatureHistogram
     */
    public static fromObject(object: { [k: string]: any }): TemperatureHistogram;

    /**
     * Creates a plain object from a TemperatureHistogram message. Also converts values to other types if specified.
     * @param message TemperatureHistogram
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: TemperatureHistogram, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this TemperatureHistogram to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for TemperatureHistogram
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of an ExtraStatistic. */
export interface IExtraStatistic {

    /** ExtraStatistic histogram */
    histogram?: (IHistogram|null);

    /** ExtraStatistic timeseries */
    timeseries?: (ITimeSeries|null);

    /** ExtraStatistic temperatureHistogram */
    temperatureHistogram?: (ITemperatureHistogram|null);
}

/** Represents an ExtraStatistic. */
export class ExtraStatistic implements IExtraStatistic {

    /**
     * Constructs a new ExtraStatistic.
     * @param [properties] Properties to set
     */
    constructor(properties?: IExtraStatistic);

    /** ExtraStatistic histogram. */
    public histogram?: (IHistogram|null);

    /** ExtraStatistic timeseries. */
    public timeseries?: (ITimeSeries|null);

    /** ExtraStatistic temperatureHistogram. */
    public temperatureHistogram?: (ITemperatureHistogram|null);

    /** ExtraStatistic _histogram. */
    public _histogram?: "histogram";

    /** ExtraStatistic _timeseries. */
    public _timeseries?: "timeseries";

    /** ExtraStatistic _temperatureHistogram. */
    public _temperatureHistogram?: "temperatureHistogram";

    /**
     * Creates a new ExtraStatistic instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ExtraStatistic instance
     */
    public static create(properties?: IExtraStatistic): ExtraStatistic;

    /**
     * Encodes the specified ExtraStatistic message. Does not implicitly {@link ExtraStatistic.verify|verify} messages.
     * @param message ExtraStatistic message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IExtraStatistic, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified ExtraStatistic message, length delimited. Does not implicitly {@link ExtraStatistic.verify|verify} messages.
     * @param message ExtraStatistic message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IExtraStatistic, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an ExtraStatistic message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ExtraStatistic
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): ExtraStatistic;

    /**
     * Decodes an ExtraStatistic message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ExtraStatistic
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): ExtraStatistic;

    /**
     * Verifies an ExtraStatistic message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates an ExtraStatistic message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ExtraStatistic
     */
    public static fromObject(object: { [k: string]: any }): ExtraStatistic;

    /**
     * Creates a plain object from an ExtraStatistic message. Also converts values to other types if specified.
     * @param message ExtraStatistic
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: ExtraStatistic, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this ExtraStatistic to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ExtraStatistic
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a Metadata. */
export interface IMetadata {

    /** Metadata metadataIndex */
    metadataIndex?: (number|null);

    /** Metadata stringValue */
    stringValue?: (string|null);
}

/** Represents a Metadata. */
export class Metadata implements IMetadata {

    /**
     * Constructs a new Metadata.
     * @param [properties] Properties to set
     */
    constructor(properties?: IMetadata);

    /** Metadata metadataIndex. */
    public metadataIndex: number;

    /** Metadata stringValue. */
    public stringValue?: (string|null);

    /** Metadata _stringValue. */
    public _stringValue?: "stringValue";

    /**
     * Creates a new Metadata instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Metadata instance
     */
    public static create(properties?: IMetadata): Metadata;

    /**
     * Encodes the specified Metadata message. Does not implicitly {@link Metadata.verify|verify} messages.
     * @param message Metadata message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IMetadata, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Metadata message, length delimited. Does not implicitly {@link Metadata.verify|verify} messages.
     * @param message Metadata message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IMetadata, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Metadata message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Metadata
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Metadata;

    /**
     * Decodes a Metadata message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Metadata
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Metadata;

    /**
     * Verifies a Metadata message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a Metadata message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Metadata
     */
    public static fromObject(object: { [k: string]: any }): Metadata;

    /**
     * Creates a plain object from a Metadata message. Also converts values to other types if specified.
     * @param message Metadata
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: Metadata, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Metadata to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Metadata
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

    /** Article statisticIndicesPacked */
    statisticIndicesPacked?: (Uint8Array|null);

    /** Article rows */
    rows?: (IStatisticRow[]|null);

    /** Article overallFirstOrLast */
    overallFirstOrLast?: (IFirstOrLast[]|null);

    /** Article related */
    related?: (IRelatedButtons[]|null);

    /** Article universes */
    universes?: (string[]|null);

    /** Article extraStats */
    extraStats?: (IExtraStatistic[]|null);

    /** Article metadata */
    metadata?: (IMetadata[]|null);
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

    /** Article statisticIndicesPacked. */
    public statisticIndicesPacked: Uint8Array;

    /** Article rows. */
    public rows: IStatisticRow[];

    /** Article overallFirstOrLast. */
    public overallFirstOrLast: IFirstOrLast[];

    /** Article related. */
    public related: IRelatedButtons[];

    /** Article universes. */
    public universes: string[];

    /** Article extraStats. */
    public extraStats: IExtraStatistic[];

    /** Article metadata. */
    public metadata: IMetadata[];

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

/** Properties of a ConsolidatedArticles. */
export interface IConsolidatedArticles {

    /** ConsolidatedArticles longnames */
    longnames?: (string[]|null);

    /** ConsolidatedArticles articles */
    articles?: (IArticle[]|null);

    /** ConsolidatedArticles symlinkLinkNames */
    symlinkLinkNames?: (string[]|null);

    /** ConsolidatedArticles symlinkTargetNames */
    symlinkTargetNames?: (string[]|null);
}

/** Represents a ConsolidatedArticles. */
export class ConsolidatedArticles implements IConsolidatedArticles {

    /**
     * Constructs a new ConsolidatedArticles.
     * @param [properties] Properties to set
     */
    constructor(properties?: IConsolidatedArticles);

    /** ConsolidatedArticles longnames. */
    public longnames: string[];

    /** ConsolidatedArticles articles. */
    public articles: IArticle[];

    /** ConsolidatedArticles symlinkLinkNames. */
    public symlinkLinkNames: string[];

    /** ConsolidatedArticles symlinkTargetNames. */
    public symlinkTargetNames: string[];

    /**
     * Creates a new ConsolidatedArticles instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ConsolidatedArticles instance
     */
    public static create(properties?: IConsolidatedArticles): ConsolidatedArticles;

    /**
     * Encodes the specified ConsolidatedArticles message. Does not implicitly {@link ConsolidatedArticles.verify|verify} messages.
     * @param message ConsolidatedArticles message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IConsolidatedArticles, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified ConsolidatedArticles message, length delimited. Does not implicitly {@link ConsolidatedArticles.verify|verify} messages.
     * @param message ConsolidatedArticles message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IConsolidatedArticles, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a ConsolidatedArticles message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ConsolidatedArticles
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): ConsolidatedArticles;

    /**
     * Decodes a ConsolidatedArticles message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ConsolidatedArticles
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): ConsolidatedArticles;

    /**
     * Verifies a ConsolidatedArticles message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a ConsolidatedArticles message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ConsolidatedArticles
     */
    public static fromObject(object: { [k: string]: any }): ConsolidatedArticles;

    /**
     * Creates a plain object from a ConsolidatedArticles message. Also converts values to other types if specified.
     * @param message ConsolidatedArticles
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: ConsolidatedArticles, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this ConsolidatedArticles to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ConsolidatedArticles
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

    /** Feature zones */
    zones?: (number[]|null);

    /** Feature centerLon */
    centerLon?: (number|null);
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

    /** Feature zones. */
    public zones: number[];

    /** Feature centerLon. */
    public centerLon: number;

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

/** Properties of a PointSeries. */
export interface IPointSeries {

    /** PointSeries coords */
    coords?: (ICoordinate[]|null);
}

/** Represents a PointSeries. */
export class PointSeries implements IPointSeries {

    /**
     * Constructs a new PointSeries.
     * @param [properties] Properties to set
     */
    constructor(properties?: IPointSeries);

    /** PointSeries coords. */
    public coords: ICoordinate[];

    /**
     * Creates a new PointSeries instance using the specified properties.
     * @param [properties] Properties to set
     * @returns PointSeries instance
     */
    public static create(properties?: IPointSeries): PointSeries;

    /**
     * Encodes the specified PointSeries message. Does not implicitly {@link PointSeries.verify|verify} messages.
     * @param message PointSeries message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IPointSeries, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified PointSeries message, length delimited. Does not implicitly {@link PointSeries.verify|verify} messages.
     * @param message PointSeries message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IPointSeries, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a PointSeries message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns PointSeries
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): PointSeries;

    /**
     * Decodes a PointSeries message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns PointSeries
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): PointSeries;

    /**
     * Verifies a PointSeries message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a PointSeries message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns PointSeries
     */
    public static fromObject(object: { [k: string]: any }): PointSeries;

    /**
     * Creates a plain object from a PointSeries message. Also converts values to other types if specified.
     * @param message PointSeries
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: PointSeries, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this PointSeries to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for PointSeries
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of an ArticleOrderingList. */
export interface IArticleOrderingList {

    /** ArticleOrderingList longnames */
    longnames?: (string[]|null);

    /** ArticleOrderingList types */
    types?: (number[]|null);
}

/** Represents an ArticleOrderingList. */
export class ArticleOrderingList implements IArticleOrderingList {

    /**
     * Constructs a new ArticleOrderingList.
     * @param [properties] Properties to set
     */
    constructor(properties?: IArticleOrderingList);

    /** ArticleOrderingList longnames. */
    public longnames: string[];

    /** ArticleOrderingList types. */
    public types: number[];

    /**
     * Creates a new ArticleOrderingList instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ArticleOrderingList instance
     */
    public static create(properties?: IArticleOrderingList): ArticleOrderingList;

    /**
     * Encodes the specified ArticleOrderingList message. Does not implicitly {@link ArticleOrderingList.verify|verify} messages.
     * @param message ArticleOrderingList message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IArticleOrderingList, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified ArticleOrderingList message, length delimited. Does not implicitly {@link ArticleOrderingList.verify|verify} messages.
     * @param message ArticleOrderingList message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IArticleOrderingList, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an ArticleOrderingList message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ArticleOrderingList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): ArticleOrderingList;

    /**
     * Decodes an ArticleOrderingList message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ArticleOrderingList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): ArticleOrderingList;

    /**
     * Verifies an ArticleOrderingList message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates an ArticleOrderingList message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ArticleOrderingList
     */
    public static fromObject(object: { [k: string]: any }): ArticleOrderingList;

    /**
     * Creates a plain object from an ArticleOrderingList message. Also converts values to other types if specified.
     * @param message ArticleOrderingList
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: ArticleOrderingList, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this ArticleOrderingList to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ArticleOrderingList
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of an ArticleUniverseList. */
export interface IArticleUniverseList {

    /** ArticleUniverseList universes */
    universes?: (IUniverses[]|null);
}

/** Represents an ArticleUniverseList. */
export class ArticleUniverseList implements IArticleUniverseList {

    /**
     * Constructs a new ArticleUniverseList.
     * @param [properties] Properties to set
     */
    constructor(properties?: IArticleUniverseList);

    /** ArticleUniverseList universes. */
    public universes: IUniverses[];

    /**
     * Creates a new ArticleUniverseList instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ArticleUniverseList instance
     */
    public static create(properties?: IArticleUniverseList): ArticleUniverseList;

    /**
     * Encodes the specified ArticleUniverseList message. Does not implicitly {@link ArticleUniverseList.verify|verify} messages.
     * @param message ArticleUniverseList message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IArticleUniverseList, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified ArticleUniverseList message, length delimited. Does not implicitly {@link ArticleUniverseList.verify|verify} messages.
     * @param message ArticleUniverseList message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IArticleUniverseList, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an ArticleUniverseList message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ArticleUniverseList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): ArticleUniverseList;

    /**
     * Decodes an ArticleUniverseList message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ArticleUniverseList
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): ArticleUniverseList;

    /**
     * Verifies an ArticleUniverseList message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates an ArticleUniverseList message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ArticleUniverseList
     */
    public static fromObject(object: { [k: string]: any }): ArticleUniverseList;

    /**
     * Creates a plain object from an ArticleUniverseList message. Also converts values to other types if specified.
     * @param message ArticleUniverseList
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: ArticleUniverseList, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this ArticleUniverseList to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ArticleUniverseList
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a SearchIndexMetadata. */
export interface ISearchIndexMetadata {

    /** SearchIndexMetadata type */
    type?: (number|null);

    /** SearchIndexMetadata isUsa */
    isUsa?: (number|null);

    /** SearchIndexMetadata isSymlink */
    isSymlink?: (number|null);
}

/** Represents a SearchIndexMetadata. */
export class SearchIndexMetadata implements ISearchIndexMetadata {

    /**
     * Constructs a new SearchIndexMetadata.
     * @param [properties] Properties to set
     */
    constructor(properties?: ISearchIndexMetadata);

    /** SearchIndexMetadata type. */
    public type: number;

    /** SearchIndexMetadata isUsa. */
    public isUsa: number;

    /** SearchIndexMetadata isSymlink. */
    public isSymlink: number;

    /**
     * Creates a new SearchIndexMetadata instance using the specified properties.
     * @param [properties] Properties to set
     * @returns SearchIndexMetadata instance
     */
    public static create(properties?: ISearchIndexMetadata): SearchIndexMetadata;

    /**
     * Encodes the specified SearchIndexMetadata message. Does not implicitly {@link SearchIndexMetadata.verify|verify} messages.
     * @param message SearchIndexMetadata message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ISearchIndexMetadata, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified SearchIndexMetadata message, length delimited. Does not implicitly {@link SearchIndexMetadata.verify|verify} messages.
     * @param message SearchIndexMetadata message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ISearchIndexMetadata, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a SearchIndexMetadata message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns SearchIndexMetadata
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): SearchIndexMetadata;

    /**
     * Decodes a SearchIndexMetadata message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns SearchIndexMetadata
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): SearchIndexMetadata;

    /**
     * Verifies a SearchIndexMetadata message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a SearchIndexMetadata message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns SearchIndexMetadata
     */
    public static fromObject(object: { [k: string]: any }): SearchIndexMetadata;

    /**
     * Creates a plain object from a SearchIndexMetadata message. Also converts values to other types if specified.
     * @param message SearchIndexMetadata
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: SearchIndexMetadata, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this SearchIndexMetadata to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for SearchIndexMetadata
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a SearchIndex. */
export interface ISearchIndex {

    /** SearchIndex elements */
    elements?: (string[]|null);

    /** SearchIndex metadata */
    metadata?: (ISearchIndexMetadata[]|null);
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

    /** SearchIndex metadata. */
    public metadata: ISearchIndexMetadata[];

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

/** Properties of a PopulationPercentileByUniverse. */
export interface IPopulationPercentileByUniverse {

    /** PopulationPercentileByUniverse populationPercentile */
    populationPercentile?: (number[]|null);
}

/** Represents a PopulationPercentileByUniverse. */
export class PopulationPercentileByUniverse implements IPopulationPercentileByUniverse {

    /**
     * Constructs a new PopulationPercentileByUniverse.
     * @param [properties] Properties to set
     */
    constructor(properties?: IPopulationPercentileByUniverse);

    /** PopulationPercentileByUniverse populationPercentile. */
    public populationPercentile: number[];

    /**
     * Creates a new PopulationPercentileByUniverse instance using the specified properties.
     * @param [properties] Properties to set
     * @returns PopulationPercentileByUniverse instance
     */
    public static create(properties?: IPopulationPercentileByUniverse): PopulationPercentileByUniverse;

    /**
     * Encodes the specified PopulationPercentileByUniverse message. Does not implicitly {@link PopulationPercentileByUniverse.verify|verify} messages.
     * @param message PopulationPercentileByUniverse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IPopulationPercentileByUniverse, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified PopulationPercentileByUniverse message, length delimited. Does not implicitly {@link PopulationPercentileByUniverse.verify|verify} messages.
     * @param message PopulationPercentileByUniverse message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IPopulationPercentileByUniverse, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a PopulationPercentileByUniverse message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns PopulationPercentileByUniverse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): PopulationPercentileByUniverse;

    /**
     * Decodes a PopulationPercentileByUniverse message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns PopulationPercentileByUniverse
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): PopulationPercentileByUniverse;

    /**
     * Verifies a PopulationPercentileByUniverse message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a PopulationPercentileByUniverse message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns PopulationPercentileByUniverse
     */
    public static fromObject(object: { [k: string]: any }): PopulationPercentileByUniverse;

    /**
     * Creates a plain object from a PopulationPercentileByUniverse message. Also converts values to other types if specified.
     * @param message PopulationPercentileByUniverse
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: PopulationPercentileByUniverse, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this PopulationPercentileByUniverse to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for PopulationPercentileByUniverse
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a DataList. */
export interface IDataList {

    /** DataList value */
    value?: (number[]|null);

    /** DataList populationPercentileByUniverse */
    populationPercentileByUniverse?: (IPopulationPercentileByUniverse[]|null);
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

    /** DataList populationPercentileByUniverse. */
    public populationPercentileByUniverse: IPopulationPercentileByUniverse[];

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

/** Properties of an Universes. */
export interface IUniverses {

    /** Universes universeIdxs */
    universeIdxs?: (number[]|null);
}

/** Represents an Universes. */
export class Universes implements IUniverses {

    /**
     * Constructs a new Universes.
     * @param [properties] Properties to set
     */
    constructor(properties?: IUniverses);

    /** Universes universeIdxs. */
    public universeIdxs: number[];

    /**
     * Creates a new Universes instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Universes instance
     */
    public static create(properties?: IUniverses): Universes;

    /**
     * Encodes the specified Universes message. Does not implicitly {@link Universes.verify|verify} messages.
     * @param message Universes message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IUniverses, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Universes message, length delimited. Does not implicitly {@link Universes.verify|verify} messages.
     * @param message Universes message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IUniverses, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an Universes message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Universes
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Universes;

    /**
     * Decodes an Universes message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Universes
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Universes;

    /**
     * Verifies an Universes message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates an Universes message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Universes
     */
    public static fromObject(object: { [k: string]: any }): Universes;

    /**
     * Creates a plain object from an Universes message. Also converts values to other types if specified.
     * @param message Universes
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: Universes, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Universes to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Universes
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a ConsolidatedShapes. */
export interface IConsolidatedShapes {

    /** ConsolidatedShapes longnames */
    longnames?: (string[]|null);

    /** ConsolidatedShapes universes */
    universes?: (IUniverses[]|null);

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

    /** ConsolidatedShapes universes. */
    public universes: IUniverses[];

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

/** Properties of a QuizDataForStat. */
export interface IQuizDataForStat {

    /** QuizDataForStat stats */
    stats?: (number[]|null);
}

/** Represents a QuizDataForStat. */
export class QuizDataForStat implements IQuizDataForStat {

    /**
     * Constructs a new QuizDataForStat.
     * @param [properties] Properties to set
     */
    constructor(properties?: IQuizDataForStat);

    /** QuizDataForStat stats. */
    public stats: number[];

    /**
     * Creates a new QuizDataForStat instance using the specified properties.
     * @param [properties] Properties to set
     * @returns QuizDataForStat instance
     */
    public static create(properties?: IQuizDataForStat): QuizDataForStat;

    /**
     * Encodes the specified QuizDataForStat message. Does not implicitly {@link QuizDataForStat.verify|verify} messages.
     * @param message QuizDataForStat message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IQuizDataForStat, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified QuizDataForStat message, length delimited. Does not implicitly {@link QuizDataForStat.verify|verify} messages.
     * @param message QuizDataForStat message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IQuizDataForStat, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a QuizDataForStat message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns QuizDataForStat
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): QuizDataForStat;

    /**
     * Decodes a QuizDataForStat message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns QuizDataForStat
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): QuizDataForStat;

    /**
     * Verifies a QuizDataForStat message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a QuizDataForStat message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns QuizDataForStat
     */
    public static fromObject(object: { [k: string]: any }): QuizDataForStat;

    /**
     * Creates a plain object from a QuizDataForStat message. Also converts values to other types if specified.
     * @param message QuizDataForStat
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: QuizDataForStat, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this QuizDataForStat to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for QuizDataForStat
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a QuizFullData. */
export interface IQuizFullData {

    /** QuizFullData stats */
    stats?: (IQuizDataForStat[]|null);
}

/** Represents a QuizFullData. */
export class QuizFullData implements IQuizFullData {

    /**
     * Constructs a new QuizFullData.
     * @param [properties] Properties to set
     */
    constructor(properties?: IQuizFullData);

    /** QuizFullData stats. */
    public stats: IQuizDataForStat[];

    /**
     * Creates a new QuizFullData instance using the specified properties.
     * @param [properties] Properties to set
     * @returns QuizFullData instance
     */
    public static create(properties?: IQuizFullData): QuizFullData;

    /**
     * Encodes the specified QuizFullData message. Does not implicitly {@link QuizFullData.verify|verify} messages.
     * @param message QuizFullData message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IQuizFullData, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified QuizFullData message, length delimited. Does not implicitly {@link QuizFullData.verify|verify} messages.
     * @param message QuizFullData message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IQuizFullData, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a QuizFullData message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns QuizFullData
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): QuizFullData;

    /**
     * Decodes a QuizFullData message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns QuizFullData
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): QuizFullData;

    /**
     * Verifies a QuizFullData message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a QuizFullData message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns QuizFullData
     */
    public static fromObject(object: { [k: string]: any }): QuizFullData;

    /**
     * Creates a plain object from a QuizFullData message. Also converts values to other types if specified.
     * @param message QuizFullData
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: QuizFullData, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this QuizFullData to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for QuizFullData
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a QuizQuestionTronche. */
export interface IQuizQuestionTronche {

    /** QuizQuestionTronche geographyA */
    geographyA?: (number[]|null);

    /** QuizQuestionTronche geographyB */
    geographyB?: (number[]|null);

    /** QuizQuestionTronche stat */
    stat?: (number[]|null);

    /** QuizQuestionTronche negLogProbX10Basis */
    negLogProbX10Basis?: (number|null);

    /** QuizQuestionTronche negLogProbX10MinusBasis */
    negLogProbX10MinusBasis?: (number[]|null);
}

/** Represents a QuizQuestionTronche. */
export class QuizQuestionTronche implements IQuizQuestionTronche {

    /**
     * Constructs a new QuizQuestionTronche.
     * @param [properties] Properties to set
     */
    constructor(properties?: IQuizQuestionTronche);

    /** QuizQuestionTronche geographyA. */
    public geographyA: number[];

    /** QuizQuestionTronche geographyB. */
    public geographyB: number[];

    /** QuizQuestionTronche stat. */
    public stat: number[];

    /** QuizQuestionTronche negLogProbX10Basis. */
    public negLogProbX10Basis: number;

    /** QuizQuestionTronche negLogProbX10MinusBasis. */
    public negLogProbX10MinusBasis: number[];

    /**
     * Creates a new QuizQuestionTronche instance using the specified properties.
     * @param [properties] Properties to set
     * @returns QuizQuestionTronche instance
     */
    public static create(properties?: IQuizQuestionTronche): QuizQuestionTronche;

    /**
     * Encodes the specified QuizQuestionTronche message. Does not implicitly {@link QuizQuestionTronche.verify|verify} messages.
     * @param message QuizQuestionTronche message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IQuizQuestionTronche, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified QuizQuestionTronche message, length delimited. Does not implicitly {@link QuizQuestionTronche.verify|verify} messages.
     * @param message QuizQuestionTronche message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IQuizQuestionTronche, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a QuizQuestionTronche message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns QuizQuestionTronche
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): QuizQuestionTronche;

    /**
     * Decodes a QuizQuestionTronche message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns QuizQuestionTronche
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): QuizQuestionTronche;

    /**
     * Verifies a QuizQuestionTronche message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a QuizQuestionTronche message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns QuizQuestionTronche
     */
    public static fromObject(object: { [k: string]: any }): QuizQuestionTronche;

    /**
     * Creates a plain object from a QuizQuestionTronche message. Also converts values to other types if specified.
     * @param message QuizQuestionTronche
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: QuizQuestionTronche, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this QuizQuestionTronche to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for QuizQuestionTronche
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a CountsByColumnCompressed. */
export interface ICountsByColumnCompressed {

    /** CountsByColumnCompressed count */
    count?: (number[]|null);

    /** CountsByColumnCompressed countRepeat */
    countRepeat?: (number[]|null);
}

/** Represents a CountsByColumnCompressed. */
export class CountsByColumnCompressed implements ICountsByColumnCompressed {

    /**
     * Constructs a new CountsByColumnCompressed.
     * @param [properties] Properties to set
     */
    constructor(properties?: ICountsByColumnCompressed);

    /** CountsByColumnCompressed count. */
    public count: number[];

    /** CountsByColumnCompressed countRepeat. */
    public countRepeat: number[];

    /**
     * Creates a new CountsByColumnCompressed instance using the specified properties.
     * @param [properties] Properties to set
     * @returns CountsByColumnCompressed instance
     */
    public static create(properties?: ICountsByColumnCompressed): CountsByColumnCompressed;

    /**
     * Encodes the specified CountsByColumnCompressed message. Does not implicitly {@link CountsByColumnCompressed.verify|verify} messages.
     * @param message CountsByColumnCompressed message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ICountsByColumnCompressed, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified CountsByColumnCompressed message, length delimited. Does not implicitly {@link CountsByColumnCompressed.verify|verify} messages.
     * @param message CountsByColumnCompressed message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ICountsByColumnCompressed, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a CountsByColumnCompressed message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns CountsByColumnCompressed
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): CountsByColumnCompressed;

    /**
     * Decodes a CountsByColumnCompressed message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns CountsByColumnCompressed
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): CountsByColumnCompressed;

    /**
     * Verifies a CountsByColumnCompressed message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a CountsByColumnCompressed message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns CountsByColumnCompressed
     */
    public static fromObject(object: { [k: string]: any }): CountsByColumnCompressed;

    /**
     * Creates a plain object from a CountsByColumnCompressed message. Also converts values to other types if specified.
     * @param message CountsByColumnCompressed
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: CountsByColumnCompressed, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this CountsByColumnCompressed to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for CountsByColumnCompressed
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a CountsByArticleType. */
export interface ICountsByArticleType {

    /** CountsByArticleType articleType */
    articleType?: (string[]|null);

    /** CountsByArticleType counts */
    counts?: (ICountsByColumnCompressed[]|null);
}

/** Represents a CountsByArticleType. */
export class CountsByArticleType implements ICountsByArticleType {

    /**
     * Constructs a new CountsByArticleType.
     * @param [properties] Properties to set
     */
    constructor(properties?: ICountsByArticleType);

    /** CountsByArticleType articleType. */
    public articleType: string[];

    /** CountsByArticleType counts. */
    public counts: ICountsByColumnCompressed[];

    /**
     * Creates a new CountsByArticleType instance using the specified properties.
     * @param [properties] Properties to set
     * @returns CountsByArticleType instance
     */
    public static create(properties?: ICountsByArticleType): CountsByArticleType;

    /**
     * Encodes the specified CountsByArticleType message. Does not implicitly {@link CountsByArticleType.verify|verify} messages.
     * @param message CountsByArticleType message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ICountsByArticleType, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified CountsByArticleType message, length delimited. Does not implicitly {@link CountsByArticleType.verify|verify} messages.
     * @param message CountsByArticleType message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ICountsByArticleType, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a CountsByArticleType message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns CountsByArticleType
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): CountsByArticleType;

    /**
     * Decodes a CountsByArticleType message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns CountsByArticleType
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): CountsByArticleType;

    /**
     * Verifies a CountsByArticleType message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a CountsByArticleType message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns CountsByArticleType
     */
    public static fromObject(object: { [k: string]: any }): CountsByArticleType;

    /**
     * Creates a plain object from a CountsByArticleType message. Also converts values to other types if specified.
     * @param message CountsByArticleType
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: CountsByArticleType, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this CountsByArticleType to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for CountsByArticleType
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a CountsByArticleUniverseAndType. */
export interface ICountsByArticleUniverseAndType {

    /** CountsByArticleUniverseAndType universe */
    universe?: (string[]|null);

    /** CountsByArticleUniverseAndType countsByType */
    countsByType?: (ICountsByArticleType[]|null);
}

/** Represents a CountsByArticleUniverseAndType. */
export class CountsByArticleUniverseAndType implements ICountsByArticleUniverseAndType {

    /**
     * Constructs a new CountsByArticleUniverseAndType.
     * @param [properties] Properties to set
     */
    constructor(properties?: ICountsByArticleUniverseAndType);

    /** CountsByArticleUniverseAndType universe. */
    public universe: string[];

    /** CountsByArticleUniverseAndType countsByType. */
    public countsByType: ICountsByArticleType[];

    /**
     * Creates a new CountsByArticleUniverseAndType instance using the specified properties.
     * @param [properties] Properties to set
     * @returns CountsByArticleUniverseAndType instance
     */
    public static create(properties?: ICountsByArticleUniverseAndType): CountsByArticleUniverseAndType;

    /**
     * Encodes the specified CountsByArticleUniverseAndType message. Does not implicitly {@link CountsByArticleUniverseAndType.verify|verify} messages.
     * @param message CountsByArticleUniverseAndType message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ICountsByArticleUniverseAndType, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified CountsByArticleUniverseAndType message, length delimited. Does not implicitly {@link CountsByArticleUniverseAndType.verify|verify} messages.
     * @param message CountsByArticleUniverseAndType message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ICountsByArticleUniverseAndType, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a CountsByArticleUniverseAndType message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns CountsByArticleUniverseAndType
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): CountsByArticleUniverseAndType;

    /**
     * Decodes a CountsByArticleUniverseAndType message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns CountsByArticleUniverseAndType
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): CountsByArticleUniverseAndType;

    /**
     * Verifies a CountsByArticleUniverseAndType message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a CountsByArticleUniverseAndType message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns CountsByArticleUniverseAndType
     */
    public static fromObject(object: { [k: string]: any }): CountsByArticleUniverseAndType;

    /**
     * Creates a plain object from a CountsByArticleUniverseAndType message. Also converts values to other types if specified.
     * @param message CountsByArticleUniverseAndType
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: CountsByArticleUniverseAndType, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this CountsByArticleUniverseAndType to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for CountsByArticleUniverseAndType
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a Symlinks. */
export interface ISymlinks {

    /** Symlinks linkName */
    linkName?: (string[]|null);

    /** Symlinks targetName */
    targetName?: (string[]|null);
}

/** Represents a Symlinks. */
export class Symlinks implements ISymlinks {

    /**
     * Constructs a new Symlinks.
     * @param [properties] Properties to set
     */
    constructor(properties?: ISymlinks);

    /** Symlinks linkName. */
    public linkName: string[];

    /** Symlinks targetName. */
    public targetName: string[];

    /**
     * Creates a new Symlinks instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Symlinks instance
     */
    public static create(properties?: ISymlinks): Symlinks;

    /**
     * Encodes the specified Symlinks message. Does not implicitly {@link Symlinks.verify|verify} messages.
     * @param message Symlinks message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ISymlinks, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Symlinks message, length delimited. Does not implicitly {@link Symlinks.verify|verify} messages.
     * @param message Symlinks message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: ISymlinks, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Symlinks message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Symlinks
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Symlinks;

    /**
     * Decodes a Symlinks message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Symlinks
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Symlinks;

    /**
     * Verifies a Symlinks message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a Symlinks message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Symlinks
     */
    public static fromObject(object: { [k: string]: any }): Symlinks;

    /**
     * Creates a plain object from a Symlinks message. Also converts values to other types if specified.
     * @param message Symlinks
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: Symlinks, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Symlinks to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Symlinks
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a DefaultUniverseTriple. */
export interface IDefaultUniverseTriple {

    /** DefaultUniverseTriple typeIdx */
    typeIdx?: (number|null);

    /** DefaultUniverseTriple statIdx */
    statIdx?: (number|null);

    /** DefaultUniverseTriple universeIdx */
    universeIdx?: (number|null);
}

/** Represents a DefaultUniverseTriple. */
export class DefaultUniverseTriple implements IDefaultUniverseTriple {

    /**
     * Constructs a new DefaultUniverseTriple.
     * @param [properties] Properties to set
     */
    constructor(properties?: IDefaultUniverseTriple);

    /** DefaultUniverseTriple typeIdx. */
    public typeIdx?: (number|null);

    /** DefaultUniverseTriple statIdx. */
    public statIdx?: (number|null);

    /** DefaultUniverseTriple universeIdx. */
    public universeIdx?: (number|null);

    /** DefaultUniverseTriple _typeIdx. */
    public _typeIdx?: "typeIdx";

    /** DefaultUniverseTriple _statIdx. */
    public _statIdx?: "statIdx";

    /** DefaultUniverseTriple _universeIdx. */
    public _universeIdx?: "universeIdx";

    /**
     * Creates a new DefaultUniverseTriple instance using the specified properties.
     * @param [properties] Properties to set
     * @returns DefaultUniverseTriple instance
     */
    public static create(properties?: IDefaultUniverseTriple): DefaultUniverseTriple;

    /**
     * Encodes the specified DefaultUniverseTriple message. Does not implicitly {@link DefaultUniverseTriple.verify|verify} messages.
     * @param message DefaultUniverseTriple message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IDefaultUniverseTriple, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified DefaultUniverseTriple message, length delimited. Does not implicitly {@link DefaultUniverseTriple.verify|verify} messages.
     * @param message DefaultUniverseTriple message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IDefaultUniverseTriple, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a DefaultUniverseTriple message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns DefaultUniverseTriple
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): DefaultUniverseTriple;

    /**
     * Decodes a DefaultUniverseTriple message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns DefaultUniverseTriple
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): DefaultUniverseTriple;

    /**
     * Verifies a DefaultUniverseTriple message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a DefaultUniverseTriple message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns DefaultUniverseTriple
     */
    public static fromObject(object: { [k: string]: any }): DefaultUniverseTriple;

    /**
     * Creates a plain object from a DefaultUniverseTriple message. Also converts values to other types if specified.
     * @param message DefaultUniverseTriple
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: DefaultUniverseTriple, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this DefaultUniverseTriple to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for DefaultUniverseTriple
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a DefaultUniverseTable. */
export interface IDefaultUniverseTable {

    /** DefaultUniverseTable mostCommonUniverseIdx */
    mostCommonUniverseIdx?: (number|null);

    /** DefaultUniverseTable exceptions */
    exceptions?: (IDefaultUniverseTriple[]|null);
}

/** Represents a DefaultUniverseTable. */
export class DefaultUniverseTable implements IDefaultUniverseTable {

    /**
     * Constructs a new DefaultUniverseTable.
     * @param [properties] Properties to set
     */
    constructor(properties?: IDefaultUniverseTable);

    /** DefaultUniverseTable mostCommonUniverseIdx. */
    public mostCommonUniverseIdx?: (number|null);

    /** DefaultUniverseTable exceptions. */
    public exceptions: IDefaultUniverseTriple[];

    /** DefaultUniverseTable _mostCommonUniverseIdx. */
    public _mostCommonUniverseIdx?: "mostCommonUniverseIdx";

    /**
     * Creates a new DefaultUniverseTable instance using the specified properties.
     * @param [properties] Properties to set
     * @returns DefaultUniverseTable instance
     */
    public static create(properties?: IDefaultUniverseTable): DefaultUniverseTable;

    /**
     * Encodes the specified DefaultUniverseTable message. Does not implicitly {@link DefaultUniverseTable.verify|verify} messages.
     * @param message DefaultUniverseTable message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IDefaultUniverseTable, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified DefaultUniverseTable message, length delimited. Does not implicitly {@link DefaultUniverseTable.verify|verify} messages.
     * @param message DefaultUniverseTable message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IDefaultUniverseTable, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a DefaultUniverseTable message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns DefaultUniverseTable
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): DefaultUniverseTable;

    /**
     * Decodes a DefaultUniverseTable message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns DefaultUniverseTable
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): DefaultUniverseTable;

    /**
     * Verifies a DefaultUniverseTable message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a DefaultUniverseTable message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns DefaultUniverseTable
     */
    public static fromObject(object: { [k: string]: any }): DefaultUniverseTable;

    /**
     * Creates a plain object from a DefaultUniverseTable message. Also converts values to other types if specified.
     * @param message DefaultUniverseTable
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: DefaultUniverseTable, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this DefaultUniverseTable to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for DefaultUniverseTable
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}
