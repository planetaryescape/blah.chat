module.exports = [
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/base64.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "byteLength",
    ()=>byteLength,
    "fromByteArray",
    ()=>fromByteArray,
    "fromByteArrayUrlSafeNoPadding",
    ()=>fromByteArrayUrlSafeNoPadding,
    "toByteArray",
    ()=>toByteArray
]);
"use strict";
var lookup = [];
var revLookup = [];
var Arr = Uint8Array;
var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for(var i = 0, len = code.length; i < len; ++i){
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
}
revLookup["-".charCodeAt(0)] = 62;
revLookup["_".charCodeAt(0)] = 63;
function getLens(b64) {
    var len = b64.length;
    if (len % 4 > 0) {
        throw new Error("Invalid string. Length must be a multiple of 4");
    }
    var validLen = b64.indexOf("=");
    if (validLen === -1) validLen = len;
    var placeHoldersLen = validLen === len ? 0 : 4 - validLen % 4;
    return [
        validLen,
        placeHoldersLen
    ];
}
function byteLength(b64) {
    var lens = getLens(b64);
    var validLen = lens[0];
    var placeHoldersLen = lens[1];
    return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
}
function _byteLength(_b64, validLen, placeHoldersLen) {
    return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
}
function toByteArray(b64) {
    var tmp;
    var lens = getLens(b64);
    var validLen = lens[0];
    var placeHoldersLen = lens[1];
    var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
    var curByte = 0;
    var len = placeHoldersLen > 0 ? validLen - 4 : validLen;
    var i;
    for(i = 0; i < len; i += 4){
        tmp = revLookup[b64.charCodeAt(i)] << 18 | revLookup[b64.charCodeAt(i + 1)] << 12 | revLookup[b64.charCodeAt(i + 2)] << 6 | revLookup[b64.charCodeAt(i + 3)];
        arr[curByte++] = tmp >> 16 & 255;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
    }
    if (placeHoldersLen === 2) {
        tmp = revLookup[b64.charCodeAt(i)] << 2 | revLookup[b64.charCodeAt(i + 1)] >> 4;
        arr[curByte++] = tmp & 255;
    }
    if (placeHoldersLen === 1) {
        tmp = revLookup[b64.charCodeAt(i)] << 10 | revLookup[b64.charCodeAt(i + 1)] << 4 | revLookup[b64.charCodeAt(i + 2)] >> 2;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
    }
    return arr;
}
function tripletToBase64(num) {
    return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
}
function encodeChunk(uint8, start, end) {
    var tmp;
    var output = [];
    for(var i = start; i < end; i += 3){
        tmp = (uint8[i] << 16 & 16711680) + (uint8[i + 1] << 8 & 65280) + (uint8[i + 2] & 255);
        output.push(tripletToBase64(tmp));
    }
    return output.join("");
}
function fromByteArray(uint8) {
    var tmp;
    var len = uint8.length;
    var extraBytes = len % 3;
    var parts = [];
    var maxChunkLength = 16383;
    for(var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength){
        parts.push(encodeChunk(uint8, i, i + maxChunkLength > len2 ? len2 : i + maxChunkLength));
    }
    if (extraBytes === 1) {
        tmp = uint8[len - 1];
        parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "==");
    } else if (extraBytes === 2) {
        tmp = (uint8[len - 2] << 8) + uint8[len - 1];
        parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "=");
    }
    return parts.join("");
}
function fromByteArrayUrlSafeNoPadding(uint8) {
    return fromByteArray(uint8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
} //# sourceMappingURL=base64.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/common/index.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isSimpleObject",
    ()=>isSimpleObject,
    "parseArgs",
    ()=>parseArgs,
    "validateDeploymentUrl",
    ()=>validateDeploymentUrl
]);
"use strict";
function parseArgs(args) {
    if (args === void 0) {
        return {};
    }
    if (!isSimpleObject(args)) {
        throw new Error(`The arguments to a Convex function must be an object. Received: ${args}`);
    }
    return args;
}
function validateDeploymentUrl(deploymentUrl) {
    if (typeof deploymentUrl === "undefined") {
        throw new Error(`Client created with undefined deployment address. If you used an environment variable, check that it's set.`);
    }
    if (typeof deploymentUrl !== "string") {
        throw new Error(`Invalid deployment address: found ${deploymentUrl}".`);
    }
    if (!(deploymentUrl.startsWith("http:") || deploymentUrl.startsWith("https:"))) {
        throw new Error(`Invalid deployment address: Must start with "https://" or "http://". Found "${deploymentUrl}".`);
    }
    try {
        new URL(deploymentUrl);
    } catch  {
        throw new Error(`Invalid deployment address: "${deploymentUrl}" is not a valid URL. If you believe this URL is correct, use the \`skipConvexDeploymentUrlCheck\` option to bypass this.`);
    }
    if (deploymentUrl.endsWith(".convex.site")) {
        throw new Error(`Invalid deployment address: "${deploymentUrl}" ends with .convex.site, which is used for HTTP Actions. Convex deployment URLs typically end with .convex.cloud? If you believe this URL is correct, use the \`skipConvexDeploymentUrlCheck\` option to bypass this.`);
    }
}
function isSimpleObject(value) {
    const isObject = typeof value === "object";
    const prototype = Object.getPrototypeOf(value);
    const isSimple = prototype === null || prototype === Object.prototype || // Objects generated from other contexts (e.g. across Node.js `vm` modules) will not satisfy the previous
    // conditions but are still simple objects.
    prototype?.constructor?.name === "Object";
    return isObject && isSimple;
} //# sourceMappingURL=index.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/value.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "base64ToBigInt",
    ()=>base64ToBigInt,
    "bigIntToBase64",
    ()=>bigIntToBase64,
    "convexOrUndefinedToJson",
    ()=>convexOrUndefinedToJson,
    "convexToJson",
    ()=>convexToJson,
    "jsonToConvex",
    ()=>jsonToConvex,
    "modernBase64ToBigInt",
    ()=>modernBase64ToBigInt,
    "modernBigIntToBase64",
    ()=>modernBigIntToBase64,
    "patchValueToJson",
    ()=>patchValueToJson,
    "slowBase64ToBigInt",
    ()=>slowBase64ToBigInt,
    "slowBigIntToBase64",
    ()=>slowBigIntToBase64,
    "stringifyValueForError",
    ()=>stringifyValueForError
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$base64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/base64.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/common/index.js [app-ssr] (ecmascript)");
"use strict";
;
;
const LITTLE_ENDIAN = true;
const MIN_INT64 = BigInt("-9223372036854775808");
const MAX_INT64 = BigInt("9223372036854775807");
const ZERO = BigInt("0");
const EIGHT = BigInt("8");
const TWOFIFTYSIX = BigInt("256");
function isSpecial(n) {
    return Number.isNaN(n) || !Number.isFinite(n) || Object.is(n, -0);
}
function slowBigIntToBase64(value) {
    if (value < ZERO) {
        value -= MIN_INT64 + MIN_INT64;
    }
    let hex = value.toString(16);
    if (hex.length % 2 === 1) hex = "0" + hex;
    const bytes = new Uint8Array(new ArrayBuffer(8));
    let i = 0;
    for (const hexByte of hex.match(/.{2}/g).reverse()){
        bytes.set([
            parseInt(hexByte, 16)
        ], i++);
        value >>= EIGHT;
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$base64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fromByteArray"](bytes);
}
function slowBase64ToBigInt(encoded) {
    const integerBytes = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$base64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toByteArray"](encoded);
    if (integerBytes.byteLength !== 8) {
        throw new Error(`Received ${integerBytes.byteLength} bytes, expected 8 for $integer`);
    }
    let value = ZERO;
    let power = ZERO;
    for (const byte of integerBytes){
        value += BigInt(byte) * TWOFIFTYSIX ** power;
        power++;
    }
    if (value > MAX_INT64) {
        value += MIN_INT64 + MIN_INT64;
    }
    return value;
}
function modernBigIntToBase64(value) {
    if (value < MIN_INT64 || MAX_INT64 < value) {
        throw new Error(`BigInt ${value} does not fit into a 64-bit signed integer.`);
    }
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setBigInt64(0, value, true);
    return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$base64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fromByteArray"](new Uint8Array(buffer));
}
function modernBase64ToBigInt(encoded) {
    const integerBytes = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$base64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toByteArray"](encoded);
    if (integerBytes.byteLength !== 8) {
        throw new Error(`Received ${integerBytes.byteLength} bytes, expected 8 for $integer`);
    }
    const intBytesView = new DataView(integerBytes.buffer);
    return intBytesView.getBigInt64(0, true);
}
const bigIntToBase64 = DataView.prototype.setBigInt64 ? modernBigIntToBase64 : slowBigIntToBase64;
const base64ToBigInt = DataView.prototype.getBigInt64 ? modernBase64ToBigInt : slowBase64ToBigInt;
const MAX_IDENTIFIER_LEN = 1024;
function validateObjectField(k) {
    if (k.length > MAX_IDENTIFIER_LEN) {
        throw new Error(`Field name ${k} exceeds maximum field name length ${MAX_IDENTIFIER_LEN}.`);
    }
    if (k.startsWith("$")) {
        throw new Error(`Field name ${k} starts with a '$', which is reserved.`);
    }
    for(let i = 0; i < k.length; i += 1){
        const charCode = k.charCodeAt(i);
        if (charCode < 32 || charCode >= 127) {
            throw new Error(`Field name ${k} has invalid character '${k[i]}': Field names can only contain non-control ASCII characters`);
        }
    }
}
function jsonToConvex(value) {
    if (value === null) {
        return value;
    }
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "number") {
        return value;
    }
    if (typeof value === "string") {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((value2)=>jsonToConvex(value2));
    }
    if (typeof value !== "object") {
        throw new Error(`Unexpected type of ${value}`);
    }
    const entries = Object.entries(value);
    if (entries.length === 1) {
        const key = entries[0][0];
        if (key === "$bytes") {
            if (typeof value.$bytes !== "string") {
                throw new Error(`Malformed $bytes field on ${value}`);
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$base64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toByteArray"](value.$bytes).buffer;
        }
        if (key === "$integer") {
            if (typeof value.$integer !== "string") {
                throw new Error(`Malformed $integer field on ${value}`);
            }
            return base64ToBigInt(value.$integer);
        }
        if (key === "$float") {
            if (typeof value.$float !== "string") {
                throw new Error(`Malformed $float field on ${value}`);
            }
            const floatBytes = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$base64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toByteArray"](value.$float);
            if (floatBytes.byteLength !== 8) {
                throw new Error(`Received ${floatBytes.byteLength} bytes, expected 8 for $float`);
            }
            const floatBytesView = new DataView(floatBytes.buffer);
            const float = floatBytesView.getFloat64(0, LITTLE_ENDIAN);
            if (!isSpecial(float)) {
                throw new Error(`Float ${float} should be encoded as a number`);
            }
            return float;
        }
        if (key === "$set") {
            throw new Error(`Received a Set which is no longer supported as a Convex type.`);
        }
        if (key === "$map") {
            throw new Error(`Received a Map which is no longer supported as a Convex type.`);
        }
    }
    const out = {};
    for (const [k, v] of Object.entries(value)){
        validateObjectField(k);
        out[k] = jsonToConvex(v);
    }
    return out;
}
const MAX_VALUE_FOR_ERROR_LEN = 16384;
function stringifyValueForError(value) {
    const str = JSON.stringify(value, (_key, value2)=>{
        if (value2 === void 0) {
            return "undefined";
        }
        if (typeof value2 === "bigint") {
            return `${value2.toString()}n`;
        }
        return value2;
    });
    if (str.length > MAX_VALUE_FOR_ERROR_LEN) {
        const rest = "[...truncated]";
        let truncateAt = MAX_VALUE_FOR_ERROR_LEN - rest.length;
        const codePoint = str.codePointAt(truncateAt - 1);
        if (codePoint !== void 0 && codePoint > 65535) {
            truncateAt -= 1;
        }
        return str.substring(0, truncateAt) + rest;
    }
    return str;
}
function convexToJsonInternal(value, originalValue, context, includeTopLevelUndefined) {
    if (value === void 0) {
        const contextText = context && ` (present at path ${context} in original object ${stringifyValueForError(originalValue)})`;
        throw new Error(`undefined is not a valid Convex value${contextText}. To learn about Convex's supported types, see https://docs.convex.dev/using/types.`);
    }
    if (value === null) {
        return value;
    }
    if (typeof value === "bigint") {
        if (value < MIN_INT64 || MAX_INT64 < value) {
            throw new Error(`BigInt ${value} does not fit into a 64-bit signed integer.`);
        }
        return {
            $integer: bigIntToBase64(value)
        };
    }
    if (typeof value === "number") {
        if (isSpecial(value)) {
            const buffer = new ArrayBuffer(8);
            new DataView(buffer).setFloat64(0, value, LITTLE_ENDIAN);
            return {
                $float: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$base64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fromByteArray"](new Uint8Array(buffer))
            };
        } else {
            return value;
        }
    }
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "string") {
        return value;
    }
    if (value instanceof ArrayBuffer) {
        return {
            $bytes: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$base64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fromByteArray"](new Uint8Array(value))
        };
    }
    if (Array.isArray(value)) {
        return value.map((value2, i)=>convexToJsonInternal(value2, originalValue, context + `[${i}]`, false));
    }
    if (value instanceof Set) {
        throw new Error(errorMessageForUnsupportedType(context, "Set", [
            ...value
        ], originalValue));
    }
    if (value instanceof Map) {
        throw new Error(errorMessageForUnsupportedType(context, "Map", [
            ...value
        ], originalValue));
    }
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isSimpleObject"])(value)) {
        const theType = value?.constructor?.name;
        const typeName = theType ? `${theType} ` : "";
        throw new Error(errorMessageForUnsupportedType(context, typeName, value, originalValue));
    }
    const out = {};
    const entries = Object.entries(value);
    entries.sort(([k1, _v1], [k2, _v2])=>k1 === k2 ? 0 : k1 < k2 ? -1 : 1);
    for (const [k, v] of entries){
        if (v !== void 0) {
            validateObjectField(k);
            out[k] = convexToJsonInternal(v, originalValue, context + `.${k}`, false);
        } else if (includeTopLevelUndefined) {
            validateObjectField(k);
            out[k] = convexOrUndefinedToJsonInternal(v, originalValue, context + `.${k}`);
        }
    }
    return out;
}
function errorMessageForUnsupportedType(context, typeName, value, originalValue) {
    if (context) {
        return `${typeName}${stringifyValueForError(value)} is not a supported Convex type (present at path ${context} in original object ${stringifyValueForError(originalValue)}). To learn about Convex's supported types, see https://docs.convex.dev/using/types.`;
    } else {
        return `${typeName}${stringifyValueForError(value)} is not a supported Convex type.`;
    }
}
function convexOrUndefinedToJsonInternal(value, originalValue, context) {
    if (value === void 0) {
        return {
            $undefined: null
        };
    } else {
        if (originalValue === void 0) {
            throw new Error(`Programming error. Current value is ${stringifyValueForError(value)} but original value is undefined`);
        }
        return convexToJsonInternal(value, originalValue, context, false);
    }
}
function convexToJson(value) {
    return convexToJsonInternal(value, value, "", false);
}
function convexOrUndefinedToJson(value) {
    return convexOrUndefinedToJsonInternal(value, value, "");
}
function patchValueToJson(value) {
    return convexToJsonInternal(value, value, "", true);
} //# sourceMappingURL=value.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/validators.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "VAny",
    ()=>VAny,
    "VArray",
    ()=>VArray,
    "VBoolean",
    ()=>VBoolean,
    "VBytes",
    ()=>VBytes,
    "VFloat64",
    ()=>VFloat64,
    "VId",
    ()=>VId,
    "VInt64",
    ()=>VInt64,
    "VLiteral",
    ()=>VLiteral,
    "VNull",
    ()=>VNull,
    "VObject",
    ()=>VObject,
    "VRecord",
    ()=>VRecord,
    "VString",
    ()=>VString,
    "VUnion",
    ()=>VUnion
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/value.js [app-ssr] (ecmascript)");
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
;
const UNDEFINED_VALIDATOR_ERROR_URL = "https://docs.convex.dev/error#undefined-validator";
function throwUndefinedValidatorError(context, fieldName) {
    const fieldInfo = fieldName !== void 0 ? ` for field "${fieldName}"` : "";
    throw new Error(`A validator is undefined${fieldInfo} in ${context}. This is often caused by circular imports. See ${UNDEFINED_VALIDATOR_ERROR_URL} for details.`);
}
class BaseValidator {
    constructor({ isOptional }){
        /**
     * Only for TypeScript, the TS type of the JS values validated
     * by this validator.
     */ __publicField(this, "type");
        /**
     * Only for TypeScript, if this an Object validator, then
     * this is the TS type of its property names.
     */ __publicField(this, "fieldPaths");
        /**
     * Whether this is an optional Object property value validator.
     */ __publicField(this, "isOptional");
        /**
     * Always `"true"`.
     */ __publicField(this, "isConvexValidator");
        this.isOptional = isOptional;
        this.isConvexValidator = true;
    }
}
class VId extends BaseValidator {
    /**
   * Usually you'd use `v.id(tableName)` instead.
   */ constructor({ isOptional, tableName }){
        super({
            isOptional
        });
        /**
     * The name of the table that the validated IDs must belong to.
     */ __publicField(this, "tableName");
        /**
     * The kind of validator, `"id"`.
     */ __publicField(this, "kind", "id");
        if (typeof tableName !== "string") {
            throw new Error("v.id(tableName) requires a string");
        }
        this.tableName = tableName;
    }
    /** @internal */ get json() {
        return {
            type: "id",
            tableName: this.tableName
        };
    }
    /** @internal */ asOptional() {
        return new VId({
            isOptional: "optional",
            tableName: this.tableName
        });
    }
}
class VFloat64 extends BaseValidator {
    constructor(){
        super(...arguments);
        /**
     * The kind of validator, `"float64"`.
     */ __publicField(this, "kind", "float64");
    }
    /** @internal */ get json() {
        return {
            type: "number"
        };
    }
    /** @internal */ asOptional() {
        return new VFloat64({
            isOptional: "optional"
        });
    }
}
class VInt64 extends BaseValidator {
    constructor(){
        super(...arguments);
        /**
     * The kind of validator, `"int64"`.
     */ __publicField(this, "kind", "int64");
    }
    /** @internal */ get json() {
        return {
            type: "bigint"
        };
    }
    /** @internal */ asOptional() {
        return new VInt64({
            isOptional: "optional"
        });
    }
}
class VBoolean extends BaseValidator {
    constructor(){
        super(...arguments);
        /**
     * The kind of validator, `"boolean"`.
     */ __publicField(this, "kind", "boolean");
    }
    /** @internal */ get json() {
        return {
            type: this.kind
        };
    }
    /** @internal */ asOptional() {
        return new VBoolean({
            isOptional: "optional"
        });
    }
}
class VBytes extends BaseValidator {
    constructor(){
        super(...arguments);
        /**
     * The kind of validator, `"bytes"`.
     */ __publicField(this, "kind", "bytes");
    }
    /** @internal */ get json() {
        return {
            type: this.kind
        };
    }
    /** @internal */ asOptional() {
        return new VBytes({
            isOptional: "optional"
        });
    }
}
class VString extends BaseValidator {
    constructor(){
        super(...arguments);
        /**
     * The kind of validator, `"string"`.
     */ __publicField(this, "kind", "string");
    }
    /** @internal */ get json() {
        return {
            type: this.kind
        };
    }
    /** @internal */ asOptional() {
        return new VString({
            isOptional: "optional"
        });
    }
}
class VNull extends BaseValidator {
    constructor(){
        super(...arguments);
        /**
     * The kind of validator, `"null"`.
     */ __publicField(this, "kind", "null");
    }
    /** @internal */ get json() {
        return {
            type: this.kind
        };
    }
    /** @internal */ asOptional() {
        return new VNull({
            isOptional: "optional"
        });
    }
}
class VAny extends BaseValidator {
    constructor(){
        super(...arguments);
        /**
     * The kind of validator, `"any"`.
     */ __publicField(this, "kind", "any");
    }
    /** @internal */ get json() {
        return {
            type: this.kind
        };
    }
    /** @internal */ asOptional() {
        return new VAny({
            isOptional: "optional"
        });
    }
}
class VObject extends BaseValidator {
    /**
   * Usually you'd use `v.object({ ... })` instead.
   */ constructor({ isOptional, fields }){
        super({
            isOptional
        });
        /**
     * An object with the validator for each property.
     */ __publicField(this, "fields");
        /**
     * The kind of validator, `"object"`.
     */ __publicField(this, "kind", "object");
        globalThis.Object.entries(fields).forEach(([fieldName, validator])=>{
            if (validator === void 0) {
                throwUndefinedValidatorError("v.object()", fieldName);
            }
            if (!validator.isConvexValidator) {
                throw new Error("v.object() entries must be validators");
            }
        });
        this.fields = fields;
    }
    /** @internal */ get json() {
        return {
            type: this.kind,
            value: globalThis.Object.fromEntries(globalThis.Object.entries(this.fields).map(([k, v])=>[
                    k,
                    {
                        fieldType: v.json,
                        optional: v.isOptional === "optional" ? true : false
                    }
                ]))
        };
    }
    /** @internal */ asOptional() {
        return new VObject({
            isOptional: "optional",
            fields: this.fields
        });
    }
    /**
   * Create a new VObject with the specified fields omitted.
   * @param fields The field names to omit from this VObject.
   */ omit(...fields) {
        const newFields = {
            ...this.fields
        };
        for (const field of fields){
            delete newFields[field];
        }
        return new VObject({
            isOptional: this.isOptional,
            fields: newFields
        });
    }
    /**
   * Create a new VObject with only the specified fields.
   * @param fields The field names to pick from this VObject.
   */ pick(...fields) {
        const newFields = {};
        for (const field of fields){
            newFields[field] = this.fields[field];
        }
        return new VObject({
            isOptional: this.isOptional,
            fields: newFields
        });
    }
    /**
   * Create a new VObject with all fields marked as optional.
   */ partial() {
        const newFields = {};
        for (const [key, validator] of globalThis.Object.entries(this.fields)){
            newFields[key] = validator.asOptional();
        }
        return new VObject({
            isOptional: this.isOptional,
            fields: newFields
        });
    }
    /**
   * Create a new VObject with additional fields merged in.
   * @param fields An object with additional validators to merge into this VObject.
   */ extend(fields) {
        return new VObject({
            isOptional: this.isOptional,
            fields: {
                ...this.fields,
                ...fields
            }
        });
    }
}
class VLiteral extends BaseValidator {
    /**
   * Usually you'd use `v.literal(value)` instead.
   */ constructor({ isOptional, value }){
        super({
            isOptional
        });
        /**
     * The value that the validated values must be equal to.
     */ __publicField(this, "value");
        /**
     * The kind of validator, `"literal"`.
     */ __publicField(this, "kind", "literal");
        if (typeof value !== "string" && typeof value !== "boolean" && typeof value !== "number" && typeof value !== "bigint") {
            throw new Error("v.literal(value) must be a string, number, or boolean");
        }
        this.value = value;
    }
    /** @internal */ get json() {
        return {
            type: this.kind,
            value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(this.value)
        };
    }
    /** @internal */ asOptional() {
        return new VLiteral({
            isOptional: "optional",
            value: this.value
        });
    }
}
class VArray extends BaseValidator {
    /**
   * Usually you'd use `v.array(element)` instead.
   */ constructor({ isOptional, element }){
        super({
            isOptional
        });
        /**
     * The validator for the elements of the array.
     */ __publicField(this, "element");
        /**
     * The kind of validator, `"array"`.
     */ __publicField(this, "kind", "array");
        if (element === void 0) {
            throwUndefinedValidatorError("v.array()");
        }
        this.element = element;
    }
    /** @internal */ get json() {
        return {
            type: this.kind,
            value: this.element.json
        };
    }
    /** @internal */ asOptional() {
        return new VArray({
            isOptional: "optional",
            element: this.element
        });
    }
}
class VRecord extends BaseValidator {
    /**
   * Usually you'd use `v.record(key, value)` instead.
   */ constructor({ isOptional, key, value }){
        super({
            isOptional
        });
        /**
     * The validator for the keys of the record.
     */ __publicField(this, "key");
        /**
     * The validator for the values of the record.
     */ __publicField(this, "value");
        /**
     * The kind of validator, `"record"`.
     */ __publicField(this, "kind", "record");
        if (key === void 0) {
            throwUndefinedValidatorError("v.record()", "key");
        }
        if (value === void 0) {
            throwUndefinedValidatorError("v.record()", "value");
        }
        if (key.isOptional === "optional") {
            throw new Error("Record validator cannot have optional keys");
        }
        if (value.isOptional === "optional") {
            throw new Error("Record validator cannot have optional values");
        }
        if (!key.isConvexValidator || !value.isConvexValidator) {
            throw new Error("Key and value of v.record() but be validators");
        }
        this.key = key;
        this.value = value;
    }
    /** @internal */ get json() {
        return {
            type: this.kind,
            // This cast is needed because TypeScript thinks the key type is too wide
            keys: this.key.json,
            values: {
                fieldType: this.value.json,
                optional: false
            }
        };
    }
    /** @internal */ asOptional() {
        return new VRecord({
            isOptional: "optional",
            key: this.key,
            value: this.value
        });
    }
}
class VUnion extends BaseValidator {
    /**
   * Usually you'd use `v.union(...members)` instead.
   */ constructor({ isOptional, members }){
        super({
            isOptional
        });
        /**
     * The array of validators, one of which must match the value.
     */ __publicField(this, "members");
        /**
     * The kind of validator, `"union"`.
     */ __publicField(this, "kind", "union");
        members.forEach((member, index)=>{
            if (member === void 0) {
                throwUndefinedValidatorError("v.union()", `member at index ${index}`);
            }
            if (!member.isConvexValidator) {
                throw new Error("All members of v.union() must be validators");
            }
        });
        this.members = members;
    }
    /** @internal */ get json() {
        return {
            type: this.kind,
            value: this.members.map((v)=>v.json)
        };
    }
    /** @internal */ asOptional() {
        return new VUnion({
            isOptional: "optional",
            members: this.members
        });
    }
} //# sourceMappingURL=validators.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/validator.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "asObjectValidator",
    ()=>asObjectValidator,
    "isValidator",
    ()=>isValidator,
    "v",
    ()=>v
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/validators.js [app-ssr] (ecmascript)");
"use strict";
;
function isValidator(v2) {
    return !!v2.isConvexValidator;
}
function asObjectValidator(obj) {
    if (isValidator(obj)) {
        return obj;
    } else {
        return v.object(obj);
    }
}
const v = {
    /**
   * Validates that the value corresponds to an ID of a document in given table.
   * @param tableName The name of the table.
   */ id: (tableName)=>{
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VId"]({
            isOptional: "required",
            tableName
        });
    },
    /**
   * Validates that the value is of type Null.
   */ null: ()=>{
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VNull"]({
            isOptional: "required"
        });
    },
    /**
   * Validates that the value is of Convex type Float64 (Number in JS).
   *
   * Alias for `v.float64()`
   */ number: ()=>{
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VFloat64"]({
            isOptional: "required"
        });
    },
    /**
   * Validates that the value is of Convex type Float64 (Number in JS).
   */ float64: ()=>{
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VFloat64"]({
            isOptional: "required"
        });
    },
    /**
   * @deprecated Use `v.int64()` instead
   */ bigint: ()=>{
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VInt64"]({
            isOptional: "required"
        });
    },
    /**
   * Validates that the value is of Convex type Int64 (BigInt in JS).
   */ int64: ()=>{
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VInt64"]({
            isOptional: "required"
        });
    },
    /**
   * Validates that the value is of type Boolean.
   */ boolean: ()=>{
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VBoolean"]({
            isOptional: "required"
        });
    },
    /**
   * Validates that the value is of type String.
   */ string: ()=>{
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VString"]({
            isOptional: "required"
        });
    },
    /**
   * Validates that the value is of Convex type Bytes (constructed in JS via `ArrayBuffer`).
   */ bytes: ()=>{
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VBytes"]({
            isOptional: "required"
        });
    },
    /**
   * Validates that the value is equal to the given literal value.
   * @param literal The literal value to compare against.
   */ literal: (literal)=>{
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VLiteral"]({
            isOptional: "required",
            value: literal
        });
    },
    /**
   * Validates that the value is an Array of the given element type.
   * @param element The validator for the elements of the array.
   */ array: (element)=>{
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VArray"]({
            isOptional: "required",
            element
        });
    },
    /**
   * Validates that the value is an Object with the given properties.
   * @param fields An object specifying the validator for each property.
   */ object: (fields)=>{
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VObject"]({
            isOptional: "required",
            fields
        });
    },
    /**
   * Validates that the value is a Record with keys and values that match the given types.
   * @param keys The validator for the keys of the record. This cannot contain string literals.
   * @param values The validator for the values of the record.
   */ record: (keys, values)=>{
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VRecord"]({
            isOptional: "required",
            key: keys,
            value: values
        });
    },
    /**
   * Validates that the value matches one of the given validators.
   * @param members The validators to match against.
   */ union: (...members)=>{
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VUnion"]({
            isOptional: "required",
            members
        });
    },
    /**
   * Does not validate the value.
   */ any: ()=>{
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validators$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VAny"]({
            isOptional: "required"
        });
    },
    /**
   * Allows not specifying a value for a property in an Object.
   * @param value The property value validator to make optional.
   *
   * ```typescript
   * const objectWithOptionalFields = v.object({
   *   requiredField: v.string(),
   *   optionalField: v.optional(v.string()),
   * });
   * ```
   */ optional: (value)=>{
        return value.asOptional();
    },
    /**
   * Allows specifying a value or null.
   */ nullable: (value)=>{
        return v.union(value, v.null());
    }
}; //# sourceMappingURL=validator.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/errors.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConvexError",
    ()=>ConvexError
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/value.js [app-ssr] (ecmascript)");
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a, _b;
;
const IDENTIFYING_FIELD = Symbol.for("ConvexError");
class ConvexError extends (_b = Error, _a = IDENTIFYING_FIELD, _b) {
    constructor(data){
        super(typeof data === "string" ? data : (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["stringifyValueForError"])(data));
        __publicField(this, "name", "ConvexError");
        __publicField(this, "data");
        __publicField(this, _a, true);
        this.data = data;
    }
} //# sourceMappingURL=errors.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/compare_utf8.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "compareUTF8",
    ()=>compareUTF8,
    "greaterThan",
    ()=>greaterThan,
    "greaterThanEq",
    ()=>greaterThanEq,
    "lessThan",
    ()=>lessThan,
    "lessThanEq",
    ()=>lessThanEq,
    "utf16LengthForCodePoint",
    ()=>utf16LengthForCodePoint
]);
"use strict";
function compareUTF8(a, b) {
    const aLength = a.length;
    const bLength = b.length;
    const length = Math.min(aLength, bLength);
    for(let i = 0; i < length;){
        const aCodePoint = a.codePointAt(i);
        const bCodePoint = b.codePointAt(i);
        if (aCodePoint !== bCodePoint) {
            if (aCodePoint < 128 && bCodePoint < 128) {
                return aCodePoint - bCodePoint;
            }
            const aLength2 = utf8Bytes(aCodePoint, aBytes);
            const bLength2 = utf8Bytes(bCodePoint, bBytes);
            return compareArrays(aBytes, aLength2, bBytes, bLength2);
        }
        i += utf16LengthForCodePoint(aCodePoint);
    }
    return aLength - bLength;
}
function compareArrays(a, aLength, b, bLength) {
    const length = Math.min(aLength, bLength);
    for(let i = 0; i < length; i++){
        const aValue = a[i];
        const bValue = b[i];
        if (aValue !== bValue) {
            return aValue - bValue;
        }
    }
    return aLength - bLength;
}
function utf16LengthForCodePoint(aCodePoint) {
    return aCodePoint > 65535 ? 2 : 1;
}
const arr = ()=>Array.from({
        length: 4
    }, ()=>0);
const aBytes = arr();
const bBytes = arr();
function utf8Bytes(codePoint, bytes) {
    if (codePoint < 128) {
        bytes[0] = codePoint;
        return 1;
    }
    let count;
    let offset;
    if (codePoint <= 2047) {
        count = 1;
        offset = 192;
    } else if (codePoint <= 65535) {
        count = 2;
        offset = 224;
    } else if (codePoint <= 1114111) {
        count = 3;
        offset = 240;
    } else {
        throw new Error("Invalid code point");
    }
    bytes[0] = (codePoint >> 6 * count) + offset;
    let i = 1;
    for(; count > 0; count--){
        const temp = codePoint >> 6 * (count - 1);
        bytes[i++] = 128 | temp & 63;
    }
    return i;
}
function greaterThan(a, b) {
    return compareUTF8(a, b) > 0;
}
function greaterThanEq(a, b) {
    return compareUTF8(a, b) >= 0;
}
function lessThan(a, b) {
    return compareUTF8(a, b) < 0;
}
function lessThanEq(a, b) {
    return compareUTF8(a, b) <= 0;
} //# sourceMappingURL=compare_utf8.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/compare.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "compareValues",
    ()=>compareValues
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare_utf8$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/compare_utf8.js [app-ssr] (ecmascript)");
"use strict";
;
function compareValues(k1, k2) {
    return compareAsTuples(makeComparable(k1), makeComparable(k2));
}
function compareAsTuples(a, b) {
    if (a[0] === b[0]) {
        return compareSameTypeValues(a[1], b[1]);
    } else if (a[0] < b[0]) {
        return -1;
    }
    return 1;
}
function compareSameTypeValues(v1, v2) {
    if (v1 === void 0 || v1 === null) {
        return 0;
    }
    if (typeof v1 === "number") {
        if (typeof v2 !== "number") {
            throw new Error(`Unexpected type ${v2}`);
        }
        return compareNumbers(v1, v2);
    }
    if (typeof v1 === "string") {
        if (typeof v2 !== "string") {
            throw new Error(`Unexpected type ${v2}`);
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare_utf8$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compareUTF8"])(v1, v2);
    }
    if (typeof v1 === "bigint" || typeof v1 === "boolean" || typeof v1 === "string") {
        return v1 < v2 ? -1 : v1 === v2 ? 0 : 1;
    }
    if (!Array.isArray(v1) || !Array.isArray(v2)) {
        throw new Error(`Unexpected type ${v1}`);
    }
    for(let i = 0; i < v1.length && i < v2.length; i++){
        const cmp = compareAsTuples(v1[i], v2[i]);
        if (cmp !== 0) {
            return cmp;
        }
    }
    if (v1.length < v2.length) {
        return -1;
    }
    if (v1.length > v2.length) {
        return 1;
    }
    return 0;
}
function compareNumbers(v1, v2) {
    if (isNaN(v1) || isNaN(v2)) {
        const buffer1 = new ArrayBuffer(8);
        const buffer2 = new ArrayBuffer(8);
        new DataView(buffer1).setFloat64(0, v1, /* little-endian */ true);
        new DataView(buffer2).setFloat64(0, v2, /* little-endian */ true);
        const v1Bits = BigInt(new DataView(buffer1).getBigInt64(0, /* little-endian */ true));
        const v2Bits = BigInt(new DataView(buffer2).getBigInt64(0, /* little-endian */ true));
        const v1Sign = (v1Bits & 0x8000000000000000n) !== 0n;
        const v2Sign = (v2Bits & 0x8000000000000000n) !== 0n;
        if (isNaN(v1) !== isNaN(v2)) {
            if (isNaN(v1)) {
                return v1Sign ? -1 : 1;
            }
            return v2Sign ? 1 : -1;
        }
        if (v1Sign !== v2Sign) {
            return v1Sign ? -1 : 1;
        }
        return v1Bits < v2Bits ? -1 : v1Bits === v2Bits ? 0 : 1;
    }
    if (Object.is(v1, v2)) {
        return 0;
    }
    if (Object.is(v1, -0)) {
        return Object.is(v2, 0) ? -1 : -Math.sign(v2);
    }
    if (Object.is(v2, -0)) {
        return Object.is(v1, 0) ? 1 : Math.sign(v1);
    }
    return v1 < v2 ? -1 : 1;
}
function makeComparable(v) {
    if (v === void 0) {
        return [
            0,
            void 0
        ];
    }
    if (v === null) {
        return [
            1,
            null
        ];
    }
    if (typeof v === "bigint") {
        return [
            2,
            v
        ];
    }
    if (typeof v === "number") {
        return [
            3,
            v
        ];
    }
    if (typeof v === "boolean") {
        return [
            4,
            v
        ];
    }
    if (typeof v === "string") {
        return [
            5,
            v
        ];
    }
    if (v instanceof ArrayBuffer) {
        return [
            6,
            Array.from(new Uint8Array(v)).map(makeComparable)
        ];
    }
    if (Array.isArray(v)) {
        return [
            7,
            v.map(makeComparable)
        ];
    }
    const keys = Object.keys(v).sort();
    const pojo = keys.map((k)=>[
            k,
            v[k]
        ]);
    return [
        8,
        pojo.map(makeComparable)
    ];
} //# sourceMappingURL=compare.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/index.js [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/value.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$validator$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/validator.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$base64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/base64.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/errors.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/compare.js [app-ssr] (ecmascript)"); //# sourceMappingURL=index.js.map
"use strict";
;
;
;
;
;
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/index.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "version",
    ()=>version
]);
"use strict";
const version = "1.31.2"; //# sourceMappingURL=index.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/logging.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DefaultLogger",
    ()=>DefaultLogger,
    "createHybridErrorStacktrace",
    ()=>createHybridErrorStacktrace,
    "forwardData",
    ()=>forwardData,
    "instantiateDefaultLogger",
    ()=>instantiateDefaultLogger,
    "instantiateNoopLogger",
    ()=>instantiateNoopLogger,
    "logFatalError",
    ()=>logFatalError,
    "logForFunction",
    ()=>logForFunction
]);
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const INFO_COLOR = "color:rgb(0, 145, 255)";
function prefix_for_source(source) {
    switch(source){
        case "query":
            return "Q";
        case "mutation":
            return "M";
        case "action":
            return "A";
        case "any":
            return "?";
    }
}
class DefaultLogger {
    constructor(options){
        __publicField(this, "_onLogLineFuncs");
        __publicField(this, "_verbose");
        this._onLogLineFuncs = {};
        this._verbose = options.verbose;
    }
    addLogLineListener(func) {
        let id = Math.random().toString(36).substring(2, 15);
        for(let i = 0; i < 10; i++){
            if (this._onLogLineFuncs[id] === void 0) {
                break;
            }
            id = Math.random().toString(36).substring(2, 15);
        }
        this._onLogLineFuncs[id] = func;
        return ()=>{
            delete this._onLogLineFuncs[id];
        };
    }
    logVerbose(...args) {
        if (this._verbose) {
            for (const func of Object.values(this._onLogLineFuncs)){
                func("debug", `${/* @__PURE__ */ new Date().toISOString()}`, ...args);
            }
        }
    }
    log(...args) {
        for (const func of Object.values(this._onLogLineFuncs)){
            func("info", ...args);
        }
    }
    warn(...args) {
        for (const func of Object.values(this._onLogLineFuncs)){
            func("warn", ...args);
        }
    }
    error(...args) {
        for (const func of Object.values(this._onLogLineFuncs)){
            func("error", ...args);
        }
    }
}
function instantiateDefaultLogger(options) {
    const logger = new DefaultLogger(options);
    logger.addLogLineListener((level, ...args)=>{
        switch(level){
            case "debug":
                console.debug(...args);
                break;
            case "info":
                console.log(...args);
                break;
            case "warn":
                console.warn(...args);
                break;
            case "error":
                console.error(...args);
                break;
            default:
                {
                    level;
                    console.log(...args);
                }
        }
    });
    return logger;
}
function instantiateNoopLogger(options) {
    return new DefaultLogger(options);
}
function logForFunction(logger, type, source, udfPath, message) {
    const prefix = prefix_for_source(source);
    if (typeof message === "object") {
        message = `ConvexError ${JSON.stringify(message.errorData, null, 2)}`;
    }
    if (type === "info") {
        const match = message.match(/^\[.*?\] /);
        if (match === null) {
            logger.error(`[CONVEX ${prefix}(${udfPath})] Could not parse console.log`);
            return;
        }
        const level = message.slice(1, match[0].length - 2);
        const args = message.slice(match[0].length);
        logger.log(`%c[CONVEX ${prefix}(${udfPath})] [${level}]`, INFO_COLOR, args);
    } else {
        logger.error(`[CONVEX ${prefix}(${udfPath})] ${message}`);
    }
}
function logFatalError(logger, message) {
    const errorMessage = `[CONVEX FATAL ERROR] ${message}`;
    logger.error(errorMessage);
    return new Error(errorMessage);
}
function createHybridErrorStacktrace(source, udfPath, result) {
    const prefix = prefix_for_source(source);
    return `[CONVEX ${prefix}(${udfPath})] ${result.errorMessage}
  Called by client`;
}
function forwardData(result, error) {
    error.data = result.errorData;
    return error;
} //# sourceMappingURL=logging.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/udf_path_utils.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "canonicalizeUdfPath",
    ()=>canonicalizeUdfPath,
    "serializePaginatedPathAndArgs",
    ()=>serializePaginatedPathAndArgs,
    "serializePathAndArgs",
    ()=>serializePathAndArgs,
    "serializedQueryTokenIsPaginated",
    ()=>serializedQueryTokenIsPaginated
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/value.js [app-ssr] (ecmascript)");
"use strict";
;
function canonicalizeUdfPath(udfPath) {
    const pieces = udfPath.split(":");
    let moduleName;
    let functionName;
    if (pieces.length === 1) {
        moduleName = pieces[0];
        functionName = "default";
    } else {
        moduleName = pieces.slice(0, pieces.length - 1).join(":");
        functionName = pieces[pieces.length - 1];
    }
    if (moduleName.endsWith(".js")) {
        moduleName = moduleName.slice(0, -3);
    }
    return `${moduleName}:${functionName}`;
}
function serializePathAndArgs(udfPath, args) {
    return JSON.stringify({
        udfPath: canonicalizeUdfPath(udfPath),
        args: (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(args)
    });
}
function serializePaginatedPathAndArgs(udfPath, args, options) {
    const { initialNumItems, id } = options;
    const result = JSON.stringify({
        type: "paginated",
        udfPath: canonicalizeUdfPath(udfPath),
        args: (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(args),
        options: (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])({
            initialNumItems,
            id
        })
    });
    return result;
}
function serializedQueryTokenIsPaginated(token) {
    return JSON.parse(token).type === "paginated";
} //# sourceMappingURL=udf_path_utils.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/local_state.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LocalSyncState",
    ()=>LocalSyncState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/value.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/udf_path_utils.js [app-ssr] (ecmascript)");
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
;
;
class LocalSyncState {
    constructor(){
        __publicField(this, "nextQueryId");
        __publicField(this, "querySetVersion");
        __publicField(this, "querySet");
        __publicField(this, "queryIdToToken");
        __publicField(this, "identityVersion");
        __publicField(this, "auth");
        __publicField(this, "outstandingQueriesOlderThanRestart");
        __publicField(this, "outstandingAuthOlderThanRestart");
        __publicField(this, "paused");
        __publicField(this, "pendingQuerySetModifications");
        this.nextQueryId = 0;
        this.querySetVersion = 0;
        this.identityVersion = 0;
        this.querySet = /* @__PURE__ */ new Map();
        this.queryIdToToken = /* @__PURE__ */ new Map();
        this.outstandingQueriesOlderThanRestart = /* @__PURE__ */ new Set();
        this.outstandingAuthOlderThanRestart = false;
        this.paused = false;
        this.pendingQuerySetModifications = /* @__PURE__ */ new Map();
    }
    hasSyncedPastLastReconnect() {
        return this.outstandingQueriesOlderThanRestart.size === 0 && !this.outstandingAuthOlderThanRestart;
    }
    markAuthCompletion() {
        this.outstandingAuthOlderThanRestart = false;
    }
    subscribe(udfPath, args, journal, componentPath) {
        const canonicalizedUdfPath = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canonicalizeUdfPath"])(udfPath);
        const queryToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["serializePathAndArgs"])(canonicalizedUdfPath, args);
        const existingEntry = this.querySet.get(queryToken);
        if (existingEntry !== void 0) {
            existingEntry.numSubscribers += 1;
            return {
                queryToken,
                modification: null,
                unsubscribe: ()=>this.removeSubscriber(queryToken)
            };
        } else {
            const queryId = this.nextQueryId++;
            const query = {
                id: queryId,
                canonicalizedUdfPath,
                args,
                numSubscribers: 1,
                journal,
                componentPath
            };
            this.querySet.set(queryToken, query);
            this.queryIdToToken.set(queryId, queryToken);
            const baseVersion = this.querySetVersion;
            const newVersion = this.querySetVersion + 1;
            const add = {
                type: "Add",
                queryId,
                udfPath: canonicalizedUdfPath,
                args: [
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(args)
                ],
                journal,
                componentPath
            };
            if (this.paused) {
                this.pendingQuerySetModifications.set(queryId, add);
            } else {
                this.querySetVersion = newVersion;
            }
            const modification = {
                type: "ModifyQuerySet",
                baseVersion,
                newVersion,
                modifications: [
                    add
                ]
            };
            return {
                queryToken,
                modification,
                unsubscribe: ()=>this.removeSubscriber(queryToken)
            };
        }
    }
    transition(transition) {
        for (const modification of transition.modifications){
            switch(modification.type){
                case "QueryUpdated":
                case "QueryFailed":
                    {
                        this.outstandingQueriesOlderThanRestart.delete(modification.queryId);
                        const journal = modification.journal;
                        if (journal !== void 0) {
                            const queryToken = this.queryIdToToken.get(modification.queryId);
                            if (queryToken !== void 0) {
                                this.querySet.get(queryToken).journal = journal;
                            }
                        }
                        break;
                    }
                case "QueryRemoved":
                    {
                        this.outstandingQueriesOlderThanRestart.delete(modification.queryId);
                        break;
                    }
                default:
                    {
                        modification;
                        throw new Error(`Invalid modification ${modification.type}`);
                    }
            }
        }
    }
    queryId(udfPath, args) {
        const canonicalizedUdfPath = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canonicalizeUdfPath"])(udfPath);
        const queryToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["serializePathAndArgs"])(canonicalizedUdfPath, args);
        const existingEntry = this.querySet.get(queryToken);
        if (existingEntry !== void 0) {
            return existingEntry.id;
        }
        return null;
    }
    isCurrentOrNewerAuthVersion(version) {
        return version >= this.identityVersion;
    }
    getAuth() {
        return this.auth;
    }
    setAuth(value) {
        this.auth = {
            tokenType: "User",
            value
        };
        const baseVersion = this.identityVersion;
        if (!this.paused) {
            this.identityVersion = baseVersion + 1;
        }
        return {
            type: "Authenticate",
            baseVersion,
            ...this.auth
        };
    }
    setAdminAuth(value, actingAs) {
        const auth = {
            tokenType: "Admin",
            value,
            impersonating: actingAs
        };
        this.auth = auth;
        const baseVersion = this.identityVersion;
        if (!this.paused) {
            this.identityVersion = baseVersion + 1;
        }
        return {
            type: "Authenticate",
            baseVersion,
            ...auth
        };
    }
    clearAuth() {
        this.auth = void 0;
        this.markAuthCompletion();
        const baseVersion = this.identityVersion;
        if (!this.paused) {
            this.identityVersion = baseVersion + 1;
        }
        return {
            type: "Authenticate",
            tokenType: "None",
            baseVersion
        };
    }
    hasAuth() {
        return !!this.auth;
    }
    isNewAuth(value) {
        return this.auth?.value !== value;
    }
    queryPath(queryId) {
        const pathAndArgs = this.queryIdToToken.get(queryId);
        if (pathAndArgs) {
            return this.querySet.get(pathAndArgs).canonicalizedUdfPath;
        }
        return null;
    }
    queryArgs(queryId) {
        const pathAndArgs = this.queryIdToToken.get(queryId);
        if (pathAndArgs) {
            return this.querySet.get(pathAndArgs).args;
        }
        return null;
    }
    queryToken(queryId) {
        return this.queryIdToToken.get(queryId) ?? null;
    }
    queryJournal(queryToken) {
        return this.querySet.get(queryToken)?.journal;
    }
    restart(oldRemoteQueryResults) {
        this.unpause();
        this.outstandingQueriesOlderThanRestart.clear();
        const modifications = [];
        for (const localQuery of this.querySet.values()){
            const add = {
                type: "Add",
                queryId: localQuery.id,
                udfPath: localQuery.canonicalizedUdfPath,
                args: [
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(localQuery.args)
                ],
                journal: localQuery.journal,
                componentPath: localQuery.componentPath
            };
            modifications.push(add);
            if (!oldRemoteQueryResults.has(localQuery.id)) {
                this.outstandingQueriesOlderThanRestart.add(localQuery.id);
            }
        }
        this.querySetVersion = 1;
        const querySet = {
            type: "ModifyQuerySet",
            baseVersion: 0,
            newVersion: 1,
            modifications
        };
        if (!this.auth) {
            this.identityVersion = 0;
            return [
                querySet,
                void 0
            ];
        }
        this.outstandingAuthOlderThanRestart = true;
        const authenticate = {
            type: "Authenticate",
            baseVersion: 0,
            ...this.auth
        };
        this.identityVersion = 1;
        return [
            querySet,
            authenticate
        ];
    }
    pause() {
        this.paused = true;
    }
    resume() {
        const querySet = this.pendingQuerySetModifications.size > 0 ? {
            type: "ModifyQuerySet",
            baseVersion: this.querySetVersion,
            newVersion: ++this.querySetVersion,
            modifications: Array.from(this.pendingQuerySetModifications.values())
        } : void 0;
        const authenticate = this.auth !== void 0 ? {
            type: "Authenticate",
            baseVersion: this.identityVersion++,
            ...this.auth
        } : void 0;
        this.unpause();
        return [
            querySet,
            authenticate
        ];
    }
    unpause() {
        this.paused = false;
        this.pendingQuerySetModifications.clear();
    }
    removeSubscriber(queryToken) {
        const localQuery = this.querySet.get(queryToken);
        if (localQuery.numSubscribers > 1) {
            localQuery.numSubscribers -= 1;
            return null;
        } else {
            this.querySet.delete(queryToken);
            this.queryIdToToken.delete(localQuery.id);
            this.outstandingQueriesOlderThanRestart.delete(localQuery.id);
            const baseVersion = this.querySetVersion;
            const newVersion = this.querySetVersion + 1;
            const remove = {
                type: "Remove",
                queryId: localQuery.id
            };
            if (this.paused) {
                if (this.pendingQuerySetModifications.has(localQuery.id)) {
                    this.pendingQuerySetModifications.delete(localQuery.id);
                } else {
                    this.pendingQuerySetModifications.set(localQuery.id, remove);
                }
            } else {
                this.querySetVersion = newVersion;
            }
            return {
                type: "ModifyQuerySet",
                baseVersion,
                newVersion,
                modifications: [
                    remove
                ]
            };
        }
    }
} //# sourceMappingURL=local_state.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/request_manager.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RequestManager",
    ()=>RequestManager
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/value.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/logging.js [app-ssr] (ecmascript)");
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
;
;
class RequestManager {
    constructor(logger, markConnectionStateDirty){
        this.logger = logger;
        this.markConnectionStateDirty = markConnectionStateDirty;
        __publicField(this, "inflightRequests");
        __publicField(this, "requestsOlderThanRestart");
        __publicField(this, "inflightMutationsCount", 0);
        __publicField(this, "inflightActionsCount", 0);
        this.inflightRequests = /* @__PURE__ */ new Map();
        this.requestsOlderThanRestart = /* @__PURE__ */ new Set();
    }
    request(message, sent) {
        const result = new Promise((resolve)=>{
            const status = sent ? "Requested" : "NotSent";
            this.inflightRequests.set(message.requestId, {
                message,
                status: {
                    status,
                    requestedAt: /* @__PURE__ */ new Date(),
                    onResult: resolve
                }
            });
            if (message.type === "Mutation") {
                this.inflightMutationsCount++;
            } else if (message.type === "Action") {
                this.inflightActionsCount++;
            }
        });
        this.markConnectionStateDirty();
        return result;
    }
    /**
   * Update the state after receiving a response.
   *
   * @returns A RequestId if the request is complete and its optimistic update
   * can be dropped, null otherwise.
   */ onResponse(response) {
        const requestInfo = this.inflightRequests.get(response.requestId);
        if (requestInfo === void 0) {
            return null;
        }
        if (requestInfo.status.status === "Completed") {
            return null;
        }
        const udfType = requestInfo.message.type === "Mutation" ? "mutation" : "action";
        const udfPath = requestInfo.message.udfPath;
        for (const line of response.logLines){
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["logForFunction"])(this.logger, "info", udfType, udfPath, line);
        }
        const status = requestInfo.status;
        let result;
        let onResolve;
        if (response.success) {
            result = {
                success: true,
                logLines: response.logLines,
                value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsonToConvex"])(response.result)
            };
            onResolve = ()=>status.onResult(result);
        } else {
            const errorMessage = response.result;
            const { errorData } = response;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["logForFunction"])(this.logger, "error", udfType, udfPath, errorMessage);
            result = {
                success: false,
                errorMessage,
                errorData: errorData !== void 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsonToConvex"])(errorData) : void 0,
                logLines: response.logLines
            };
            onResolve = ()=>status.onResult(result);
        }
        if (response.type === "ActionResponse" || !response.success) {
            onResolve();
            this.inflightRequests.delete(response.requestId);
            this.requestsOlderThanRestart.delete(response.requestId);
            if (requestInfo.message.type === "Action") {
                this.inflightActionsCount--;
            } else if (requestInfo.message.type === "Mutation") {
                this.inflightMutationsCount--;
            }
            this.markConnectionStateDirty();
            return {
                requestId: response.requestId,
                result
            };
        }
        requestInfo.status = {
            status: "Completed",
            result,
            ts: response.ts,
            onResolve
        };
        return null;
    }
    // Remove and returns completed requests.
    removeCompleted(ts) {
        const completeRequests = /* @__PURE__ */ new Map();
        for (const [requestId, requestInfo] of this.inflightRequests.entries()){
            const status = requestInfo.status;
            if (status.status === "Completed" && status.ts.lessThanOrEqual(ts)) {
                status.onResolve();
                completeRequests.set(requestId, status.result);
                if (requestInfo.message.type === "Mutation") {
                    this.inflightMutationsCount--;
                } else if (requestInfo.message.type === "Action") {
                    this.inflightActionsCount--;
                }
                this.inflightRequests.delete(requestId);
                this.requestsOlderThanRestart.delete(requestId);
            }
        }
        if (completeRequests.size > 0) {
            this.markConnectionStateDirty();
        }
        return completeRequests;
    }
    restart() {
        this.requestsOlderThanRestart = new Set(this.inflightRequests.keys());
        const allMessages = [];
        for (const [requestId, value] of this.inflightRequests){
            if (value.status.status === "NotSent") {
                value.status.status = "Requested";
                allMessages.push(value.message);
                continue;
            }
            if (value.message.type === "Mutation") {
                allMessages.push(value.message);
            } else if (value.message.type === "Action") {
                this.inflightRequests.delete(requestId);
                this.requestsOlderThanRestart.delete(requestId);
                this.inflightActionsCount--;
                if (value.status.status === "Completed") {
                    throw new Error("Action should never be in 'Completed' state");
                }
                value.status.onResult({
                    success: false,
                    errorMessage: "Connection lost while action was in flight",
                    logLines: []
                });
            }
        }
        this.markConnectionStateDirty();
        return allMessages;
    }
    resume() {
        const allMessages = [];
        for (const [, value] of this.inflightRequests){
            if (value.status.status === "NotSent") {
                value.status.status = "Requested";
                allMessages.push(value.message);
                continue;
            }
        }
        return allMessages;
    }
    /**
   * @returns true if there are any requests that have been requested but have
   * not be completed yet.
   */ hasIncompleteRequests() {
        for (const requestInfo of this.inflightRequests.values()){
            if (requestInfo.status.status === "Requested") {
                return true;
            }
        }
        return false;
    }
    /**
   * @returns true if there are any inflight requests, including ones that have
   * completed on the server, but have not been applied.
   */ hasInflightRequests() {
        return this.inflightRequests.size > 0;
    }
    /**
   * @returns true if there are any inflight requests, that have been hanging around
   * since prior to the most recent restart.
   */ hasSyncedPastLastReconnect() {
        return this.requestsOlderThanRestart.size === 0;
    }
    timeOfOldestInflightRequest() {
        if (this.inflightRequests.size === 0) {
            return null;
        }
        let oldestInflightRequest = Date.now();
        for (const request of this.inflightRequests.values()){
            if (request.status.status !== "Completed") {
                if (request.status.requestedAt.getTime() < oldestInflightRequest) {
                    oldestInflightRequest = request.status.requestedAt.getTime();
                }
            }
        }
        return new Date(oldestInflightRequest);
    }
    /**
   * @returns The number of mutations currently in flight.
   */ inflightMutations() {
        return this.inflightMutationsCount;
    }
    /**
   * @returns The number of actions currently in flight.
   */ inflightActions() {
        return this.inflightActionsCount;
    }
} //# sourceMappingURL=request_manager.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/server/functionName.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "functionName",
    ()=>functionName
]);
"use strict";
const functionName = Symbol.for("functionName"); //# sourceMappingURL=functionName.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/server/components/paths.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "extractReferencePath",
    ()=>extractReferencePath,
    "getFunctionAddress",
    ()=>getFunctionAddress,
    "isFunctionHandle",
    ()=>isFunctionHandle,
    "setReferencePath",
    ()=>setReferencePath,
    "toReferencePath",
    ()=>toReferencePath
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$functionName$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/server/functionName.js [app-ssr] (ecmascript)");
"use strict";
;
const toReferencePath = Symbol.for("toReferencePath");
function setReferencePath(obj, value) {
    obj[toReferencePath] = value;
}
function extractReferencePath(reference) {
    return reference[toReferencePath] ?? null;
}
function isFunctionHandle(s) {
    return s.startsWith("function://");
}
function getFunctionAddress(functionReference) {
    let functionAddress;
    if (typeof functionReference === "string") {
        if (isFunctionHandle(functionReference)) {
            functionAddress = {
                functionHandle: functionReference
            };
        } else {
            functionAddress = {
                name: functionReference
            };
        }
    } else if (functionReference[__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$functionName$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["functionName"]]) {
        functionAddress = {
            name: functionReference[__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$functionName$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["functionName"]]
        };
    } else {
        const referencePath = extractReferencePath(functionReference);
        if (!referencePath) {
            throw new Error(`${functionReference} is not a functionReference`);
        }
        functionAddress = {
            reference: referencePath
        };
    }
    return functionAddress;
} //# sourceMappingURL=paths.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/server/api.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "anyApi",
    ()=>anyApi,
    "filterApi",
    ()=>filterApi,
    "getFunctionName",
    ()=>getFunctionName,
    "justActions",
    ()=>justActions,
    "justInternal",
    ()=>justInternal,
    "justMutations",
    ()=>justMutations,
    "justPaginatedQueries",
    ()=>justPaginatedQueries,
    "justPublic",
    ()=>justPublic,
    "justQueries",
    ()=>justQueries,
    "justSchedulable",
    ()=>justSchedulable,
    "makeFunctionReference",
    ()=>makeFunctionReference
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$functionName$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/server/functionName.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$components$2f$paths$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/server/components/paths.js [app-ssr] (ecmascript)");
"use strict";
;
;
function getFunctionName(functionReference) {
    const address = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$components$2f$paths$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionAddress"])(functionReference);
    if (address.name === void 0) {
        if (address.functionHandle !== void 0) {
            throw new Error(`Expected function reference like "api.file.func" or "internal.file.func", but received function handle ${address.functionHandle}`);
        } else if (address.reference !== void 0) {
            throw new Error(`Expected function reference in the current component like "api.file.func" or "internal.file.func", but received reference ${address.reference}`);
        }
        throw new Error(`Expected function reference like "api.file.func" or "internal.file.func", but received ${JSON.stringify(address)}`);
    }
    if (typeof functionReference === "string") return functionReference;
    const name = functionReference[__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$functionName$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["functionName"]];
    if (!name) {
        throw new Error(`${functionReference} is not a functionReference`);
    }
    return name;
}
function makeFunctionReference(name) {
    return {
        [__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$functionName$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["functionName"]]: name
    };
}
function createApi(pathParts = []) {
    const handler = {
        get (_, prop) {
            if (typeof prop === "string") {
                const newParts = [
                    ...pathParts,
                    prop
                ];
                return createApi(newParts);
            } else if (prop === __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$functionName$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["functionName"]) {
                if (pathParts.length < 2) {
                    const found = [
                        "api",
                        ...pathParts
                    ].join(".");
                    throw new Error(`API path is expected to be of the form \`api.moduleName.functionName\`. Found: \`${found}\``);
                }
                const path = pathParts.slice(0, -1).join("/");
                const exportName = pathParts[pathParts.length - 1];
                if (exportName === "default") {
                    return path;
                } else {
                    return path + ":" + exportName;
                }
            } else if (prop === Symbol.toStringTag) {
                return "FunctionReference";
            } else {
                return void 0;
            }
        }
    };
    return new Proxy({}, handler);
}
function filterApi(api) {
    return api;
}
function justInternal(api) {
    return api;
}
function justPublic(api) {
    return api;
}
function justQueries(api) {
    return api;
}
function justMutations(api) {
    return api;
}
function justActions(api) {
    return api;
}
function justPaginatedQueries(api) {
    return api;
}
function justSchedulable(api) {
    return api;
}
const anyApi = createApi(); //# sourceMappingURL=api.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/optimistic_updates_impl.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OptimisticQueryResults",
    ()=>OptimisticQueryResults
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/server/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/common/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/logging.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/udf_path_utils.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/errors.js [app-ssr] (ecmascript)");
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
;
;
;
;
;
class OptimisticLocalStoreImpl {
    constructor(queryResults){
        // A references of the query results in OptimisticQueryResults
        __publicField(this, "queryResults");
        // All of the queries modified by this class
        __publicField(this, "modifiedQueries");
        this.queryResults = queryResults;
        this.modifiedQueries = [];
    }
    getQuery(query, ...args) {
        const queryArgs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseArgs"])(args[0]);
        const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(query);
        const queryResult = this.queryResults.get((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["serializePathAndArgs"])(name, queryArgs));
        if (queryResult === void 0) {
            return void 0;
        }
        return OptimisticLocalStoreImpl.queryValue(queryResult.result);
    }
    getAllQueries(query) {
        const queriesWithName = [];
        const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(query);
        for (const queryResult of this.queryResults.values()){
            if (queryResult.udfPath === (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canonicalizeUdfPath"])(name)) {
                queriesWithName.push({
                    args: queryResult.args,
                    value: OptimisticLocalStoreImpl.queryValue(queryResult.result)
                });
            }
        }
        return queriesWithName;
    }
    setQuery(queryReference, args, value) {
        const queryArgs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseArgs"])(args);
        const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(queryReference);
        const queryToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["serializePathAndArgs"])(name, queryArgs);
        let result;
        if (value === void 0) {
            result = void 0;
        } else {
            result = {
                success: true,
                value,
                // It's an optimistic update, so there are no function logs to show.
                logLines: []
            };
        }
        const query = {
            udfPath: name,
            args: queryArgs,
            result
        };
        this.queryResults.set(queryToken, query);
        this.modifiedQueries.push(queryToken);
    }
    static queryValue(result) {
        if (result === void 0) {
            return void 0;
        } else if (result.success) {
            return result.value;
        } else {
            return void 0;
        }
    }
}
class OptimisticQueryResults {
    constructor(){
        __publicField(this, "queryResults");
        __publicField(this, "optimisticUpdates");
        this.queryResults = /* @__PURE__ */ new Map();
        this.optimisticUpdates = [];
    }
    /**
   * Apply all optimistic updates on top of server query results
   */ ingestQueryResultsFromServer(serverQueryResults, optimisticUpdatesToDrop) {
        this.optimisticUpdates = this.optimisticUpdates.filter((updateAndId)=>{
            return !optimisticUpdatesToDrop.has(updateAndId.mutationId);
        });
        const oldQueryResults = this.queryResults;
        this.queryResults = new Map(serverQueryResults);
        const localStore = new OptimisticLocalStoreImpl(this.queryResults);
        for (const updateAndId of this.optimisticUpdates){
            updateAndId.update(localStore);
        }
        const changedQueries = [];
        for (const [queryToken, query] of this.queryResults){
            const oldQuery = oldQueryResults.get(queryToken);
            if (oldQuery === void 0 || oldQuery.result !== query.result) {
                changedQueries.push(queryToken);
            }
        }
        return changedQueries;
    }
    applyOptimisticUpdate(update, mutationId) {
        this.optimisticUpdates.push({
            update,
            mutationId
        });
        const localStore = new OptimisticLocalStoreImpl(this.queryResults);
        update(localStore);
        return localStore.modifiedQueries;
    }
    /**
   * "Raw" with respect to errors vs values, but query results still have
   * optimistic updates applied.
   *
   * @internal
   */ rawQueryResult(queryToken) {
        const query = this.queryResults.get(queryToken);
        if (query === void 0) {
            return void 0;
        }
        return query.result;
    }
    queryResult(queryToken) {
        const query = this.queryResults.get(queryToken);
        if (query === void 0) {
            return void 0;
        }
        const result = query.result;
        if (result === void 0) {
            return void 0;
        } else if (result.success) {
            return result.value;
        } else {
            if (result.errorData !== void 0) {
                throw (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardData"])(result, new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConvexError"]((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHybridErrorStacktrace"])("query", query.udfPath, result)));
            }
            throw new Error((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHybridErrorStacktrace"])("query", query.udfPath, result));
        }
    }
    hasQueryResult(queryToken) {
        return this.queryResults.get(queryToken) !== void 0;
    }
    /**
   * @internal
   */ queryLogs(queryToken) {
        const query = this.queryResults.get(queryToken);
        return query?.result?.logLines;
    }
} //# sourceMappingURL=optimistic_updates_impl.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/vendor/long.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Long",
    ()=>Long
]);
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
class Long {
    constructor(low, high){
        __publicField(this, "low");
        __publicField(this, "high");
        __publicField(this, "__isUnsignedLong__");
        this.low = low | 0;
        this.high = high | 0;
        this.__isUnsignedLong__ = true;
    }
    static isLong(obj) {
        return (obj && obj.__isUnsignedLong__) === true;
    }
    // prettier-ignore
    static fromBytesLE(bytes) {
        return new Long(bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24, bytes[4] | bytes[5] << 8 | bytes[6] << 16 | bytes[7] << 24);
    }
    // prettier-ignore
    toBytesLE() {
        const hi = this.high;
        const lo = this.low;
        return [
            lo & 255,
            lo >>> 8 & 255,
            lo >>> 16 & 255,
            lo >>> 24,
            hi & 255,
            hi >>> 8 & 255,
            hi >>> 16 & 255,
            hi >>> 24
        ];
    }
    static fromNumber(value) {
        if (isNaN(value)) return UZERO;
        if (value < 0) return UZERO;
        if (value >= TWO_PWR_64_DBL) return MAX_UNSIGNED_VALUE;
        return new Long(value % TWO_PWR_32_DBL | 0, value / TWO_PWR_32_DBL | 0);
    }
    toString() {
        return (BigInt(this.high) * BigInt(TWO_PWR_32_DBL) + BigInt(this.low)).toString();
    }
    equals(other) {
        if (!Long.isLong(other)) other = Long.fromValue(other);
        if (this.high >>> 31 === 1 && other.high >>> 31 === 1) return false;
        return this.high === other.high && this.low === other.low;
    }
    notEquals(other) {
        return !this.equals(other);
    }
    comp(other) {
        if (!Long.isLong(other)) other = Long.fromValue(other);
        if (this.equals(other)) return 0;
        return other.high >>> 0 > this.high >>> 0 || other.high === this.high && other.low >>> 0 > this.low >>> 0 ? -1 : 1;
    }
    lessThanOrEqual(other) {
        return this.comp(/* validates */ other) <= 0;
    }
    static fromValue(val) {
        if (typeof val === "number") return Long.fromNumber(val);
        return new Long(val.low, val.high);
    }
}
const UZERO = new Long(0, 0);
const TWO_PWR_16_DBL = 1 << 16;
const TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL;
const TWO_PWR_64_DBL = TWO_PWR_32_DBL * TWO_PWR_32_DBL;
const MAX_UNSIGNED_VALUE = new Long(4294967295 | 0, 4294967295 | 0); //# sourceMappingURL=long.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/remote_query_set.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RemoteQuerySet",
    ()=>RemoteQuerySet
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/value.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$vendor$2f$long$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/vendor/long.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/logging.js [app-ssr] (ecmascript)");
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
;
;
;
class RemoteQuerySet {
    constructor(queryPath, logger){
        __publicField(this, "version");
        __publicField(this, "remoteQuerySet");
        __publicField(this, "queryPath");
        __publicField(this, "logger");
        this.version = {
            querySet: 0,
            ts: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$vendor$2f$long$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Long"].fromNumber(0),
            identity: 0
        };
        this.remoteQuerySet = /* @__PURE__ */ new Map();
        this.queryPath = queryPath;
        this.logger = logger;
    }
    transition(transition) {
        const start = transition.startVersion;
        if (this.version.querySet !== start.querySet || this.version.ts.notEquals(start.ts) || this.version.identity !== start.identity) {
            throw new Error(`Invalid start version: ${start.ts.toString()}:${start.querySet}:${start.identity}, transitioning from ${this.version.ts.toString()}:${this.version.querySet}:${this.version.identity}`);
        }
        for (const modification of transition.modifications){
            switch(modification.type){
                case "QueryUpdated":
                    {
                        const queryPath = this.queryPath(modification.queryId);
                        if (queryPath) {
                            for (const line of modification.logLines){
                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["logForFunction"])(this.logger, "info", "query", queryPath, line);
                            }
                        }
                        const value = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsonToConvex"])(modification.value ?? null);
                        this.remoteQuerySet.set(modification.queryId, {
                            success: true,
                            value,
                            logLines: modification.logLines
                        });
                        break;
                    }
                case "QueryFailed":
                    {
                        const queryPath = this.queryPath(modification.queryId);
                        if (queryPath) {
                            for (const line of modification.logLines){
                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["logForFunction"])(this.logger, "info", "query", queryPath, line);
                            }
                        }
                        const { errorData } = modification;
                        this.remoteQuerySet.set(modification.queryId, {
                            success: false,
                            errorMessage: modification.errorMessage,
                            errorData: errorData !== void 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsonToConvex"])(errorData) : void 0,
                            logLines: modification.logLines
                        });
                        break;
                    }
                case "QueryRemoved":
                    {
                        this.remoteQuerySet.delete(modification.queryId);
                        break;
                    }
                default:
                    {
                        modification;
                        throw new Error(`Invalid modification ${modification.type}`);
                    }
            }
        }
        this.version = transition.endVersion;
    }
    remoteQueryResults() {
        return this.remoteQuerySet;
    }
    timestamp() {
        return this.version.ts;
    }
} //# sourceMappingURL=remote_query_set.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/base64.js [app-ssr] (ecmascript) <export * as Base64>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Base64",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$base64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$base64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/base64.js [app-ssr] (ecmascript)");
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/protocol.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "encodeClientMessage",
    ()=>encodeClientMessage,
    "longToU64",
    ()=>longToU64,
    "parseServerMessage",
    ()=>parseServerMessage,
    "u64ToLong",
    ()=>u64ToLong
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$base64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Base64$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/base64.js [app-ssr] (ecmascript) <export * as Base64>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$vendor$2f$long$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/vendor/long.js [app-ssr] (ecmascript)");
"use strict";
;
;
function u64ToLong(encoded) {
    const integerBytes = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$base64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Base64$3e$__["Base64"].toByteArray(encoded);
    return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$vendor$2f$long$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Long"].fromBytesLE(Array.from(integerBytes));
}
function longToU64(raw) {
    const integerBytes = new Uint8Array(raw.toBytesLE());
    return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$base64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Base64$3e$__["Base64"].fromByteArray(integerBytes);
}
function parseServerMessage(encoded) {
    switch(encoded.type){
        case "FatalError":
        case "AuthError":
        case "ActionResponse":
        case "TransitionChunk":
        case "Ping":
            {
                return {
                    ...encoded
                };
            }
        case "MutationResponse":
            {
                if (encoded.success) {
                    return {
                        ...encoded,
                        ts: u64ToLong(encoded.ts)
                    };
                } else {
                    return {
                        ...encoded
                    };
                }
            }
        case "Transition":
            {
                return {
                    ...encoded,
                    startVersion: {
                        ...encoded.startVersion,
                        ts: u64ToLong(encoded.startVersion.ts)
                    },
                    endVersion: {
                        ...encoded.endVersion,
                        ts: u64ToLong(encoded.endVersion.ts)
                    }
                };
            }
        default:
            {
                encoded;
            }
    }
    return void 0;
}
function encodeClientMessage(message) {
    switch(message.type){
        case "Authenticate":
        case "ModifyQuerySet":
        case "Mutation":
        case "Action":
        case "Event":
            {
                return {
                    ...message
                };
            }
        case "Connect":
            {
                if (message.maxObservedTimestamp !== void 0) {
                    return {
                        ...message,
                        maxObservedTimestamp: longToU64(message.maxObservedTimestamp)
                    };
                } else {
                    return {
                        ...message,
                        maxObservedTimestamp: void 0
                    };
                }
            }
        default:
            {
                message;
            }
    }
    return void 0;
} //# sourceMappingURL=protocol.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/web_socket_manager.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "WebSocketManager",
    ()=>WebSocketManager
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$protocol$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/protocol.js [app-ssr] (ecmascript)");
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
;
const CLOSE_NORMAL = 1e3;
const CLOSE_GOING_AWAY = 1001;
const CLOSE_NO_STATUS = 1005;
const CLOSE_NOT_FOUND = 4040;
let firstTime;
function monotonicMillis() {
    if (firstTime === void 0) {
        firstTime = Date.now();
    }
    if (typeof performance === "undefined" || !performance.now) {
        return Date.now();
    }
    return Math.round(firstTime + performance.now());
}
function prettyNow() {
    return `t=${Math.round((monotonicMillis() - firstTime) / 100) / 10}s`;
}
const serverDisconnectErrors = {
    // A known error, e.g. during a restart or push
    InternalServerError: {
        timeout: 1e3
    },
    // ErrorMetadata::overloaded() messages that we realy should back off
    SubscriptionsWorkerFullError: {
        timeout: 3e3
    },
    TooManyConcurrentRequests: {
        timeout: 3e3
    },
    CommitterFullError: {
        timeout: 3e3
    },
    AwsTooManyRequestsException: {
        timeout: 3e3
    },
    ExecuteFullError: {
        timeout: 3e3
    },
    SystemTimeoutError: {
        timeout: 3e3
    },
    ExpiredInQueue: {
        timeout: 3e3
    },
    // ErrorMetadata::feature_temporarily_unavailable() that typically indicate a deploy just happened
    VectorIndexesUnavailable: {
        timeout: 1e3
    },
    SearchIndexesUnavailable: {
        timeout: 1e3
    },
    TableSummariesUnavailable: {
        timeout: 1e3
    },
    // More ErrorMetadata::overloaded()
    VectorIndexTooLarge: {
        timeout: 3e3
    },
    SearchIndexTooLarge: {
        timeout: 3e3
    },
    TooManyWritesInTimePeriod: {
        timeout: 3e3
    }
};
function classifyDisconnectError(s) {
    if (s === void 0) return "Unknown";
    for (const prefix of Object.keys(serverDisconnectErrors)){
        if (s.startsWith(prefix)) {
            return prefix;
        }
    }
    return "Unknown";
}
class WebSocketManager {
    constructor(uri, callbacks, webSocketConstructor, logger, markConnectionStateDirty, debug){
        this.markConnectionStateDirty = markConnectionStateDirty;
        this.debug = debug;
        __publicField(this, "socket");
        __publicField(this, "connectionCount");
        __publicField(this, "_hasEverConnected", false);
        __publicField(this, "lastCloseReason");
        // State for assembling the split-up Transition currently being received.
        __publicField(this, "transitionChunkBuffer", null);
        /** Upon HTTPS/WSS failure, the first jittered backoff duration, in ms. */ __publicField(this, "defaultInitialBackoff");
        /** We backoff exponentially, but we need to cap that--this is the jittered max. */ __publicField(this, "maxBackoff");
        /** How many times have we failed consecutively? */ __publicField(this, "retries");
        /** How long before lack of server response causes us to initiate a reconnect,
     * in ms */ __publicField(this, "serverInactivityThreshold");
        __publicField(this, "reconnectDueToServerInactivityTimeout");
        __publicField(this, "uri");
        __publicField(this, "onOpen");
        __publicField(this, "onResume");
        __publicField(this, "onMessage");
        __publicField(this, "webSocketConstructor");
        __publicField(this, "logger");
        __publicField(this, "onServerDisconnectError");
        this.webSocketConstructor = webSocketConstructor;
        this.socket = {
            state: "disconnected"
        };
        this.connectionCount = 0;
        this.lastCloseReason = "InitialConnect";
        this.defaultInitialBackoff = 1e3;
        this.maxBackoff = 16e3;
        this.retries = 0;
        this.serverInactivityThreshold = 6e4;
        this.reconnectDueToServerInactivityTimeout = null;
        this.uri = uri;
        this.onOpen = callbacks.onOpen;
        this.onResume = callbacks.onResume;
        this.onMessage = callbacks.onMessage;
        this.onServerDisconnectError = callbacks.onServerDisconnectError;
        this.logger = logger;
        this.connect();
    }
    setSocketState(state) {
        this.socket = state;
        this._logVerbose(`socket state changed: ${this.socket.state}, paused: ${"paused" in this.socket ? this.socket.paused : void 0}`);
        this.markConnectionStateDirty();
    }
    assembleTransition(chunk) {
        if (chunk.partNumber < 0 || chunk.partNumber >= chunk.totalParts || chunk.totalParts === 0 || this.transitionChunkBuffer && (this.transitionChunkBuffer.totalParts !== chunk.totalParts || this.transitionChunkBuffer.transitionId !== chunk.transitionId)) {
            this.transitionChunkBuffer = null;
            throw new Error("Invalid TransitionChunk");
        }
        if (this.transitionChunkBuffer === null) {
            this.transitionChunkBuffer = {
                chunks: [],
                totalParts: chunk.totalParts,
                transitionId: chunk.transitionId
            };
        }
        if (chunk.partNumber !== this.transitionChunkBuffer.chunks.length) {
            const expectedLength = this.transitionChunkBuffer.chunks.length;
            this.transitionChunkBuffer = null;
            throw new Error(`TransitionChunk received out of order: expected part ${expectedLength}, got ${chunk.partNumber}`);
        }
        this.transitionChunkBuffer.chunks.push(chunk.chunk);
        if (this.transitionChunkBuffer.chunks.length === chunk.totalParts) {
            const fullJson = this.transitionChunkBuffer.chunks.join("");
            this.transitionChunkBuffer = null;
            const transition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$protocol$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseServerMessage"])(JSON.parse(fullJson));
            if (transition.type !== "Transition") {
                throw new Error(`Expected Transition, got ${transition.type} after assembling chunks`);
            }
            return transition;
        }
        return null;
    }
    connect() {
        if (this.socket.state === "terminated") {
            return;
        }
        if (this.socket.state !== "disconnected" && this.socket.state !== "stopped") {
            throw new Error("Didn't start connection from disconnected state: " + this.socket.state);
        }
        const ws = new this.webSocketConstructor(this.uri);
        this._logVerbose("constructed WebSocket");
        this.setSocketState({
            state: "connecting",
            ws,
            paused: "no"
        });
        this.resetServerInactivityTimeout();
        ws.onopen = ()=>{
            this.logger.logVerbose("begin ws.onopen");
            if (this.socket.state !== "connecting") {
                throw new Error("onopen called with socket not in connecting state");
            }
            this.setSocketState({
                state: "ready",
                ws,
                paused: this.socket.paused === "yes" ? "uninitialized" : "no"
            });
            this.resetServerInactivityTimeout();
            if (this.socket.paused === "no") {
                this._hasEverConnected = true;
                this.onOpen({
                    connectionCount: this.connectionCount,
                    lastCloseReason: this.lastCloseReason,
                    clientTs: monotonicMillis()
                });
            }
            if (this.lastCloseReason !== "InitialConnect") {
                if (this.lastCloseReason) {
                    this.logger.log("WebSocket reconnected at", prettyNow(), "after disconnect due to", this.lastCloseReason);
                } else {
                    this.logger.log("WebSocket reconnected at", prettyNow());
                }
            }
            this.connectionCount += 1;
            this.lastCloseReason = null;
        };
        ws.onerror = (error)=>{
            this.transitionChunkBuffer = null;
            const message = error.message;
            if (message) {
                this.logger.log(`WebSocket error message: ${message}`);
            }
        };
        ws.onmessage = (message)=>{
            this.resetServerInactivityTimeout();
            const messageLength = message.data.length;
            let serverMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$protocol$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseServerMessage"])(JSON.parse(message.data));
            this._logVerbose(`received ws message with type ${serverMessage.type}`);
            if (serverMessage.type === "Ping") {
                return;
            }
            if (serverMessage.type === "TransitionChunk") {
                const transition = this.assembleTransition(serverMessage);
                if (!transition) {
                    return;
                }
                serverMessage = transition;
                this._logVerbose(`assembled full ws message of type ${serverMessage.type}`);
            }
            if (this.transitionChunkBuffer !== null) {
                this.transitionChunkBuffer = null;
                this.logger.log(`Received unexpected ${serverMessage.type} while buffering TransitionChunks`);
            }
            if (serverMessage.type === "Transition") {
                this.reportLargeTransition({
                    messageLength,
                    transition: serverMessage
                });
            }
            const response = this.onMessage(serverMessage);
            if (response.hasSyncedPastLastReconnect) {
                this.retries = 0;
                this.markConnectionStateDirty();
            }
        };
        ws.onclose = (event)=>{
            this._logVerbose("begin ws.onclose");
            this.transitionChunkBuffer = null;
            if (this.lastCloseReason === null) {
                this.lastCloseReason = event.reason || `closed with code ${event.code}`;
            }
            if (event.code !== CLOSE_NORMAL && event.code !== CLOSE_GOING_AWAY && // This commonly gets fired on mobile apps when the app is backgrounded
            event.code !== CLOSE_NO_STATUS && event.code !== CLOSE_NOT_FOUND) {
                let msg = `WebSocket closed with code ${event.code}`;
                if (event.reason) {
                    msg += `: ${event.reason}`;
                }
                this.logger.log(msg);
                if (this.onServerDisconnectError && event.reason) {
                    this.onServerDisconnectError(msg);
                }
            }
            const reason = classifyDisconnectError(event.reason);
            this.scheduleReconnect(reason);
            return;
        };
    }
    /**
   * @returns The state of the {@link Socket}.
   */ socketState() {
        return this.socket.state;
    }
    /**
   * @param message - A ClientMessage to send.
   * @returns Whether the message (might have been) sent.
   */ sendMessage(message) {
        const messageForLog = {
            type: message.type,
            ...message.type === "Authenticate" && message.tokenType === "User" ? {
                value: `...${message.value.slice(-7)}`
            } : {}
        };
        if (this.socket.state === "ready" && this.socket.paused === "no") {
            const encodedMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$protocol$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encodeClientMessage"])(message);
            const request = JSON.stringify(encodedMessage);
            let sent = false;
            try {
                this.socket.ws.send(request);
                sent = true;
            } catch (error) {
                this.logger.log(`Failed to send message on WebSocket, reconnecting: ${error}`);
                this.closeAndReconnect("FailedToSendMessage");
            }
            this._logVerbose(`${sent ? "sent" : "failed to send"} message with type ${message.type}: ${JSON.stringify(messageForLog)}`);
            return true;
        }
        this._logVerbose(`message not sent (socket state: ${this.socket.state}, paused: ${"paused" in this.socket ? this.socket.paused : void 0}): ${JSON.stringify(messageForLog)}`);
        return false;
    }
    resetServerInactivityTimeout() {
        if (this.socket.state === "terminated") {
            return;
        }
        if (this.reconnectDueToServerInactivityTimeout !== null) {
            clearTimeout(this.reconnectDueToServerInactivityTimeout);
            this.reconnectDueToServerInactivityTimeout = null;
        }
        this.reconnectDueToServerInactivityTimeout = setTimeout(()=>{
            this.closeAndReconnect("InactiveServer");
        }, this.serverInactivityThreshold);
    }
    scheduleReconnect(reason) {
        this.socket = {
            state: "disconnected"
        };
        const backoff = this.nextBackoff(reason);
        this.markConnectionStateDirty();
        this.logger.log(`Attempting reconnect in ${Math.round(backoff)}ms`);
        setTimeout(()=>this.connect(), backoff);
    }
    /**
   * Close the WebSocket and schedule a reconnect.
   *
   * This should be used when we hit an error and would like to restart the session.
   */ closeAndReconnect(closeReason) {
        this._logVerbose(`begin closeAndReconnect with reason ${closeReason}`);
        switch(this.socket.state){
            case "disconnected":
            case "terminated":
            case "stopped":
                return;
            case "connecting":
            case "ready":
                {
                    this.lastCloseReason = closeReason;
                    void this.close();
                    this.scheduleReconnect("client");
                    return;
                }
            default:
                {
                    this.socket;
                }
        }
    }
    /**
   * Close the WebSocket, being careful to clear the onclose handler to avoid re-entrant
   * calls. Use this instead of directly calling `ws.close()`
   *
   * It is the callers responsibility to update the state after this method is called so that the
   * closed socket is not accessible or used again after this method is called
   */ close() {
        this.transitionChunkBuffer = null;
        switch(this.socket.state){
            case "disconnected":
            case "terminated":
            case "stopped":
                return Promise.resolve();
            case "connecting":
                {
                    const ws = this.socket.ws;
                    ws.onmessage = (_message)=>{
                        this._logVerbose("Ignoring message received after close");
                    };
                    return new Promise((r)=>{
                        ws.onclose = ()=>{
                            this._logVerbose("Closed after connecting");
                            r();
                        };
                        ws.onopen = ()=>{
                            this._logVerbose("Opened after connecting");
                            ws.close();
                        };
                    });
                }
            case "ready":
                {
                    this._logVerbose("ws.close called");
                    const ws = this.socket.ws;
                    ws.onmessage = (_message)=>{
                        this._logVerbose("Ignoring message received after close");
                    };
                    const result = new Promise((r)=>{
                        ws.onclose = ()=>{
                            r();
                        };
                    });
                    ws.close();
                    return result;
                }
            default:
                {
                    this.socket;
                    return Promise.resolve();
                }
        }
    }
    /**
   * Close the WebSocket and do not reconnect.
   * @returns A Promise that resolves when the WebSocket `onClose` callback is called.
   */ terminate() {
        if (this.reconnectDueToServerInactivityTimeout) {
            clearTimeout(this.reconnectDueToServerInactivityTimeout);
        }
        switch(this.socket.state){
            case "terminated":
            case "stopped":
            case "disconnected":
            case "connecting":
            case "ready":
                {
                    const result = this.close();
                    this.setSocketState({
                        state: "terminated"
                    });
                    return result;
                }
            default:
                {
                    this.socket;
                    throw new Error(`Invalid websocket state: ${this.socket.state}`);
                }
        }
    }
    stop() {
        switch(this.socket.state){
            case "terminated":
                return Promise.resolve();
            case "connecting":
            case "stopped":
            case "disconnected":
            case "ready":
                {
                    const result = this.close();
                    this.socket = {
                        state: "stopped"
                    };
                    return result;
                }
            default:
                {
                    this.socket;
                    return Promise.resolve();
                }
        }
    }
    /**
   * Create a new WebSocket after a previous `stop()`, unless `terminate()` was
   * called before.
   */ tryRestart() {
        switch(this.socket.state){
            case "stopped":
                break;
            case "terminated":
            case "connecting":
            case "ready":
            case "disconnected":
                this.logger.logVerbose("Restart called without stopping first");
                return;
            default:
                {
                    this.socket;
                }
        }
        this.connect();
    }
    pause() {
        switch(this.socket.state){
            case "disconnected":
            case "stopped":
            case "terminated":
                return;
            case "connecting":
            case "ready":
                {
                    this.socket = {
                        ...this.socket,
                        paused: "yes"
                    };
                    return;
                }
            default:
                {
                    this.socket;
                    return;
                }
        }
    }
    /**
   * Resume the state machine if previously paused.
   */ resume() {
        switch(this.socket.state){
            case "connecting":
                this.socket = {
                    ...this.socket,
                    paused: "no"
                };
                return;
            case "ready":
                if (this.socket.paused === "uninitialized") {
                    this.socket = {
                        ...this.socket,
                        paused: "no"
                    };
                    this.onOpen({
                        connectionCount: this.connectionCount,
                        lastCloseReason: this.lastCloseReason,
                        clientTs: monotonicMillis()
                    });
                } else if (this.socket.paused === "yes") {
                    this.socket = {
                        ...this.socket,
                        paused: "no"
                    };
                    this.onResume();
                }
                return;
            case "terminated":
            case "stopped":
            case "disconnected":
                return;
            default:
                {
                    this.socket;
                }
        }
        this.connect();
    }
    connectionState() {
        return {
            isConnected: this.socket.state === "ready",
            hasEverConnected: this._hasEverConnected,
            connectionCount: this.connectionCount,
            connectionRetries: this.retries
        };
    }
    _logVerbose(message) {
        this.logger.logVerbose(message);
    }
    nextBackoff(reason) {
        const initialBackoff = reason === "client" ? 100 : reason === "Unknown" ? this.defaultInitialBackoff : serverDisconnectErrors[reason].timeout;
        const baseBackoff = initialBackoff * Math.pow(2, this.retries);
        this.retries += 1;
        const actualBackoff = Math.min(baseBackoff, this.maxBackoff);
        const jitter = actualBackoff * (Math.random() - 0.5);
        return actualBackoff + jitter;
    }
    reportLargeTransition({ transition, messageLength }) {
        if (transition.clientClockSkew === void 0 || transition.serverTs === void 0) {
            return;
        }
        const transitionTransitTime = monotonicMillis() - // client time now
        // clientClockSkew = (server time + upstream latency) - client time
        // clientClockSkew is "how many milliseconds behind (slow) is the client clock"
        // but the latency of the Connect message inflates this, making it appear further behind
        transition.clientClockSkew - transition.serverTs / 1e6;
        const prettyTransitionTime = `${Math.round(transitionTransitTime)}ms`;
        const prettyMessageMB = `${Math.round(messageLength / 1e4) / 100}MB`;
        const bytesPerSecond = messageLength / (transitionTransitTime / 1e3);
        const prettyBytesPerSecond = `${Math.round(bytesPerSecond / 1e4) / 100}MB per second`;
        this._logVerbose(`received ${prettyMessageMB} transition in ${prettyTransitionTime} at ${prettyBytesPerSecond}`);
        if (messageLength > 2e7) {
            this.logger.log(`received query results totaling more that 20MB (${prettyMessageMB}) which will take a long time to download on slower connections`);
        } else if (transitionTransitTime > 2e4) {
            this.logger.log(`received query results totaling ${prettyMessageMB} which took more than 20s to arrive (${prettyTransitionTime})`);
        }
        if (this.debug) {
            this.sendMessage({
                type: "Event",
                eventType: "ClientReceivedTransition",
                event: {
                    transitionTransitTime,
                    messageLength
                }
            });
        }
    }
} //# sourceMappingURL=web_socket_manager.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/session.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "newSessionId",
    ()=>newSessionId
]);
"use strict";
function newSessionId() {
    return uuidv4();
}
function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c)=>{
        const r = Math.random() * 16 | 0, v = c === "x" ? r : r & 3 | 8;
        return v.toString(16);
    });
} //# sourceMappingURL=session.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/vendor/jwt-decode/index.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InvalidTokenError",
    ()=>InvalidTokenError,
    "jwtDecode",
    ()=>jwtDecode
]);
"use strict";
class InvalidTokenError extends Error {
}
InvalidTokenError.prototype.name = "InvalidTokenError";
function b64DecodeUnicode(str) {
    return decodeURIComponent(atob(str).replace(/(.)/g, (_m, p)=>{
        let code = p.charCodeAt(0).toString(16).toUpperCase();
        if (code.length < 2) {
            code = "0" + code;
        }
        return "%" + code;
    }));
}
function base64UrlDecode(str) {
    let output = str.replace(/-/g, "+").replace(/_/g, "/");
    switch(output.length % 4){
        case 0:
            break;
        case 2:
            output += "==";
            break;
        case 3:
            output += "=";
            break;
        default:
            throw new Error("base64 string is not of the correct length");
    }
    try {
        return b64DecodeUnicode(output);
    } catch  {
        return atob(output);
    }
}
function jwtDecode(token, options) {
    if (typeof token !== "string") {
        throw new InvalidTokenError("Invalid token specified: must be a string");
    }
    options || (options = {});
    const pos = options.header === true ? 0 : 1;
    const part = token.split(".")[pos];
    if (typeof part !== "string") {
        throw new InvalidTokenError(`Invalid token specified: missing part #${pos + 1}`);
    }
    let decoded;
    try {
        decoded = base64UrlDecode(part);
    } catch (e) {
        throw new InvalidTokenError(`Invalid token specified: invalid base64 for part #${pos + 1} (${e.message})`);
    }
    try {
        return JSON.parse(decoded);
    } catch (e) {
        throw new InvalidTokenError(`Invalid token specified: invalid json for part #${pos + 1} (${e.message})`);
    }
} //# sourceMappingURL=index.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/authentication_manager.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthenticationManager",
    ()=>AuthenticationManager
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$vendor$2f$jwt$2d$decode$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/vendor/jwt-decode/index.js [app-ssr] (ecmascript)");
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
;
const MAXIMUM_REFRESH_DELAY = 20 * 24 * 60 * 60 * 1e3;
const MAX_TOKEN_CONFIRMATION_ATTEMPTS = 2;
class AuthenticationManager {
    constructor(syncState, callbacks, config){
        __publicField(this, "authState", {
            state: "noAuth"
        });
        // Used to detect races involving `setConfig` calls
        // while a token is being fetched.
        __publicField(this, "configVersion", 0);
        // Shared by the BaseClient so that the auth manager can easily inspect it
        __publicField(this, "syncState");
        // Passed down by BaseClient, sends a message to the server
        __publicField(this, "authenticate");
        __publicField(this, "stopSocket");
        __publicField(this, "tryRestartSocket");
        __publicField(this, "pauseSocket");
        __publicField(this, "resumeSocket");
        // Passed down by BaseClient, sends a message to the server
        __publicField(this, "clearAuth");
        __publicField(this, "logger");
        __publicField(this, "refreshTokenLeewaySeconds");
        // Number of times we have attempted to confirm the latest token. We retry up
        // to `MAX_TOKEN_CONFIRMATION_ATTEMPTS` times.
        __publicField(this, "tokenConfirmationAttempts", 0);
        this.syncState = syncState;
        this.authenticate = callbacks.authenticate;
        this.stopSocket = callbacks.stopSocket;
        this.tryRestartSocket = callbacks.tryRestartSocket;
        this.pauseSocket = callbacks.pauseSocket;
        this.resumeSocket = callbacks.resumeSocket;
        this.clearAuth = callbacks.clearAuth;
        this.logger = config.logger;
        this.refreshTokenLeewaySeconds = config.refreshTokenLeewaySeconds;
    }
    async setConfig(fetchToken, onChange) {
        this.resetAuthState();
        this._logVerbose("pausing WS for auth token fetch");
        this.pauseSocket();
        const token = await this.fetchTokenAndGuardAgainstRace(fetchToken, {
            forceRefreshToken: false
        });
        if (token.isFromOutdatedConfig) {
            return;
        }
        if (token.value) {
            this.setAuthState({
                state: "waitingForServerConfirmationOfCachedToken",
                config: {
                    fetchToken,
                    onAuthChange: onChange
                },
                hasRetried: false
            });
            this.authenticate(token.value);
        } else {
            this.setAuthState({
                state: "initialRefetch",
                config: {
                    fetchToken,
                    onAuthChange: onChange
                }
            });
            await this.refetchToken();
        }
        this._logVerbose("resuming WS after auth token fetch");
        this.resumeSocket();
    }
    onTransition(serverMessage) {
        if (!this.syncState.isCurrentOrNewerAuthVersion(serverMessage.endVersion.identity)) {
            return;
        }
        if (serverMessage.endVersion.identity <= serverMessage.startVersion.identity) {
            return;
        }
        if (this.authState.state === "waitingForServerConfirmationOfCachedToken") {
            this._logVerbose("server confirmed auth token is valid");
            void this.refetchToken();
            this.authState.config.onAuthChange(true);
            return;
        }
        if (this.authState.state === "waitingForServerConfirmationOfFreshToken") {
            this._logVerbose("server confirmed new auth token is valid");
            this.scheduleTokenRefetch(this.authState.token);
            this.tokenConfirmationAttempts = 0;
            if (!this.authState.hadAuth) {
                this.authState.config.onAuthChange(true);
            }
        }
    }
    onAuthError(serverMessage) {
        if (serverMessage.authUpdateAttempted === false && (this.authState.state === "waitingForServerConfirmationOfFreshToken" || this.authState.state === "waitingForServerConfirmationOfCachedToken")) {
            this._logVerbose("ignoring non-auth token expired error");
            return;
        }
        const { baseVersion } = serverMessage;
        if (!this.syncState.isCurrentOrNewerAuthVersion(baseVersion + 1)) {
            this._logVerbose("ignoring auth error for previous auth attempt");
            return;
        }
        void this.tryToReauthenticate(serverMessage);
        return;
    }
    // This is similar to `refetchToken` defined below, in fact we
    // don't represent them as different states, but it is different
    // in that we pause the WebSocket so that mutations
    // don't retry with bad auth.
    async tryToReauthenticate(serverMessage) {
        this._logVerbose(`attempting to reauthenticate: ${serverMessage.error}`);
        if (// No way to fetch another token, kaboom
        this.authState.state === "noAuth" || // We failed on a fresh token. After a small number of retries, we give up
        // and clear the auth state to avoid infinite retries.
        this.authState.state === "waitingForServerConfirmationOfFreshToken" && this.tokenConfirmationAttempts >= MAX_TOKEN_CONFIRMATION_ATTEMPTS) {
            this.logger.error(`Failed to authenticate: "${serverMessage.error}", check your server auth config`);
            if (this.syncState.hasAuth()) {
                this.syncState.clearAuth();
            }
            if (this.authState.state !== "noAuth") {
                this.setAndReportAuthFailed(this.authState.config.onAuthChange);
            }
            return;
        }
        if (this.authState.state === "waitingForServerConfirmationOfFreshToken") {
            this.tokenConfirmationAttempts++;
            this._logVerbose(`retrying reauthentication, ${MAX_TOKEN_CONFIRMATION_ATTEMPTS - this.tokenConfirmationAttempts} attempts remaining`);
        }
        await this.stopSocket();
        const token = await this.fetchTokenAndGuardAgainstRace(this.authState.config.fetchToken, {
            forceRefreshToken: true
        });
        if (token.isFromOutdatedConfig) {
            return;
        }
        if (token.value && this.syncState.isNewAuth(token.value)) {
            this.authenticate(token.value);
            this.setAuthState({
                state: "waitingForServerConfirmationOfFreshToken",
                config: this.authState.config,
                token: token.value,
                hadAuth: this.authState.state === "notRefetching" || this.authState.state === "waitingForScheduledRefetch"
            });
        } else {
            this._logVerbose("reauthentication failed, could not fetch a new token");
            if (this.syncState.hasAuth()) {
                this.syncState.clearAuth();
            }
            this.setAndReportAuthFailed(this.authState.config.onAuthChange);
        }
        this.tryRestartSocket();
    }
    // Force refetch the token and schedule another refetch
    // before the token expires - an active client should never
    // need to reauthenticate.
    async refetchToken() {
        if (this.authState.state === "noAuth") {
            return;
        }
        this._logVerbose("refetching auth token");
        const token = await this.fetchTokenAndGuardAgainstRace(this.authState.config.fetchToken, {
            forceRefreshToken: true
        });
        if (token.isFromOutdatedConfig) {
            return;
        }
        if (token.value) {
            if (this.syncState.isNewAuth(token.value)) {
                this.setAuthState({
                    state: "waitingForServerConfirmationOfFreshToken",
                    hadAuth: this.syncState.hasAuth(),
                    token: token.value,
                    config: this.authState.config
                });
                this.authenticate(token.value);
            } else {
                this.setAuthState({
                    state: "notRefetching",
                    config: this.authState.config
                });
            }
        } else {
            this._logVerbose("refetching token failed");
            if (this.syncState.hasAuth()) {
                this.clearAuth();
            }
            this.setAndReportAuthFailed(this.authState.config.onAuthChange);
        }
        this._logVerbose("restarting WS after auth token fetch (if currently stopped)");
        this.tryRestartSocket();
    }
    scheduleTokenRefetch(token) {
        if (this.authState.state === "noAuth") {
            return;
        }
        const decodedToken = this.decodeToken(token);
        if (!decodedToken) {
            this.logger.error("Auth token is not a valid JWT, cannot refetch the token");
            return;
        }
        const { iat, exp } = decodedToken;
        if (!iat || !exp) {
            this.logger.error("Auth token does not have required fields, cannot refetch the token");
            return;
        }
        const tokenValiditySeconds = exp - iat;
        if (tokenValiditySeconds <= 2) {
            this.logger.error("Auth token does not live long enough, cannot refetch the token");
            return;
        }
        let delay = Math.min(MAXIMUM_REFRESH_DELAY, (tokenValiditySeconds - this.refreshTokenLeewaySeconds) * 1e3);
        if (delay <= 0) {
            this.logger.warn(`Refetching auth token immediately, configured leeway ${this.refreshTokenLeewaySeconds}s is larger than the token's lifetime ${tokenValiditySeconds}s`);
            delay = 0;
        }
        const refetchTokenTimeoutId = setTimeout(()=>{
            this._logVerbose("running scheduled token refetch");
            void this.refetchToken();
        }, delay);
        this.setAuthState({
            state: "waitingForScheduledRefetch",
            refetchTokenTimeoutId,
            config: this.authState.config
        });
        this._logVerbose(`scheduled preemptive auth token refetching in ${delay}ms`);
    }
    // Protects against simultaneous calls to `setConfig`
    // while we're fetching a token
    async fetchTokenAndGuardAgainstRace(fetchToken, fetchArgs) {
        const originalConfigVersion = ++this.configVersion;
        this._logVerbose(`fetching token with config version ${originalConfigVersion}`);
        const token = await fetchToken(fetchArgs);
        if (this.configVersion !== originalConfigVersion) {
            this._logVerbose(`stale config version, expected ${originalConfigVersion}, got ${this.configVersion}`);
            return {
                isFromOutdatedConfig: true
            };
        }
        return {
            isFromOutdatedConfig: false,
            value: token
        };
    }
    stop() {
        this.resetAuthState();
        this.configVersion++;
        this._logVerbose(`config version bumped to ${this.configVersion}`);
    }
    setAndReportAuthFailed(onAuthChange) {
        onAuthChange(false);
        this.resetAuthState();
    }
    resetAuthState() {
        this.setAuthState({
            state: "noAuth"
        });
    }
    setAuthState(newAuth) {
        const authStateForLog = newAuth.state === "waitingForServerConfirmationOfFreshToken" ? {
            hadAuth: newAuth.hadAuth,
            state: newAuth.state,
            token: `...${newAuth.token.slice(-7)}`
        } : {
            state: newAuth.state
        };
        this._logVerbose(`setting auth state to ${JSON.stringify(authStateForLog)}`);
        switch(newAuth.state){
            case "waitingForScheduledRefetch":
            case "notRefetching":
            case "noAuth":
                this.tokenConfirmationAttempts = 0;
                break;
            case "waitingForServerConfirmationOfFreshToken":
            case "waitingForServerConfirmationOfCachedToken":
            case "initialRefetch":
                break;
            default:
                {
                    newAuth;
                }
        }
        if (this.authState.state === "waitingForScheduledRefetch") {
            clearTimeout(this.authState.refetchTokenTimeoutId);
            this.syncState.markAuthCompletion();
        }
        this.authState = newAuth;
    }
    decodeToken(token) {
        try {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$vendor$2f$jwt$2d$decode$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jwtDecode"])(token);
        } catch (e) {
            this._logVerbose(`Error decoding token: ${e instanceof Error ? e.message : "Unknown error"}`);
            return null;
        }
    }
    _logVerbose(message) {
        this.logger.logVerbose(`${message} [v${this.configVersion}]`);
    }
} //# sourceMappingURL=authentication_manager.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/metrics.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getMarksReport",
    ()=>getMarksReport,
    "mark",
    ()=>mark
]);
"use strict";
const markNames = [
    "convexClientConstructed",
    "convexWebSocketOpen",
    "convexFirstMessageReceived"
];
function mark(name, sessionId) {
    const detail = {
        sessionId
    };
    if (typeof performance === "undefined" || !performance.mark) return;
    performance.mark(name, {
        detail
    });
}
function performanceMarkToJson(mark2) {
    let name = mark2.name.slice("convex".length);
    name = name.charAt(0).toLowerCase() + name.slice(1);
    return {
        name,
        startTime: mark2.startTime
    };
}
function getMarksReport(sessionId) {
    if (typeof performance === "undefined" || !performance.getEntriesByName) {
        return [];
    }
    const allMarks = [];
    for (const name of markNames){
        const marks = performance.getEntriesByName(name).filter((entry)=>entry.entryType === "mark").filter((mark2)=>mark2.detail.sessionId === sessionId);
        allMarks.push(...marks);
    }
    return allMarks.map(performanceMarkToJson);
} //# sourceMappingURL=metrics.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/client.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BaseConvexClient",
    ()=>BaseConvexClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/value.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/logging.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$local_state$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/local_state.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$request_manager$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/request_manager.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$optimistic_updates_impl$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/optimistic_updates_impl.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$remote_query_set$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/remote_query_set.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/udf_path_utils.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$web_socket_manager$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/web_socket_manager.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$session$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/session.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$authentication_manager$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/authentication_manager.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$metrics$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/metrics.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/common/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/errors.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$vendor$2f$jwt$2d$decode$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/vendor/jwt-decode/index.js [app-ssr] (ecmascript)");
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
class BaseConvexClient {
    /**
   * @param address - The url of your Convex deployment, often provided
   * by an environment variable. E.g. `https://small-mouse-123.convex.cloud`.
   * @param onTransition - A callback receiving an array of query tokens
   * corresponding to query results that have changed -- additional handlers
   * can be added via `addOnTransitionHandler`.
   * @param options - See {@link BaseConvexClientOptions} for a full description.
   */ constructor(address, onTransition, options){
        __publicField(this, "address");
        __publicField(this, "state");
        __publicField(this, "requestManager");
        __publicField(this, "webSocketManager");
        __publicField(this, "authenticationManager");
        __publicField(this, "remoteQuerySet");
        __publicField(this, "optimisticQueryResults");
        __publicField(this, "_transitionHandlerCounter", 0);
        __publicField(this, "_nextRequestId");
        __publicField(this, "_onTransitionFns", /* @__PURE__ */ new Map());
        __publicField(this, "_sessionId");
        __publicField(this, "firstMessageReceived", false);
        __publicField(this, "debug");
        __publicField(this, "logger");
        __publicField(this, "maxObservedTimestamp");
        __publicField(this, "connectionStateSubscribers", /* @__PURE__ */ new Map());
        __publicField(this, "nextConnectionStateSubscriberId", 0);
        __publicField(this, "_lastPublishedConnectionState");
        /**
     * Call this whenever the connection state may have changed in a way that could
     * require publishing it. Schedules a possibly update.
     */ __publicField(this, "markConnectionStateDirty", ()=>{
            void Promise.resolve().then(()=>{
                const curConnectionState = this.connectionState();
                if (JSON.stringify(curConnectionState) !== JSON.stringify(this._lastPublishedConnectionState)) {
                    this._lastPublishedConnectionState = curConnectionState;
                    for (const cb of this.connectionStateSubscribers.values()){
                        cb(curConnectionState);
                    }
                }
            });
        });
        // Instance property so that `mark()` doesn't need to be called as a method.
        __publicField(this, "mark", (name)=>{
            if (this.debug) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$metrics$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mark"])(name, this.sessionId);
            }
        });
        if (typeof address === "object") {
            throw new Error("Passing a ClientConfig object is no longer supported. Pass the URL of the Convex deployment as a string directly.");
        }
        if (options?.skipConvexDeploymentUrlCheck !== true) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateDeploymentUrl"])(address);
        }
        options = {
            ...options
        };
        const authRefreshTokenLeewaySeconds = options.authRefreshTokenLeewaySeconds ?? 2;
        let webSocketConstructor = options.webSocketConstructor;
        if (!webSocketConstructor && typeof WebSocket === "undefined") {
            throw new Error("No WebSocket global variable defined! To use Convex in an environment without WebSocket try the HTTP client: https://docs.convex.dev/api/classes/browser.ConvexHttpClient");
        }
        webSocketConstructor = webSocketConstructor || WebSocket;
        this.debug = options.reportDebugInfoToConvex ?? false;
        this.address = address;
        this.logger = options.logger === false ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["instantiateNoopLogger"])({
            verbose: options.verbose ?? false
        }) : options.logger !== true && options.logger ? options.logger : (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["instantiateDefaultLogger"])({
            verbose: options.verbose ?? false
        });
        const i = address.search("://");
        if (i === -1) {
            throw new Error("Provided address was not an absolute URL.");
        }
        const origin = address.substring(i + 3);
        const protocol = address.substring(0, i);
        let wsProtocol;
        if (protocol === "http") {
            wsProtocol = "ws";
        } else if (protocol === "https") {
            wsProtocol = "wss";
        } else {
            throw new Error(`Unknown parent protocol ${protocol}`);
        }
        const wsUri = `${wsProtocol}://${origin}/api/${__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["version"]}/sync`;
        this.state = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$local_state$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LocalSyncState"]();
        this.remoteQuerySet = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$remote_query_set$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RemoteQuerySet"]((queryId)=>this.state.queryPath(queryId), this.logger);
        this.requestManager = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$request_manager$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RequestManager"](this.logger, this.markConnectionStateDirty);
        const pauseSocket = ()=>{
            this.webSocketManager.pause();
            this.state.pause();
        };
        this.authenticationManager = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$authentication_manager$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AuthenticationManager"](this.state, {
            authenticate: (token)=>{
                const message = this.state.setAuth(token);
                this.webSocketManager.sendMessage(message);
                return message.baseVersion;
            },
            stopSocket: ()=>this.webSocketManager.stop(),
            tryRestartSocket: ()=>this.webSocketManager.tryRestart(),
            pauseSocket,
            resumeSocket: ()=>this.webSocketManager.resume(),
            clearAuth: ()=>{
                this.clearAuth();
            }
        }, {
            logger: this.logger,
            refreshTokenLeewaySeconds: authRefreshTokenLeewaySeconds
        });
        this.optimisticQueryResults = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$optimistic_updates_impl$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OptimisticQueryResults"]();
        this.addOnTransitionHandler((transition)=>{
            onTransition(transition.queries.map((q)=>q.token));
        });
        this._nextRequestId = 0;
        this._sessionId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$session$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["newSessionId"])();
        const { unsavedChangesWarning } = options;
        if ("TURBOPACK compile-time truthy", 1) {
            if (unsavedChangesWarning === true) {
                throw new Error("unsavedChangesWarning requested, but window.addEventListener not found! Remove {unsavedChangesWarning: true} from Convex client options.");
            }
        } else //TURBOPACK unreachable
        ;
        this.webSocketManager = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$web_socket_manager$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WebSocketManager"](wsUri, {
            onOpen: (reconnectMetadata)=>{
                this.mark("convexWebSocketOpen");
                this.webSocketManager.sendMessage({
                    ...reconnectMetadata,
                    type: "Connect",
                    sessionId: this._sessionId,
                    maxObservedTimestamp: this.maxObservedTimestamp
                });
                const oldRemoteQueryResults = new Set(this.remoteQuerySet.remoteQueryResults().keys());
                this.remoteQuerySet = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$remote_query_set$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RemoteQuerySet"]((queryId)=>this.state.queryPath(queryId), this.logger);
                const [querySetModification, authModification] = this.state.restart(oldRemoteQueryResults);
                if (authModification) {
                    this.webSocketManager.sendMessage(authModification);
                }
                this.webSocketManager.sendMessage(querySetModification);
                for (const message of this.requestManager.restart()){
                    this.webSocketManager.sendMessage(message);
                }
            },
            onResume: ()=>{
                const [querySetModification, authModification] = this.state.resume();
                if (authModification) {
                    this.webSocketManager.sendMessage(authModification);
                }
                if (querySetModification) {
                    this.webSocketManager.sendMessage(querySetModification);
                }
                for (const message of this.requestManager.resume()){
                    this.webSocketManager.sendMessage(message);
                }
            },
            onMessage: (serverMessage)=>{
                if (!this.firstMessageReceived) {
                    this.firstMessageReceived = true;
                    this.mark("convexFirstMessageReceived");
                    this.reportMarks();
                }
                switch(serverMessage.type){
                    case "Transition":
                        {
                            this.observedTimestamp(serverMessage.endVersion.ts);
                            this.authenticationManager.onTransition(serverMessage);
                            this.remoteQuerySet.transition(serverMessage);
                            this.state.transition(serverMessage);
                            const completedRequests = this.requestManager.removeCompleted(this.remoteQuerySet.timestamp());
                            this.notifyOnQueryResultChanges(completedRequests);
                            break;
                        }
                    case "MutationResponse":
                        {
                            if (serverMessage.success) {
                                this.observedTimestamp(serverMessage.ts);
                            }
                            const completedMutationInfo = this.requestManager.onResponse(serverMessage);
                            if (completedMutationInfo !== null) {
                                this.notifyOnQueryResultChanges(/* @__PURE__ */ new Map([
                                    [
                                        completedMutationInfo.requestId,
                                        completedMutationInfo.result
                                    ]
                                ]));
                            }
                            break;
                        }
                    case "ActionResponse":
                        {
                            this.requestManager.onResponse(serverMessage);
                            break;
                        }
                    case "AuthError":
                        {
                            this.authenticationManager.onAuthError(serverMessage);
                            break;
                        }
                    case "FatalError":
                        {
                            const error = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["logFatalError"])(this.logger, serverMessage.error);
                            void this.webSocketManager.terminate();
                            throw error;
                        }
                    default:
                        {
                            serverMessage;
                        }
                }
                return {
                    hasSyncedPastLastReconnect: this.hasSyncedPastLastReconnect()
                };
            },
            onServerDisconnectError: options.onServerDisconnectError
        }, webSocketConstructor, this.logger, this.markConnectionStateDirty, this.debug);
        this.mark("convexClientConstructed");
        if (options.expectAuth) {
            pauseSocket();
        }
    }
    /**
   * Return true if there is outstanding work from prior to the time of the most recent restart.
   * This indicates that the client has not proven itself to have gotten past the issue that
   * potentially led to the restart. Use this to influence when to reset backoff after a failure.
   */ hasSyncedPastLastReconnect() {
        const hasSyncedPastLastReconnect = this.requestManager.hasSyncedPastLastReconnect() || this.state.hasSyncedPastLastReconnect();
        return hasSyncedPastLastReconnect;
    }
    observedTimestamp(observedTs) {
        if (this.maxObservedTimestamp === void 0 || this.maxObservedTimestamp.lessThanOrEqual(observedTs)) {
            this.maxObservedTimestamp = observedTs;
        }
    }
    getMaxObservedTimestamp() {
        return this.maxObservedTimestamp;
    }
    /**
   * Compute the current query results based on the remoteQuerySet and the
   * current optimistic updates and call `onTransition` for all the changed
   * queries.
   *
   * @param completedMutations - A set of mutation IDs whose optimistic updates
   * are no longer needed.
   */ notifyOnQueryResultChanges(completedRequests) {
        const remoteQueryResults = this.remoteQuerySet.remoteQueryResults();
        const queryTokenToValue = /* @__PURE__ */ new Map();
        for (const [queryId, result] of remoteQueryResults){
            const queryToken = this.state.queryToken(queryId);
            if (queryToken !== null) {
                const query = {
                    result,
                    udfPath: this.state.queryPath(queryId),
                    args: this.state.queryArgs(queryId)
                };
                queryTokenToValue.set(queryToken, query);
            }
        }
        const changedQueryTokens = this.optimisticQueryResults.ingestQueryResultsFromServer(queryTokenToValue, new Set(completedRequests.keys()));
        this.handleTransition({
            queries: changedQueryTokens.map((token)=>{
                const optimisticResult = this.optimisticQueryResults.rawQueryResult(token);
                return {
                    token,
                    modification: {
                        kind: "Updated",
                        result: optimisticResult
                    }
                };
            }),
            reflectedMutations: Array.from(completedRequests).map(([requestId, result])=>({
                    requestId,
                    result
                })),
            timestamp: this.remoteQuerySet.timestamp()
        });
    }
    handleTransition(transition) {
        for (const fn of this._onTransitionFns.values()){
            fn(transition);
        }
    }
    /**
   * Add a handler that will be called on a transition.
   *
   * Any external side effects (e.g. setting React state) should be handled here.
   *
   * @param fn
   *
   * @returns
   */ addOnTransitionHandler(fn) {
        const id = this._transitionHandlerCounter++;
        this._onTransitionFns.set(id, fn);
        return ()=>this._onTransitionFns.delete(id);
    }
    /**
   * Get the current JWT auth token and decoded claims.
   */ getCurrentAuthClaims() {
        const authToken = this.state.getAuth();
        let decoded = {};
        if (authToken && authToken.tokenType === "User") {
            try {
                decoded = authToken ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$vendor$2f$jwt$2d$decode$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jwtDecode"])(authToken.value) : {};
            } catch  {
                decoded = {};
            }
        } else {
            return void 0;
        }
        return {
            token: authToken.value,
            decoded
        };
    }
    /**
   * Set the authentication token to be used for subsequent queries and mutations.
   * `fetchToken` will be called automatically again if a token expires.
   * `fetchToken` should return `null` if the token cannot be retrieved, for example
   * when the user's rights were permanently revoked.
   * @param fetchToken - an async function returning the JWT-encoded OpenID Connect Identity Token
   * @param onChange - a callback that will be called when the authentication status changes
   */ setAuth(fetchToken, onChange) {
        void this.authenticationManager.setConfig(fetchToken, onChange);
    }
    hasAuth() {
        return this.state.hasAuth();
    }
    /** @internal */ setAdminAuth(value, fakeUserIdentity) {
        const message = this.state.setAdminAuth(value, fakeUserIdentity);
        this.webSocketManager.sendMessage(message);
    }
    clearAuth() {
        const message = this.state.clearAuth();
        this.webSocketManager.sendMessage(message);
    }
    /**
     * Subscribe to a query function.
     *
     * Whenever this query's result changes, the `onTransition` callback
     * passed into the constructor will be called.
     *
     * @param name - The name of the query.
     * @param args - An arguments object for the query. If this is omitted, the
     * arguments will be `{}`.
     * @param options - A {@link SubscribeOptions} options object for this query.
  
     * @returns An object containing a {@link QueryToken} corresponding to this
     * query and an `unsubscribe` callback.
     */ subscribe(name, args, options) {
        const argsObject = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseArgs"])(args);
        const { modification, queryToken, unsubscribe } = this.state.subscribe(name, argsObject, options?.journal, options?.componentPath);
        if (modification !== null) {
            this.webSocketManager.sendMessage(modification);
        }
        return {
            queryToken,
            unsubscribe: ()=>{
                const modification2 = unsubscribe();
                if (modification2) {
                    this.webSocketManager.sendMessage(modification2);
                }
            }
        };
    }
    /**
   * A query result based only on the current, local state.
   *
   * The only way this will return a value is if we're already subscribed to the
   * query or its value has been set optimistically.
   */ localQueryResult(udfPath, args) {
        const argsObject = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseArgs"])(args);
        const queryToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["serializePathAndArgs"])(udfPath, argsObject);
        return this.optimisticQueryResults.queryResult(queryToken);
    }
    /**
   * Get query result by query token based on current, local state
   *
   * The only way this will return a value is if we're already subscribed to the
   * query or its value has been set optimistically.
   *
   * @internal
   */ localQueryResultByToken(queryToken) {
        return this.optimisticQueryResults.queryResult(queryToken);
    }
    /**
   * Whether local query result is available for a token.
   *
   * This method does not throw if the result is an error.
   *
   * @internal
   */ hasLocalQueryResultByToken(queryToken) {
        return this.optimisticQueryResults.hasQueryResult(queryToken);
    }
    /**
   * @internal
   */ localQueryLogs(udfPath, args) {
        const argsObject = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseArgs"])(args);
        const queryToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["serializePathAndArgs"])(udfPath, argsObject);
        return this.optimisticQueryResults.queryLogs(queryToken);
    }
    /**
   * Retrieve the current {@link QueryJournal} for this query function.
   *
   * If we have not yet received a result for this query, this will be `undefined`.
   *
   * @param name - The name of the query.
   * @param args - The arguments object for this query.
   * @returns The query's {@link QueryJournal} or `undefined`.
   */ queryJournal(name, args) {
        const argsObject = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseArgs"])(args);
        const queryToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["serializePathAndArgs"])(name, argsObject);
        return this.state.queryJournal(queryToken);
    }
    /**
   * Get the current {@link ConnectionState} between the client and the Convex
   * backend.
   *
   * @returns The {@link ConnectionState} with the Convex backend.
   */ connectionState() {
        const wsConnectionState = this.webSocketManager.connectionState();
        return {
            hasInflightRequests: this.requestManager.hasInflightRequests(),
            isWebSocketConnected: wsConnectionState.isConnected,
            hasEverConnected: wsConnectionState.hasEverConnected,
            connectionCount: wsConnectionState.connectionCount,
            connectionRetries: wsConnectionState.connectionRetries,
            timeOfOldestInflightRequest: this.requestManager.timeOfOldestInflightRequest(),
            inflightMutations: this.requestManager.inflightMutations(),
            inflightActions: this.requestManager.inflightActions()
        };
    }
    /**
   * Subscribe to the {@link ConnectionState} between the client and the Convex
   * backend, calling a callback each time it changes.
   *
   * Subscribed callbacks will be called when any part of ConnectionState changes.
   * ConnectionState may grow in future versions (e.g. to provide a array of
   * inflight requests) in which case callbacks would be called more frequently.
   *
   * @returns An unsubscribe function to stop listening.
   */ subscribeToConnectionState(cb) {
        const id = this.nextConnectionStateSubscriberId++;
        this.connectionStateSubscribers.set(id, cb);
        return ()=>{
            this.connectionStateSubscribers.delete(id);
        };
    }
    /**
     * Execute a mutation function.
     *
     * @param name - The name of the mutation.
     * @param args - An arguments object for the mutation. If this is omitted,
     * the arguments will be `{}`.
     * @param options - A {@link MutationOptions} options object for this mutation.
  
     * @returns - A promise of the mutation's result.
     */ async mutation(name, args, options) {
        const result = await this.mutationInternal(name, args, options);
        if (!result.success) {
            if (result.errorData !== void 0) {
                throw (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardData"])(result, new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConvexError"]((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHybridErrorStacktrace"])("mutation", name, result)));
            }
            throw new Error((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHybridErrorStacktrace"])("mutation", name, result));
        }
        return result.value;
    }
    /**
   * @internal
   */ async mutationInternal(udfPath, args, options, componentPath) {
        const { mutationPromise } = this.enqueueMutation(udfPath, args, options, componentPath);
        return mutationPromise;
    }
    /**
   * @internal
   */ enqueueMutation(udfPath, args, options, componentPath) {
        const mutationArgs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseArgs"])(args);
        this.tryReportLongDisconnect();
        const requestId = this.nextRequestId;
        this._nextRequestId++;
        if (options !== void 0) {
            const optimisticUpdate = options.optimisticUpdate;
            if (optimisticUpdate !== void 0) {
                const wrappedUpdate = (localQueryStore)=>{
                    const result = optimisticUpdate(localQueryStore, mutationArgs);
                    if (result instanceof Promise) {
                        this.logger.warn("Optimistic update handler returned a Promise. Optimistic updates should be synchronous.");
                    }
                };
                const changedQueryTokens = this.optimisticQueryResults.applyOptimisticUpdate(wrappedUpdate, requestId);
                const changedQueries = changedQueryTokens.map((token)=>{
                    const localResult = this.localQueryResultByToken(token);
                    return {
                        token,
                        modification: {
                            kind: "Updated",
                            result: localResult === void 0 ? void 0 : {
                                success: true,
                                value: localResult,
                                logLines: []
                            }
                        }
                    };
                });
                this.handleTransition({
                    queries: changedQueries,
                    reflectedMutations: [],
                    timestamp: this.remoteQuerySet.timestamp()
                });
            }
        }
        const message = {
            type: "Mutation",
            requestId,
            udfPath,
            componentPath,
            args: [
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(mutationArgs)
            ]
        };
        const mightBeSent = this.webSocketManager.sendMessage(message);
        const mutationPromise = this.requestManager.request(message, mightBeSent);
        return {
            requestId,
            mutationPromise
        };
    }
    /**
   * Execute an action function.
   *
   * @param name - The name of the action.
   * @param args - An arguments object for the action. If this is omitted,
   * the arguments will be `{}`.
   * @returns A promise of the action's result.
   */ async action(name, args) {
        const result = await this.actionInternal(name, args);
        if (!result.success) {
            if (result.errorData !== void 0) {
                throw (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["forwardData"])(result, new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConvexError"]((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHybridErrorStacktrace"])("action", name, result)));
            }
            throw new Error((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHybridErrorStacktrace"])("action", name, result));
        }
        return result.value;
    }
    /**
   * @internal
   */ async actionInternal(udfPath, args, componentPath) {
        const actionArgs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseArgs"])(args);
        const requestId = this.nextRequestId;
        this._nextRequestId++;
        this.tryReportLongDisconnect();
        const message = {
            type: "Action",
            requestId,
            udfPath,
            componentPath,
            args: [
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(actionArgs)
            ]
        };
        const mightBeSent = this.webSocketManager.sendMessage(message);
        return this.requestManager.request(message, mightBeSent);
    }
    /**
   * Close any network handles associated with this client and stop all subscriptions.
   *
   * Call this method when you're done with an {@link BaseConvexClient} to
   * dispose of its sockets and resources.
   *
   * @returns A `Promise` fulfilled when the connection has been completely closed.
   */ async close() {
        this.authenticationManager.stop();
        return this.webSocketManager.terminate();
    }
    /**
   * Return the address for this client, useful for creating a new client.
   *
   * Not guaranteed to match the address with which this client was constructed:
   * it may be canonicalized.
   */ get url() {
        return this.address;
    }
    /**
   * @internal
   */ get nextRequestId() {
        return this._nextRequestId;
    }
    /**
   * @internal
   */ get sessionId() {
        return this._sessionId;
    }
    /**
   * Reports performance marks to the server. This should only be called when
   * we have a functional websocket.
   */ reportMarks() {
        if (this.debug) {
            const report = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$metrics$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getMarksReport"])(this.sessionId);
            this.webSocketManager.sendMessage({
                type: "Event",
                eventType: "ClientConnect",
                event: report
            });
        }
    }
    tryReportLongDisconnect() {
        if (!this.debug) {
            return;
        }
        const timeOfOldestRequest = this.connectionState().timeOfOldestInflightRequest;
        if (timeOfOldestRequest === null || Date.now() - timeOfOldestRequest.getTime() <= 60 * 1e3) {
            return;
        }
        const endpoint = `${this.address}/api/debug_event`;
        fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Convex-Client": `npm-${__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["version"]}`
            },
            body: JSON.stringify({
                event: "LongWebsocketDisconnect"
            })
        }).then((response)=>{
            if (!response.ok) {
                this.logger.warn("Analytics request failed with response:", response.body);
            }
        }).catch((error)=>{
            this.logger.warn("Analytics response failed with error:", error);
        });
    }
} //# sourceMappingURL=client.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/pagination.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "asPaginationArgs",
    ()=>asPaginationArgs,
    "asPaginationResult",
    ()=>asPaginationResult
]);
"use strict";
function asPaginationArgs(value) {
    if (typeof value.paginationOpts.numItems !== "number") {
        throw new Error(`Not valid paginated query args: ${JSON.stringify(value)}`);
    }
    return value;
}
function asPaginationResult(value) {
    if (typeof value !== "object" || value === null || !Array.isArray(value.page) || typeof value.isDone !== "boolean" || typeof value.continueCursor !== "string") {
        throw new Error(`Not a valid paginated query result: ${value?.toString()}`);
    }
    return value;
} //# sourceMappingURL=pagination.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/paginated_query_client.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PaginatedQueryClient",
    ()=>PaginatedQueryClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/udf_path_utils.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$pagination$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/pagination.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$vendor$2f$long$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/vendor/long.js [app-ssr] (ecmascript)");
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
;
;
;
class PaginatedQueryClient {
    constructor(client, onTransition){
        this.client = client;
        this.onTransition = onTransition;
        __publicField(this, "paginatedQuerySet", /* @__PURE__ */ new Map());
        // hold onto a real Transition so we can construct synthetic ones with that timestamp
        __publicField(this, "lastTransitionTs");
        this.lastTransitionTs = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$vendor$2f$long$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Long"].fromNumber(0);
        this.client.addOnTransitionHandler((transition)=>this.onBaseTransition(transition));
    }
    /**
   * Subscribe to a paginated query.
   *
   * @param name - The name of the paginated query function
   * @param args - Arguments for the query (excluding paginationOpts)
   * @param options - Pagination options including initialNumItems
   * @returns Object with paginatedQueryToken and unsubscribe function
   */ subscribe(name, args, options) {
        const canonicalizedUdfPath = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canonicalizeUdfPath"])(name);
        const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["serializePaginatedPathAndArgs"])(canonicalizedUdfPath, args, options);
        const unsubscribe = ()=>this.removePaginatedQuerySubscriber(token);
        const existingEntry = this.paginatedQuerySet.get(token);
        if (existingEntry) {
            existingEntry.numSubscribers += 1;
            return {
                paginatedQueryToken: token,
                unsubscribe
            };
        }
        this.paginatedQuerySet.set(token, {
            token,
            canonicalizedUdfPath,
            args,
            numSubscribers: 1,
            options: {
                initialNumItems: options.initialNumItems
            },
            nextPageKey: 0,
            pageKeys: [],
            pageKeyToQuery: /* @__PURE__ */ new Map(),
            ongoingSplits: /* @__PURE__ */ new Map(),
            skip: false,
            id: options.id
        });
        this.addPageToPaginatedQuery(token, null, options.initialNumItems);
        return {
            paginatedQueryToken: token,
            unsubscribe
        };
    }
    /**
   * Get current results for a paginated query based on local state.
   *
   * Throws an error when one of the pages has errored.
   */ localQueryResult(name, args, options) {
        const canonicalizedUdfPath = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canonicalizeUdfPath"])(name);
        const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["serializePaginatedPathAndArgs"])(canonicalizedUdfPath, args, options);
        return this.localQueryResultByToken(token);
    }
    /**
   * @internal
   */ localQueryResultByToken(token) {
        const paginatedQuery = this.paginatedQuerySet.get(token);
        if (!paginatedQuery) {
            return void 0;
        }
        const activePages = this.activePageQueryTokens(paginatedQuery);
        if (activePages.length === 0) {
            return {
                results: [],
                status: "LoadingFirstPage",
                loadMore: (numItems)=>{
                    return this.loadMoreOfPaginatedQuery(token, numItems);
                }
            };
        }
        let allResults = [];
        let hasUndefined = false;
        let isDone = false;
        for (const pageToken of activePages){
            const result = this.client.localQueryResultByToken(pageToken);
            if (result === void 0) {
                hasUndefined = true;
                isDone = false;
                continue;
            }
            const paginationResult = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$pagination$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asPaginationResult"])(result);
            allResults = allResults.concat(paginationResult.page);
            isDone = !!paginationResult.isDone;
        }
        let status;
        if (hasUndefined) {
            status = allResults.length === 0 ? "LoadingFirstPage" : "LoadingMore";
        } else if (isDone) {
            status = "Exhausted";
        } else {
            status = "CanLoadMore";
        }
        return {
            results: allResults,
            status,
            loadMore: (numItems)=>{
                return this.loadMoreOfPaginatedQuery(token, numItems);
            }
        };
    }
    onBaseTransition(transition) {
        const changedBaseTokens = transition.queries.map((q)=>q.token);
        const changed = this.queriesContainingTokens(changedBaseTokens);
        let paginatedQueries = [];
        if (changed.length > 0) {
            this.processPaginatedQuerySplits(changed, (token)=>this.client.localQueryResultByToken(token));
            paginatedQueries = changed.map((token)=>({
                    token,
                    modification: {
                        kind: "Updated",
                        result: this.localQueryResultByToken(token)
                    }
                }));
        }
        const extendedTransition = {
            ...transition,
            paginatedQueries
        };
        this.onTransition(extendedTransition);
    }
    /**
   * Load more items for a paginated query.
   *
   * This *always* causes a transition, the status of the query
   * has probably changed from "CanLoadMore" to "LoadingMore".
   * Data might have changed too: maybe a subscription to this page
   * query already exists (unlikely but possible) or this page query
   * has an optimistic update providing some initial data.
   *
   * @internal
   */ loadMoreOfPaginatedQuery(token, numItems) {
        this.mustGetPaginatedQuery(token);
        const lastPageToken = this.queryTokenForLastPageOfPaginatedQuery(token);
        const lastPageResult = this.client.localQueryResultByToken(lastPageToken);
        if (!lastPageResult) {
            return false;
        }
        const paginationResult = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$pagination$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asPaginationResult"])(lastPageResult);
        if (paginationResult.isDone) {
            return false;
        }
        this.addPageToPaginatedQuery(token, paginationResult.continueCursor, numItems);
        const loadMoreTransition = {
            timestamp: this.lastTransitionTs,
            reflectedMutations: [],
            queries: [],
            paginatedQueries: [
                {
                    token,
                    modification: {
                        kind: "Updated",
                        result: this.localQueryResultByToken(token)
                    }
                }
            ]
        };
        this.onTransition(loadMoreTransition);
        return true;
    }
    /**
   * @internal
   */ queriesContainingTokens(queryTokens) {
        if (queryTokens.length === 0) {
            return [];
        }
        const changed = [];
        const queryTokenSet = new Set(queryTokens);
        for (const [paginatedToken, paginatedQuery] of this.paginatedQuerySet){
            for (const pageToken of this.allQueryTokens(paginatedQuery)){
                if (queryTokenSet.has(pageToken)) {
                    changed.push(paginatedToken);
                    break;
                }
            }
        }
        return changed;
    }
    /**
   * @internal
   */ processPaginatedQuerySplits(changed, getResult) {
        for (const paginatedQueryToken of changed){
            const paginatedQuery = this.mustGetPaginatedQuery(paginatedQueryToken);
            const { ongoingSplits, pageKeyToQuery, pageKeys } = paginatedQuery;
            for (const [pageKey, [splitKey1, splitKey2]] of ongoingSplits){
                const bothNewPagesLoaded = getResult(pageKeyToQuery.get(splitKey1).queryToken) !== void 0 && getResult(pageKeyToQuery.get(splitKey2).queryToken) !== void 0;
                if (bothNewPagesLoaded) {
                    this.completePaginatedQuerySplit(paginatedQuery, pageKey, splitKey1, splitKey2);
                }
            }
            for (const pageKey of pageKeys){
                if (ongoingSplits.has(pageKey)) {
                    continue;
                }
                const pageToken = pageKeyToQuery.get(pageKey).queryToken;
                const pageResult = getResult(pageToken);
                if (!pageResult) {
                    continue;
                }
                const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$pagination$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asPaginationResult"])(pageResult);
                const shouldSplit = result.splitCursor && (result.pageStatus === "SplitRecommended" || result.pageStatus === "SplitRequired" || // This client-driven page splitting condition will change in the future.
                result.page.length > paginatedQuery.options.initialNumItems * 2);
                if (shouldSplit) {
                    this.splitPaginatedQueryPage(paginatedQuery, pageKey, result.splitCursor, // we just checked
                    result.continueCursor);
                }
            }
        }
    }
    splitPaginatedQueryPage(paginatedQuery, pageKey, splitCursor, continueCursor) {
        const splitKey1 = paginatedQuery.nextPageKey++;
        const splitKey2 = paginatedQuery.nextPageKey++;
        const paginationOpts = {
            cursor: continueCursor,
            numItems: paginatedQuery.options.initialNumItems,
            id: paginatedQuery.id
        };
        const firstSubscription = this.client.subscribe(paginatedQuery.canonicalizedUdfPath, {
            ...paginatedQuery.args,
            paginationOpts: {
                ...paginationOpts,
                cursor: null,
                // Start from beginning for first split
                endCursor: splitCursor
            }
        });
        paginatedQuery.pageKeyToQuery.set(splitKey1, firstSubscription);
        const secondSubscription = this.client.subscribe(paginatedQuery.canonicalizedUdfPath, {
            ...paginatedQuery.args,
            paginationOpts: {
                ...paginationOpts,
                cursor: splitCursor,
                endCursor: continueCursor
            }
        });
        paginatedQuery.pageKeyToQuery.set(splitKey2, secondSubscription);
        paginatedQuery.ongoingSplits.set(pageKey, [
            splitKey1,
            splitKey2
        ]);
    }
    /**
   * @internal
   */ addPageToPaginatedQuery(token, continueCursor, numItems) {
        const paginatedQuery = this.mustGetPaginatedQuery(token);
        const pageKey = paginatedQuery.nextPageKey++;
        const paginationOpts = {
            cursor: continueCursor,
            numItems,
            id: paginatedQuery.id
        };
        const pageArgs = {
            ...paginatedQuery.args,
            paginationOpts
        };
        const subscription = this.client.subscribe(paginatedQuery.canonicalizedUdfPath, pageArgs);
        paginatedQuery.pageKeys.push(pageKey);
        paginatedQuery.pageKeyToQuery.set(pageKey, subscription);
        return subscription;
    }
    removePaginatedQuerySubscriber(token) {
        const paginatedQuery = this.paginatedQuerySet.get(token);
        if (!paginatedQuery) {
            return;
        }
        paginatedQuery.numSubscribers -= 1;
        if (paginatedQuery.numSubscribers > 0) {
            return;
        }
        for (const subscription of paginatedQuery.pageKeyToQuery.values()){
            subscription.unsubscribe();
        }
        this.paginatedQuerySet.delete(token);
    }
    completePaginatedQuerySplit(paginatedQuery, pageKey, splitKey1, splitKey2) {
        const originalQuery = paginatedQuery.pageKeyToQuery.get(pageKey);
        paginatedQuery.pageKeyToQuery.delete(pageKey);
        const pageIndex = paginatedQuery.pageKeys.indexOf(pageKey);
        paginatedQuery.pageKeys.splice(pageIndex, 1, splitKey1, splitKey2);
        paginatedQuery.ongoingSplits.delete(pageKey);
        originalQuery.unsubscribe();
    }
    /** The query tokens for all active pages, in result order */ activePageQueryTokens(paginatedQuery) {
        return paginatedQuery.pageKeys.map((pageKey)=>paginatedQuery.pageKeyToQuery.get(pageKey).queryToken);
    }
    allQueryTokens(paginatedQuery) {
        return Array.from(paginatedQuery.pageKeyToQuery.values()).map((sub)=>sub.queryToken);
    }
    queryTokenForLastPageOfPaginatedQuery(token) {
        const paginatedQuery = this.mustGetPaginatedQuery(token);
        const lastPageKey = paginatedQuery.pageKeys[paginatedQuery.pageKeys.length - 1];
        if (lastPageKey === void 0) {
            throw new Error(`No pages for paginated query ${token}`);
        }
        return paginatedQuery.pageKeyToQuery.get(lastPageKey).queryToken;
    }
    mustGetPaginatedQuery(token) {
        const paginatedQuery = this.paginatedQuerySet.get(token);
        if (!paginatedQuery) {
            throw new Error("paginated query no longer exists for token " + token);
        }
        return paginatedQuery;
    }
} //# sourceMappingURL=paginated_query_client.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/simple_client.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConvexClient",
    ()=>ConvexClient,
    "setDefaultWebSocketConstructor",
    ()=>setDefaultWebSocketConstructor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/common/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/client.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/server/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$paginated_query_client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/paginated_query_client.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/udf_path_utils.js [app-ssr] (ecmascript)");
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
;
;
;
;
;
let defaultWebSocketConstructor;
function setDefaultWebSocketConstructor(ws) {
    defaultWebSocketConstructor = ws;
}
class ConvexClient {
    /**
   * Construct a client and immediately initiate a WebSocket connection to the passed address.
   *
   * @public
   */ constructor(address, options = {}){
        __publicField(this, "listeners");
        __publicField(this, "_client");
        __publicField(this, "_paginatedClient");
        // A synthetic server event to run callbacks the first time
        __publicField(this, "callNewListenersWithCurrentValuesTimer");
        __publicField(this, "_closed");
        __publicField(this, "_disabled");
        if (options.skipConvexDeploymentUrlCheck !== true) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateDeploymentUrl"])(address);
        }
        const { disabled, ...baseOptions } = options;
        this._closed = false;
        this._disabled = !!disabled;
        if (defaultWebSocketConstructor && !("webSocketConstructor" in baseOptions) && typeof WebSocket === "undefined") {
            baseOptions.webSocketConstructor = defaultWebSocketConstructor;
        }
        if (("TURBOPACK compile-time value", "undefined") === "undefined" && !("unsavedChangesWarning" in baseOptions)) {
            baseOptions.unsavedChangesWarning = false;
        }
        if (!this.disabled) {
            this._client = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BaseConvexClient"](address, ()=>{}, // NOP, let the paginated query client do it all
            baseOptions);
            this._paginatedClient = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$paginated_query_client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PaginatedQueryClient"](this._client, (transition)=>this._transition(transition));
        }
        this.listeners = /* @__PURE__ */ new Set();
    }
    /**
   * Once closed no registered callbacks will fire again.
   */ get closed() {
        return this._closed;
    }
    get client() {
        if (this._client) return this._client;
        throw new Error("ConvexClient is disabled");
    }
    /**
   * @internal
   */ get paginatedClient() {
        if (this._paginatedClient) return this._paginatedClient;
        throw new Error("ConvexClient is disabled");
    }
    get disabled() {
        return this._disabled;
    }
    /**
   * Call a callback whenever a new result for a query is received. The callback
   * will run soon after being registered if a result for the query is already
   * in memory.
   *
   * The return value is an {@link Unsubscribe} object which is both a function
   * an an object with properties. Both of the patterns below work with this object:
   *
   *```ts
   * // call the return value as a function
   * const unsubscribe = client.onUpdate(api.messages.list, {}, (messages) => {
   *   console.log(messages);
   * });
   * unsubscribe();
   *
   * // unpack the return value into its properties
   * const {
   *   getCurrentValue,
   *   unsubscribe,
   * } = client.onUpdate(api.messages.list, {}, (messages) => {
   *   console.log(messages);
   * });
   *```
   *
   * @param query - A {@link server.FunctionReference} for the public query to run.
   * @param args - The arguments to run the query with.
   * @param callback - Function to call when the query result updates.
   * @param onError - Function to call when the query result updates with an error.
   * If not provided, errors will be thrown instead of calling the callback.
   *
   * @return an {@link Unsubscribe} function to stop calling the onUpdate function.
   */ onUpdate(query, args, callback, onError) {
        if (this.disabled) {
            return this.createDisabledUnsubscribe();
        }
        const { queryToken, unsubscribe } = this.client.subscribe((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(query), args);
        const queryInfo = {
            queryToken,
            callback,
            onError,
            unsubscribe,
            hasEverRun: false,
            query,
            args,
            paginationOptions: void 0
        };
        this.listeners.add(queryInfo);
        if (this.queryResultReady(queryToken) && this.callNewListenersWithCurrentValuesTimer === void 0) {
            this.callNewListenersWithCurrentValuesTimer = setTimeout(()=>this.callNewListenersWithCurrentValues(), 0);
        }
        const unsubscribeProps = {
            unsubscribe: ()=>{
                if (this.closed) {
                    return;
                }
                this.listeners.delete(queryInfo);
                unsubscribe();
            },
            getCurrentValue: ()=>this.client.localQueryResultByToken(queryToken),
            getQueryLogs: ()=>this.client.localQueryLogs(queryToken)
        };
        const ret = unsubscribeProps.unsubscribe;
        Object.assign(ret, unsubscribeProps);
        return ret;
    }
    /**
   * Call a callback whenever a new result for a paginated query is received.
   *
   * This is an experimental preview: the final API may change.
   * In particular, caching behavior, page splitting, and required paginated query options
   * may change.
   *
   * @param query - A {@link server.FunctionReference} for the public query to run.
   * @param args - The arguments to run the query with.
   * @param options - Options for the paginated query including initialNumItems and id.
   * @param callback - Function to call when the query result updates.
   * @param onError - Function to call when the query result updates with an error.
   *
   * @return an {@link Unsubscribe} function to stop calling the callback.
   */ onPaginatedUpdate_experimental(query, args, options, callback, onError) {
        if (this.disabled) {
            return this.createDisabledUnsubscribe();
        }
        const paginationOptions = {
            initialNumItems: options.initialNumItems,
            id: -1
        };
        const { paginatedQueryToken, unsubscribe } = this.paginatedClient.subscribe((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(query), args, // Simple client doesn't use IDs, there's no expectation that these queries remain separate.
        paginationOptions);
        const queryInfo = {
            queryToken: paginatedQueryToken,
            callback,
            onError,
            unsubscribe,
            hasEverRun: false,
            query,
            args,
            paginationOptions
        };
        this.listeners.add(queryInfo);
        if (!!this.paginatedClient.localQueryResultByToken(paginatedQueryToken) && this.callNewListenersWithCurrentValuesTimer === void 0) {
            this.callNewListenersWithCurrentValuesTimer = setTimeout(()=>this.callNewListenersWithCurrentValues(), 0);
        }
        const unsubscribeProps = {
            unsubscribe: ()=>{
                if (this.closed) {
                    return;
                }
                this.listeners.delete(queryInfo);
                unsubscribe();
            },
            getCurrentValue: ()=>{
                const result = this.paginatedClient.localQueryResult((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(query), args, paginationOptions);
                return result;
            },
            getQueryLogs: ()=>[]
        };
        const ret = unsubscribeProps.unsubscribe;
        Object.assign(ret, unsubscribeProps);
        return ret;
    }
    // Run all callbacks that have never been run before if they have a query
    // result available now.
    callNewListenersWithCurrentValues() {
        this.callNewListenersWithCurrentValuesTimer = void 0;
        this._transition({
            queries: [],
            paginatedQueries: []
        }, true);
    }
    queryResultReady(queryToken) {
        return this.client.hasLocalQueryResultByToken(queryToken);
    }
    createDisabledUnsubscribe() {
        const disabledUnsubscribe = ()=>{};
        const unsubscribeProps = {
            unsubscribe: disabledUnsubscribe,
            getCurrentValue: ()=>void 0,
            getQueryLogs: ()=>void 0
        };
        Object.assign(disabledUnsubscribe, unsubscribeProps);
        return disabledUnsubscribe;
    }
    async close() {
        if (this.disabled) return;
        this.listeners.clear();
        this._closed = true;
        if (this._paginatedClient) {
            this._paginatedClient = void 0;
        }
        return this.client.close();
    }
    /**
   * Get the current JWT auth token and decoded claims.
   */ getAuth() {
        if (this.disabled) return;
        return this.client.getCurrentAuthClaims();
    }
    /**
   * Set the authentication token to be used for subsequent queries and mutations.
   * `fetchToken` will be called automatically again if a token expires.
   * `fetchToken` should return `null` if the token cannot be retrieved, for example
   * when the user's rights were permanently revoked.
   * @param fetchToken - an async function returning the JWT (typically an OpenID Connect Identity Token)
   * @param onChange - a callback that will be called when the authentication status changes
   */ setAuth(fetchToken, onChange) {
        if (this.disabled) return;
        this.client.setAuth(fetchToken, onChange ?? (()=>{}));
    }
    /**
   * @internal
   */ setAdminAuth(token, identity) {
        if (this.closed) {
            throw new Error("ConvexClient has already been closed.");
        }
        if (this.disabled) return;
        this.client.setAdminAuth(token, identity);
    }
    /**
   * @internal
   */ _transition({ queries, paginatedQueries }, callNewListeners = false) {
        const updatedQueries = [
            ...queries.map((q)=>q.token),
            ...paginatedQueries.map((q)=>q.token)
        ];
        for (const queryInfo of this.listeners){
            const { callback, queryToken, onError, hasEverRun } = queryInfo;
            const isPaginatedQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$udf_path_utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["serializedQueryTokenIsPaginated"])(queryToken);
            const hasResultReady = isPaginatedQuery ? !!this.paginatedClient.localQueryResultByToken(queryToken) : this.client.hasLocalQueryResultByToken(queryToken);
            if (updatedQueries.includes(queryToken) || callNewListeners && !hasEverRun && hasResultReady) {
                queryInfo.hasEverRun = true;
                let newValue;
                try {
                    if (isPaginatedQuery) {
                        newValue = this.paginatedClient.localQueryResultByToken(queryToken);
                    } else {
                        newValue = this.client.localQueryResultByToken(queryToken);
                    }
                } catch (error) {
                    if (!(error instanceof Error)) throw error;
                    if (onError) {
                        onError(error, "Second argument to onUpdate onError is reserved for later use");
                    } else {
                        void Promise.reject(error);
                    }
                    continue;
                }
                callback(newValue, "Second argument to onUpdate callback is reserved for later use");
            }
        }
    }
    /**
   * Execute a mutation function.
   *
   * @param mutation - A {@link server.FunctionReference} for the public mutation
   * to run.
   * @param args - An arguments object for the mutation.
   * @param options - A {@link MutationOptions} options object for the mutation.
   * @returns A promise of the mutation's result.
   */ async mutation(mutation, args, options) {
        if (this.disabled) throw new Error("ConvexClient is disabled");
        return await this.client.mutation((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(mutation), args, options);
    }
    /**
   * Execute an action function.
   *
   * @param action - A {@link server.FunctionReference} for the public action
   * to run.
   * @param args - An arguments object for the action.
   * @returns A promise of the action's result.
   */ async action(action, args) {
        if (this.disabled) throw new Error("ConvexClient is disabled");
        return await this.client.action((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(action), args);
    }
    /**
   * Fetch a query result once.
   *
   * @param query - A {@link server.FunctionReference} for the public query
   * to run.
   * @param args - An arguments object for the query.
   * @returns A promise of the query's result.
   */ async query(query, args) {
        if (this.disabled) throw new Error("ConvexClient is disabled");
        const value = this.client.localQueryResult((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(query), args);
        if (value !== void 0) return Promise.resolve(value);
        return new Promise((resolve, reject)=>{
            const { unsubscribe } = this.onUpdate(query, args, (value2)=>{
                unsubscribe();
                resolve(value2);
            }, (e)=>{
                unsubscribe();
                reject(e);
            });
        });
    }
    /**
   * Get the current {@link ConnectionState} between the client and the Convex
   * backend.
   *
   * @returns The {@link ConnectionState} with the Convex backend.
   */ connectionState() {
        if (this.disabled) throw new Error("ConvexClient is disabled");
        return this.client.connectionState();
    }
    /**
   * Subscribe to the {@link ConnectionState} between the client and the Convex
   * backend, calling a callback each time it changes.
   *
   * Subscribed callbacks will be called when any part of ConnectionState changes.
   * ConnectionState may grow in future versions (e.g. to provide a array of
   * inflight requests) in which case callbacks would be called more frequently.
   *
   * @returns An unsubscribe function to stop listening.
   */ subscribeToConnectionState(cb) {
        if (this.disabled) return ()=>{};
        return this.client.subscribeToConnectionState(cb);
    }
} //# sourceMappingURL=simple_client.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/http_client.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConvexHttpClient",
    ()=>ConvexHttpClient,
    "STATUS_CODE_BAD_REQUEST",
    ()=>STATUS_CODE_BAD_REQUEST,
    "STATUS_CODE_OK",
    ()=>STATUS_CODE_OK,
    "STATUS_CODE_UDF_FAILED",
    ()=>STATUS_CODE_UDF_FAILED,
    "setFetch",
    ()=>setFetch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/server/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/common/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/errors.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/value.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/logging.js [app-ssr] (ecmascript)");
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
;
;
;
;
;
const STATUS_CODE_OK = 200;
const STATUS_CODE_BAD_REQUEST = 400;
const STATUS_CODE_UDF_FAILED = 560;
let specifiedFetch = void 0;
function setFetch(f) {
    specifiedFetch = f;
}
class ConvexHttpClient {
    /**
   * Create a new {@link ConvexHttpClient}.
   *
   * @param address - The url of your Convex deployment, often provided
   * by an environment variable. E.g. `https://small-mouse-123.convex.cloud`.
   * @param options - An object of options.
   * - `skipConvexDeploymentUrlCheck` - Skip validating that the Convex deployment URL looks like
   * `https://happy-animal-123.convex.cloud` or localhost. This can be useful if running a self-hosted
   * Convex backend that uses a different URL.
   * - `logger` - A logger or a boolean. If not provided, logs to the console.
   * You can construct your own logger to customize logging to log elsewhere
   * or not log at all, or use `false` as a shorthand for a no-op logger.
   * A logger is an object with 4 methods: log(), warn(), error(), and logVerbose().
   * These methods can receive multiple arguments of any types, like console.log().
   * - `auth` - A JWT containing identity claims accessible in Convex functions.
   * This identity may expire so it may be necessary to call `setAuth()` later,
   * but for short-lived clients it's convenient to specify this value here.
   * - `fetch` - A custom fetch implementation to use for all HTTP requests made by this client.
   */ constructor(address, options){
        __publicField(this, "address");
        __publicField(this, "auth");
        __publicField(this, "adminAuth");
        __publicField(this, "encodedTsPromise");
        __publicField(this, "debug");
        __publicField(this, "fetchOptions");
        __publicField(this, "fetch");
        __publicField(this, "logger");
        __publicField(this, "mutationQueue", []);
        __publicField(this, "isProcessingQueue", false);
        if (typeof options === "boolean") {
            throw new Error("skipConvexDeploymentUrlCheck as the second argument is no longer supported. Please pass an options object, `{ skipConvexDeploymentUrlCheck: true }`.");
        }
        const opts = options ?? {};
        if (opts.skipConvexDeploymentUrlCheck !== true) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateDeploymentUrl"])(address);
        }
        this.logger = options?.logger === false ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["instantiateNoopLogger"])({
            verbose: false
        }) : options?.logger !== true && options?.logger ? options.logger : (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["instantiateDefaultLogger"])({
            verbose: false
        });
        this.address = address;
        this.debug = true;
        this.auth = void 0;
        this.adminAuth = void 0;
        this.fetch = options?.fetch;
        if (options?.auth) {
            this.setAuth(options.auth);
        }
    }
    /**
   * Obtain the {@link ConvexHttpClient}'s URL to its backend.
   * @deprecated Use url, which returns the url without /api at the end.
   *
   * @returns The URL to the Convex backend, including the client's API version.
   */ backendUrl() {
        return `${this.address}/api`;
    }
    /**
   * Return the address for this client, useful for creating a new client.
   *
   * Not guaranteed to match the address with which this client was constructed:
   * it may be canonicalized.
   */ get url() {
        return this.address;
    }
    /**
   * Set the authentication token to be used for subsequent queries and mutations.
   *
   * Should be called whenever the token changes (i.e. due to expiration and refresh).
   *
   * @param value - JWT-encoded OpenID Connect identity token.
   */ setAuth(value) {
        this.clearAuth();
        this.auth = value;
    }
    /**
   * Set admin auth token to allow calling internal queries, mutations, and actions
   * and acting as an identity.
   *
   * @internal
   */ setAdminAuth(token, actingAsIdentity) {
        this.clearAuth();
        if (actingAsIdentity !== void 0) {
            const bytes = new TextEncoder().encode(JSON.stringify(actingAsIdentity));
            const actingAsIdentityEncoded = btoa(String.fromCodePoint(...bytes));
            this.adminAuth = `${token}:${actingAsIdentityEncoded}`;
        } else {
            this.adminAuth = token;
        }
    }
    /**
   * Clear the current authentication token if set.
   */ clearAuth() {
        this.auth = void 0;
        this.adminAuth = void 0;
    }
    /**
   * Sets whether the result log lines should be printed on the console or not.
   *
   * @internal
   */ setDebug(debug) {
        this.debug = debug;
    }
    /**
   * Used to customize the fetch behavior in some runtimes.
   *
   * @internal
   */ setFetchOptions(fetchOptions) {
        this.fetchOptions = fetchOptions;
    }
    /**
   * This API is experimental: it may change or disappear.
   *
   * Execute a Convex query function at the same timestamp as every other
   * consistent query execution run by this HTTP client.
   *
   * This doesn't make sense for long-lived ConvexHttpClients as Convex
   * backends can read a limited amount into the past: beyond 30 seconds
   * in the past may not be available.
   *
   * Create a new client to use a consistent time.
   *
   * @param name - The name of the query.
   * @param args - The arguments object for the query. If this is omitted,
   * the arguments will be `{}`.
   * @returns A promise of the query's result.
   *
   * @deprecated This API is experimental: it may change or disappear.
   */ async consistentQuery(query, ...args) {
        const queryArgs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseArgs"])(args[0]);
        const timestampPromise = this.getTimestamp();
        return await this.queryInner(query, queryArgs, {
            timestampPromise
        });
    }
    async getTimestamp() {
        if (this.encodedTsPromise) {
            return this.encodedTsPromise;
        }
        return this.encodedTsPromise = this.getTimestampInner();
    }
    async getTimestampInner() {
        const localFetch = this.fetch || specifiedFetch || fetch;
        const headers = {
            "Content-Type": "application/json",
            "Convex-Client": `npm-${__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["version"]}`
        };
        const response = await localFetch(`${this.address}/api/query_ts`, {
            ...this.fetchOptions,
            method: "POST",
            headers
        });
        if (!response.ok) {
            throw new Error(await response.text());
        }
        const { ts } = await response.json();
        return ts;
    }
    /**
   * Execute a Convex query function.
   *
   * @param name - The name of the query.
   * @param args - The arguments object for the query. If this is omitted,
   * the arguments will be `{}`.
   * @returns A promise of the query's result.
   */ async query(query, ...args) {
        const queryArgs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseArgs"])(args[0]);
        return await this.queryInner(query, queryArgs, {});
    }
    async queryInner(query, queryArgs, options) {
        const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(query);
        const args = [
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(queryArgs)
        ];
        const headers = {
            "Content-Type": "application/json",
            "Convex-Client": `npm-${__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["version"]}`
        };
        if (this.adminAuth) {
            headers["Authorization"] = `Convex ${this.adminAuth}`;
        } else if (this.auth) {
            headers["Authorization"] = `Bearer ${this.auth}`;
        }
        const localFetch = this.fetch || specifiedFetch || fetch;
        const timestamp = options.timestampPromise ? await options.timestampPromise : void 0;
        const body = JSON.stringify({
            path: name,
            format: "convex_encoded_json",
            args,
            ...timestamp ? {
                ts: timestamp
            } : {}
        });
        const endpoint = timestamp ? `${this.address}/api/query_at_ts` : `${this.address}/api/query`;
        const response = await localFetch(endpoint, {
            ...this.fetchOptions,
            body,
            method: "POST",
            headers
        });
        if (!response.ok && response.status !== STATUS_CODE_UDF_FAILED) {
            throw new Error(await response.text());
        }
        const respJSON = await response.json();
        if (this.debug) {
            for (const line of respJSON.logLines ?? []){
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["logForFunction"])(this.logger, "info", "query", name, line);
            }
        }
        switch(respJSON.status){
            case "success":
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsonToConvex"])(respJSON.value);
            case "error":
                if (respJSON.errorData !== void 0) {
                    throw forwardErrorData(respJSON.errorData, new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConvexError"](respJSON.errorMessage));
                }
                throw new Error(respJSON.errorMessage);
            default:
                throw new Error(`Invalid response: ${JSON.stringify(respJSON)}`);
        }
    }
    async mutationInner(mutation, mutationArgs) {
        const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(mutation);
        const body = JSON.stringify({
            path: name,
            format: "convex_encoded_json",
            args: [
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(mutationArgs)
            ]
        });
        const headers = {
            "Content-Type": "application/json",
            "Convex-Client": `npm-${__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["version"]}`
        };
        if (this.adminAuth) {
            headers["Authorization"] = `Convex ${this.adminAuth}`;
        } else if (this.auth) {
            headers["Authorization"] = `Bearer ${this.auth}`;
        }
        const localFetch = this.fetch || specifiedFetch || fetch;
        const response = await localFetch(`${this.address}/api/mutation`, {
            ...this.fetchOptions,
            body,
            method: "POST",
            headers
        });
        if (!response.ok && response.status !== STATUS_CODE_UDF_FAILED) {
            throw new Error(await response.text());
        }
        const respJSON = await response.json();
        if (this.debug) {
            for (const line of respJSON.logLines ?? []){
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["logForFunction"])(this.logger, "info", "mutation", name, line);
            }
        }
        switch(respJSON.status){
            case "success":
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsonToConvex"])(respJSON.value);
            case "error":
                if (respJSON.errorData !== void 0) {
                    throw forwardErrorData(respJSON.errorData, new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConvexError"](respJSON.errorMessage));
                }
                throw new Error(respJSON.errorMessage);
            default:
                throw new Error(`Invalid response: ${JSON.stringify(respJSON)}`);
        }
    }
    async processMutationQueue() {
        if (this.isProcessingQueue) {
            return;
        }
        this.isProcessingQueue = true;
        while(this.mutationQueue.length > 0){
            const { mutation, args, resolve, reject } = this.mutationQueue.shift();
            try {
                const result = await this.mutationInner(mutation, args);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }
        this.isProcessingQueue = false;
    }
    enqueueMutation(mutation, args) {
        return new Promise((resolve, reject)=>{
            this.mutationQueue.push({
                mutation,
                args,
                resolve,
                reject
            });
            void this.processMutationQueue();
        });
    }
    /**
   * Execute a Convex mutation function. Mutations are queued by default.
   *
   * @param name - The name of the mutation.
   * @param args - The arguments object for the mutation. If this is omitted,
   * the arguments will be `{}`.
   * @param options - An optional object containing
   * @returns A promise of the mutation's result.
   */ async mutation(mutation, ...args) {
        const [fnArgs, options] = args;
        const mutationArgs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseArgs"])(fnArgs);
        const queued = !options?.skipQueue;
        if (queued) {
            return await this.enqueueMutation(mutation, mutationArgs);
        } else {
            return await this.mutationInner(mutation, mutationArgs);
        }
    }
    /**
   * Execute a Convex action function. Actions are not queued.
   *
   * @param name - The name of the action.
   * @param args - The arguments object for the action. If this is omitted,
   * the arguments will be `{}`.
   * @returns A promise of the action's result.
   */ async action(action, ...args) {
        const actionArgs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseArgs"])(args[0]);
        const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(action);
        const body = JSON.stringify({
            path: name,
            format: "convex_encoded_json",
            args: [
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(actionArgs)
            ]
        });
        const headers = {
            "Content-Type": "application/json",
            "Convex-Client": `npm-${__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["version"]}`
        };
        if (this.adminAuth) {
            headers["Authorization"] = `Convex ${this.adminAuth}`;
        } else if (this.auth) {
            headers["Authorization"] = `Bearer ${this.auth}`;
        }
        const localFetch = this.fetch || specifiedFetch || fetch;
        const response = await localFetch(`${this.address}/api/action`, {
            ...this.fetchOptions,
            body,
            method: "POST",
            headers
        });
        if (!response.ok && response.status !== STATUS_CODE_UDF_FAILED) {
            throw new Error(await response.text());
        }
        const respJSON = await response.json();
        if (this.debug) {
            for (const line of respJSON.logLines ?? []){
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["logForFunction"])(this.logger, "info", "action", name, line);
            }
        }
        switch(respJSON.status){
            case "success":
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsonToConvex"])(respJSON.value);
            case "error":
                if (respJSON.errorData !== void 0) {
                    throw forwardErrorData(respJSON.errorData, new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConvexError"](respJSON.errorMessage));
                }
                throw new Error(respJSON.errorMessage);
            default:
                throw new Error(`Invalid response: ${JSON.stringify(respJSON)}`);
        }
    }
    /**
   * Execute a Convex function of an unknown type. These function calls are not queued.
   *
   * @param name - The name of the function.
   * @param args - The arguments object for the function. If this is omitted,
   * the arguments will be `{}`.
   * @returns A promise of the function's result.
   *
   * @internal
   */ async function(anyFunction, componentPath, ...args) {
        const functionArgs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseArgs"])(args[0]);
        const name = typeof anyFunction === "string" ? anyFunction : (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(anyFunction);
        const body = JSON.stringify({
            componentPath,
            path: name,
            format: "convex_encoded_json",
            args: (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(functionArgs)
        });
        const headers = {
            "Content-Type": "application/json",
            "Convex-Client": `npm-${__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["version"]}`
        };
        if (this.adminAuth) {
            headers["Authorization"] = `Convex ${this.adminAuth}`;
        } else if (this.auth) {
            headers["Authorization"] = `Bearer ${this.auth}`;
        }
        const localFetch = this.fetch || specifiedFetch || fetch;
        const response = await localFetch(`${this.address}/api/function`, {
            ...this.fetchOptions,
            body,
            method: "POST",
            headers
        });
        if (!response.ok && response.status !== STATUS_CODE_UDF_FAILED) {
            throw new Error(await response.text());
        }
        const respJSON = await response.json();
        if (this.debug) {
            for (const line of respJSON.logLines ?? []){
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["logForFunction"])(this.logger, "info", "any", name, line);
            }
        }
        switch(respJSON.status){
            case "success":
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsonToConvex"])(respJSON.value);
            case "error":
                if (respJSON.errorData !== void 0) {
                    throw forwardErrorData(respJSON.errorData, new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConvexError"](respJSON.errorMessage));
                }
                throw new Error(respJSON.errorMessage);
            default:
                throw new Error(`Invalid response: ${JSON.stringify(respJSON)}`);
        }
    }
}
function forwardErrorData(errorData, error) {
    error.data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsonToConvex"])(errorData);
    return error;
} //# sourceMappingURL=http_client.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/index.js [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/client.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$simple_client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/simple_client.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$http_client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/http_client.js [app-ssr] (ecmascript)"); //# sourceMappingURL=index.js.map
"use strict";
;
;
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/use_subscription.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useSubscription",
    ()=>useSubscription
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use strict";
;
function useSubscription({ // (Synchronously) returns the current value of our subscription.
getCurrentValue, // This function is passed an event handler to attach to the subscription.
// It should return an unsubscribe function that removes the handler.
subscribe }) {
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>({
            getCurrentValue,
            subscribe,
            value: getCurrentValue()
        }));
    let valueToReturn = state.value;
    if (state.getCurrentValue !== getCurrentValue || state.subscribe !== subscribe) {
        valueToReturn = getCurrentValue();
        setState({
            getCurrentValue,
            subscribe,
            value: valueToReturn
        });
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        let didUnsubscribe = false;
        const checkForUpdates = ()=>{
            if (didUnsubscribe) {
                return;
            }
            setState((prevState)=>{
                if (prevState.getCurrentValue !== getCurrentValue || prevState.subscribe !== subscribe) {
                    return prevState;
                }
                const value = getCurrentValue();
                if (prevState.value === value) {
                    return prevState;
                }
                return {
                    ...prevState,
                    value
                };
            });
        };
        const unsubscribe = subscribe(checkForUpdates);
        checkForUpdates();
        return ()=>{
            didUnsubscribe = true;
            unsubscribe();
        };
    }, [
        getCurrentValue,
        subscribe
    ]);
    return valueToReturn;
} //# sourceMappingURL=use_subscription.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/client.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConvexProvider",
    ()=>ConvexProvider,
    "ConvexReactClient",
    ()=>ConvexReactClient,
    "createMutation",
    ()=>createMutation,
    "useAction",
    ()=>useAction,
    "useConvex",
    ()=>useConvex,
    "useConvexConnectionState",
    ()=>useConvexConnectionState,
    "useMutation",
    ()=>useMutation,
    "useQuery",
    ()=>useQuery
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/client.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/value.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$use_queries$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/use_queries.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$use_subscription$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/use_subscription.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/common/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/server/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/logging.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$paginated_query_client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/browser/sync/paginated_query_client.js [app-ssr] (ecmascript)");
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
;
;
;
;
;
;
;
;
;
const DEFAULT_EXTEND_SUBSCRIPTION_FOR = 5e3;
if (typeof __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"] === "undefined") {
    throw new Error("Required dependency 'react' not found");
}
function createMutation(mutationReference, client, update) {
    function mutation(args) {
        assertNotAccidentalArgument(args);
        return client.mutation(mutationReference, args, {
            optimisticUpdate: update
        });
    }
    mutation.withOptimisticUpdate = function withOptimisticUpdate(optimisticUpdate) {
        if (update !== void 0) {
            throw new Error(`Already specified optimistic update for mutation ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(mutationReference)}`);
        }
        return createMutation(mutationReference, client, optimisticUpdate);
    };
    return mutation;
}
function createAction(actionReference, client) {
    return function(args) {
        return client.action(actionReference, args);
    };
}
class ConvexReactClient {
    /**
   * @param address - The url of your Convex deployment, often provided
   * by an environment variable. E.g. `https://small-mouse-123.convex.cloud`.
   * @param options - See {@link ConvexReactClientOptions} for a full description.
   */ constructor(address, options){
        __publicField(this, "address");
        __publicField(this, "cachedSync");
        __publicField(this, "cachedPaginatedQueryClient");
        __publicField(this, "listeners");
        __publicField(this, "options");
        // "closed" means this client is done, not just that the underlying WS connection is closed.
        __publicField(this, "closed", false);
        __publicField(this, "_logger");
        __publicField(this, "adminAuth");
        __publicField(this, "fakeUserIdentity");
        if (address === void 0) {
            throw new Error("No address provided to ConvexReactClient.\nIf trying to deploy to production, make sure to follow all the instructions found at https://docs.convex.dev/production/hosting/\nIf running locally, make sure to run `convex dev` and ensure the .env.local file is populated.");
        }
        if (typeof address !== "string") {
            throw new Error(`ConvexReactClient requires a URL like 'https://happy-otter-123.convex.cloud', received something of type ${typeof address} instead.`);
        }
        if (!address.includes("://")) {
            throw new Error("Provided address was not an absolute URL.");
        }
        this.address = address;
        this.listeners = /* @__PURE__ */ new Map();
        this._logger = options?.logger === false ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["instantiateNoopLogger"])({
            verbose: options?.verbose ?? false
        }) : options?.logger !== true && options?.logger ? options.logger : (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$logging$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["instantiateDefaultLogger"])({
            verbose: options?.verbose ?? false
        });
        this.options = {
            ...options,
            logger: this._logger
        };
    }
    /**
   * Return the address for this client, useful for creating a new client.
   *
   * Not guaranteed to match the address with which this client was constructed:
   * it may be canonicalized.
   */ get url() {
        return this.address;
    }
    /**
   * Lazily instantiate the `BaseConvexClient` so we don't create the WebSocket
   * when server-side rendering.
   *
   * @internal
   */ get sync() {
        if (this.closed) {
            throw new Error("ConvexReactClient has already been closed.");
        }
        if (this.cachedSync) {
            return this.cachedSync;
        }
        this.cachedSync = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BaseConvexClient"](this.address, ()=>{}, // Use the PaginatedQueryClient's transition instead.
        this.options);
        if (this.adminAuth) {
            this.cachedSync.setAdminAuth(this.adminAuth, this.fakeUserIdentity);
        }
        this.cachedPaginatedQueryClient = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$sync$2f$paginated_query_client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PaginatedQueryClient"](this.cachedSync, (transition)=>this.handleTransition(transition));
        return this.cachedSync;
    }
    /**
   * Lazily instantiate the `PaginatedQueryClient` so we don't create it
   * when server-side rendering.
   *
   * @internal
   */ get paginatedQueryClient() {
        this.sync;
        if (this.cachedPaginatedQueryClient) {
            return this.cachedPaginatedQueryClient;
        }
        throw new Error("Should already be instantiated");
    }
    /**
   * Set the authentication token to be used for subsequent queries and mutations.
   * `fetchToken` will be called automatically again if a token expires.
   * `fetchToken` should return `null` if the token cannot be retrieved, for example
   * when the user's rights were permanently revoked.
   * @param fetchToken - an async function returning the JWT-encoded OpenID Connect Identity Token
   * @param onChange - a callback that will be called when the authentication status changes
   */ setAuth(fetchToken, onChange) {
        if (typeof fetchToken === "string") {
            throw new Error("Passing a string to ConvexReactClient.setAuth is no longer supported, please upgrade to passing in an async function to handle reauthentication.");
        }
        this.sync.setAuth(fetchToken, onChange ?? (()=>{}));
    }
    /**
   * Clear the current authentication token if set.
   */ clearAuth() {
        this.sync.clearAuth();
    }
    /**
   * @internal
   */ setAdminAuth(token, identity) {
        this.adminAuth = token;
        this.fakeUserIdentity = identity;
        if (this.closed) {
            throw new Error("ConvexReactClient has already been closed.");
        }
        if (this.cachedSync) {
            this.sync.setAdminAuth(token, identity);
        }
    }
    /**
   * Construct a new {@link Watch} on a Convex query function.
   *
   * **Most application code should not call this method directly. Instead use
   * the {@link useQuery} hook.**
   *
   * The act of creating a watch does nothing, a Watch is stateless.
   *
   * @param query - A {@link server.FunctionReference} for the public query to run.
   * @param args - An arguments object for the query. If this is omitted,
   * the arguments will be `{}`.
   * @param options - A {@link WatchQueryOptions} options object for this query.
   *
   * @returns The {@link Watch} object.
   */ watchQuery(query, ...argsAndOptions) {
        const [args, options] = argsAndOptions;
        const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(query);
        return {
            onUpdate: (callback)=>{
                const { queryToken, unsubscribe } = this.sync.subscribe(name, args, options);
                const currentListeners = this.listeners.get(queryToken);
                if (currentListeners !== void 0) {
                    currentListeners.add(callback);
                } else {
                    this.listeners.set(queryToken, /* @__PURE__ */ new Set([
                        callback
                    ]));
                }
                return ()=>{
                    if (this.closed) {
                        return;
                    }
                    const currentListeners2 = this.listeners.get(queryToken);
                    currentListeners2.delete(callback);
                    if (currentListeners2.size === 0) {
                        this.listeners.delete(queryToken);
                    }
                    unsubscribe();
                };
            },
            localQueryResult: ()=>{
                if (this.cachedSync) {
                    return this.cachedSync.localQueryResult(name, args);
                }
                return void 0;
            },
            localQueryLogs: ()=>{
                if (this.cachedSync) {
                    return this.cachedSync.localQueryLogs(name, args);
                }
                return void 0;
            },
            journal: ()=>{
                if (this.cachedSync) {
                    return this.cachedSync.queryJournal(name, args);
                }
                return void 0;
            }
        };
    }
    // Let's try out a queryOptions-style API.
    // This method is similar to the React Query API `queryClient.prefetchQuery()`.
    // In the future an ensureQueryData(): Promise<Data> method could exist.
    /**
   * Indicates likely future interest in a query subscription.
   *
   * The implementation currently immediately subscribes to a query. In the future this method
   * may prioritize some queries over others, fetch the query result without subscribing, or
   * do nothing in slow network connections or high load scenarios.
   *
   * To use this in a React component, call useQuery() and ignore the return value.
   *
   * @param queryOptions - A query (function reference from an api object) and its args, plus
   * an optional extendSubscriptionFor for how long to subscribe to the query.
   */ prewarmQuery(queryOptions) {
        const extendSubscriptionFor = queryOptions.extendSubscriptionFor ?? DEFAULT_EXTEND_SUBSCRIPTION_FOR;
        const watch = this.watchQuery(queryOptions.query, queryOptions.args || {});
        const unsubscribe = watch.onUpdate(()=>{});
        setTimeout(unsubscribe, extendSubscriptionFor);
    }
    /**
   * Construct a new {@link PaginatedWatch} on a Convex paginated query function.
   *
   * **Most application code should not call this method directly. Instead use
   * the {@link usePaginatedQuery} hook.**
   *
   * The act of creating a watch does nothing, a Watch is stateless.
   *
   * @param query - A {@link server.FunctionReference} for the public query to run.
   * @param args - An arguments object for the query. If this is omitted,
   * the arguments will be `{}`.
   * @param options - A {@link WatchPaginatedQueryOptions} options object for this query.
   *
   * @returns The {@link PaginatedWatch} object.
   *
   * @internal
   */ watchPaginatedQuery(query, args, options) {
        const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(query);
        return {
            onUpdate: (callback)=>{
                const { paginatedQueryToken, unsubscribe } = this.paginatedQueryClient.subscribe(name, args || {}, options);
                const currentListeners = this.listeners.get(paginatedQueryToken);
                if (currentListeners !== void 0) {
                    currentListeners.add(callback);
                } else {
                    this.listeners.set(paginatedQueryToken, /* @__PURE__ */ new Set([
                        callback
                    ]));
                }
                return ()=>{
                    if (this.closed) {
                        return;
                    }
                    const currentListeners2 = this.listeners.get(paginatedQueryToken);
                    currentListeners2.delete(callback);
                    if (currentListeners2.size === 0) {
                        this.listeners.delete(paginatedQueryToken);
                    }
                    unsubscribe();
                };
            },
            localQueryResult: ()=>{
                return this.paginatedQueryClient.localQueryResult(name, args, options);
            }
        };
    }
    /**
   * Execute a mutation function.
   *
   * @param mutation - A {@link server.FunctionReference} for the public mutation
   * to run.
   * @param args - An arguments object for the mutation. If this is omitted,
   * the arguments will be `{}`.
   * @param options - A {@link MutationOptions} options object for the mutation.
   * @returns A promise of the mutation's result.
   */ mutation(mutation, ...argsAndOptions) {
        const [args, options] = argsAndOptions;
        const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(mutation);
        return this.sync.mutation(name, args, options);
    }
    /**
   * Execute an action function.
   *
   * @param action - A {@link server.FunctionReference} for the public action
   * to run.
   * @param args - An arguments object for the action. If this is omitted,
   * the arguments will be `{}`.
   * @returns A promise of the action's result.
   */ action(action, ...args) {
        const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(action);
        return this.sync.action(name, ...args);
    }
    /**
   * Fetch a query result once.
   *
   * **Most application code should subscribe to queries instead, using
   * the {@link useQuery} hook.**
   *
   * @param query - A {@link server.FunctionReference} for the public query
   * to run.
   * @param args - An arguments object for the query. If this is omitted,
   * the arguments will be `{}`.
   * @returns A promise of the query's result.
   */ query(query, ...args) {
        const watch = this.watchQuery(query, ...args);
        const existingResult = watch.localQueryResult();
        if (existingResult !== void 0) {
            return Promise.resolve(existingResult);
        }
        return new Promise((resolve, reject)=>{
            const unsubscribe = watch.onUpdate(()=>{
                unsubscribe();
                try {
                    resolve(watch.localQueryResult());
                } catch (e) {
                    reject(e);
                }
            });
        });
    }
    /**
   * Get the current {@link ConnectionState} between the client and the Convex
   * backend.
   *
   * @returns The {@link ConnectionState} with the Convex backend.
   */ connectionState() {
        return this.sync.connectionState();
    }
    /**
   * Subscribe to the {@link ConnectionState} between the client and the Convex
   * backend, calling a callback each time it changes.
   *
   * Subscribed callbacks will be called when any part of ConnectionState changes.
   * ConnectionState may grow in future versions (e.g. to provide a array of
   * inflight requests) in which case callbacks would be called more frequently.
   * ConnectionState may also *lose* properties in future versions as we figure
   * out what information is most useful. As such this API is considered unstable.
   *
   * @returns An unsubscribe function to stop listening.
   */ subscribeToConnectionState(cb) {
        return this.sync.subscribeToConnectionState(cb);
    }
    /**
   * Get the logger for this client.
   *
   * @returns The {@link Logger} for this client.
   */ get logger() {
        return this._logger;
    }
    /**
   * Close any network handles associated with this client and stop all subscriptions.
   *
   * Call this method when you're done with a {@link ConvexReactClient} to
   * dispose of its sockets and resources.
   *
   * @returns A `Promise` fulfilled when the connection has been completely closed.
   */ async close() {
        this.closed = true;
        this.listeners = /* @__PURE__ */ new Map();
        if (this.cachedPaginatedQueryClient) {
            this.cachedPaginatedQueryClient = void 0;
        }
        if (this.cachedSync) {
            const sync = this.cachedSync;
            this.cachedSync = void 0;
            await sync.close();
        }
    }
    /**
   * Handle transitions from both base client and paginated client.
   * This ensures all transitions are processed synchronously and in order.
   */ handleTransition(transition) {
        const simple = transition.queries.map((q)=>q.token);
        const paginated = transition.paginatedQueries.map((q)=>q.token);
        this.transition([
            ...simple,
            ...paginated
        ]);
    }
    transition(updatedQueries) {
        for (const queryToken of updatedQueries){
            const callbacks = this.listeners.get(queryToken);
            if (callbacks) {
                for (const callback of callbacks){
                    callback();
                }
            }
        }
    }
}
const ConvexContext = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createContext(void 0);
function useConvex() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(ConvexContext);
}
const ConvexProvider = ({ client, children })=>{
    return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(ConvexContext.Provider, {
        value: client
    }, children);
};
function useQuery(query, ...args) {
    const skip = args[0] === "skip";
    const argsObject = args[0] === "skip" ? {} : (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$common$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseArgs"])(args[0]);
    const queryReference = typeof query === "string" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["makeFunctionReference"])(query) : query;
    const queryName = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(queryReference);
    const queries = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>skip ? {} : {
            query: {
                query: queryReference,
                args: argsObject
            }
        }, // Stringify args so args that are semantically the same don't trigger a
    // rerender. Saves developers from adding `useMemo` on every args usage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
        JSON.stringify((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(argsObject)),
        queryName,
        skip
    ]);
    const results = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$use_queries$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQueries"])(queries);
    const result = results["query"];
    if (result instanceof Error) {
        throw result;
    }
    return result;
}
function useMutation(mutation) {
    const mutationReference = typeof mutation === "string" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["makeFunctionReference"])(mutation) : mutation;
    const convex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(ConvexContext);
    if (convex === void 0) {
        throw new Error("Could not find Convex client! `useMutation` must be used in the React component tree under `ConvexProvider`. Did you forget it? See https://docs.convex.dev/quick-start#set-up-convex-in-your-react-app");
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>createMutation(mutationReference, convex), // eslint-disable-next-line react-hooks/exhaustive-deps
    [
        convex,
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(mutationReference)
    ]);
}
function useAction(action) {
    const convex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(ConvexContext);
    const actionReference = typeof action === "string" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["makeFunctionReference"])(action) : action;
    if (convex === void 0) {
        throw new Error("Could not find Convex client! `useAction` must be used in the React component tree under `ConvexProvider`. Did you forget it? See https://docs.convex.dev/quick-start#set-up-convex-in-your-react-app");
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>createAction(actionReference, convex), // eslint-disable-next-line react-hooks/exhaustive-deps
    [
        convex,
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(actionReference)
    ]);
}
function useConvexConnectionState() {
    const convex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(ConvexContext);
    if (convex === void 0) {
        throw new Error("Could not find Convex client! `useConvexConnectionState` must be used in the React component tree under `ConvexProvider`. Did you forget it? See https://docs.convex.dev/quick-start#set-up-convex-in-your-react-app");
    }
    const getCurrentValue = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        return convex.connectionState();
    }, [
        convex
    ]);
    const subscribe = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((callback)=>{
        return convex.subscribeToConnectionState(()=>{
            callback();
        });
    }, [
        convex
    ]);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$use_subscription$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSubscription"])({
        getCurrentValue,
        subscribe
    });
}
function assertNotAccidentalArgument(value) {
    if (typeof value === "object" && value !== null && "bubbles" in value && "persist" in value && "isDefaultPrevented" in value) {
        throw new Error(`Convex function called with SyntheticEvent object. Did you use a Convex function as an event handler directly? Event handlers like onClick receive an event object as their first argument. These SyntheticEvent objects are not valid Convex values. Try wrapping the function like \`const handler = () => myMutation();\` and using \`handler\` in the event handler.`);
    }
} //# sourceMappingURL=client.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/queries_observer.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QueriesObserver",
    ()=>QueriesObserver
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/value.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/server/api.js [app-ssr] (ecmascript)");
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __publicField = (obj, key, value)=>__defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
;
;
class QueriesObserver {
    constructor(createWatch){
        __publicField(this, "createWatch");
        __publicField(this, "queries");
        __publicField(this, "listeners");
        this.createWatch = createWatch;
        this.queries = {};
        this.listeners = /* @__PURE__ */ new Set();
    }
    setQueries(newQueries) {
        for (const identifier of Object.keys(newQueries)){
            const { query, args, paginationOptions } = newQueries[identifier];
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(query);
            if (this.queries[identifier] === void 0) {
                this.addQuery(identifier, query, args, paginationOptions ? {
                    paginationOptions
                } : {});
            } else {
                const existingInfo = this.queries[identifier];
                if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(query) !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(existingInfo.query) || JSON.stringify((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(args)) !== JSON.stringify((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(existingInfo.args)) || JSON.stringify(paginationOptions) !== JSON.stringify(existingInfo.paginationOptions)) {
                    this.removeQuery(identifier);
                    this.addQuery(identifier, query, args, paginationOptions ? {
                        paginationOptions
                    } : {});
                }
            }
        }
        for (const identifier of Object.keys(this.queries)){
            if (newQueries[identifier] === void 0) {
                this.removeQuery(identifier);
            }
        }
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return ()=>{
            this.listeners.delete(listener);
        };
    }
    getLocalResults(queries) {
        const result = {};
        for (const identifier of Object.keys(queries)){
            const { query, args } = queries[identifier];
            const paginationOptions = queries[identifier].paginationOptions;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(query);
            const watch = this.createWatch(query, args, paginationOptions ? {
                paginationOptions
            } : {});
            let value;
            try {
                value = watch.localQueryResult();
            } catch (e) {
                if (e instanceof Error) {
                    value = e;
                } else {
                    throw e;
                }
            }
            result[identifier] = value;
        }
        return result;
    }
    setCreateWatch(createWatch) {
        this.createWatch = createWatch;
        for (const identifier of Object.keys(this.queries)){
            const { query, args, watch, paginationOptions } = this.queries[identifier];
            const journal = "journal" in watch ? watch.journal() : void 0;
            this.removeQuery(identifier);
            this.addQuery(identifier, query, args, {
                ...journal ? {
                    journal
                } : [],
                ...paginationOptions ? {
                    paginationOptions
                } : {}
            });
        }
    }
    destroy() {
        for (const identifier of Object.keys(this.queries)){
            this.removeQuery(identifier);
        }
        this.listeners = /* @__PURE__ */ new Set();
    }
    addQuery(identifier, query, args, { paginationOptions, journal }) {
        if (this.queries[identifier] !== void 0) {
            throw new Error(`Tried to add a new query with identifier ${identifier} when it already exists.`);
        }
        const watch = this.createWatch(query, args, {
            ...journal ? {
                journal
            } : [],
            ...paginationOptions ? {
                paginationOptions
            } : {}
        });
        const unsubscribe = watch.onUpdate(()=>this.notifyListeners());
        this.queries[identifier] = {
            query,
            args,
            watch,
            unsubscribe,
            ...paginationOptions ? {
                paginationOptions
            } : {}
        };
    }
    removeQuery(identifier) {
        const info = this.queries[identifier];
        if (info === void 0) {
            throw new Error(`No query found with identifier ${identifier}.`);
        }
        info.unsubscribe();
        delete this.queries[identifier];
    }
    notifyListeners() {
        for (const listener of this.listeners){
            listener();
        }
    }
} //# sourceMappingURL=queries_observer.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/use_queries.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useQueries",
    ()=>useQueries,
    "useQueriesHelper",
    ()=>useQueriesHelper
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/client.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$queries_observer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/queries_observer.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$use_subscription$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/use_subscription.js [app-ssr] (ecmascript)");
"use strict";
;
;
;
;
function useQueries(queries) {
    const convex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useConvex"])();
    if (convex === void 0) {
        throw new Error("Could not find Convex client! `useQuery` must be used in the React component tree under `ConvexProvider`. Did you forget it? See https://docs.convex.dev/quick-start#set-up-convex-in-your-react-app");
    }
    const createWatch = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return (query, args, { journal, paginationOptions })=>{
            if (paginationOptions) {
                return convex.watchPaginatedQuery(query, args, paginationOptions);
            } else {
                return convex.watchQuery(query, args, journal ? {
                    journal
                } : {});
            }
        };
    }, [
        convex
    ]);
    return useQueriesHelper(queries, createWatch);
}
function useQueriesHelper(queries, createWatch) {
    const [observer] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$queries_observer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QueriesObserver"](createWatch));
    if (observer.createWatch !== createWatch) {
        observer.setCreateWatch(createWatch);
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>()=>observer.destroy(), [
        observer
    ]);
    const subscription = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>({
            getCurrentValue: ()=>{
                return observer.getLocalResults(queries);
            },
            subscribe: (callback)=>{
                observer.setQueries(queries);
                return observer.subscribe(callback);
            }
        }), [
        observer,
        queries
    ]);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$use_subscription$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSubscription"])(subscription);
} //# sourceMappingURL=use_queries.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/use_paginated_query.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "includePage",
    ()=>includePage,
    "insertAtBottomIfLoaded",
    ()=>insertAtBottomIfLoaded,
    "insertAtPosition",
    ()=>insertAtPosition,
    "insertAtTop",
    ()=>insertAtTop,
    "optimisticallyUpdateValueInPaginatedQuery",
    ()=>optimisticallyUpdateValueInPaginatedQuery,
    "page",
    ()=>page,
    "resetPaginationId",
    ()=>resetPaginationId,
    "usePaginatedQuery",
    ()=>usePaginatedQuery,
    "usePaginatedQueryInternal",
    ()=>usePaginatedQueryInternal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/errors.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/value.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$use_queries$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/use_queries.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/server/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/client.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/compare.js [app-ssr] (ecmascript)");
"use strict";
;
;
;
;
;
;
const splitQuery = (key, splitCursor, continueCursor)=>(prevState)=>{
        const queries = {
            ...prevState.queries
        };
        const splitKey1 = prevState.nextPageKey;
        const splitKey2 = prevState.nextPageKey + 1;
        const nextPageKey = prevState.nextPageKey + 2;
        queries[splitKey1] = {
            query: prevState.query,
            args: {
                ...prevState.args,
                paginationOpts: {
                    ...prevState.queries[key].args.paginationOpts,
                    endCursor: splitCursor
                }
            }
        };
        queries[splitKey2] = {
            query: prevState.query,
            args: {
                ...prevState.args,
                paginationOpts: {
                    ...prevState.queries[key].args.paginationOpts,
                    cursor: splitCursor,
                    endCursor: continueCursor
                }
            }
        };
        const ongoingSplits = {
            ...prevState.ongoingSplits
        };
        ongoingSplits[key] = [
            splitKey1,
            splitKey2
        ];
        return {
            ...prevState,
            nextPageKey,
            queries,
            ongoingSplits
        };
    };
const completeSplitQuery = (key)=>(prevState)=>{
        const completedSplit = prevState.ongoingSplits[key];
        if (completedSplit === void 0) {
            return prevState;
        }
        const queries = {
            ...prevState.queries
        };
        delete queries[key];
        const ongoingSplits = {
            ...prevState.ongoingSplits
        };
        delete ongoingSplits[key];
        let pageKeys = prevState.pageKeys.slice();
        const pageIndex = prevState.pageKeys.findIndex((v)=>v === key);
        if (pageIndex >= 0) {
            pageKeys = [
                ...prevState.pageKeys.slice(0, pageIndex),
                ...completedSplit,
                ...prevState.pageKeys.slice(pageIndex + 1)
            ];
        }
        return {
            ...prevState,
            queries,
            pageKeys,
            ongoingSplits
        };
    };
function usePaginatedQuery(query, args, options) {
    const { user } = usePaginatedQueryInternal(query, args, options);
    return user;
}
const includePage = Symbol("includePageKeys");
const page = Symbol("page");
function usePaginatedQueryInternal(query, args, options) {
    if (typeof options?.initialNumItems !== "number" || options.initialNumItems < 0) {
        throw new Error(`\`options.initialNumItems\` must be a positive number. Received \`${options?.initialNumItems}\`.`);
    }
    const skip = args === "skip";
    const argsObject = skip ? {} : args;
    const queryName = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(query);
    const createInitialState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return ()=>{
            const id = nextPaginationId();
            return {
                query,
                args: argsObject,
                id,
                nextPageKey: 1,
                pageKeys: skip ? [] : [
                    0
                ],
                queries: skip ? {} : {
                    0: {
                        query,
                        args: {
                            ...argsObject,
                            paginationOpts: {
                                numItems: options.initialNumItems,
                                cursor: null,
                                id
                            }
                        }
                    }
                },
                ongoingSplits: {},
                skip
            };
        };
    }, [
        // eslint-disable-next-line react-hooks/exhaustive-deps
        JSON.stringify((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(argsObject)),
        queryName,
        options.initialNumItems,
        skip
    ]);
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(createInitialState);
    let currState = state;
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(query) !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(state.query) || JSON.stringify((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(argsObject)) !== JSON.stringify((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(state.args)) || skip !== state.skip) {
        currState = createInitialState();
        setState(currState);
    }
    const convexClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useConvex"])();
    const logger = convexClient.logger;
    const resultsObject = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$use_queries$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQueries"])(currState.queries);
    const isIncludingPageKeys = options[includePage] ?? false;
    const [results, maybeLastResult] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        let currResult = void 0;
        const allItems = [];
        for (const pageKey of currState.pageKeys){
            currResult = resultsObject[pageKey];
            if (currResult === void 0) {
                break;
            }
            if (currResult instanceof Error) {
                if (currResult.message.includes("InvalidCursor") || currResult instanceof __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConvexError"] && typeof currResult.data === "object" && currResult.data?.isConvexSystemError === true && currResult.data?.paginationError === "InvalidCursor") {
                    logger.warn("usePaginatedQuery hit error, resetting pagination state: " + currResult.message);
                    setState(createInitialState);
                    return [
                        [],
                        void 0
                    ];
                } else {
                    throw currResult;
                }
            }
            const ongoingSplit = currState.ongoingSplits[pageKey];
            if (ongoingSplit !== void 0) {
                if (resultsObject[ongoingSplit[0]] !== void 0 && resultsObject[ongoingSplit[1]] !== void 0) {
                    setState(completeSplitQuery(pageKey));
                }
            } else if (currResult.splitCursor && (currResult.pageStatus === "SplitRecommended" || currResult.pageStatus === "SplitRequired" || currResult.page.length > options.initialNumItems * 2)) {
                setState(splitQuery(pageKey, currResult.splitCursor, currResult.continueCursor));
            }
            if (currResult.pageStatus === "SplitRequired") {
                return [
                    allItems,
                    void 0
                ];
            }
            allItems.push(...isIncludingPageKeys ? currResult.page.map((i)=>({
                    ...i,
                    [page]: pageKey.toString()
                })) : currResult.page);
        }
        return [
            allItems,
            currResult
        ];
    }, [
        resultsObject,
        currState.pageKeys,
        currState.ongoingSplits,
        options.initialNumItems,
        createInitialState,
        logger,
        isIncludingPageKeys
    ]);
    const statusObject = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (maybeLastResult === void 0) {
            if (currState.nextPageKey === 1) {
                return {
                    status: "LoadingFirstPage",
                    isLoading: true,
                    loadMore: (_numItems)=>{}
                };
            } else {
                return {
                    status: "LoadingMore",
                    isLoading: true,
                    loadMore: (_numItems)=>{}
                };
            }
        }
        if (maybeLastResult.isDone) {
            return {
                status: "Exhausted",
                isLoading: false,
                loadMore: (_numItems)=>{}
            };
        }
        const continueCursor = maybeLastResult.continueCursor;
        let alreadyLoadingMore = false;
        return {
            status: "CanLoadMore",
            isLoading: false,
            loadMore: (numItems)=>{
                if (!alreadyLoadingMore) {
                    alreadyLoadingMore = true;
                    setState((prevState)=>{
                        const pageKeys = [
                            ...prevState.pageKeys,
                            prevState.nextPageKey
                        ];
                        const queries = {
                            ...prevState.queries
                        };
                        queries[prevState.nextPageKey] = {
                            query: prevState.query,
                            args: {
                                ...prevState.args,
                                paginationOpts: {
                                    numItems,
                                    cursor: continueCursor,
                                    id: prevState.id
                                }
                            }
                        };
                        return {
                            ...prevState,
                            nextPageKey: prevState.nextPageKey + 1,
                            pageKeys,
                            queries
                        };
                    });
                }
            }
        };
    }, [
        maybeLastResult,
        currState.nextPageKey
    ]);
    return {
        user: {
            results,
            ...statusObject
        },
        internal: {
            state: currState
        }
    };
}
let paginationId = 0;
function nextPaginationId() {
    paginationId++;
    return paginationId;
}
function resetPaginationId() {
    paginationId = 0;
}
function optimisticallyUpdateValueInPaginatedQuery(localStore, query, args, updateValue) {
    const expectedArgs = JSON.stringify((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(args));
    for (const queryResult of localStore.getAllQueries(query)){
        if (queryResult.value !== void 0) {
            const { paginationOpts: _, ...innerArgs } = queryResult.args;
            if (JSON.stringify((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(innerArgs)) === expectedArgs) {
                const value = queryResult.value;
                if (typeof value === "object" && value !== null && Array.isArray(value.page)) {
                    localStore.setQuery(query, queryResult.args, {
                        ...value,
                        page: value.page.map(updateValue)
                    });
                }
            }
        }
    }
}
function insertAtTop(options) {
    const { paginatedQuery, argsToMatch, localQueryStore, item } = options;
    const queries = localQueryStore.getAllQueries(paginatedQuery);
    const queriesThatMatch = queries.filter((q)=>{
        if (argsToMatch === void 0) {
            return true;
        }
        return Object.keys(argsToMatch).every(// @ts-expect-error -- This should be safe since both should be plain objects
        (k)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compareValues"])(argsToMatch[k], q.args[k]) === 0);
    });
    const firstPage = queriesThatMatch.find((q)=>q.args.paginationOpts.cursor === null);
    if (firstPage === void 0 || firstPage.value === void 0) {
        return;
    }
    localQueryStore.setQuery(paginatedQuery, firstPage.args, {
        ...firstPage.value,
        page: [
            item,
            ...firstPage.value.page
        ]
    });
}
function insertAtBottomIfLoaded(options) {
    const { paginatedQuery, localQueryStore, item, argsToMatch } = options;
    const queries = localQueryStore.getAllQueries(paginatedQuery);
    const queriesThatMatch = queries.filter((q)=>{
        if (argsToMatch === void 0) {
            return true;
        }
        return Object.keys(argsToMatch).every(// @ts-expect-error -- This should be safe since both should be plain objects
        (k)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compareValues"])(argsToMatch[k], q.args[k]) === 0);
    });
    const lastPage = queriesThatMatch.find((q)=>q.value !== void 0 && q.value.isDone);
    if (lastPage === void 0) {
        return;
    }
    localQueryStore.setQuery(paginatedQuery, lastPage.args, {
        ...lastPage.value,
        page: [
            ...lastPage.value.page,
            item
        ]
    });
}
function insertAtPosition(options) {
    const { paginatedQuery, sortOrder, sortKeyFromItem, localQueryStore, item, argsToMatch } = options;
    const queries = localQueryStore.getAllQueries(paginatedQuery);
    const queryGroups = {};
    for (const query of queries){
        if (argsToMatch !== void 0 && !Object.keys(argsToMatch).every((k)=>// @ts-ignore why is this not working?
            argsToMatch[k] === query.args[k])) {
            continue;
        }
        const key = JSON.stringify(Object.fromEntries(Object.entries(query.args).map(([k, v])=>[
                k,
                k === "paginationOpts" ? v.id : v
            ])));
        queryGroups[key] ?? (queryGroups[key] = []);
        queryGroups[key].push(query);
    }
    for (const pageQueries of Object.values(queryGroups)){
        insertAtPositionInPages({
            pageQueries,
            paginatedQuery,
            sortOrder,
            sortKeyFromItem,
            localQueryStore,
            item
        });
    }
}
function insertAtPositionInPages(options) {
    const { pageQueries, sortOrder, sortKeyFromItem, localQueryStore, item, paginatedQuery } = options;
    const insertedKey = sortKeyFromItem(item);
    const loadedPages = pageQueries.filter((q)=>q.value !== void 0 && q.value.page.length > 0);
    const sortedPages = loadedPages.sort((a, b)=>{
        const aKey = sortKeyFromItem(a.value.page[0]);
        const bKey = sortKeyFromItem(b.value.page[0]);
        if (sortOrder === "asc") {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compareValues"])(aKey, bKey);
        } else {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compareValues"])(bKey, aKey);
        }
    });
    const firstLoadedPage = sortedPages[0];
    if (firstLoadedPage === void 0) {
        return;
    }
    const firstPageKey = sortKeyFromItem(firstLoadedPage.value.page[0]);
    const isBeforeFirstPage = sortOrder === "asc" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compareValues"])(insertedKey, firstPageKey) <= 0 : (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compareValues"])(insertedKey, firstPageKey) >= 0;
    if (isBeforeFirstPage) {
        if (firstLoadedPage.args.paginationOpts.cursor === null) {
            localQueryStore.setQuery(paginatedQuery, firstLoadedPage.args, {
                ...firstLoadedPage.value,
                page: [
                    item,
                    ...firstLoadedPage.value.page
                ]
            });
        } else {
            return;
        }
        return;
    }
    const lastLoadedPage = sortedPages[sortedPages.length - 1];
    if (lastLoadedPage === void 0) {
        return;
    }
    const lastPageKey = sortKeyFromItem(lastLoadedPage.value.page[lastLoadedPage.value.page.length - 1]);
    const isAfterLastPage = sortOrder === "asc" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compareValues"])(insertedKey, lastPageKey) >= 0 : (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compareValues"])(insertedKey, lastPageKey) <= 0;
    if (isAfterLastPage) {
        if (lastLoadedPage.value.isDone) {
            localQueryStore.setQuery(paginatedQuery, lastLoadedPage.args, {
                ...lastLoadedPage.value,
                page: [
                    ...lastLoadedPage.value.page,
                    item
                ]
            });
        }
        return;
    }
    const successorPageIndex = sortedPages.findIndex((p)=>sortOrder === "asc" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compareValues"])(sortKeyFromItem(p.value.page[0]), insertedKey) > 0 : (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compareValues"])(sortKeyFromItem(p.value.page[0]), insertedKey) < 0);
    const pageToUpdate = successorPageIndex === -1 ? sortedPages[sortedPages.length - 1] : sortedPages[successorPageIndex - 1];
    if (pageToUpdate === void 0) {
        return;
    }
    const indexWithinPage = pageToUpdate.value.page.findIndex((e)=>sortOrder === "asc" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compareValues"])(sortKeyFromItem(e), insertedKey) >= 0 : (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$compare$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compareValues"])(sortKeyFromItem(e), insertedKey) <= 0);
    const newPage = indexWithinPage === -1 ? [
        ...pageToUpdate.value.page,
        item
    ] : [
        ...pageToUpdate.value.page.slice(0, indexWithinPage),
        item,
        ...pageToUpdate.value.page.slice(indexWithinPage)
    ];
    localQueryStore.setQuery(paginatedQuery, pageToUpdate.args, {
        ...pageToUpdate.value,
        page: newPage
    });
} //# sourceMappingURL=use_paginated_query.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/use_paginated_query2.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "resetPaginationId",
    ()=>resetPaginationId,
    "usePaginatedQuery_experimental",
    ()=>usePaginatedQuery_experimental
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/server/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/value.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$use_queries$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/use_queries.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/errors.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/client.js [app-ssr] (ecmascript)");
"use strict";
;
;
;
;
;
;
function usePaginatedQuery_experimental(query, args, options) {
    if (typeof options?.initialNumItems !== "number" || options.initialNumItems < 0) {
        throw new Error(`\`options.initialNumItems\` must be a positive number. Received \`${options?.initialNumItems}\`.`);
    }
    const skip = args === "skip";
    const argsObject = skip ? {} : args;
    const convexClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useConvex"])();
    const logger = convexClient.logger;
    const createInitialState = ()=>{
        const id = nextPaginationId();
        return {
            query,
            args: argsObject,
            id,
            // Queries will contain zero or one queries forever.
            queries: skip ? {} : {
                paginatedQuery: {
                    query,
                    args: {
                        ...argsObject
                    },
                    paginationOptions: {
                        initialNumItems: options.initialNumItems,
                        id
                    }
                }
            },
            skip
        };
    };
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(createInitialState);
    let currState = state;
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(query) !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getFunctionName"])(state.query) || JSON.stringify((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(argsObject)) !== JSON.stringify((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convexToJson"])(state.args)) || skip !== state.skip) {
        currState = createInitialState();
        setState(currState);
    }
    const resultsObject = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$use_queries$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQueries"])(currState.queries);
    if (!("paginatedQuery" in resultsObject)) {
        if (!skip) {
            throw new Error("Why is it missing?");
        }
        return {
            results: [],
            status: "LoadingFirstPage",
            isLoading: true,
            loadMore: function skipNOP(_numItems) {
                return false;
            }
        };
    }
    const result = resultsObject.paginatedQuery;
    if (result === void 0) {
        return {
            results: [],
            loadMore: ()=>false,
            isLoading: true,
            status: "LoadingFirstPage"
        };
    }
    if (result instanceof Error) {
        if (result.message.includes("InvalidCursor") || result instanceof __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConvexError"] && typeof result.data === "object" && result.data?.isConvexSystemError === true && result.data?.paginationError === "InvalidCursor") {
            logger.warn("usePaginatedQuery hit error, resetting pagination state: " + result.message);
            setState(createInitialState);
            return {
                results: [],
                loadMore: ()=>false,
                isLoading: true,
                status: "LoadingFirstPage"
            };
        } else {
            throw result;
        }
    }
    return {
        ...result,
        loadMore: (num)=>{
            return result.loadMore(num);
        },
        isLoading: result.status === "LoadingFirstPage" ? true : result.status === "LoadingMore" ? true : false
    };
}
let paginationId = 0;
function nextPaginationId() {
    paginationId++;
    return paginationId;
}
function resetPaginationId() {
    paginationId = 0;
} //# sourceMappingURL=use_paginated_query2.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/ConvexAuthState.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConvexProviderWithAuth",
    ()=>ConvexProviderWithAuth,
    "useConvexAuth",
    ()=>useConvexAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/client.js [app-ssr] (ecmascript)");
"use strict";
;
;
const ConvexAuthContext = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(void 0);
function useConvexAuth() {
    const authContext = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(ConvexAuthContext);
    if (authContext === void 0) {
        throw new Error("Could not find `ConvexProviderWithAuth` (or `ConvexProviderWithClerk` or `ConvexProviderWithAuth0`) as an ancestor component. This component may be missing, or you might have two instances of the `convex/react` module loaded in your project.");
    }
    return authContext;
}
function ConvexProviderWithAuth({ children, client, useAuth }) {
    const { isLoading: authProviderLoading, isAuthenticated: authProviderAuthenticated, fetchAccessToken } = useAuth();
    const [isConvexAuthenticated, setIsConvexAuthenticated] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    if (authProviderLoading && isConvexAuthenticated !== null) {
        setIsConvexAuthenticated(null);
    }
    if (!authProviderLoading && !authProviderAuthenticated && isConvexAuthenticated !== false) {
        setIsConvexAuthenticated(false);
    }
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(ConvexAuthContext.Provider, {
        value: {
            isLoading: isConvexAuthenticated === null,
            isAuthenticated: authProviderAuthenticated && (isConvexAuthenticated ?? false)
        }
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(ConvexAuthStateFirstEffect, {
        authProviderAuthenticated,
        fetchAccessToken,
        authProviderLoading,
        client,
        setIsConvexAuthenticated
    }), /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConvexProvider"], {
        client
    }, children), /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(ConvexAuthStateLastEffect, {
        authProviderAuthenticated,
        fetchAccessToken,
        authProviderLoading,
        client,
        setIsConvexAuthenticated
    }));
}
function ConvexAuthStateFirstEffect({ authProviderAuthenticated, fetchAccessToken, authProviderLoading, client, setIsConvexAuthenticated }) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        let isThisEffectRelevant = true;
        if (authProviderAuthenticated) {
            client.setAuth(fetchAccessToken, (backendReportsIsAuthenticated)=>{
                if (isThisEffectRelevant) {
                    setIsConvexAuthenticated(()=>backendReportsIsAuthenticated);
                }
            });
            return ()=>{
                isThisEffectRelevant = false;
                setIsConvexAuthenticated((isConvexAuthenticated)=>isConvexAuthenticated ? false : null);
            };
        }
    }, [
        authProviderAuthenticated,
        fetchAccessToken,
        authProviderLoading,
        client,
        setIsConvexAuthenticated
    ]);
    return null;
}
function ConvexAuthStateLastEffect({ authProviderAuthenticated, fetchAccessToken, authProviderLoading, client, setIsConvexAuthenticated }) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (authProviderAuthenticated) {
            return ()=>{
                client.clearAuth();
                setIsConvexAuthenticated(()=>null);
            };
        }
    }, [
        authProviderAuthenticated,
        fetchAccessToken,
        authProviderLoading,
        client,
        setIsConvexAuthenticated
    ]);
    return null;
} //# sourceMappingURL=ConvexAuthState.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/auth_helpers.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthLoading",
    ()=>AuthLoading,
    "Authenticated",
    ()=>Authenticated,
    "Unauthenticated",
    ()=>Unauthenticated
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$ConvexAuthState$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/ConvexAuthState.js [app-ssr] (ecmascript)");
"use strict";
;
;
function Authenticated({ children }) {
    const { isLoading, isAuthenticated } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$ConvexAuthState$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useConvexAuth"])();
    if (isLoading || !isAuthenticated) {
        return null;
    }
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].Fragment, null, children);
}
function Unauthenticated({ children }) {
    const { isLoading, isAuthenticated } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$ConvexAuthState$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useConvexAuth"])();
    if (isLoading || isAuthenticated) {
        return null;
    }
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].Fragment, null, children);
}
function AuthLoading({ children }) {
    const { isLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$ConvexAuthState$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useConvexAuth"])();
    if (!isLoading) {
        return null;
    }
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].Fragment, null, children);
} //# sourceMappingURL=auth_helpers.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/hydration.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "usePreloadedQuery",
    ()=>usePreloadedQuery
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/client.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/server/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/values/value.js [app-ssr] (ecmascript)");
"use strict";
;
;
;
;
function usePreloadedQuery(preloadedQuery) {
    const args = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsonToConvex"])(preloadedQuery._argsJSON), [
        preloadedQuery._argsJSON
    ]);
    const preloadedResult = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsonToConvex"])(preloadedQuery._valueJSON), [
        preloadedQuery._valueJSON
    ]);
    const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["makeFunctionReference"])(preloadedQuery._name), args);
    return result === void 0 ? preloadedResult : result;
} //# sourceMappingURL=hydration.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/index.js [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$use_paginated_query$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/use_paginated_query.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$use_paginated_query2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/use_paginated_query2.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$use_queries$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/use_queries.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$auth_helpers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/auth_helpers.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$ConvexAuthState$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/ConvexAuthState.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$hydration$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/hydration.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$use_subscription$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/use_subscription.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/client.js [app-ssr] (ecmascript)"); //# sourceMappingURL=index.js.map
"use strict";
;
;
;
;
;
;
;
;
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react-clerk/ConvexProviderWithClerk.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConvexProviderWithClerk",
    ()=>ConvexProviderWithClerk
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$ConvexAuthState$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/ConvexAuthState.js [app-ssr] (ecmascript)");
"use strict";
;
;
;
function ConvexProviderWithClerk({ children, client, useAuth }) {
    const useAuthFromClerk = useUseAuthFromClerk(useAuth);
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$ConvexAuthState$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConvexProviderWithAuth"], {
        client,
        useAuth: useAuthFromClerk
    }, children);
}
function useUseAuthFromClerk(useAuth) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>function useAuthFromClerk() {
            const { isLoaded, isSignedIn, getToken, orgId, orgRole } = useAuth();
            const fetchAccessToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ({ forceRefreshToken })=>{
                try {
                    return await getToken({
                        template: "convex",
                        skipCache: forceRefreshToken
                    });
                } catch  {
                    return null;
                }
            }, // Build a new fetchAccessToken to trigger setAuth() whenever these change.
            // Anything else from the JWT Clerk wants to be reactive goes here too.
            // Clerk's Expo useAuth hook is not memoized so we don't include getToken.
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [
                orgId,
                orgRole
            ]);
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>({
                    isLoading: !isLoaded,
                    isAuthenticated: isSignedIn ?? false,
                    fetchAccessToken
                }), [
                isLoaded,
                isSignedIn,
                fetchAccessToken
            ]);
        }, [
        useAuth
    ]);
} //# sourceMappingURL=ConvexProviderWithClerk.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react-clerk/index.js [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2d$clerk$2f$ConvexProviderWithClerk$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react-clerk/ConvexProviderWithClerk.js [app-ssr] (ecmascript)"); //# sourceMappingURL=index.js.map
"use strict";
;
}),
];

//# sourceMappingURL=2fe65_convex_dist_esm_722bbcf7._.js.map