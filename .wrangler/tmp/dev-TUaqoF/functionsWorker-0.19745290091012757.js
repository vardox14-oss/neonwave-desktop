var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// .wrangler/tmp/bundle-6SKfb5/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/pages-Sa1gDu/functionsWorker-0.19745290091012757.mjs
var __create = Object.create;
var __defProp2 = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var __require2 = /* @__PURE__ */ ((x) => typeof __require !== "undefined" ? __require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: /* @__PURE__ */ __name((a, b) => (typeof __require !== "undefined" ? __require : a)[b], "get")
}) : x)(function(x) {
  if (typeof __require !== "undefined") return __require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = /* @__PURE__ */ __name((fn, res) => /* @__PURE__ */ __name(function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
}, "__init"), "__esm");
var __commonJS = /* @__PURE__ */ __name((cb, mod) => /* @__PURE__ */ __name(function __require22() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
}, "__require2"), "__commonJS");
var __copyProps = /* @__PURE__ */ __name((to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp2(to, key, { get: /* @__PURE__ */ __name(() => from[key], "get"), enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
}, "__copyProps");
var __toESM = /* @__PURE__ */ __name((mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
  mod
)), "__toESM");
function checkURL2(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls2.has(url.toString())) {
      urls2.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL2, "checkURL");
var urls2;
var init_checked_fetch = __esm({
  "../.wrangler/tmp/bundle-jEwIp1/checked-fetch.js"() {
    urls2 = /* @__PURE__ */ new Set();
    __name2(checkURL2, "checkURL");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        const [request, init] = argArray;
        checkURL2(request, init);
        return Reflect.apply(target, thisArg, argArray);
      }
    });
  }
});
var compose;
var init_compose = __esm({
  "../node_modules/hono/dist/compose.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    compose = /* @__PURE__ */ __name2((middleware, onError, onNotFound) => {
      return (context, next) => {
        let index = -1;
        return dispatch(0);
        async function dispatch(i) {
          if (i <= index) {
            throw new Error("next() called multiple times");
          }
          index = i;
          let res;
          let isError = false;
          let handler;
          if (middleware[i]) {
            handler = middleware[i][0][0];
            context.req.routeIndex = i;
          } else {
            handler = i === middleware.length && next || void 0;
          }
          if (handler) {
            try {
              res = await handler(context, () => dispatch(i + 1));
            } catch (err) {
              if (err instanceof Error && onError) {
                context.error = err;
                res = await onError(err, context);
                isError = true;
              } else {
                throw err;
              }
            }
          } else {
            if (context.finalized === false && onNotFound) {
              res = await onNotFound(context);
            }
          }
          if (res && (context.finalized === false || isError)) {
            context.res = res;
          }
          return context;
        }
        __name(dispatch, "dispatch");
        __name2(dispatch, "dispatch");
      };
    }, "compose");
  }
});
var init_http_exception = __esm({
  "../node_modules/hono/dist/http-exception.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
  }
});
var GET_MATCH_RESULT;
var init_constants = __esm({
  "../node_modules/hono/dist/request/constants.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    GET_MATCH_RESULT = /* @__PURE__ */ Symbol();
  }
});
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var parseBody;
var handleParsingAllValues;
var handleParsingNestedValues;
var init_body = __esm({
  "../node_modules/hono/dist/utils/body.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_request();
    parseBody = /* @__PURE__ */ __name2(async (request, options = /* @__PURE__ */ Object.create(null)) => {
      const { all = false, dot = false } = options;
      const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
      const contentType = headers.get("Content-Type");
      if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
        return parseFormData(request, { all, dot });
      }
      return {};
    }, "parseBody");
    __name2(parseFormData, "parseFormData");
    __name2(convertFormDataToBodyData, "convertFormDataToBodyData");
    handleParsingAllValues = /* @__PURE__ */ __name2((form, key, value) => {
      if (form[key] !== void 0) {
        if (Array.isArray(form[key])) {
          ;
          form[key].push(value);
        } else {
          form[key] = [form[key], value];
        }
      } else {
        if (!key.endsWith("[]")) {
          form[key] = value;
        } else {
          form[key] = [value];
        }
      }
    }, "handleParsingAllValues");
    handleParsingNestedValues = /* @__PURE__ */ __name2((form, key, value) => {
      if (/(?:^|\.)__proto__\./.test(key)) {
        return;
      }
      let nestedForm = form;
      const keys = key.split(".");
      keys.forEach((key2, index) => {
        if (index === keys.length - 1) {
          nestedForm[key2] = value;
        } else {
          if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
            nestedForm[key2] = /* @__PURE__ */ Object.create(null);
          }
          nestedForm = nestedForm[key2];
        }
      });
    }, "handleParsingNestedValues");
  }
});
var splitPath;
var splitRoutingPath;
var extractGroupsFromPath;
var replaceGroupMarks;
var patternCache;
var getPattern;
var tryDecode;
var tryDecodeURI;
var getPath;
var getPathNoStrict;
var mergePath;
var checkOptionalParameter;
var _decodeURI;
var _getQueryParam;
var getQueryParam;
var getQueryParams;
var decodeURIComponent_;
var init_url = __esm({
  "../node_modules/hono/dist/utils/url.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    splitPath = /* @__PURE__ */ __name2((path) => {
      const paths = path.split("/");
      if (paths[0] === "") {
        paths.shift();
      }
      return paths;
    }, "splitPath");
    splitRoutingPath = /* @__PURE__ */ __name2((routePath) => {
      const { groups, path } = extractGroupsFromPath(routePath);
      const paths = splitPath(path);
      return replaceGroupMarks(paths, groups);
    }, "splitRoutingPath");
    extractGroupsFromPath = /* @__PURE__ */ __name2((path) => {
      const groups = [];
      path = path.replace(/\{[^}]+\}/g, (match3, index) => {
        const mark = `@${index}`;
        groups.push([mark, match3]);
        return mark;
      });
      return { groups, path };
    }, "extractGroupsFromPath");
    replaceGroupMarks = /* @__PURE__ */ __name2((paths, groups) => {
      for (let i = groups.length - 1; i >= 0; i--) {
        const [mark] = groups[i];
        for (let j = paths.length - 1; j >= 0; j--) {
          if (paths[j].includes(mark)) {
            paths[j] = paths[j].replace(mark, groups[i][1]);
            break;
          }
        }
      }
      return paths;
    }, "replaceGroupMarks");
    patternCache = {};
    getPattern = /* @__PURE__ */ __name2((label, next) => {
      if (label === "*") {
        return "*";
      }
      const match3 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      if (match3) {
        const cacheKey = `${label}#${next}`;
        if (!patternCache[cacheKey]) {
          if (match3[2]) {
            patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match3[1], new RegExp(`^${match3[2]}(?=/${next})`)] : [label, match3[1], new RegExp(`^${match3[2]}$`)];
          } else {
            patternCache[cacheKey] = [label, match3[1], true];
          }
        }
        return patternCache[cacheKey];
      }
      return null;
    }, "getPattern");
    tryDecode = /* @__PURE__ */ __name2((str, decoder) => {
      try {
        return decoder(str);
      } catch {
        return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match3) => {
          try {
            return decoder(match3);
          } catch {
            return match3;
          }
        });
      }
    }, "tryDecode");
    tryDecodeURI = /* @__PURE__ */ __name2((str) => tryDecode(str, decodeURI), "tryDecodeURI");
    getPath = /* @__PURE__ */ __name2((request) => {
      const url = request.url;
      const start = url.indexOf("/", url.indexOf(":") + 4);
      let i = start;
      for (; i < url.length; i++) {
        const charCode = url.charCodeAt(i);
        if (charCode === 37) {
          const queryIndex = url.indexOf("?", i);
          const hashIndex = url.indexOf("#", i);
          const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
          const path = url.slice(start, end);
          return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
        } else if (charCode === 63 || charCode === 35) {
          break;
        }
      }
      return url.slice(start, i);
    }, "getPath");
    getPathNoStrict = /* @__PURE__ */ __name2((request) => {
      const result = getPath(request);
      return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
    }, "getPathNoStrict");
    mergePath = /* @__PURE__ */ __name2((base, sub, ...rest) => {
      if (rest.length) {
        sub = mergePath(sub, ...rest);
      }
      return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
    }, "mergePath");
    checkOptionalParameter = /* @__PURE__ */ __name2((path) => {
      if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
        return null;
      }
      const segments = path.split("/");
      const results = [];
      let basePath = "";
      segments.forEach((segment) => {
        if (segment !== "" && !/\:/.test(segment)) {
          basePath += "/" + segment;
        } else if (/\:/.test(segment)) {
          if (/\?/.test(segment)) {
            if (results.length === 0 && basePath === "") {
              results.push("/");
            } else {
              results.push(basePath);
            }
            const optionalSegment = segment.replace("?", "");
            basePath += "/" + optionalSegment;
            results.push(basePath);
          } else {
            basePath += "/" + segment;
          }
        }
      });
      return results.filter((v, i, a) => a.indexOf(v) === i);
    }, "checkOptionalParameter");
    _decodeURI = /* @__PURE__ */ __name2((value) => {
      if (!/[%+]/.test(value)) {
        return value;
      }
      if (value.indexOf("+") !== -1) {
        value = value.replace(/\+/g, " ");
      }
      return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
    }, "_decodeURI");
    _getQueryParam = /* @__PURE__ */ __name2((url, key, multiple) => {
      let encoded;
      if (!multiple && key && !/[%+]/.test(key)) {
        let keyIndex2 = url.indexOf("?", 8);
        if (keyIndex2 === -1) {
          return void 0;
        }
        if (!url.startsWith(key, keyIndex2 + 1)) {
          keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
        }
        while (keyIndex2 !== -1) {
          const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
          if (trailingKeyCode === 61) {
            const valueIndex = keyIndex2 + key.length + 2;
            const endIndex = url.indexOf("&", valueIndex);
            return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
          } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
            return "";
          }
          keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
        }
        encoded = /[%+]/.test(url);
        if (!encoded) {
          return void 0;
        }
      }
      const results = {};
      encoded ??= /[%+]/.test(url);
      let keyIndex = url.indexOf("?", 8);
      while (keyIndex !== -1) {
        const nextKeyIndex = url.indexOf("&", keyIndex + 1);
        let valueIndex = url.indexOf("=", keyIndex);
        if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
          valueIndex = -1;
        }
        let name = url.slice(
          keyIndex + 1,
          valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
        );
        if (encoded) {
          name = _decodeURI(name);
        }
        keyIndex = nextKeyIndex;
        if (name === "") {
          continue;
        }
        let value;
        if (valueIndex === -1) {
          value = "";
        } else {
          value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
          if (encoded) {
            value = _decodeURI(value);
          }
        }
        if (multiple) {
          if (!(results[name] && Array.isArray(results[name]))) {
            results[name] = [];
          }
          ;
          results[name].push(value);
        } else {
          results[name] ??= value;
        }
      }
      return key ? results[key] : results;
    }, "_getQueryParam");
    getQueryParam = _getQueryParam;
    getQueryParams = /* @__PURE__ */ __name2((url, key) => {
      return _getQueryParam(url, key, true);
    }, "getQueryParams");
    decodeURIComponent_ = decodeURIComponent;
  }
});
var tryDecodeURIComponent;
var HonoRequest;
var init_request = __esm({
  "../node_modules/hono/dist/request.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_http_exception();
    init_constants();
    init_body();
    init_url();
    tryDecodeURIComponent = /* @__PURE__ */ __name2((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
    HonoRequest = class {
      static {
        __name(this, "HonoRequest");
      }
      static {
        __name2(this, "HonoRequest");
      }
      /**
       * `.raw` can get the raw Request object.
       *
       * @see {@link https://hono.dev/docs/api/request#raw}
       *
       * @example
       * ```ts
       * // For Cloudflare Workers
       * app.post('/', async (c) => {
       *   const metadata = c.req.raw.cf?.hostMetadata?
       *   ...
       * })
       * ```
       */
      raw;
      #validatedData;
      // Short name of validatedData
      #matchResult;
      routeIndex = 0;
      /**
       * `.path` can get the pathname of the request.
       *
       * @see {@link https://hono.dev/docs/api/request#path}
       *
       * @example
       * ```ts
       * app.get('/about/me', (c) => {
       *   const pathname = c.req.path // `/about/me`
       * })
       * ```
       */
      path;
      bodyCache = {};
      constructor(request, path = "/", matchResult = [[]]) {
        this.raw = request;
        this.path = path;
        this.#matchResult = matchResult;
        this.#validatedData = {};
      }
      param(key) {
        return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
      }
      #getDecodedParam(key) {
        const paramKey = this.#matchResult[0][this.routeIndex][1][key];
        const param = this.#getParamValue(paramKey);
        return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
      }
      #getAllDecodedParams() {
        const decoded = {};
        const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
        for (const key of keys) {
          const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
          if (value !== void 0) {
            decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
          }
        }
        return decoded;
      }
      #getParamValue(paramKey) {
        return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
      }
      query(key) {
        return getQueryParam(this.url, key);
      }
      queries(key) {
        return getQueryParams(this.url, key);
      }
      header(name) {
        if (name) {
          return this.raw.headers.get(name) ?? void 0;
        }
        const headerData = {};
        this.raw.headers.forEach((value, key) => {
          headerData[key] = value;
        });
        return headerData;
      }
      async parseBody(options) {
        return parseBody(this, options);
      }
      #cachedBody = /* @__PURE__ */ __name2((key) => {
        const { bodyCache, raw: raw2 } = this;
        const cachedBody = bodyCache[key];
        if (cachedBody) {
          return cachedBody;
        }
        const anyCachedKey = Object.keys(bodyCache)[0];
        if (anyCachedKey) {
          return bodyCache[anyCachedKey].then((body) => {
            if (anyCachedKey === "json") {
              body = JSON.stringify(body);
            }
            return new Response(body)[key]();
          });
        }
        return bodyCache[key] = raw2[key]();
      }, "#cachedBody");
      /**
       * `.json()` can parse Request body of type `application/json`
       *
       * @see {@link https://hono.dev/docs/api/request#json}
       *
       * @example
       * ```ts
       * app.post('/entry', async (c) => {
       *   const body = await c.req.json()
       * })
       * ```
       */
      json() {
        return this.#cachedBody("text").then((text) => JSON.parse(text));
      }
      /**
       * `.text()` can parse Request body of type `text/plain`
       *
       * @see {@link https://hono.dev/docs/api/request#text}
       *
       * @example
       * ```ts
       * app.post('/entry', async (c) => {
       *   const body = await c.req.text()
       * })
       * ```
       */
      text() {
        return this.#cachedBody("text");
      }
      /**
       * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
       *
       * @see {@link https://hono.dev/docs/api/request#arraybuffer}
       *
       * @example
       * ```ts
       * app.post('/entry', async (c) => {
       *   const body = await c.req.arrayBuffer()
       * })
       * ```
       */
      arrayBuffer() {
        return this.#cachedBody("arrayBuffer");
      }
      /**
       * `.bytes()` parses the request body as a `Uint8Array`.
       *
       * @see {@link https://hono.dev/docs/api/request#bytes}
       *
       * @example
       * ```ts
       * app.post('/entry', async (c) => {
       *   const body = await c.req.bytes()
       * })
       * ```
       */
      bytes() {
        return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
      }
      /**
       * Parses the request body as a `Blob`.
       * @example
       * ```ts
       * app.post('/entry', async (c) => {
       *   const body = await c.req.blob();
       * });
       * ```
       * @see https://hono.dev/docs/api/request#blob
       */
      blob() {
        return this.#cachedBody("blob");
      }
      /**
       * Parses the request body as `FormData`.
       * @example
       * ```ts
       * app.post('/entry', async (c) => {
       *   const body = await c.req.formData();
       * });
       * ```
       * @see https://hono.dev/docs/api/request#formdata
       */
      formData() {
        return this.#cachedBody("formData");
      }
      /**
       * Adds validated data to the request.
       *
       * @param target - The target of the validation.
       * @param data - The validated data to add.
       */
      addValidatedData(target, data) {
        this.#validatedData[target] = data;
      }
      valid(target) {
        return this.#validatedData[target];
      }
      /**
       * `.url()` can get the request url strings.
       *
       * @see {@link https://hono.dev/docs/api/request#url}
       *
       * @example
       * ```ts
       * app.get('/about/me', (c) => {
       *   const url = c.req.url // `http://localhost:8787/about/me`
       *   ...
       * })
       * ```
       */
      get url() {
        return this.raw.url;
      }
      /**
       * `.method()` can get the method name of the request.
       *
       * @see {@link https://hono.dev/docs/api/request#method}
       *
       * @example
       * ```ts
       * app.get('/about/me', (c) => {
       *   const method = c.req.method // `GET`
       * })
       * ```
       */
      get method() {
        return this.raw.method;
      }
      get [GET_MATCH_RESULT]() {
        return this.#matchResult;
      }
      /**
       * `.matchedRoutes()` can return a matched route in the handler
       *
       * @deprecated
       *
       * Use matchedRoutes helper defined in "hono/route" instead.
       *
       * @see {@link https://hono.dev/docs/api/request#matchedroutes}
       *
       * @example
       * ```ts
       * app.use('*', async function logger(c, next) {
       *   await next()
       *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
       *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
       *     console.log(
       *       method,
       *       ' ',
       *       path,
       *       ' '.repeat(Math.max(10 - path.length, 0)),
       *       name,
       *       i === c.req.routeIndex ? '<- respond from here' : ''
       *     )
       *   })
       * })
       * ```
       */
      get matchedRoutes() {
        return this.#matchResult[0].map(([[, route]]) => route);
      }
      /**
       * `routePath()` can retrieve the path registered within the handler
       *
       * @deprecated
       *
       * Use routePath helper defined in "hono/route" instead.
       *
       * @see {@link https://hono.dev/docs/api/request#routepath}
       *
       * @example
       * ```ts
       * app.get('/posts/:id', (c) => {
       *   return c.json({ path: c.req.routePath })
       * })
       * ```
       */
      get routePath() {
        return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
      }
    };
  }
});
var HtmlEscapedCallbackPhase;
var raw;
var resolveCallback;
var init_html = __esm({
  "../node_modules/hono/dist/utils/html.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    HtmlEscapedCallbackPhase = {
      Stringify: 1,
      BeforeStream: 2,
      Stream: 3
    };
    raw = /* @__PURE__ */ __name2((value, callbacks) => {
      const escapedString = new String(value);
      escapedString.isEscaped = true;
      escapedString.callbacks = callbacks;
      return escapedString;
    }, "raw");
    resolveCallback = /* @__PURE__ */ __name2(async (str, phase, preserveCallbacks, context, buffer) => {
      if (typeof str === "object" && !(str instanceof String)) {
        if (!(str instanceof Promise)) {
          str = str.toString();
        }
        if (str instanceof Promise) {
          str = await str;
        }
      }
      const callbacks = str.callbacks;
      if (!callbacks?.length) {
        return Promise.resolve(str);
      }
      if (buffer) {
        buffer[0] += str;
      } else {
        buffer = [str];
      }
      const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
        (res) => Promise.all(
          res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
        ).then(() => buffer[0])
      );
      if (preserveCallbacks) {
        return raw(await resStr, callbacks);
      } else {
        return resStr;
      }
    }, "resolveCallback");
  }
});
var TEXT_PLAIN;
var setDefaultContentType;
var createResponseInstance;
var Context;
var init_context = __esm({
  "../node_modules/hono/dist/context.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_request();
    init_html();
    TEXT_PLAIN = "text/plain; charset=UTF-8";
    setDefaultContentType = /* @__PURE__ */ __name2((contentType, headers) => {
      return {
        "Content-Type": contentType,
        ...headers
      };
    }, "setDefaultContentType");
    createResponseInstance = /* @__PURE__ */ __name2((body, init) => new Response(body, init), "createResponseInstance");
    Context = class {
      static {
        __name(this, "Context");
      }
      static {
        __name2(this, "Context");
      }
      #rawRequest;
      #req;
      /**
       * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
       *
       * @see {@link https://hono.dev/docs/api/context#env}
       *
       * @example
       * ```ts
       * // Environment object for Cloudflare Workers
       * app.get('*', async c => {
       *   const counter = c.env.COUNTER
       * })
       * ```
       */
      env = {};
      #var;
      finalized = false;
      /**
       * `.error` can get the error object from the middleware if the Handler throws an error.
       *
       * @see {@link https://hono.dev/docs/api/context#error}
       *
       * @example
       * ```ts
       * app.use('*', async (c, next) => {
       *   await next()
       *   if (c.error) {
       *     // do something...
       *   }
       * })
       * ```
       */
      error;
      #status;
      #executionCtx;
      #res;
      #layout;
      #renderer;
      #notFoundHandler;
      #preparedHeaders;
      #matchResult;
      #path;
      /**
       * Creates an instance of the Context class.
       *
       * @param req - The Request object.
       * @param options - Optional configuration options for the context.
       */
      constructor(req, options) {
        this.#rawRequest = req;
        if (options) {
          this.#executionCtx = options.executionCtx;
          this.env = options.env;
          this.#notFoundHandler = options.notFoundHandler;
          this.#path = options.path;
          this.#matchResult = options.matchResult;
        }
      }
      /**
       * `.req` is the instance of {@link HonoRequest}.
       */
      get req() {
        this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
        return this.#req;
      }
      /**
       * @see {@link https://hono.dev/docs/api/context#event}
       * The FetchEvent associated with the current request.
       *
       * @throws Will throw an error if the context does not have a FetchEvent.
       */
      get event() {
        if (this.#executionCtx && "respondWith" in this.#executionCtx) {
          return this.#executionCtx;
        } else {
          throw Error("This context has no FetchEvent");
        }
      }
      /**
       * @see {@link https://hono.dev/docs/api/context#executionctx}
       * The ExecutionContext associated with the current request.
       *
       * @throws Will throw an error if the context does not have an ExecutionContext.
       */
      get executionCtx() {
        if (this.#executionCtx) {
          return this.#executionCtx;
        } else {
          throw Error("This context has no ExecutionContext");
        }
      }
      /**
       * @see {@link https://hono.dev/docs/api/context#res}
       * The Response object for the current request.
       */
      get res() {
        return this.#res ||= createResponseInstance(null, {
          headers: this.#preparedHeaders ??= new Headers()
        });
      }
      /**
       * Sets the Response object for the current request.
       *
       * @param _res - The Response object to set.
       */
      set res(_res) {
        if (this.#res && _res) {
          _res = createResponseInstance(_res.body, _res);
          for (const [k, v] of this.#res.headers.entries()) {
            if (k === "content-type") {
              continue;
            }
            if (k === "set-cookie") {
              const cookies = this.#res.headers.getSetCookie();
              _res.headers.delete("set-cookie");
              for (const cookie of cookies) {
                _res.headers.append("set-cookie", cookie);
              }
            } else {
              _res.headers.set(k, v);
            }
          }
        }
        this.#res = _res;
        this.finalized = true;
      }
      /**
       * `.render()` can create a response within a layout.
       *
       * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
       *
       * @example
       * ```ts
       * app.get('/', (c) => {
       *   return c.render('Hello!')
       * })
       * ```
       */
      render = /* @__PURE__ */ __name2((...args) => {
        this.#renderer ??= (content) => this.html(content);
        return this.#renderer(...args);
      }, "render");
      /**
       * Sets the layout for the response.
       *
       * @param layout - The layout to set.
       * @returns The layout function.
       */
      setLayout = /* @__PURE__ */ __name2((layout) => this.#layout = layout, "setLayout");
      /**
       * Gets the current layout for the response.
       *
       * @returns The current layout function.
       */
      getLayout = /* @__PURE__ */ __name2(() => this.#layout, "getLayout");
      /**
       * `.setRenderer()` can set the layout in the custom middleware.
       *
       * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
       *
       * @example
       * ```tsx
       * app.use('*', async (c, next) => {
       *   c.setRenderer((content) => {
       *     return c.html(
       *       <html>
       *         <body>
       *           <p>{content}</p>
       *         </body>
       *       </html>
       *     )
       *   })
       *   await next()
       * })
       * ```
       */
      setRenderer = /* @__PURE__ */ __name2((renderer) => {
        this.#renderer = renderer;
      }, "setRenderer");
      /**
       * `.header()` can set headers.
       *
       * @see {@link https://hono.dev/docs/api/context#header}
       *
       * @example
       * ```ts
       * app.get('/welcome', (c) => {
       *   // Set headers
       *   c.header('X-Message', 'Hello!')
       *   c.header('Content-Type', 'text/plain')
       *
       *   return c.body('Thank you for coming')
       * })
       * ```
       */
      header = /* @__PURE__ */ __name2((name, value, options) => {
        if (this.finalized) {
          this.#res = createResponseInstance(this.#res.body, this.#res);
        }
        const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
        if (value === void 0) {
          headers.delete(name);
        } else if (options?.append) {
          headers.append(name, value);
        } else {
          headers.set(name, value);
        }
      }, "header");
      status = /* @__PURE__ */ __name2((status) => {
        this.#status = status;
      }, "status");
      /**
       * `.set()` can set the value specified by the key.
       *
       * @see {@link https://hono.dev/docs/api/context#set-get}
       *
       * @example
       * ```ts
       * app.use('*', async (c, next) => {
       *   c.set('message', 'Hono is hot!!')
       *   await next()
       * })
       * ```
       */
      set = /* @__PURE__ */ __name2((key, value) => {
        this.#var ??= /* @__PURE__ */ new Map();
        this.#var.set(key, value);
      }, "set");
      /**
       * `.get()` can use the value specified by the key.
       *
       * @see {@link https://hono.dev/docs/api/context#set-get}
       *
       * @example
       * ```ts
       * app.get('/', (c) => {
       *   const message = c.get('message')
       *   return c.text(`The message is "${message}"`)
       * })
       * ```
       */
      get = /* @__PURE__ */ __name2((key) => {
        return this.#var ? this.#var.get(key) : void 0;
      }, "get");
      /**
       * `.var` can access the value of a variable.
       *
       * @see {@link https://hono.dev/docs/api/context#var}
       *
       * @example
       * ```ts
       * const result = c.var.client.oneMethod()
       * ```
       */
      // c.var.propName is a read-only
      get var() {
        if (!this.#var) {
          return {};
        }
        return Object.fromEntries(this.#var);
      }
      #newResponse(data, arg, headers) {
        const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
        if (typeof arg === "object" && "headers" in arg) {
          const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
          for (const [key, value] of argHeaders) {
            if (key.toLowerCase() === "set-cookie") {
              responseHeaders.append(key, value);
            } else {
              responseHeaders.set(key, value);
            }
          }
        }
        if (headers) {
          for (const [k, v] of Object.entries(headers)) {
            if (typeof v === "string") {
              responseHeaders.set(k, v);
            } else {
              responseHeaders.delete(k);
              for (const v2 of v) {
                responseHeaders.append(k, v2);
              }
            }
          }
        }
        const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
        return createResponseInstance(data, { status, headers: responseHeaders });
      }
      newResponse = /* @__PURE__ */ __name2((...args) => this.#newResponse(...args), "newResponse");
      /**
       * `.body()` can return the HTTP response.
       * You can set headers with `.header()` and set HTTP status code with `.status`.
       * This can also be set in `.text()`, `.json()` and so on.
       *
       * @see {@link https://hono.dev/docs/api/context#body}
       *
       * @example
       * ```ts
       * app.get('/welcome', (c) => {
       *   // Set headers
       *   c.header('X-Message', 'Hello!')
       *   c.header('Content-Type', 'text/plain')
       *   // Set HTTP status code
       *   c.status(201)
       *
       *   // Return the response body
       *   return c.body('Thank you for coming')
       * })
       * ```
       */
      body = /* @__PURE__ */ __name2((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
      /**
       * `.text()` can render text as `Content-Type:text/plain`.
       *
       * @see {@link https://hono.dev/docs/api/context#text}
       *
       * @example
       * ```ts
       * app.get('/say', (c) => {
       *   return c.text('Hello!')
       * })
       * ```
       */
      text = /* @__PURE__ */ __name2((text, arg, headers) => {
        return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
          text,
          arg,
          setDefaultContentType(TEXT_PLAIN, headers)
        );
      }, "text");
      /**
       * `.json()` can render JSON as `Content-Type:application/json`.
       *
       * @see {@link https://hono.dev/docs/api/context#json}
       *
       * @example
       * ```ts
       * app.get('/api', (c) => {
       *   return c.json({ message: 'Hello!' })
       * })
       * ```
       */
      json = /* @__PURE__ */ __name2((object, arg, headers) => {
        return this.#newResponse(
          JSON.stringify(object),
          arg,
          setDefaultContentType("application/json", headers)
        );
      }, "json");
      html = /* @__PURE__ */ __name2((html, arg, headers) => {
        const res = /* @__PURE__ */ __name2((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
        return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
      }, "html");
      /**
       * `.redirect()` can Redirect, default status code is 302.
       *
       * @see {@link https://hono.dev/docs/api/context#redirect}
       *
       * @example
       * ```ts
       * app.get('/redirect', (c) => {
       *   return c.redirect('/')
       * })
       * app.get('/redirect-permanently', (c) => {
       *   return c.redirect('/', 301)
       * })
       * ```
       */
      redirect = /* @__PURE__ */ __name2((location, status) => {
        const locationString = String(location);
        this.header(
          "Location",
          // Multibyes should be encoded
          // eslint-disable-next-line no-control-regex
          !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
        );
        return this.newResponse(null, status ?? 302);
      }, "redirect");
      /**
       * `.notFound()` can return the Not Found Response.
       *
       * @see {@link https://hono.dev/docs/api/context#notfound}
       *
       * @example
       * ```ts
       * app.get('/notfound', (c) => {
       *   return c.notFound()
       * })
       * ```
       */
      notFound = /* @__PURE__ */ __name2(() => {
        this.#notFoundHandler ??= () => createResponseInstance();
        return this.#notFoundHandler(this);
      }, "notFound");
    };
  }
});
var METHOD_NAME_ALL;
var METHOD_NAME_ALL_LOWERCASE;
var METHODS;
var MESSAGE_MATCHER_IS_ALREADY_BUILT;
var UnsupportedPathError;
var init_router = __esm({
  "../node_modules/hono/dist/router.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    METHOD_NAME_ALL = "ALL";
    METHOD_NAME_ALL_LOWERCASE = "all";
    METHODS = ["get", "post", "put", "delete", "options", "patch"];
    MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
    UnsupportedPathError = class extends Error {
      static {
        __name(this, "UnsupportedPathError");
      }
      static {
        __name2(this, "UnsupportedPathError");
      }
    };
  }
});
var COMPOSED_HANDLER;
var init_constants2 = __esm({
  "../node_modules/hono/dist/utils/constants.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    COMPOSED_HANDLER = "__COMPOSED_HANDLER";
  }
});
var notFoundHandler;
var errorHandler;
var Hono;
var init_hono_base = __esm({
  "../node_modules/hono/dist/hono-base.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_compose();
    init_context();
    init_router();
    init_constants2();
    init_url();
    notFoundHandler = /* @__PURE__ */ __name2((c) => {
      return c.text("404 Not Found", 404);
    }, "notFoundHandler");
    errorHandler = /* @__PURE__ */ __name2((err, c) => {
      if ("getResponse" in err) {
        const res = err.getResponse();
        return c.newResponse(res.body, res);
      }
      console.error(err);
      return c.text("Internal Server Error", 500);
    }, "errorHandler");
    Hono = class _Hono {
      static {
        __name(this, "_Hono");
      }
      static {
        __name2(this, "_Hono");
      }
      get;
      post;
      put;
      delete;
      options;
      patch;
      all;
      on;
      use;
      /*
        This class is like an abstract class and does not have a router.
        To use it, inherit the class and implement router in the constructor.
      */
      router;
      getPath;
      // Cannot use `#` because it requires visibility at JavaScript runtime.
      _basePath = "/";
      #path = "/";
      routes = [];
      constructor(options = {}) {
        const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
        allMethods.forEach((method) => {
          this[method] = (args1, ...args) => {
            if (typeof args1 === "string") {
              this.#path = args1;
            } else {
              this.#addRoute(method, this.#path, args1);
            }
            args.forEach((handler) => {
              this.#addRoute(method, this.#path, handler);
            });
            return this;
          };
        });
        this.on = (method, path, ...handlers) => {
          for (const p of [path].flat()) {
            this.#path = p;
            for (const m of [method].flat()) {
              handlers.map((handler) => {
                this.#addRoute(m.toUpperCase(), this.#path, handler);
              });
            }
          }
          return this;
        };
        this.use = (arg1, ...handlers) => {
          if (typeof arg1 === "string") {
            this.#path = arg1;
          } else {
            this.#path = "*";
            handlers.unshift(arg1);
          }
          handlers.forEach((handler) => {
            this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
          });
          return this;
        };
        const { strict, ...optionsWithoutStrict } = options;
        Object.assign(this, optionsWithoutStrict);
        this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
      }
      #clone() {
        const clone = new _Hono({
          router: this.router,
          getPath: this.getPath
        });
        clone.errorHandler = this.errorHandler;
        clone.#notFoundHandler = this.#notFoundHandler;
        clone.routes = this.routes;
        return clone;
      }
      #notFoundHandler = notFoundHandler;
      // Cannot use `#` because it requires visibility at JavaScript runtime.
      errorHandler = errorHandler;
      /**
       * `.route()` allows grouping other Hono instance in routes.
       *
       * @see {@link https://hono.dev/docs/api/routing#grouping}
       *
       * @param {string} path - base Path
       * @param {Hono} app - other Hono instance
       * @returns {Hono} routed Hono instance
       *
       * @example
       * ```ts
       * const app = new Hono()
       * const app2 = new Hono()
       *
       * app2.get("/user", (c) => c.text("user"))
       * app.route("/api", app2) // GET /api/user
       * ```
       */
      route(path, app2) {
        const subApp = this.basePath(path);
        app2.routes.map((r) => {
          let handler;
          if (app2.errorHandler === errorHandler) {
            handler = r.handler;
          } else {
            handler = /* @__PURE__ */ __name2(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
            handler[COMPOSED_HANDLER] = r.handler;
          }
          subApp.#addRoute(r.method, r.path, handler, r.basePath);
        });
        return this;
      }
      /**
       * `.basePath()` allows base paths to be specified.
       *
       * @see {@link https://hono.dev/docs/api/routing#base-path}
       *
       * @param {string} path - base Path
       * @returns {Hono} changed Hono instance
       *
       * @example
       * ```ts
       * const api = new Hono().basePath('/api')
       * ```
       */
      basePath(path) {
        const subApp = this.#clone();
        subApp._basePath = mergePath(this._basePath, path);
        return subApp;
      }
      /**
       * `.onError()` handles an error and returns a customized Response.
       *
       * @see {@link https://hono.dev/docs/api/hono#error-handling}
       *
       * @param {ErrorHandler} handler - request Handler for error
       * @returns {Hono} changed Hono instance
       *
       * @example
       * ```ts
       * app.onError((err, c) => {
       *   console.error(`${err}`)
       *   return c.text('Custom Error Message', 500)
       * })
       * ```
       */
      onError = /* @__PURE__ */ __name2((handler) => {
        this.errorHandler = handler;
        return this;
      }, "onError");
      /**
       * `.notFound()` allows you to customize a Not Found Response.
       *
       * @see {@link https://hono.dev/docs/api/hono#not-found}
       *
       * @param {NotFoundHandler} handler - request handler for not-found
       * @returns {Hono} changed Hono instance
       *
       * @example
       * ```ts
       * app.notFound((c) => {
       *   return c.text('Custom 404 Message', 404)
       * })
       * ```
       */
      notFound = /* @__PURE__ */ __name2((handler) => {
        this.#notFoundHandler = handler;
        return this;
      }, "notFound");
      /**
       * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
       *
       * @see {@link https://hono.dev/docs/api/hono#mount}
       *
       * @param {string} path - base Path
       * @param {Function} applicationHandler - other Request Handler
       * @param {MountOptions} [options] - options of `.mount()`
       * @returns {Hono} mounted Hono instance
       *
       * @example
       * ```ts
       * import { Router as IttyRouter } from 'itty-router'
       * import { Hono } from 'hono'
       * // Create itty-router application
       * const ittyRouter = IttyRouter()
       * // GET /itty-router/hello
       * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
       *
       * const app = new Hono()
       * app.mount('/itty-router', ittyRouter.handle)
       * ```
       *
       * @example
       * ```ts
       * const app = new Hono()
       * // Send the request to another application without modification.
       * app.mount('/app', anotherApp, {
       *   replaceRequest: (req) => req,
       * })
       * ```
       */
      mount(path, applicationHandler, options) {
        let replaceRequest;
        let optionHandler;
        if (options) {
          if (typeof options === "function") {
            optionHandler = options;
          } else {
            optionHandler = options.optionHandler;
            if (options.replaceRequest === false) {
              replaceRequest = /* @__PURE__ */ __name2((request) => request, "replaceRequest");
            } else {
              replaceRequest = options.replaceRequest;
            }
          }
        }
        const getOptions = optionHandler ? (c) => {
          const options2 = optionHandler(c);
          return Array.isArray(options2) ? options2 : [options2];
        } : (c) => {
          let executionContext = void 0;
          try {
            executionContext = c.executionCtx;
          } catch {
          }
          return [c.env, executionContext];
        };
        replaceRequest ||= (() => {
          const mergedPath = mergePath(this._basePath, path);
          const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
          return (request) => {
            const url = new URL(request.url);
            url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
            return new Request(url, request);
          };
        })();
        const handler = /* @__PURE__ */ __name2(async (c, next) => {
          const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
          if (res) {
            return res;
          }
          await next();
        }, "handler");
        this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
        return this;
      }
      #addRoute(method, path, handler, baseRoutePath) {
        method = method.toUpperCase();
        path = mergePath(this._basePath, path);
        const r = {
          basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
          path,
          method,
          handler
        };
        this.router.add(method, path, [handler, r]);
        this.routes.push(r);
      }
      #handleError(err, c) {
        if (err instanceof Error) {
          return this.errorHandler(err, c);
        }
        throw err;
      }
      #dispatch(request, executionCtx, env, method) {
        if (method === "HEAD") {
          return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
        }
        const path = this.getPath(request, { env });
        const matchResult = this.router.match(method, path);
        const c = new Context(request, {
          path,
          matchResult,
          env,
          executionCtx,
          notFoundHandler: this.#notFoundHandler
        });
        if (matchResult[0].length === 1) {
          let res;
          try {
            res = matchResult[0][0][0][0](c, async () => {
              c.res = await this.#notFoundHandler(c);
            });
          } catch (err) {
            return this.#handleError(err, c);
          }
          return res instanceof Promise ? res.then(
            (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
          ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
        }
        const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
        return (async () => {
          try {
            const context = await composed(c);
            if (!context.finalized) {
              throw new Error(
                "Context is not finalized. Did you forget to return a Response object or `await next()`?"
              );
            }
            return context.res;
          } catch (err) {
            return this.#handleError(err, c);
          }
        })();
      }
      /**
       * `.fetch()` will be entry point of your app.
       *
       * @see {@link https://hono.dev/docs/api/hono#fetch}
       *
       * @param {Request} request - request Object of request
       * @param {Env} Env - env Object
       * @param {ExecutionContext} - context of execution
       * @returns {Response | Promise<Response>} response of request
       *
       */
      fetch = /* @__PURE__ */ __name2((request, ...rest) => {
        return this.#dispatch(request, rest[1], rest[0], request.method);
      }, "fetch");
      /**
       * `.request()` is a useful method for testing.
       * You can pass a URL or pathname to send a GET request.
       * app will return a Response object.
       * ```ts
       * test('GET /hello is ok', async () => {
       *   const res = await app.request('/hello')
       *   expect(res.status).toBe(200)
       * })
       * ```
       * @see https://hono.dev/docs/api/hono#request
       */
      request = /* @__PURE__ */ __name2((input, requestInit, Env, executionCtx) => {
        if (input instanceof Request) {
          return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
        }
        input = input.toString();
        return this.fetch(
          new Request(
            /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
            requestInit
          ),
          Env,
          executionCtx
        );
      }, "request");
      /**
       * `.fire()` automatically adds a global fetch event listener.
       * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
       * @deprecated
       * Use `fire` from `hono/service-worker` instead.
       * ```ts
       * import { Hono } from 'hono'
       * import { fire } from 'hono/service-worker'
       *
       * const app = new Hono()
       * // ...
       * fire(app)
       * ```
       * @see https://hono.dev/docs/api/hono#fire
       * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
       * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
       */
      fire = /* @__PURE__ */ __name2(() => {
        addEventListener("fetch", (event) => {
          event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
        });
      }, "fire");
    };
  }
});
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match22 = /* @__PURE__ */ __name2(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match22;
  return match22(method, path);
}
__name(match, "match");
var emptyParam;
var init_matcher = __esm({
  "../node_modules/hono/dist/router/reg-exp-router/matcher.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_router();
    emptyParam = [];
    __name2(match, "match");
  }
});
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var LABEL_REG_EXP_STR;
var ONLY_WILDCARD_REG_EXP_STR;
var TAIL_WILDCARD_REG_EXP_STR;
var PATH_ERROR;
var regExpMetaChars;
var Node;
var init_node = __esm({
  "../node_modules/hono/dist/router/reg-exp-router/node.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    LABEL_REG_EXP_STR = "[^/]+";
    ONLY_WILDCARD_REG_EXP_STR = ".*";
    TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
    PATH_ERROR = /* @__PURE__ */ Symbol();
    regExpMetaChars = new Set(".\\+*[^]$()");
    __name2(compareKey, "compareKey");
    Node = class _Node {
      static {
        __name(this, "_Node");
      }
      static {
        __name2(this, "_Node");
      }
      #index;
      #varIndex;
      #children = /* @__PURE__ */ Object.create(null);
      insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
        if (tokens.length === 0) {
          if (this.#index !== void 0) {
            throw PATH_ERROR;
          }
          if (pathErrorCheckOnly) {
            return;
          }
          this.#index = index;
          return;
        }
        const [token, ...restTokens] = tokens;
        const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
        let node;
        if (pattern) {
          const name = pattern[1];
          let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
          if (name && pattern[2]) {
            if (regexpStr === ".*") {
              throw PATH_ERROR;
            }
            regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
            if (/\((?!\?:)/.test(regexpStr)) {
              throw PATH_ERROR;
            }
          }
          node = this.#children[regexpStr];
          if (!node) {
            if (Object.keys(this.#children).some(
              (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
            )) {
              throw PATH_ERROR;
            }
            if (pathErrorCheckOnly) {
              return;
            }
            node = this.#children[regexpStr] = new _Node();
            if (name !== "") {
              node.#varIndex = context.varIndex++;
            }
          }
          if (!pathErrorCheckOnly && name !== "") {
            paramMap.push([name, node.#varIndex]);
          }
        } else {
          node = this.#children[token];
          if (!node) {
            if (Object.keys(this.#children).some(
              (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
            )) {
              throw PATH_ERROR;
            }
            if (pathErrorCheckOnly) {
              return;
            }
            node = this.#children[token] = new _Node();
          }
        }
        node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
      }
      buildRegExpStr() {
        const childKeys = Object.keys(this.#children).sort(compareKey);
        const strList = childKeys.map((k) => {
          const c = this.#children[k];
          return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
        });
        if (typeof this.#index === "number") {
          strList.unshift(`#${this.#index}`);
        }
        if (strList.length === 0) {
          return "";
        }
        if (strList.length === 1) {
          return strList[0];
        }
        return "(?:" + strList.join("|") + ")";
      }
    };
  }
});
var Trie;
var init_trie = __esm({
  "../node_modules/hono/dist/router/reg-exp-router/trie.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_node();
    Trie = class {
      static {
        __name(this, "Trie");
      }
      static {
        __name2(this, "Trie");
      }
      #context = { varIndex: 0 };
      #root = new Node();
      insert(path, index, pathErrorCheckOnly) {
        const paramAssoc = [];
        const groups = [];
        for (let i = 0; ; ) {
          let replaced = false;
          path = path.replace(/\{[^}]+\}/g, (m) => {
            const mark = `@\\${i}`;
            groups[i] = [mark, m];
            i++;
            replaced = true;
            return mark;
          });
          if (!replaced) {
            break;
          }
        }
        const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
        for (let i = groups.length - 1; i >= 0; i--) {
          const [mark] = groups[i];
          for (let j = tokens.length - 1; j >= 0; j--) {
            if (tokens[j].indexOf(mark) !== -1) {
              tokens[j] = tokens[j].replace(mark, groups[i][1]);
              break;
            }
          }
        }
        this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
        return paramAssoc;
      }
      buildRegExp() {
        let regexp = this.#root.buildRegExpStr();
        if (regexp === "") {
          return [/^$/, [], []];
        }
        let captureIndex = 0;
        const indexReplacementMap = [];
        const paramReplacementMap = [];
        regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
          if (handlerIndex !== void 0) {
            indexReplacementMap[++captureIndex] = Number(handlerIndex);
            return "$()";
          }
          if (paramIndex !== void 0) {
            paramReplacementMap[Number(paramIndex)] = ++captureIndex;
            return "";
          }
          return "";
        });
        return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
      }
    };
  }
});
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes2) {
  const trie = new Trie();
  const handlerData = [];
  if (routes2.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes2.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var nullMatcher;
var wildcardRegExpCache;
var RegExpRouter;
var init_router2 = __esm({
  "../node_modules/hono/dist/router/reg-exp-router/router.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_router();
    init_url();
    init_matcher();
    init_node();
    init_trie();
    nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
    wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
    __name2(buildWildcardRegExp, "buildWildcardRegExp");
    __name2(clearWildcardRegExpCache, "clearWildcardRegExpCache");
    __name2(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
    __name2(findMiddleware, "findMiddleware");
    RegExpRouter = class {
      static {
        __name(this, "RegExpRouter");
      }
      static {
        __name2(this, "RegExpRouter");
      }
      name = "RegExpRouter";
      #middleware;
      #routes;
      constructor() {
        this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
        this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
      }
      add(method, path, handler) {
        const middleware = this.#middleware;
        const routes2 = this.#routes;
        if (!middleware || !routes2) {
          throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
        }
        if (!middleware[method]) {
          ;
          [middleware, routes2].forEach((handlerMap) => {
            handlerMap[method] = /* @__PURE__ */ Object.create(null);
            Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
              handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
            });
          });
        }
        if (path === "/*") {
          path = "*";
        }
        const paramCount = (path.match(/\/:/g) || []).length;
        if (/\*$/.test(path)) {
          const re = buildWildcardRegExp(path);
          if (method === METHOD_NAME_ALL) {
            Object.keys(middleware).forEach((m) => {
              middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
            });
          } else {
            middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
          }
          Object.keys(middleware).forEach((m) => {
            if (method === METHOD_NAME_ALL || method === m) {
              Object.keys(middleware[m]).forEach((p) => {
                re.test(p) && middleware[m][p].push([handler, paramCount]);
              });
            }
          });
          Object.keys(routes2).forEach((m) => {
            if (method === METHOD_NAME_ALL || method === m) {
              Object.keys(routes2[m]).forEach(
                (p) => re.test(p) && routes2[m][p].push([handler, paramCount])
              );
            }
          });
          return;
        }
        const paths = checkOptionalParameter(path) || [path];
        for (let i = 0, len = paths.length; i < len; i++) {
          const path2 = paths[i];
          Object.keys(routes2).forEach((m) => {
            if (method === METHOD_NAME_ALL || method === m) {
              routes2[m][path2] ||= [
                ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
              ];
              routes2[m][path2].push([handler, paramCount - len + i + 1]);
            }
          });
        }
      }
      match = match;
      buildAllMatchers() {
        const matchers = /* @__PURE__ */ Object.create(null);
        Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
          matchers[method] ||= this.#buildMatcher(method);
        });
        this.#middleware = this.#routes = void 0;
        clearWildcardRegExpCache();
        return matchers;
      }
      #buildMatcher(method) {
        const routes2 = [];
        let hasOwnRoute = method === METHOD_NAME_ALL;
        [this.#middleware, this.#routes].forEach((r) => {
          const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
          if (ownRoute.length !== 0) {
            hasOwnRoute ||= true;
            routes2.push(...ownRoute);
          } else if (method !== METHOD_NAME_ALL) {
            routes2.push(
              ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
            );
          }
        });
        if (!hasOwnRoute) {
          return null;
        } else {
          return buildMatcherFromPreprocessedRoutes(routes2);
        }
      }
    };
  }
});
var init_prepared_router = __esm({
  "../node_modules/hono/dist/router/reg-exp-router/prepared-router.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_router();
    init_matcher();
    init_router2();
  }
});
var init_reg_exp_router = __esm({
  "../node_modules/hono/dist/router/reg-exp-router/index.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_router2();
    init_prepared_router();
  }
});
var SmartRouter;
var init_router3 = __esm({
  "../node_modules/hono/dist/router/smart-router/router.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_router();
    SmartRouter = class {
      static {
        __name(this, "SmartRouter");
      }
      static {
        __name2(this, "SmartRouter");
      }
      name = "SmartRouter";
      #routers = [];
      #routes = [];
      constructor(init) {
        this.#routers = init.routers;
      }
      add(method, path, handler) {
        if (!this.#routes) {
          throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
        }
        this.#routes.push([method, path, handler]);
      }
      match(method, path) {
        if (!this.#routes) {
          throw new Error("Fatal error");
        }
        const routers = this.#routers;
        const routes2 = this.#routes;
        const len = routers.length;
        let i = 0;
        let res;
        for (; i < len; i++) {
          const router = routers[i];
          try {
            for (let i2 = 0, len2 = routes2.length; i2 < len2; i2++) {
              router.add(...routes2[i2]);
            }
            res = router.match(method, path);
          } catch (e) {
            if (e instanceof UnsupportedPathError) {
              continue;
            }
            throw e;
          }
          this.match = router.match.bind(router);
          this.#routers = [router];
          this.#routes = void 0;
          break;
        }
        if (i === len) {
          throw new Error("Fatal error");
        }
        this.name = `SmartRouter + ${this.activeRouter.name}`;
        return res;
      }
      get activeRouter() {
        if (this.#routes || this.#routers.length !== 1) {
          throw new Error("No active router has been determined yet.");
        }
        return this.#routers[0];
      }
    };
  }
});
var init_smart_router = __esm({
  "../node_modules/hono/dist/router/smart-router/index.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_router3();
  }
});
var emptyParams;
var hasChildren;
var Node2;
var init_node2 = __esm({
  "../node_modules/hono/dist/router/trie-router/node.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_router();
    init_url();
    emptyParams = /* @__PURE__ */ Object.create(null);
    hasChildren = /* @__PURE__ */ __name2((children) => {
      for (const _ in children) {
        return true;
      }
      return false;
    }, "hasChildren");
    Node2 = class _Node2 {
      static {
        __name(this, "_Node2");
      }
      static {
        __name2(this, "_Node");
      }
      #methods;
      #children;
      #patterns;
      #order = 0;
      #params = emptyParams;
      constructor(method, handler, children) {
        this.#children = children || /* @__PURE__ */ Object.create(null);
        this.#methods = [];
        if (method && handler) {
          const m = /* @__PURE__ */ Object.create(null);
          m[method] = { handler, possibleKeys: [], score: 0 };
          this.#methods = [m];
        }
        this.#patterns = [];
      }
      insert(method, path, handler) {
        this.#order = ++this.#order;
        let curNode = this;
        const parts = splitRoutingPath(path);
        const possibleKeys = [];
        for (let i = 0, len = parts.length; i < len; i++) {
          const p = parts[i];
          const nextP = parts[i + 1];
          const pattern = getPattern(p, nextP);
          const key = Array.isArray(pattern) ? pattern[0] : p;
          if (key in curNode.#children) {
            curNode = curNode.#children[key];
            if (pattern) {
              possibleKeys.push(pattern[1]);
            }
            continue;
          }
          curNode.#children[key] = new _Node2();
          if (pattern) {
            curNode.#patterns.push(pattern);
            possibleKeys.push(pattern[1]);
          }
          curNode = curNode.#children[key];
        }
        curNode.#methods.push({
          [method]: {
            handler,
            possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
            score: this.#order
          }
        });
        return curNode;
      }
      #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
        for (let i = 0, len = node.#methods.length; i < len; i++) {
          const m = node.#methods[i];
          const handlerSet = m[method] || m[METHOD_NAME_ALL];
          const processedSet = {};
          if (handlerSet !== void 0) {
            handlerSet.params = /* @__PURE__ */ Object.create(null);
            handlerSets.push(handlerSet);
            if (nodeParams !== emptyParams || params && params !== emptyParams) {
              for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
                const key = handlerSet.possibleKeys[i2];
                const processed = processedSet[handlerSet.score];
                handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
                processedSet[handlerSet.score] = true;
              }
            }
          }
        }
      }
      search(method, path) {
        const handlerSets = [];
        this.#params = emptyParams;
        const curNode = this;
        let curNodes = [curNode];
        const parts = splitPath(path);
        const curNodesQueue = [];
        const len = parts.length;
        let partOffsets = null;
        for (let i = 0; i < len; i++) {
          const part = parts[i];
          const isLast = i === len - 1;
          const tempNodes = [];
          for (let j = 0, len2 = curNodes.length; j < len2; j++) {
            const node = curNodes[j];
            const nextNode = node.#children[part];
            if (nextNode) {
              nextNode.#params = node.#params;
              if (isLast) {
                if (nextNode.#children["*"]) {
                  this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
                }
                this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
              } else {
                tempNodes.push(nextNode);
              }
            }
            for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
              const pattern = node.#patterns[k];
              const params = node.#params === emptyParams ? {} : { ...node.#params };
              if (pattern === "*") {
                const astNode = node.#children["*"];
                if (astNode) {
                  this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
                  astNode.#params = params;
                  tempNodes.push(astNode);
                }
                continue;
              }
              const [key, name, matcher] = pattern;
              if (!part && !(matcher instanceof RegExp)) {
                continue;
              }
              const child = node.#children[key];
              if (matcher instanceof RegExp) {
                if (partOffsets === null) {
                  partOffsets = new Array(len);
                  let offset = path[0] === "/" ? 1 : 0;
                  for (let p = 0; p < len; p++) {
                    partOffsets[p] = offset;
                    offset += parts[p].length + 1;
                  }
                }
                const restPathString = path.substring(partOffsets[i]);
                const m = matcher.exec(restPathString);
                if (m) {
                  params[name] = m[0];
                  this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
                  if (hasChildren(child.#children)) {
                    child.#params = params;
                    const componentCount = m[0].match(/\//)?.length ?? 0;
                    const targetCurNodes = curNodesQueue[componentCount] ||= [];
                    targetCurNodes.push(child);
                  }
                  continue;
                }
              }
              if (matcher === true || matcher.test(part)) {
                params[name] = part;
                if (isLast) {
                  this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
                  if (child.#children["*"]) {
                    this.#pushHandlerSets(
                      handlerSets,
                      child.#children["*"],
                      method,
                      params,
                      node.#params
                    );
                  }
                } else {
                  child.#params = params;
                  tempNodes.push(child);
                }
              }
            }
          }
          const shifted = curNodesQueue.shift();
          curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
        }
        if (handlerSets.length > 1) {
          handlerSets.sort((a, b) => {
            return a.score - b.score;
          });
        }
        return [handlerSets.map(({ handler, params }) => [handler, params])];
      }
    };
  }
});
var TrieRouter;
var init_router4 = __esm({
  "../node_modules/hono/dist/router/trie-router/router.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_url();
    init_node2();
    TrieRouter = class {
      static {
        __name(this, "TrieRouter");
      }
      static {
        __name2(this, "TrieRouter");
      }
      name = "TrieRouter";
      #node;
      constructor() {
        this.#node = new Node2();
      }
      add(method, path, handler) {
        const results = checkOptionalParameter(path);
        if (results) {
          for (let i = 0, len = results.length; i < len; i++) {
            this.#node.insert(method, results[i], handler);
          }
          return;
        }
        this.#node.insert(method, path, handler);
      }
      match(method, path) {
        return this.#node.search(method, path);
      }
    };
  }
});
var init_trie_router = __esm({
  "../node_modules/hono/dist/router/trie-router/index.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_router4();
  }
});
var Hono2;
var init_hono = __esm({
  "../node_modules/hono/dist/hono.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_hono_base();
    init_reg_exp_router();
    init_smart_router();
    init_trie_router();
    Hono2 = class extends Hono {
      static {
        __name(this, "Hono2");
      }
      static {
        __name2(this, "Hono");
      }
      /**
       * Creates an instance of the Hono class.
       *
       * @param options - Optional configuration options for the Hono instance.
       */
      constructor(options = {}) {
        super(options);
        this.router = options.router ?? new SmartRouter({
          routers: [new RegExpRouter(), new TrieRouter()]
        });
      }
    };
  }
});
var init_dist = __esm({
  "../node_modules/hono/dist/index.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_hono();
    init_context();
  }
});
var handle;
var init_handler = __esm({
  "../node_modules/hono/dist/adapter/cloudflare-pages/handler.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_context();
    init_http_exception();
    handle = /* @__PURE__ */ __name2((app2) => (eventContext) => {
      return app2.fetch(
        eventContext.request,
        { ...eventContext.env, eventContext },
        {
          waitUntil: eventContext.waitUntil,
          passThroughOnException: eventContext.passThroughOnException,
          props: {}
        }
      );
    }, "handle");
  }
});
var init_conninfo = __esm({
  "../node_modules/hono/dist/adapter/cloudflare-pages/conninfo.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
  }
});
var init_cloudflare_pages = __esm({
  "../node_modules/hono/dist/adapter/cloudflare-pages/index.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_handler();
    init_conninfo();
  }
});
var validCookieNameRegEx;
var validCookieValueRegEx;
var trimCookieWhitespace;
var parse;
var _serialize;
var serialize;
var init_cookie = __esm({
  "../node_modules/hono/dist/utils/cookie.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_url();
    validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
    validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
    trimCookieWhitespace = /* @__PURE__ */ __name2((value) => {
      let start = 0;
      let end = value.length;
      while (start < end) {
        const charCode = value.charCodeAt(start);
        if (charCode !== 32 && charCode !== 9) {
          break;
        }
        start++;
      }
      while (end > start) {
        const charCode = value.charCodeAt(end - 1);
        if (charCode !== 32 && charCode !== 9) {
          break;
        }
        end--;
      }
      return start === 0 && end === value.length ? value : value.slice(start, end);
    }, "trimCookieWhitespace");
    parse = /* @__PURE__ */ __name2((cookie, name) => {
      if (name && cookie.indexOf(name) === -1) {
        return {};
      }
      const pairs = cookie.split(";");
      const parsedCookie = /* @__PURE__ */ Object.create(null);
      for (const pairStr of pairs) {
        const valueStartPos = pairStr.indexOf("=");
        if (valueStartPos === -1) {
          continue;
        }
        const cookieName = trimCookieWhitespace(pairStr.substring(0, valueStartPos));
        if (name && name !== cookieName || !validCookieNameRegEx.test(cookieName) || cookieName in parsedCookie) {
          continue;
        }
        let cookieValue = trimCookieWhitespace(pairStr.substring(valueStartPos + 1));
        if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
          cookieValue = cookieValue.slice(1, -1);
        }
        if (validCookieValueRegEx.test(cookieValue)) {
          parsedCookie[cookieName] = cookieValue.indexOf("%") !== -1 ? tryDecode(cookieValue, decodeURIComponent_) : cookieValue;
          if (name) {
            break;
          }
        }
      }
      return parsedCookie;
    }, "parse");
    _serialize = /* @__PURE__ */ __name2((name, value, opt = {}) => {
      if (!validCookieNameRegEx.test(name)) {
        throw new Error("Invalid cookie name");
      }
      let cookie = `${name}=${value}`;
      if (name.startsWith("__Secure-") && !opt.secure) {
        throw new Error("__Secure- Cookie must have Secure attributes");
      }
      if (name.startsWith("__Host-")) {
        if (!opt.secure) {
          throw new Error("__Host- Cookie must have Secure attributes");
        }
        if (opt.path !== "/") {
          throw new Error('__Host- Cookie must have Path attributes with "/"');
        }
        if (opt.domain) {
          throw new Error("__Host- Cookie must not have Domain attributes");
        }
      }
      for (const key of ["domain", "path", "sameSite", "priority"]) {
        if (opt[key] && /[;\r\n]/.test(opt[key])) {
          throw new Error(`${key} must not contain ";", "\\r", or "\\n"`);
        }
      }
      if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
        if (opt.maxAge > 3456e4) {
          throw new Error(
            "Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration."
          );
        }
        cookie += `; Max-Age=${opt.maxAge | 0}`;
      }
      if (opt.domain && opt.prefix !== "host") {
        cookie += `; Domain=${opt.domain}`;
      }
      if (opt.path) {
        cookie += `; Path=${opt.path}`;
      }
      if (opt.expires) {
        if (opt.expires.getTime() - Date.now() > 3456e7) {
          throw new Error(
            "Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future."
          );
        }
        cookie += `; Expires=${opt.expires.toUTCString()}`;
      }
      if (opt.httpOnly) {
        cookie += "; HttpOnly";
      }
      if (opt.secure) {
        cookie += "; Secure";
      }
      if (opt.sameSite) {
        cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
      }
      if (opt.priority) {
        cookie += `; Priority=${opt.priority.charAt(0).toUpperCase() + opt.priority.slice(1)}`;
      }
      if (opt.partitioned) {
        if (!opt.secure) {
          throw new Error("Partitioned Cookie must have Secure attributes");
        }
        cookie += "; Partitioned";
      }
      return cookie;
    }, "_serialize");
    serialize = /* @__PURE__ */ __name2((name, value, opt) => {
      value = encodeURIComponent(value);
      return _serialize(name, value, opt);
    }, "serialize");
  }
});
var getCookie;
var generateCookie;
var setCookie;
var init_cookie2 = __esm({
  "../node_modules/hono/dist/helper/cookie/index.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_cookie();
    getCookie = /* @__PURE__ */ __name2((c, key, prefix) => {
      const cookie = c.req.raw.headers.get("Cookie");
      if (typeof key === "string") {
        if (!cookie) {
          return void 0;
        }
        let finalKey = key;
        if (prefix === "secure") {
          finalKey = "__Secure-" + key;
        } else if (prefix === "host") {
          finalKey = "__Host-" + key;
        }
        const obj2 = parse(cookie, finalKey);
        return obj2[finalKey];
      }
      if (!cookie) {
        return {};
      }
      const obj = parse(cookie);
      return obj;
    }, "getCookie");
    generateCookie = /* @__PURE__ */ __name2((name, value, opt) => {
      let cookie;
      if (opt?.prefix === "secure") {
        cookie = serialize("__Secure-" + name, value, { path: "/", ...opt, secure: true });
      } else if (opt?.prefix === "host") {
        cookie = serialize("__Host-" + name, value, {
          ...opt,
          path: "/",
          secure: true,
          domain: void 0
        });
      } else {
        cookie = serialize(name, value, { path: "/", ...opt });
      }
      return cookie;
    }, "generateCookie");
    setCookie = /* @__PURE__ */ __name2((c, name, value, opt) => {
      const cookie = generateCookie(name, value, opt);
      c.header("Set-Cookie", cookie, { append: true });
    }, "setCookie");
  }
});
var decodeBase64Url;
var encodeBase64Url;
var encodeBase64;
var decodeBase64;
var init_encode = __esm({
  "../node_modules/hono/dist/utils/encode.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    decodeBase64Url = /* @__PURE__ */ __name2((str) => {
      return decodeBase64(str.replace(/_|-/g, (m) => ({ _: "/", "-": "+" })[m] ?? m));
    }, "decodeBase64Url");
    encodeBase64Url = /* @__PURE__ */ __name2((buf) => encodeBase64(buf).replace(/\/|\+/g, (m) => ({ "/": "_", "+": "-" })[m] ?? m), "encodeBase64Url");
    encodeBase64 = /* @__PURE__ */ __name2((buf) => {
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0, len = bytes.length; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }, "encodeBase64");
    decodeBase64 = /* @__PURE__ */ __name2((str) => {
      const binary = atob(str);
      const bytes = new Uint8Array(new ArrayBuffer(binary.length));
      const half = binary.length / 2;
      for (let i = 0, j = binary.length - 1; i <= half; i++, j--) {
        bytes[i] = binary.charCodeAt(i);
        bytes[j] = binary.charCodeAt(j);
      }
      return bytes;
    }, "decodeBase64");
  }
});
var AlgorithmTypes;
var init_jwa = __esm({
  "../node_modules/hono/dist/utils/jwt/jwa.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    AlgorithmTypes = /* @__PURE__ */ ((AlgorithmTypes2) => {
      AlgorithmTypes2["HS256"] = "HS256";
      AlgorithmTypes2["HS384"] = "HS384";
      AlgorithmTypes2["HS512"] = "HS512";
      AlgorithmTypes2["RS256"] = "RS256";
      AlgorithmTypes2["RS384"] = "RS384";
      AlgorithmTypes2["RS512"] = "RS512";
      AlgorithmTypes2["PS256"] = "PS256";
      AlgorithmTypes2["PS384"] = "PS384";
      AlgorithmTypes2["PS512"] = "PS512";
      AlgorithmTypes2["ES256"] = "ES256";
      AlgorithmTypes2["ES384"] = "ES384";
      AlgorithmTypes2["ES512"] = "ES512";
      AlgorithmTypes2["EdDSA"] = "EdDSA";
      return AlgorithmTypes2;
    })(AlgorithmTypes || {});
  }
});
var knownUserAgents;
var getRuntimeKey;
var checkUserAgentEquals;
var init_adapter = __esm({
  "../node_modules/hono/dist/helper/adapter/index.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    knownUserAgents = {
      deno: "Deno",
      bun: "Bun",
      workerd: "Cloudflare-Workers",
      node: "Node.js"
    };
    getRuntimeKey = /* @__PURE__ */ __name2(() => {
      const global = globalThis;
      const userAgentSupported = typeof navigator !== "undefined" && true;
      if (userAgentSupported) {
        for (const [runtimeKey, userAgent] of Object.entries(knownUserAgents)) {
          if (checkUserAgentEquals(userAgent)) {
            return runtimeKey;
          }
        }
      }
      if (typeof global?.EdgeRuntime === "string") {
        return "edge-light";
      }
      if (global?.fastly !== void 0) {
        return "fastly";
      }
      if (global?.process?.release?.name === "node") {
        return "node";
      }
      return "other";
    }, "getRuntimeKey");
    checkUserAgentEquals = /* @__PURE__ */ __name2((platform) => {
      const userAgent = "Cloudflare-Workers";
      return userAgent.startsWith(platform);
    }, "checkUserAgentEquals");
  }
});
var JwtAlgorithmNotImplemented;
var JwtAlgorithmRequired;
var JwtAlgorithmMismatch;
var JwtTokenInvalid;
var JwtTokenNotBefore;
var JwtTokenExpired;
var JwtTokenIssuedAt;
var JwtTokenIssuer;
var JwtHeaderInvalid;
var JwtHeaderRequiresKid;
var JwtSymmetricAlgorithmNotAllowed;
var JwtAlgorithmNotAllowed;
var JwtTokenSignatureMismatched;
var JwtPayloadRequiresAud;
var JwtTokenAudience;
var CryptoKeyUsage;
var init_types = __esm({
  "../node_modules/hono/dist/utils/jwt/types.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    JwtAlgorithmNotImplemented = class extends Error {
      static {
        __name(this, "JwtAlgorithmNotImplemented");
      }
      static {
        __name2(this, "JwtAlgorithmNotImplemented");
      }
      constructor(alg) {
        super(`${alg} is not an implemented algorithm`);
        this.name = "JwtAlgorithmNotImplemented";
      }
    };
    JwtAlgorithmRequired = class extends Error {
      static {
        __name(this, "JwtAlgorithmRequired");
      }
      static {
        __name2(this, "JwtAlgorithmRequired");
      }
      constructor() {
        super('JWT verification requires "alg" option to be specified');
        this.name = "JwtAlgorithmRequired";
      }
    };
    JwtAlgorithmMismatch = class extends Error {
      static {
        __name(this, "JwtAlgorithmMismatch");
      }
      static {
        __name2(this, "JwtAlgorithmMismatch");
      }
      constructor(expected, actual) {
        super(`JWT algorithm mismatch: expected "${expected}", got "${actual}"`);
        this.name = "JwtAlgorithmMismatch";
      }
    };
    JwtTokenInvalid = class extends Error {
      static {
        __name(this, "JwtTokenInvalid");
      }
      static {
        __name2(this, "JwtTokenInvalid");
      }
      constructor(token) {
        super(`invalid JWT token: ${token}`);
        this.name = "JwtTokenInvalid";
      }
    };
    JwtTokenNotBefore = class extends Error {
      static {
        __name(this, "JwtTokenNotBefore");
      }
      static {
        __name2(this, "JwtTokenNotBefore");
      }
      constructor(token) {
        super(`token (${token}) is being used before it's valid`);
        this.name = "JwtTokenNotBefore";
      }
    };
    JwtTokenExpired = class extends Error {
      static {
        __name(this, "JwtTokenExpired");
      }
      static {
        __name2(this, "JwtTokenExpired");
      }
      constructor(token) {
        super(`token (${token}) expired`);
        this.name = "JwtTokenExpired";
      }
    };
    JwtTokenIssuedAt = class extends Error {
      static {
        __name(this, "JwtTokenIssuedAt");
      }
      static {
        __name2(this, "JwtTokenIssuedAt");
      }
      constructor(currentTimestamp, iat) {
        super(
          `Invalid "iat" claim, must be a valid number lower than "${currentTimestamp}" (iat: "${iat}")`
        );
        this.name = "JwtTokenIssuedAt";
      }
    };
    JwtTokenIssuer = class extends Error {
      static {
        __name(this, "JwtTokenIssuer");
      }
      static {
        __name2(this, "JwtTokenIssuer");
      }
      constructor(expected, iss) {
        super(`expected issuer "${expected}", got ${iss ? `"${iss}"` : "none"} `);
        this.name = "JwtTokenIssuer";
      }
    };
    JwtHeaderInvalid = class extends Error {
      static {
        __name(this, "JwtHeaderInvalid");
      }
      static {
        __name2(this, "JwtHeaderInvalid");
      }
      constructor(header) {
        super(`jwt header is invalid: ${JSON.stringify(header)}`);
        this.name = "JwtHeaderInvalid";
      }
    };
    JwtHeaderRequiresKid = class extends Error {
      static {
        __name(this, "JwtHeaderRequiresKid");
      }
      static {
        __name2(this, "JwtHeaderRequiresKid");
      }
      constructor(header) {
        super(`required "kid" in jwt header: ${JSON.stringify(header)}`);
        this.name = "JwtHeaderRequiresKid";
      }
    };
    JwtSymmetricAlgorithmNotAllowed = class extends Error {
      static {
        __name(this, "JwtSymmetricAlgorithmNotAllowed");
      }
      static {
        __name2(this, "JwtSymmetricAlgorithmNotAllowed");
      }
      constructor(alg) {
        super(`symmetric algorithm "${alg}" is not allowed for JWK verification`);
        this.name = "JwtSymmetricAlgorithmNotAllowed";
      }
    };
    JwtAlgorithmNotAllowed = class extends Error {
      static {
        __name(this, "JwtAlgorithmNotAllowed");
      }
      static {
        __name2(this, "JwtAlgorithmNotAllowed");
      }
      constructor(alg, allowedAlgorithms) {
        super(`algorithm "${alg}" is not in the allowed list: [${allowedAlgorithms.join(", ")}]`);
        this.name = "JwtAlgorithmNotAllowed";
      }
    };
    JwtTokenSignatureMismatched = class extends Error {
      static {
        __name(this, "JwtTokenSignatureMismatched");
      }
      static {
        __name2(this, "JwtTokenSignatureMismatched");
      }
      constructor(token) {
        super(`token(${token}) signature mismatched`);
        this.name = "JwtTokenSignatureMismatched";
      }
    };
    JwtPayloadRequiresAud = class extends Error {
      static {
        __name(this, "JwtPayloadRequiresAud");
      }
      static {
        __name2(this, "JwtPayloadRequiresAud");
      }
      constructor(payload) {
        super(`required "aud" in jwt payload: ${JSON.stringify(payload)}`);
        this.name = "JwtPayloadRequiresAud";
      }
    };
    JwtTokenAudience = class extends Error {
      static {
        __name(this, "JwtTokenAudience");
      }
      static {
        __name2(this, "JwtTokenAudience");
      }
      constructor(expected, aud) {
        super(
          `expected audience "${Array.isArray(expected) ? expected.join(", ") : expected}", got "${aud}"`
        );
        this.name = "JwtTokenAudience";
      }
    };
    CryptoKeyUsage = /* @__PURE__ */ ((CryptoKeyUsage2) => {
      CryptoKeyUsage2["Encrypt"] = "encrypt";
      CryptoKeyUsage2["Decrypt"] = "decrypt";
      CryptoKeyUsage2["Sign"] = "sign";
      CryptoKeyUsage2["Verify"] = "verify";
      CryptoKeyUsage2["DeriveKey"] = "deriveKey";
      CryptoKeyUsage2["DeriveBits"] = "deriveBits";
      CryptoKeyUsage2["WrapKey"] = "wrapKey";
      CryptoKeyUsage2["UnwrapKey"] = "unwrapKey";
      return CryptoKeyUsage2;
    })(CryptoKeyUsage || {});
  }
});
var utf8Encoder;
var utf8Decoder;
var init_utf8 = __esm({
  "../node_modules/hono/dist/utils/jwt/utf8.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    utf8Encoder = new TextEncoder();
    utf8Decoder = new TextDecoder();
  }
});
async function signing(privateKey, alg, data) {
  const algorithm = getKeyAlgorithm(alg);
  const cryptoKey = await importPrivateKey(privateKey, algorithm);
  return await crypto.subtle.sign(algorithm, cryptoKey, data);
}
__name(signing, "signing");
async function verifying(publicKey, alg, signature, data) {
  const algorithm = getKeyAlgorithm(alg);
  const cryptoKey = await importPublicKey(publicKey, algorithm);
  return await crypto.subtle.verify(algorithm, cryptoKey, signature, data);
}
__name(verifying, "verifying");
function pemToBinary(pem) {
  return decodeBase64(pem.replace(/-+(BEGIN|END).*?-+/g, "").replace(/\s/g, ""));
}
__name(pemToBinary, "pemToBinary");
async function importPrivateKey(key, alg) {
  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error("`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.");
  }
  if (isCryptoKey(key)) {
    if (key.type !== "private" && key.type !== "secret") {
      throw new Error(
        `unexpected key type: CryptoKey.type is ${key.type}, expected private or secret`
      );
    }
    return key;
  }
  const usages = [CryptoKeyUsage.Sign];
  if (typeof key === "object") {
    return await crypto.subtle.importKey("jwk", key, alg, false, usages);
  }
  if (key.includes("PRIVATE")) {
    return await crypto.subtle.importKey("pkcs8", pemToBinary(key), alg, false, usages);
  }
  return await crypto.subtle.importKey("raw", utf8Encoder.encode(key), alg, false, usages);
}
__name(importPrivateKey, "importPrivateKey");
async function importPublicKey(key, alg) {
  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error("`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.");
  }
  if (isCryptoKey(key)) {
    if (key.type === "public" || key.type === "secret") {
      return key;
    }
    key = await exportPublicJwkFrom(key);
  }
  if (typeof key === "string" && key.includes("PRIVATE")) {
    const privateKey = await crypto.subtle.importKey("pkcs8", pemToBinary(key), alg, true, [
      CryptoKeyUsage.Sign
    ]);
    key = await exportPublicJwkFrom(privateKey);
  }
  const usages = [CryptoKeyUsage.Verify];
  if (typeof key === "object") {
    return await crypto.subtle.importKey("jwk", key, alg, false, usages);
  }
  if (key.includes("PUBLIC")) {
    return await crypto.subtle.importKey("spki", pemToBinary(key), alg, false, usages);
  }
  return await crypto.subtle.importKey("raw", utf8Encoder.encode(key), alg, false, usages);
}
__name(importPublicKey, "importPublicKey");
async function exportPublicJwkFrom(privateKey) {
  if (privateKey.type !== "private") {
    throw new Error(`unexpected key type: ${privateKey.type}`);
  }
  if (!privateKey.extractable) {
    throw new Error("unexpected private key is unextractable");
  }
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  const { kty } = jwk;
  const { alg, e, n } = jwk;
  const { crv, x, y } = jwk;
  return { kty, alg, e, n, crv, x, y, key_ops: [CryptoKeyUsage.Verify] };
}
__name(exportPublicJwkFrom, "exportPublicJwkFrom");
function getKeyAlgorithm(name) {
  switch (name) {
    case "HS256":
      return {
        name: "HMAC",
        hash: {
          name: "SHA-256"
        }
      };
    case "HS384":
      return {
        name: "HMAC",
        hash: {
          name: "SHA-384"
        }
      };
    case "HS512":
      return {
        name: "HMAC",
        hash: {
          name: "SHA-512"
        }
      };
    case "RS256":
      return {
        name: "RSASSA-PKCS1-v1_5",
        hash: {
          name: "SHA-256"
        }
      };
    case "RS384":
      return {
        name: "RSASSA-PKCS1-v1_5",
        hash: {
          name: "SHA-384"
        }
      };
    case "RS512":
      return {
        name: "RSASSA-PKCS1-v1_5",
        hash: {
          name: "SHA-512"
        }
      };
    case "PS256":
      return {
        name: "RSA-PSS",
        hash: {
          name: "SHA-256"
        },
        saltLength: 32
        // 256 >> 3
      };
    case "PS384":
      return {
        name: "RSA-PSS",
        hash: {
          name: "SHA-384"
        },
        saltLength: 48
        // 384 >> 3
      };
    case "PS512":
      return {
        name: "RSA-PSS",
        hash: {
          name: "SHA-512"
        },
        saltLength: 64
        // 512 >> 3,
      };
    case "ES256":
      return {
        name: "ECDSA",
        hash: {
          name: "SHA-256"
        },
        namedCurve: "P-256"
      };
    case "ES384":
      return {
        name: "ECDSA",
        hash: {
          name: "SHA-384"
        },
        namedCurve: "P-384"
      };
    case "ES512":
      return {
        name: "ECDSA",
        hash: {
          name: "SHA-512"
        },
        namedCurve: "P-521"
      };
    case "EdDSA":
      return {
        name: "Ed25519",
        namedCurve: "Ed25519"
      };
    default:
      throw new JwtAlgorithmNotImplemented(name);
  }
}
__name(getKeyAlgorithm, "getKeyAlgorithm");
function isCryptoKey(key) {
  const runtime = getRuntimeKey();
  if (runtime === "node" && !!crypto.webcrypto) {
    return key instanceof crypto.webcrypto.CryptoKey;
  }
  return key instanceof CryptoKey;
}
__name(isCryptoKey, "isCryptoKey");
var init_jws = __esm({
  "../node_modules/hono/dist/utils/jwt/jws.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_adapter();
    init_encode();
    init_types();
    init_utf8();
    __name2(signing, "signing");
    __name2(verifying, "verifying");
    __name2(pemToBinary, "pemToBinary");
    __name2(importPrivateKey, "importPrivateKey");
    __name2(importPublicKey, "importPublicKey");
    __name2(exportPublicJwkFrom, "exportPublicJwkFrom");
    __name2(getKeyAlgorithm, "getKeyAlgorithm");
    __name2(isCryptoKey, "isCryptoKey");
  }
});
function isTokenHeader(obj) {
  if (typeof obj === "object" && obj !== null) {
    const objWithAlg = obj;
    return "alg" in objWithAlg && Object.values(AlgorithmTypes).includes(objWithAlg.alg) && (!("typ" in objWithAlg) || objWithAlg.typ === "JWT");
  }
  return false;
}
__name(isTokenHeader, "isTokenHeader");
var encodeJwtPart;
var encodeSignaturePart;
var decodeJwtPart;
var sign;
var verify;
var symmetricAlgorithms;
var verifyWithJwks;
var decode;
var decodeHeader;
var init_jwt = __esm({
  "../node_modules/hono/dist/utils/jwt/jwt.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_encode();
    init_jwa();
    init_jws();
    init_types();
    init_utf8();
    encodeJwtPart = /* @__PURE__ */ __name2((part) => encodeBase64Url(utf8Encoder.encode(JSON.stringify(part)).buffer).replace(/=/g, ""), "encodeJwtPart");
    encodeSignaturePart = /* @__PURE__ */ __name2((buf) => encodeBase64Url(buf).replace(/=/g, ""), "encodeSignaturePart");
    decodeJwtPart = /* @__PURE__ */ __name2((part) => JSON.parse(utf8Decoder.decode(decodeBase64Url(part))), "decodeJwtPart");
    __name2(isTokenHeader, "isTokenHeader");
    sign = /* @__PURE__ */ __name2(async (payload, privateKey, alg = "HS256") => {
      const encodedPayload = encodeJwtPart(payload);
      let encodedHeader;
      if (typeof privateKey === "object" && "alg" in privateKey) {
        alg = privateKey.alg;
        encodedHeader = encodeJwtPart({ alg, typ: "JWT", kid: privateKey.kid });
      } else {
        encodedHeader = encodeJwtPart({ alg, typ: "JWT" });
      }
      const partialToken = `${encodedHeader}.${encodedPayload}`;
      const signaturePart = await signing(privateKey, alg, utf8Encoder.encode(partialToken));
      const signature = encodeSignaturePart(signaturePart);
      return `${partialToken}.${signature}`;
    }, "sign");
    verify = /* @__PURE__ */ __name2(async (token, publicKey, algOrOptions) => {
      if (!algOrOptions) {
        throw new JwtAlgorithmRequired();
      }
      const {
        alg,
        iss,
        nbf = true,
        exp = true,
        iat = true,
        aud
      } = typeof algOrOptions === "string" ? { alg: algOrOptions } : algOrOptions;
      if (!alg) {
        throw new JwtAlgorithmRequired();
      }
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        throw new JwtTokenInvalid(token);
      }
      const { header, payload } = decode(token);
      if (!isTokenHeader(header)) {
        throw new JwtHeaderInvalid(header);
      }
      if (header.alg !== alg) {
        throw new JwtAlgorithmMismatch(alg, header.alg);
      }
      const now = Math.floor(Date.now() / 1e3);
      if (nbf && payload.nbf !== void 0) {
        if (typeof payload.nbf !== "number" || !Number.isFinite(payload.nbf) || payload.nbf > now) {
          throw new JwtTokenNotBefore(token);
        }
      }
      if (exp && payload.exp !== void 0) {
        if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp) || payload.exp <= now) {
          throw new JwtTokenExpired(token);
        }
      }
      if (iat && payload.iat !== void 0) {
        if (typeof payload.iat !== "number" || !Number.isFinite(payload.iat) || now < payload.iat) {
          throw new JwtTokenIssuedAt(now, payload.iat);
        }
      }
      if (iss) {
        if (!payload.iss) {
          throw new JwtTokenIssuer(iss, null);
        }
        if (typeof iss === "string" && payload.iss !== iss) {
          throw new JwtTokenIssuer(iss, payload.iss);
        }
        if (iss instanceof RegExp && !iss.test(payload.iss)) {
          throw new JwtTokenIssuer(iss, payload.iss);
        }
      }
      if (aud) {
        if (!payload.aud) {
          throw new JwtPayloadRequiresAud(payload);
        }
        const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        const matched = audiences.some(
          (payloadAud) => aud instanceof RegExp ? aud.test(payloadAud) : typeof aud === "string" ? payloadAud === aud : Array.isArray(aud) && aud.includes(payloadAud)
        );
        if (!matched) {
          throw new JwtTokenAudience(aud, payload.aud);
        }
      }
      const headerPayload = token.substring(0, token.lastIndexOf("."));
      const verified = await verifying(
        publicKey,
        alg,
        decodeBase64Url(tokenParts[2]),
        utf8Encoder.encode(headerPayload)
      );
      if (!verified) {
        throw new JwtTokenSignatureMismatched(token);
      }
      return payload;
    }, "verify");
    symmetricAlgorithms = [
      AlgorithmTypes.HS256,
      AlgorithmTypes.HS384,
      AlgorithmTypes.HS512
    ];
    verifyWithJwks = /* @__PURE__ */ __name2(async (token, options, init) => {
      const verifyOpts = options.verification || {};
      const header = decodeHeader(token);
      if (!isTokenHeader(header)) {
        throw new JwtHeaderInvalid(header);
      }
      if (!header.kid) {
        throw new JwtHeaderRequiresKid(header);
      }
      if (symmetricAlgorithms.includes(header.alg)) {
        throw new JwtSymmetricAlgorithmNotAllowed(header.alg);
      }
      if (!options.allowedAlgorithms.includes(header.alg)) {
        throw new JwtAlgorithmNotAllowed(header.alg, options.allowedAlgorithms);
      }
      let verifyKeys = options.keys ? [...options.keys] : void 0;
      if (options.jwks_uri) {
        const response = await fetch(options.jwks_uri, init);
        if (!response.ok) {
          throw new Error(`failed to fetch JWKS from ${options.jwks_uri}`);
        }
        const data = await response.json();
        if (!data.keys) {
          throw new Error('invalid JWKS response. "keys" field is missing');
        }
        if (!Array.isArray(data.keys)) {
          throw new Error('invalid JWKS response. "keys" field is not an array');
        }
        verifyKeys ??= [];
        verifyKeys.push(...data.keys);
      } else if (!verifyKeys) {
        throw new Error('verifyWithJwks requires options for either "keys" or "jwks_uri" or both');
      }
      const matchingKey = verifyKeys.find((key) => key.kid === header.kid);
      if (!matchingKey) {
        throw new JwtTokenInvalid(token);
      }
      if (matchingKey.alg && matchingKey.alg !== header.alg) {
        throw new JwtAlgorithmMismatch(matchingKey.alg, header.alg);
      }
      return await verify(token, matchingKey, {
        alg: header.alg,
        ...verifyOpts
      });
    }, "verifyWithJwks");
    decode = /* @__PURE__ */ __name2((token) => {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new JwtTokenInvalid(token);
      }
      try {
        const header = decodeJwtPart(parts[0]);
        const payload = decodeJwtPart(parts[1]);
        return {
          header,
          payload
        };
      } catch {
        throw new JwtTokenInvalid(token);
      }
    }, "decode");
    decodeHeader = /* @__PURE__ */ __name2((token) => {
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new JwtTokenInvalid(token);
      }
      try {
        return decodeJwtPart(parts[0]);
      } catch {
        throw new JwtTokenInvalid(token);
      }
    }, "decodeHeader");
  }
});
var Jwt;
var init_jwt2 = __esm({
  "../node_modules/hono/dist/utils/jwt/index.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_jwt();
    Jwt = { sign, verify, decode, verifyWithJwks };
  }
});
var verifyWithJwks2;
var verify2;
var decode2;
var sign2;
var init_jwt3 = __esm({
  "../node_modules/hono/dist/middleware/jwt/jwt.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_cookie2();
    init_http_exception();
    init_jwt2();
    init_context();
    verifyWithJwks2 = Jwt.verifyWithJwks;
    verify2 = Jwt.verify;
    decode2 = Jwt.decode;
    sign2 = Jwt.sign;
  }
});
var init_jwt4 = __esm({
  "../node_modules/hono/dist/middleware/jwt/index.js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_jwt3();
    init_jwa();
  }
});
var require_bcrypt = __commonJS({
  "../node_modules/bcryptjs/dist/bcrypt.js"(exports, module) {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    (function(global, factory) {
      if (typeof define === "function" && define["amd"])
        define([], factory);
      else if (typeof __require2 === "function" && typeof module === "object" && module && module["exports"])
        module["exports"] = factory();
      else
        (global["dcodeIO"] = global["dcodeIO"] || {})["bcrypt"] = factory();
    })(exports, function() {
      "use strict";
      var bcrypt2 = {};
      var randomFallback = null;
      function random(len) {
        if (typeof module !== "undefined" && module && module["exports"])
          try {
            return __require2("crypto")["randomBytes"](len);
          } catch (e) {
          }
        try {
          var a;
          (self["crypto"] || self["msCrypto"])["getRandomValues"](a = new Uint32Array(len));
          return Array.prototype.slice.call(a);
        } catch (e) {
        }
        if (!randomFallback)
          throw Error("Neither WebCryptoAPI nor a crypto module is available. Use bcrypt.setRandomFallback to set an alternative");
        return randomFallback(len);
      }
      __name(random, "random");
      __name2(random, "random");
      var randomAvailable = false;
      try {
        random(1);
        randomAvailable = true;
      } catch (e) {
      }
      randomFallback = null;
      bcrypt2.setRandomFallback = function(random2) {
        randomFallback = random2;
      };
      bcrypt2.genSaltSync = function(rounds, seed_length) {
        rounds = rounds || GENSALT_DEFAULT_LOG2_ROUNDS;
        if (typeof rounds !== "number")
          throw Error("Illegal arguments: " + typeof rounds + ", " + typeof seed_length);
        if (rounds < 4)
          rounds = 4;
        else if (rounds > 31)
          rounds = 31;
        var salt = [];
        salt.push("$2a$");
        if (rounds < 10)
          salt.push("0");
        salt.push(rounds.toString());
        salt.push("$");
        salt.push(base64_encode(random(BCRYPT_SALT_LEN), BCRYPT_SALT_LEN));
        return salt.join("");
      };
      bcrypt2.genSalt = function(rounds, seed_length, callback) {
        if (typeof seed_length === "function")
          callback = seed_length, seed_length = void 0;
        if (typeof rounds === "function")
          callback = rounds, rounds = void 0;
        if (typeof rounds === "undefined")
          rounds = GENSALT_DEFAULT_LOG2_ROUNDS;
        else if (typeof rounds !== "number")
          throw Error("illegal arguments: " + typeof rounds);
        function _async(callback2) {
          nextTick(function() {
            try {
              callback2(null, bcrypt2.genSaltSync(rounds));
            } catch (err) {
              callback2(err);
            }
          });
        }
        __name(_async, "_async");
        __name2(_async, "_async");
        if (callback) {
          if (typeof callback !== "function")
            throw Error("Illegal callback: " + typeof callback);
          _async(callback);
        } else
          return new Promise(function(resolve, reject) {
            _async(function(err, res) {
              if (err) {
                reject(err);
                return;
              }
              resolve(res);
            });
          });
      };
      bcrypt2.hashSync = function(s, salt) {
        if (typeof salt === "undefined")
          salt = GENSALT_DEFAULT_LOG2_ROUNDS;
        if (typeof salt === "number")
          salt = bcrypt2.genSaltSync(salt);
        if (typeof s !== "string" || typeof salt !== "string")
          throw Error("Illegal arguments: " + typeof s + ", " + typeof salt);
        return _hash(s, salt);
      };
      bcrypt2.hash = function(s, salt, callback, progressCallback) {
        function _async(callback2) {
          if (typeof s === "string" && typeof salt === "number")
            bcrypt2.genSalt(salt, function(err, salt2) {
              _hash(s, salt2, callback2, progressCallback);
            });
          else if (typeof s === "string" && typeof salt === "string")
            _hash(s, salt, callback2, progressCallback);
          else
            nextTick(callback2.bind(this, Error("Illegal arguments: " + typeof s + ", " + typeof salt)));
        }
        __name(_async, "_async");
        __name2(_async, "_async");
        if (callback) {
          if (typeof callback !== "function")
            throw Error("Illegal callback: " + typeof callback);
          _async(callback);
        } else
          return new Promise(function(resolve, reject) {
            _async(function(err, res) {
              if (err) {
                reject(err);
                return;
              }
              resolve(res);
            });
          });
      };
      function safeStringCompare(known, unknown) {
        var right = 0, wrong = 0;
        for (var i = 0, k = known.length; i < k; ++i) {
          if (known.charCodeAt(i) === unknown.charCodeAt(i))
            ++right;
          else
            ++wrong;
        }
        if (right < 0)
          return false;
        return wrong === 0;
      }
      __name(safeStringCompare, "safeStringCompare");
      __name2(safeStringCompare, "safeStringCompare");
      bcrypt2.compareSync = function(s, hash) {
        if (typeof s !== "string" || typeof hash !== "string")
          throw Error("Illegal arguments: " + typeof s + ", " + typeof hash);
        if (hash.length !== 60)
          return false;
        return safeStringCompare(bcrypt2.hashSync(s, hash.substr(0, hash.length - 31)), hash);
      };
      bcrypt2.compare = function(s, hash, callback, progressCallback) {
        function _async(callback2) {
          if (typeof s !== "string" || typeof hash !== "string") {
            nextTick(callback2.bind(this, Error("Illegal arguments: " + typeof s + ", " + typeof hash)));
            return;
          }
          if (hash.length !== 60) {
            nextTick(callback2.bind(this, null, false));
            return;
          }
          bcrypt2.hash(s, hash.substr(0, 29), function(err, comp) {
            if (err)
              callback2(err);
            else
              callback2(null, safeStringCompare(comp, hash));
          }, progressCallback);
        }
        __name(_async, "_async");
        __name2(_async, "_async");
        if (callback) {
          if (typeof callback !== "function")
            throw Error("Illegal callback: " + typeof callback);
          _async(callback);
        } else
          return new Promise(function(resolve, reject) {
            _async(function(err, res) {
              if (err) {
                reject(err);
                return;
              }
              resolve(res);
            });
          });
      };
      bcrypt2.getRounds = function(hash) {
        if (typeof hash !== "string")
          throw Error("Illegal arguments: " + typeof hash);
        return parseInt(hash.split("$")[2], 10);
      };
      bcrypt2.getSalt = function(hash) {
        if (typeof hash !== "string")
          throw Error("Illegal arguments: " + typeof hash);
        if (hash.length !== 60)
          throw Error("Illegal hash length: " + hash.length + " != 60");
        return hash.substring(0, 29);
      };
      var nextTick = typeof process !== "undefined" && process && typeof process.nextTick === "function" ? typeof setImmediate === "function" ? setImmediate : process.nextTick : setTimeout;
      function stringToBytes(str) {
        var out = [], i = 0;
        utfx.encodeUTF16toUTF8(function() {
          if (i >= str.length) return null;
          return str.charCodeAt(i++);
        }, function(b) {
          out.push(b);
        });
        return out;
      }
      __name(stringToBytes, "stringToBytes");
      __name2(stringToBytes, "stringToBytes");
      var BASE64_CODE = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
      var BASE64_INDEX = [
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0,
        1,
        54,
        55,
        56,
        57,
        58,
        59,
        60,
        61,
        62,
        63,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        28,
        29,
        30,
        31,
        32,
        33,
        34,
        35,
        36,
        37,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        46,
        47,
        48,
        49,
        50,
        51,
        52,
        53,
        -1,
        -1,
        -1,
        -1,
        -1
      ];
      var stringFromCharCode = String.fromCharCode;
      function base64_encode(b, len) {
        var off = 0, rs = [], c1, c2;
        if (len <= 0 || len > b.length)
          throw Error("Illegal len: " + len);
        while (off < len) {
          c1 = b[off++] & 255;
          rs.push(BASE64_CODE[c1 >> 2 & 63]);
          c1 = (c1 & 3) << 4;
          if (off >= len) {
            rs.push(BASE64_CODE[c1 & 63]);
            break;
          }
          c2 = b[off++] & 255;
          c1 |= c2 >> 4 & 15;
          rs.push(BASE64_CODE[c1 & 63]);
          c1 = (c2 & 15) << 2;
          if (off >= len) {
            rs.push(BASE64_CODE[c1 & 63]);
            break;
          }
          c2 = b[off++] & 255;
          c1 |= c2 >> 6 & 3;
          rs.push(BASE64_CODE[c1 & 63]);
          rs.push(BASE64_CODE[c2 & 63]);
        }
        return rs.join("");
      }
      __name(base64_encode, "base64_encode");
      __name2(base64_encode, "base64_encode");
      function base64_decode(s, len) {
        var off = 0, slen = s.length, olen = 0, rs = [], c1, c2, c3, c4, o, code;
        if (len <= 0)
          throw Error("Illegal len: " + len);
        while (off < slen - 1 && olen < len) {
          code = s.charCodeAt(off++);
          c1 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
          code = s.charCodeAt(off++);
          c2 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
          if (c1 == -1 || c2 == -1)
            break;
          o = c1 << 2 >>> 0;
          o |= (c2 & 48) >> 4;
          rs.push(stringFromCharCode(o));
          if (++olen >= len || off >= slen)
            break;
          code = s.charCodeAt(off++);
          c3 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
          if (c3 == -1)
            break;
          o = (c2 & 15) << 4 >>> 0;
          o |= (c3 & 60) >> 2;
          rs.push(stringFromCharCode(o));
          if (++olen >= len || off >= slen)
            break;
          code = s.charCodeAt(off++);
          c4 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
          o = (c3 & 3) << 6 >>> 0;
          o |= c4;
          rs.push(stringFromCharCode(o));
          ++olen;
        }
        var res = [];
        for (off = 0; off < olen; off++)
          res.push(rs[off].charCodeAt(0));
        return res;
      }
      __name(base64_decode, "base64_decode");
      __name2(base64_decode, "base64_decode");
      var utfx = (function() {
        "use strict";
        var utfx2 = {};
        utfx2.MAX_CODEPOINT = 1114111;
        utfx2.encodeUTF8 = function(src, dst) {
          var cp = null;
          if (typeof src === "number")
            cp = src, src = /* @__PURE__ */ __name2(function() {
              return null;
            }, "src");
          while (cp !== null || (cp = src()) !== null) {
            if (cp < 128)
              dst(cp & 127);
            else if (cp < 2048)
              dst(cp >> 6 & 31 | 192), dst(cp & 63 | 128);
            else if (cp < 65536)
              dst(cp >> 12 & 15 | 224), dst(cp >> 6 & 63 | 128), dst(cp & 63 | 128);
            else
              dst(cp >> 18 & 7 | 240), dst(cp >> 12 & 63 | 128), dst(cp >> 6 & 63 | 128), dst(cp & 63 | 128);
            cp = null;
          }
        };
        utfx2.decodeUTF8 = function(src, dst) {
          var a, b, c, d, fail = /* @__PURE__ */ __name2(function(b2) {
            b2 = b2.slice(0, b2.indexOf(null));
            var err = Error(b2.toString());
            err.name = "TruncatedError";
            err["bytes"] = b2;
            throw err;
          }, "fail");
          while ((a = src()) !== null) {
            if ((a & 128) === 0)
              dst(a);
            else if ((a & 224) === 192)
              (b = src()) === null && fail([a, b]), dst((a & 31) << 6 | b & 63);
            else if ((a & 240) === 224)
              ((b = src()) === null || (c = src()) === null) && fail([a, b, c]), dst((a & 15) << 12 | (b & 63) << 6 | c & 63);
            else if ((a & 248) === 240)
              ((b = src()) === null || (c = src()) === null || (d = src()) === null) && fail([a, b, c, d]), dst((a & 7) << 18 | (b & 63) << 12 | (c & 63) << 6 | d & 63);
            else throw RangeError("Illegal starting byte: " + a);
          }
        };
        utfx2.UTF16toUTF8 = function(src, dst) {
          var c1, c2 = null;
          while (true) {
            if ((c1 = c2 !== null ? c2 : src()) === null)
              break;
            if (c1 >= 55296 && c1 <= 57343) {
              if ((c2 = src()) !== null) {
                if (c2 >= 56320 && c2 <= 57343) {
                  dst((c1 - 55296) * 1024 + c2 - 56320 + 65536);
                  c2 = null;
                  continue;
                }
              }
            }
            dst(c1);
          }
          if (c2 !== null) dst(c2);
        };
        utfx2.UTF8toUTF16 = function(src, dst) {
          var cp = null;
          if (typeof src === "number")
            cp = src, src = /* @__PURE__ */ __name2(function() {
              return null;
            }, "src");
          while (cp !== null || (cp = src()) !== null) {
            if (cp <= 65535)
              dst(cp);
            else
              cp -= 65536, dst((cp >> 10) + 55296), dst(cp % 1024 + 56320);
            cp = null;
          }
        };
        utfx2.encodeUTF16toUTF8 = function(src, dst) {
          utfx2.UTF16toUTF8(src, function(cp) {
            utfx2.encodeUTF8(cp, dst);
          });
        };
        utfx2.decodeUTF8toUTF16 = function(src, dst) {
          utfx2.decodeUTF8(src, function(cp) {
            utfx2.UTF8toUTF16(cp, dst);
          });
        };
        utfx2.calculateCodePoint = function(cp) {
          return cp < 128 ? 1 : cp < 2048 ? 2 : cp < 65536 ? 3 : 4;
        };
        utfx2.calculateUTF8 = function(src) {
          var cp, l = 0;
          while ((cp = src()) !== null)
            l += utfx2.calculateCodePoint(cp);
          return l;
        };
        utfx2.calculateUTF16asUTF8 = function(src) {
          var n = 0, l = 0;
          utfx2.UTF16toUTF8(src, function(cp) {
            ++n;
            l += utfx2.calculateCodePoint(cp);
          });
          return [n, l];
        };
        return utfx2;
      })();
      Date.now = Date.now || function() {
        return +/* @__PURE__ */ new Date();
      };
      var BCRYPT_SALT_LEN = 16;
      var GENSALT_DEFAULT_LOG2_ROUNDS = 10;
      var BLOWFISH_NUM_ROUNDS = 16;
      var MAX_EXECUTION_TIME = 100;
      var P_ORIG = [
        608135816,
        2242054355,
        320440878,
        57701188,
        2752067618,
        698298832,
        137296536,
        3964562569,
        1160258022,
        953160567,
        3193202383,
        887688300,
        3232508343,
        3380367581,
        1065670069,
        3041331479,
        2450970073,
        2306472731
      ];
      var S_ORIG = [
        3509652390,
        2564797868,
        805139163,
        3491422135,
        3101798381,
        1780907670,
        3128725573,
        4046225305,
        614570311,
        3012652279,
        134345442,
        2240740374,
        1667834072,
        1901547113,
        2757295779,
        4103290238,
        227898511,
        1921955416,
        1904987480,
        2182433518,
        2069144605,
        3260701109,
        2620446009,
        720527379,
        3318853667,
        677414384,
        3393288472,
        3101374703,
        2390351024,
        1614419982,
        1822297739,
        2954791486,
        3608508353,
        3174124327,
        2024746970,
        1432378464,
        3864339955,
        2857741204,
        1464375394,
        1676153920,
        1439316330,
        715854006,
        3033291828,
        289532110,
        2706671279,
        2087905683,
        3018724369,
        1668267050,
        732546397,
        1947742710,
        3462151702,
        2609353502,
        2950085171,
        1814351708,
        2050118529,
        680887927,
        999245976,
        1800124847,
        3300911131,
        1713906067,
        1641548236,
        4213287313,
        1216130144,
        1575780402,
        4018429277,
        3917837745,
        3693486850,
        3949271944,
        596196993,
        3549867205,
        258830323,
        2213823033,
        772490370,
        2760122372,
        1774776394,
        2652871518,
        566650946,
        4142492826,
        1728879713,
        2882767088,
        1783734482,
        3629395816,
        2517608232,
        2874225571,
        1861159788,
        326777828,
        3124490320,
        2130389656,
        2716951837,
        967770486,
        1724537150,
        2185432712,
        2364442137,
        1164943284,
        2105845187,
        998989502,
        3765401048,
        2244026483,
        1075463327,
        1455516326,
        1322494562,
        910128902,
        469688178,
        1117454909,
        936433444,
        3490320968,
        3675253459,
        1240580251,
        122909385,
        2157517691,
        634681816,
        4142456567,
        3825094682,
        3061402683,
        2540495037,
        79693498,
        3249098678,
        1084186820,
        1583128258,
        426386531,
        1761308591,
        1047286709,
        322548459,
        995290223,
        1845252383,
        2603652396,
        3431023940,
        2942221577,
        3202600964,
        3727903485,
        1712269319,
        422464435,
        3234572375,
        1170764815,
        3523960633,
        3117677531,
        1434042557,
        442511882,
        3600875718,
        1076654713,
        1738483198,
        4213154764,
        2393238008,
        3677496056,
        1014306527,
        4251020053,
        793779912,
        2902807211,
        842905082,
        4246964064,
        1395751752,
        1040244610,
        2656851899,
        3396308128,
        445077038,
        3742853595,
        3577915638,
        679411651,
        2892444358,
        2354009459,
        1767581616,
        3150600392,
        3791627101,
        3102740896,
        284835224,
        4246832056,
        1258075500,
        768725851,
        2589189241,
        3069724005,
        3532540348,
        1274779536,
        3789419226,
        2764799539,
        1660621633,
        3471099624,
        4011903706,
        913787905,
        3497959166,
        737222580,
        2514213453,
        2928710040,
        3937242737,
        1804850592,
        3499020752,
        2949064160,
        2386320175,
        2390070455,
        2415321851,
        4061277028,
        2290661394,
        2416832540,
        1336762016,
        1754252060,
        3520065937,
        3014181293,
        791618072,
        3188594551,
        3933548030,
        2332172193,
        3852520463,
        3043980520,
        413987798,
        3465142937,
        3030929376,
        4245938359,
        2093235073,
        3534596313,
        375366246,
        2157278981,
        2479649556,
        555357303,
        3870105701,
        2008414854,
        3344188149,
        4221384143,
        3956125452,
        2067696032,
        3594591187,
        2921233993,
        2428461,
        544322398,
        577241275,
        1471733935,
        610547355,
        4027169054,
        1432588573,
        1507829418,
        2025931657,
        3646575487,
        545086370,
        48609733,
        2200306550,
        1653985193,
        298326376,
        1316178497,
        3007786442,
        2064951626,
        458293330,
        2589141269,
        3591329599,
        3164325604,
        727753846,
        2179363840,
        146436021,
        1461446943,
        4069977195,
        705550613,
        3059967265,
        3887724982,
        4281599278,
        3313849956,
        1404054877,
        2845806497,
        146425753,
        1854211946,
        1266315497,
        3048417604,
        3681880366,
        3289982499,
        290971e4,
        1235738493,
        2632868024,
        2414719590,
        3970600049,
        1771706367,
        1449415276,
        3266420449,
        422970021,
        1963543593,
        2690192192,
        3826793022,
        1062508698,
        1531092325,
        1804592342,
        2583117782,
        2714934279,
        4024971509,
        1294809318,
        4028980673,
        1289560198,
        2221992742,
        1669523910,
        35572830,
        157838143,
        1052438473,
        1016535060,
        1802137761,
        1753167236,
        1386275462,
        3080475397,
        2857371447,
        1040679964,
        2145300060,
        2390574316,
        1461121720,
        2956646967,
        4031777805,
        4028374788,
        33600511,
        2920084762,
        1018524850,
        629373528,
        3691585981,
        3515945977,
        2091462646,
        2486323059,
        586499841,
        988145025,
        935516892,
        3367335476,
        2599673255,
        2839830854,
        265290510,
        3972581182,
        2759138881,
        3795373465,
        1005194799,
        847297441,
        406762289,
        1314163512,
        1332590856,
        1866599683,
        4127851711,
        750260880,
        613907577,
        1450815602,
        3165620655,
        3734664991,
        3650291728,
        3012275730,
        3704569646,
        1427272223,
        778793252,
        1343938022,
        2676280711,
        2052605720,
        1946737175,
        3164576444,
        3914038668,
        3967478842,
        3682934266,
        1661551462,
        3294938066,
        4011595847,
        840292616,
        3712170807,
        616741398,
        312560963,
        711312465,
        1351876610,
        322626781,
        1910503582,
        271666773,
        2175563734,
        1594956187,
        70604529,
        3617834859,
        1007753275,
        1495573769,
        4069517037,
        2549218298,
        2663038764,
        504708206,
        2263041392,
        3941167025,
        2249088522,
        1514023603,
        1998579484,
        1312622330,
        694541497,
        2582060303,
        2151582166,
        1382467621,
        776784248,
        2618340202,
        3323268794,
        2497899128,
        2784771155,
        503983604,
        4076293799,
        907881277,
        423175695,
        432175456,
        1378068232,
        4145222326,
        3954048622,
        3938656102,
        3820766613,
        2793130115,
        2977904593,
        26017576,
        3274890735,
        3194772133,
        1700274565,
        1756076034,
        4006520079,
        3677328699,
        720338349,
        1533947780,
        354530856,
        688349552,
        3973924725,
        1637815568,
        332179504,
        3949051286,
        53804574,
        2852348879,
        3044236432,
        1282449977,
        3583942155,
        3416972820,
        4006381244,
        1617046695,
        2628476075,
        3002303598,
        1686838959,
        431878346,
        2686675385,
        1700445008,
        1080580658,
        1009431731,
        832498133,
        3223435511,
        2605976345,
        2271191193,
        2516031870,
        1648197032,
        4164389018,
        2548247927,
        300782431,
        375919233,
        238389289,
        3353747414,
        2531188641,
        2019080857,
        1475708069,
        455242339,
        2609103871,
        448939670,
        3451063019,
        1395535956,
        2413381860,
        1841049896,
        1491858159,
        885456874,
        4264095073,
        4001119347,
        1565136089,
        3898914787,
        1108368660,
        540939232,
        1173283510,
        2745871338,
        3681308437,
        4207628240,
        3343053890,
        4016749493,
        1699691293,
        1103962373,
        3625875870,
        2256883143,
        3830138730,
        1031889488,
        3479347698,
        1535977030,
        4236805024,
        3251091107,
        2132092099,
        1774941330,
        1199868427,
        1452454533,
        157007616,
        2904115357,
        342012276,
        595725824,
        1480756522,
        206960106,
        497939518,
        591360097,
        863170706,
        2375253569,
        3596610801,
        1814182875,
        2094937945,
        3421402208,
        1082520231,
        3463918190,
        2785509508,
        435703966,
        3908032597,
        1641649973,
        2842273706,
        3305899714,
        1510255612,
        2148256476,
        2655287854,
        3276092548,
        4258621189,
        236887753,
        3681803219,
        274041037,
        1734335097,
        3815195456,
        3317970021,
        1899903192,
        1026095262,
        4050517792,
        356393447,
        2410691914,
        3873677099,
        3682840055,
        3913112168,
        2491498743,
        4132185628,
        2489919796,
        1091903735,
        1979897079,
        3170134830,
        3567386728,
        3557303409,
        857797738,
        1136121015,
        1342202287,
        507115054,
        2535736646,
        337727348,
        3213592640,
        1301675037,
        2528481711,
        1895095763,
        1721773893,
        3216771564,
        62756741,
        2142006736,
        835421444,
        2531993523,
        1442658625,
        3659876326,
        2882144922,
        676362277,
        1392781812,
        170690266,
        3921047035,
        1759253602,
        3611846912,
        1745797284,
        664899054,
        1329594018,
        3901205900,
        3045908486,
        2062866102,
        2865634940,
        3543621612,
        3464012697,
        1080764994,
        553557557,
        3656615353,
        3996768171,
        991055499,
        499776247,
        1265440854,
        648242737,
        3940784050,
        980351604,
        3713745714,
        1749149687,
        3396870395,
        4211799374,
        3640570775,
        1161844396,
        3125318951,
        1431517754,
        545492359,
        4268468663,
        3499529547,
        1437099964,
        2702547544,
        3433638243,
        2581715763,
        2787789398,
        1060185593,
        1593081372,
        2418618748,
        4260947970,
        69676912,
        2159744348,
        86519011,
        2512459080,
        3838209314,
        1220612927,
        3339683548,
        133810670,
        1090789135,
        1078426020,
        1569222167,
        845107691,
        3583754449,
        4072456591,
        1091646820,
        628848692,
        1613405280,
        3757631651,
        526609435,
        236106946,
        48312990,
        2942717905,
        3402727701,
        1797494240,
        859738849,
        992217954,
        4005476642,
        2243076622,
        3870952857,
        3732016268,
        765654824,
        3490871365,
        2511836413,
        1685915746,
        3888969200,
        1414112111,
        2273134842,
        3281911079,
        4080962846,
        172450625,
        2569994100,
        980381355,
        4109958455,
        2819808352,
        2716589560,
        2568741196,
        3681446669,
        3329971472,
        1835478071,
        660984891,
        3704678404,
        4045999559,
        3422617507,
        3040415634,
        1762651403,
        1719377915,
        3470491036,
        2693910283,
        3642056355,
        3138596744,
        1364962596,
        2073328063,
        1983633131,
        926494387,
        3423689081,
        2150032023,
        4096667949,
        1749200295,
        3328846651,
        309677260,
        2016342300,
        1779581495,
        3079819751,
        111262694,
        1274766160,
        443224088,
        298511866,
        1025883608,
        3806446537,
        1145181785,
        168956806,
        3641502830,
        3584813610,
        1689216846,
        3666258015,
        3200248200,
        1692713982,
        2646376535,
        4042768518,
        1618508792,
        1610833997,
        3523052358,
        4130873264,
        2001055236,
        3610705100,
        2202168115,
        4028541809,
        2961195399,
        1006657119,
        2006996926,
        3186142756,
        1430667929,
        3210227297,
        1314452623,
        4074634658,
        4101304120,
        2273951170,
        1399257539,
        3367210612,
        3027628629,
        1190975929,
        2062231137,
        2333990788,
        2221543033,
        2438960610,
        1181637006,
        548689776,
        2362791313,
        3372408396,
        3104550113,
        3145860560,
        296247880,
        1970579870,
        3078560182,
        3769228297,
        1714227617,
        3291629107,
        3898220290,
        166772364,
        1251581989,
        493813264,
        448347421,
        195405023,
        2709975567,
        677966185,
        3703036547,
        1463355134,
        2715995803,
        1338867538,
        1343315457,
        2802222074,
        2684532164,
        233230375,
        2599980071,
        2000651841,
        3277868038,
        1638401717,
        4028070440,
        3237316320,
        6314154,
        819756386,
        300326615,
        590932579,
        1405279636,
        3267499572,
        3150704214,
        2428286686,
        3959192993,
        3461946742,
        1862657033,
        1266418056,
        963775037,
        2089974820,
        2263052895,
        1917689273,
        448879540,
        3550394620,
        3981727096,
        150775221,
        3627908307,
        1303187396,
        508620638,
        2975983352,
        2726630617,
        1817252668,
        1876281319,
        1457606340,
        908771278,
        3720792119,
        3617206836,
        2455994898,
        1729034894,
        1080033504,
        976866871,
        3556439503,
        2881648439,
        1522871579,
        1555064734,
        1336096578,
        3548522304,
        2579274686,
        3574697629,
        3205460757,
        3593280638,
        3338716283,
        3079412587,
        564236357,
        2993598910,
        1781952180,
        1464380207,
        3163844217,
        3332601554,
        1699332808,
        1393555694,
        1183702653,
        3581086237,
        1288719814,
        691649499,
        2847557200,
        2895455976,
        3193889540,
        2717570544,
        1781354906,
        1676643554,
        2592534050,
        3230253752,
        1126444790,
        2770207658,
        2633158820,
        2210423226,
        2615765581,
        2414155088,
        3127139286,
        673620729,
        2805611233,
        1269405062,
        4015350505,
        3341807571,
        4149409754,
        1057255273,
        2012875353,
        2162469141,
        2276492801,
        2601117357,
        993977747,
        3918593370,
        2654263191,
        753973209,
        36408145,
        2530585658,
        25011837,
        3520020182,
        2088578344,
        530523599,
        2918365339,
        1524020338,
        1518925132,
        3760827505,
        3759777254,
        1202760957,
        3985898139,
        3906192525,
        674977740,
        4174734889,
        2031300136,
        2019492241,
        3983892565,
        4153806404,
        3822280332,
        352677332,
        2297720250,
        60907813,
        90501309,
        3286998549,
        1016092578,
        2535922412,
        2839152426,
        457141659,
        509813237,
        4120667899,
        652014361,
        1966332200,
        2975202805,
        55981186,
        2327461051,
        676427537,
        3255491064,
        2882294119,
        3433927263,
        1307055953,
        942726286,
        933058658,
        2468411793,
        3933900994,
        4215176142,
        1361170020,
        2001714738,
        2830558078,
        3274259782,
        1222529897,
        1679025792,
        2729314320,
        3714953764,
        1770335741,
        151462246,
        3013232138,
        1682292957,
        1483529935,
        471910574,
        1539241949,
        458788160,
        3436315007,
        1807016891,
        3718408830,
        978976581,
        1043663428,
        3165965781,
        1927990952,
        4200891579,
        2372276910,
        3208408903,
        3533431907,
        1412390302,
        2931980059,
        4132332400,
        1947078029,
        3881505623,
        4168226417,
        2941484381,
        1077988104,
        1320477388,
        886195818,
        18198404,
        3786409e3,
        2509781533,
        112762804,
        3463356488,
        1866414978,
        891333506,
        18488651,
        661792760,
        1628790961,
        3885187036,
        3141171499,
        876946877,
        2693282273,
        1372485963,
        791857591,
        2686433993,
        3759982718,
        3167212022,
        3472953795,
        2716379847,
        445679433,
        3561995674,
        3504004811,
        3574258232,
        54117162,
        3331405415,
        2381918588,
        3769707343,
        4154350007,
        1140177722,
        4074052095,
        668550556,
        3214352940,
        367459370,
        261225585,
        2610173221,
        4209349473,
        3468074219,
        3265815641,
        314222801,
        3066103646,
        3808782860,
        282218597,
        3406013506,
        3773591054,
        379116347,
        1285071038,
        846784868,
        2669647154,
        3771962079,
        3550491691,
        2305946142,
        453669953,
        1268987020,
        3317592352,
        3279303384,
        3744833421,
        2610507566,
        3859509063,
        266596637,
        3847019092,
        517658769,
        3462560207,
        3443424879,
        370717030,
        4247526661,
        2224018117,
        4143653529,
        4112773975,
        2788324899,
        2477274417,
        1456262402,
        2901442914,
        1517677493,
        1846949527,
        2295493580,
        3734397586,
        2176403920,
        1280348187,
        1908823572,
        3871786941,
        846861322,
        1172426758,
        3287448474,
        3383383037,
        1655181056,
        3139813346,
        901632758,
        1897031941,
        2986607138,
        3066810236,
        3447102507,
        1393639104,
        373351379,
        950779232,
        625454576,
        3124240540,
        4148612726,
        2007998917,
        544563296,
        2244738638,
        2330496472,
        2058025392,
        1291430526,
        424198748,
        50039436,
        29584100,
        3605783033,
        2429876329,
        2791104160,
        1057563949,
        3255363231,
        3075367218,
        3463963227,
        1469046755,
        985887462
      ];
      var C_ORIG = [
        1332899944,
        1700884034,
        1701343084,
        1684370003,
        1668446532,
        1869963892
      ];
      function _encipher(lr, off, P, S) {
        var n, l = lr[off], r = lr[off + 1];
        l ^= P[0];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[1];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[2];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[3];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[4];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[5];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[6];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[7];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[8];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[9];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[10];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[11];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[12];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[13];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[14];
        n = S[l >>> 24];
        n += S[256 | l >> 16 & 255];
        n ^= S[512 | l >> 8 & 255];
        n += S[768 | l & 255];
        r ^= n ^ P[15];
        n = S[r >>> 24];
        n += S[256 | r >> 16 & 255];
        n ^= S[512 | r >> 8 & 255];
        n += S[768 | r & 255];
        l ^= n ^ P[16];
        lr[off] = r ^ P[BLOWFISH_NUM_ROUNDS + 1];
        lr[off + 1] = l;
        return lr;
      }
      __name(_encipher, "_encipher");
      __name2(_encipher, "_encipher");
      function _streamtoword(data, offp) {
        for (var i = 0, word = 0; i < 4; ++i)
          word = word << 8 | data[offp] & 255, offp = (offp + 1) % data.length;
        return { key: word, offp };
      }
      __name(_streamtoword, "_streamtoword");
      __name2(_streamtoword, "_streamtoword");
      function _key(key, P, S) {
        var offset = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
        for (var i = 0; i < plen; i++)
          sw = _streamtoword(key, offset), offset = sw.offp, P[i] = P[i] ^ sw.key;
        for (i = 0; i < plen; i += 2)
          lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
        for (i = 0; i < slen; i += 2)
          lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
      }
      __name(_key, "_key");
      __name2(_key, "_key");
      function _ekskey(data, key, P, S) {
        var offp = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
        for (var i = 0; i < plen; i++)
          sw = _streamtoword(key, offp), offp = sw.offp, P[i] = P[i] ^ sw.key;
        offp = 0;
        for (i = 0; i < plen; i += 2)
          sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
        for (i = 0; i < slen; i += 2)
          sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
      }
      __name(_ekskey, "_ekskey");
      __name2(_ekskey, "_ekskey");
      function _crypt(b, salt, rounds, callback, progressCallback) {
        var cdata = C_ORIG.slice(), clen = cdata.length, err;
        if (rounds < 4 || rounds > 31) {
          err = Error("Illegal number of rounds (4-31): " + rounds);
          if (callback) {
            nextTick(callback.bind(this, err));
            return;
          } else
            throw err;
        }
        if (salt.length !== BCRYPT_SALT_LEN) {
          err = Error("Illegal salt length: " + salt.length + " != " + BCRYPT_SALT_LEN);
          if (callback) {
            nextTick(callback.bind(this, err));
            return;
          } else
            throw err;
        }
        rounds = 1 << rounds >>> 0;
        var P, S, i = 0, j;
        if (Int32Array) {
          P = new Int32Array(P_ORIG);
          S = new Int32Array(S_ORIG);
        } else {
          P = P_ORIG.slice();
          S = S_ORIG.slice();
        }
        _ekskey(salt, b, P, S);
        function next() {
          if (progressCallback)
            progressCallback(i / rounds);
          if (i < rounds) {
            var start = Date.now();
            for (; i < rounds; ) {
              i = i + 1;
              _key(b, P, S);
              _key(salt, P, S);
              if (Date.now() - start > MAX_EXECUTION_TIME)
                break;
            }
          } else {
            for (i = 0; i < 64; i++)
              for (j = 0; j < clen >> 1; j++)
                _encipher(cdata, j << 1, P, S);
            var ret = [];
            for (i = 0; i < clen; i++)
              ret.push((cdata[i] >> 24 & 255) >>> 0), ret.push((cdata[i] >> 16 & 255) >>> 0), ret.push((cdata[i] >> 8 & 255) >>> 0), ret.push((cdata[i] & 255) >>> 0);
            if (callback) {
              callback(null, ret);
              return;
            } else
              return ret;
          }
          if (callback)
            nextTick(next);
        }
        __name(next, "next");
        __name2(next, "next");
        if (typeof callback !== "undefined") {
          next();
        } else {
          var res;
          while (true)
            if (typeof (res = next()) !== "undefined")
              return res || [];
        }
      }
      __name(_crypt, "_crypt");
      __name2(_crypt, "_crypt");
      function _hash(s, salt, callback, progressCallback) {
        var err;
        if (typeof s !== "string" || typeof salt !== "string") {
          err = Error("Invalid string / salt: Not a string");
          if (callback) {
            nextTick(callback.bind(this, err));
            return;
          } else
            throw err;
        }
        var minor, offset;
        if (salt.charAt(0) !== "$" || salt.charAt(1) !== "2") {
          err = Error("Invalid salt version: " + salt.substring(0, 2));
          if (callback) {
            nextTick(callback.bind(this, err));
            return;
          } else
            throw err;
        }
        if (salt.charAt(2) === "$")
          minor = String.fromCharCode(0), offset = 3;
        else {
          minor = salt.charAt(2);
          if (minor !== "a" && minor !== "b" && minor !== "y" || salt.charAt(3) !== "$") {
            err = Error("Invalid salt revision: " + salt.substring(2, 4));
            if (callback) {
              nextTick(callback.bind(this, err));
              return;
            } else
              throw err;
          }
          offset = 4;
        }
        if (salt.charAt(offset + 2) > "$") {
          err = Error("Missing salt rounds");
          if (callback) {
            nextTick(callback.bind(this, err));
            return;
          } else
            throw err;
        }
        var r1 = parseInt(salt.substring(offset, offset + 1), 10) * 10, r2 = parseInt(salt.substring(offset + 1, offset + 2), 10), rounds = r1 + r2, real_salt = salt.substring(offset + 3, offset + 25);
        s += minor >= "a" ? "\0" : "";
        var passwordb = stringToBytes(s), saltb = base64_decode(real_salt, BCRYPT_SALT_LEN);
        function finish(bytes) {
          var res = [];
          res.push("$2");
          if (minor >= "a")
            res.push(minor);
          res.push("$");
          if (rounds < 10)
            res.push("0");
          res.push(rounds.toString());
          res.push("$");
          res.push(base64_encode(saltb, saltb.length));
          res.push(base64_encode(bytes, C_ORIG.length * 4 - 1));
          return res.join("");
        }
        __name(finish, "finish");
        __name2(finish, "finish");
        if (typeof callback == "undefined")
          return finish(_crypt(passwordb, saltb, rounds));
        else {
          _crypt(passwordb, saltb, rounds, function(err2, bytes) {
            if (err2)
              callback(err2, null);
            else
              callback(null, finish(bytes));
          }, progressCallback);
        }
      }
      __name(_hash, "_hash");
      __name2(_hash, "_hash");
      bcrypt2.encodeBase64 = base64_encode;
      bcrypt2.decodeBase64 = base64_decode;
      return bcrypt2;
    });
  }
});
function buildFallbackArtist(name, index = 0) {
  const safeName = (name || "").trim().replace(/\s+/g, " ");
  const knownImage = FALLBACK_ARTIST_IMAGES[safeName.toLowerCase()];
  return {
    spotifyId: "",
    name: safeName,
    imageUrl: knownImage || DEFAULT_FALLBACK_IMAGES[index % DEFAULT_FALLBACK_IMAGES.length],
    spotifyUrl: "",
    genres: [],
    popularity: 0,
    followers: 0,
    source: "fallback"
  };
}
__name(buildFallbackArtist, "buildFallbackArtist");
async function searchSpotifyArtists(env, token, query, limit = 8) {
  if (!token) return [];
  try {
    const res = await fetch(`${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=artist&market=FR&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.artists?.items || []).map((item) => ({
      spotifyId: item.id || "",
      name: item.name || "",
      imageUrl: Array.isArray(item.images) && item.images.length > 0 ? item.images[0].url || "" : "",
      spotifyUrl: item.external_urls?.spotify || "",
      genres: Array.isArray(item.genres) ? item.genres.slice(0, 5) : [],
      popularity: typeof item.popularity === "number" ? item.popularity : 0,
      followers: item.followers?.total || 0,
      source: "spotify"
    }));
  } catch (err) {
    console.error("Spotify artist search failed in worker:", err);
    return [];
  }
}
__name(searchSpotifyArtists, "searchSpotifyArtists");
async function getTopTracks(env, token, limit = 12) {
  if (!token) return [];
  try {
    const res = await fetch(`${SPOTIFY_API_BASE}/search?q=top%2050%20France&type=track&market=FR&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      return (data?.tracks?.items || []).map((item) => ({
        id: item.id || "",
        videoId: "",
        spotifyId: item.id || "",
        title: item.name || "",
        artist: Array.isArray(item.artists) ? item.artists[0]?.name || "" : "",
        thumb: Array.isArray(item.album?.images) && item.album.images.length > 0 ? item.album.images[0].url : "",
        source: "spotify",
        durationMs: item.duration_ms || 18e4
      }));
    }
  } catch (err) {
    console.error("Failed fetching top tracks in worker:", err);
  }
  return [];
}
__name(getTopTracks, "getTopTracks");
async function getOfflineFallbackRecommendations(db) {
  try {
    const rows = await db.prepare("SELECT history FROM users").all();
    const allTracksMap = /* @__PURE__ */ new Map();
    if (rows && Array.isArray(rows.results)) {
      rows.results.forEach((row) => {
        if (!row.history) return;
        try {
          const history = JSON.parse(row.history);
          if (Array.isArray(history)) {
            history.forEach((track) => {
              if (!track.videoId) return;
              const key = track.videoId;
              if (!allTracksMap.has(key)) {
                allTracksMap.set(key, {
                  id: track.videoId,
                  videoId: track.videoId,
                  spotifyId: track.spotifyId || "",
                  title: track.title,
                  artist: track.artist || track.uploaderName || "Artiste inconnu",
                  thumb: track.thumb || track.thumbnail || "",
                  source: track.source || "youtube",
                  durationMs: track.durationMs || 18e4,
                  count: 0
                });
              }
              allTracksMap.get(key).count += 1;
            });
          }
        } catch {
        }
      });
    }
    const popularTracks = Array.from(allTracksMap.values()).sort((a, b) => b.count - a.count).map(({ count, ...track }) => track);
    if (popularTracks.length >= 6) {
      return popularTracks;
    }
  } catch (e) {
    console.error("Offline fallback DB recommendations error:", e);
  }
  return STATIC_FALLBACK_TRACKS;
}
__name(getOfflineFallbackRecommendations, "getOfflineFallbackRecommendations");
async function getBannedIPs(db) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind("banned_ips").first();
  return row ? JSON.parse(row.value) : [];
}
__name(getBannedIPs, "getBannedIPs");
async function saveBannedIPs(db, ips) {
  await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind("banned_ips", JSON.stringify(ips)).run();
}
__name(saveBannedIPs, "saveBannedIPs");
async function isSetupCompleted(db) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind("setup_completed").first();
  return row ? JSON.parse(row.value) === true : false;
}
__name(isSetupCompleted, "isSetupCompleted");
async function setSetupCompleted(db, completed) {
  await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind("setup_completed", JSON.stringify(completed)).run();
}
__name(setSetupCompleted, "setSetupCompleted");
function parseUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    password: row.password,
    role: row.role,
    banned: row.banned === 1,
    musicOnboardingCompleted: row.music_onboarding_completed === 1,
    musicPreferences: row.music_preferences ? JSON.parse(row.music_preferences) : { genres: [], artists: [] },
    followedArtists: row.followed_artists ? JSON.parse(row.followed_artists) : [],
    musicPreferencesUpdatedAt: row.music_preferences_updated_at,
    favorites: row.favorites ? JSON.parse(row.favorites) : [],
    likedTracks: row.liked_tracks ? JSON.parse(row.liked_tracks) : [],
    history: row.history ? JSON.parse(row.history) : [],
    recentlyPlayed: row.recently_played ? JSON.parse(row.recently_played) : [],
    localTracks: row.local_tracks ? JSON.parse(row.local_tracks) : [],
    sharedPlaylists: row.shared_playlists ? JSON.parse(row.shared_playlists) : [],
    createdAt: row.created_at
  };
}
__name(parseUser, "parseUser");
async function getUserById(db, id) {
  const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
  return parseUser(row);
}
__name(getUserById, "getUserById");
async function getUserByEmail(db, email) {
  const row = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email.toLowerCase().trim()).first();
  return parseUser(row);
}
__name(getUserByEmail, "getUserByEmail");
async function saveUser(db, user) {
  await db.prepare(`
        INSERT OR REPLACE INTO users (
            id, email, username, password, role, banned, music_onboarding_completed,
            music_preferences, followed_artists, music_preferences_updated_at,
            favorites, liked_tracks, history, recently_played, local_tracks, shared_playlists, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
    user.id,
    user.email.toLowerCase().trim(),
    user.username,
    user.password,
    user.role,
    user.banned ? 1 : 0,
    user.musicOnboardingCompleted ? 1 : 0,
    JSON.stringify(user.musicPreferences || { genres: [], artists: [] }),
    JSON.stringify(user.followedArtists || []),
    user.musicPreferencesUpdatedAt || null,
    JSON.stringify(user.favorites || []),
    JSON.stringify(user.likedTracks || []),
    JSON.stringify(user.history || []),
    JSON.stringify(user.recentlyPlayed || []),
    JSON.stringify(user.localTracks || []),
    JSON.stringify(user.sharedPlaylists || []),
    user.createdAt
  ).run();
}
__name(saveUser, "saveUser");
async function getSpotifyToken(env) {
  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }
  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const auth = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(SPOTIFY_ACCOUNTS_BASE, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ grant_type: "client_credentials" })
  });
  if (!res.ok) return null;
  const data = await res.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1e3
  };
  return tokenCache.accessToken;
}
__name(getSpotifyToken, "getSpotifyToken");
async function tryPipedFetch(path) {
  const shuffled = [...PIPED_INSTANCES].sort(() => Math.random() - 0.5);
  for (const baseUrl of shuffled.slice(0, 3)) {
    try {
      const res = await fetch(`${baseUrl}${path}`);
      if (res.status === 200) {
        const data = await res.json();
        if (data && (Array.isArray(data.items) || Array.isArray(data.audioStreams))) {
          return data;
        }
      }
    } catch {
    }
  }
  return null;
}
__name(tryPipedFetch, "tryPipedFetch");
var import_bcryptjs;
var app;
var JWT_SECRET;
var MIN_PASSWORD_LENGTH;
var MAX_LOCAL_TRACK_BYTES;
var SPOTIFY_API_BASE;
var SPOTIFY_ACCOUNTS_BASE;
var MUSIC_GENRE_OPTIONS;
var MUSIC_GENRE_MAP;
var FALLBACK_ARTIST_IMAGES;
var DEFAULT_FALLBACK_IMAGES;
var DEFAULT_FALLBACK_ARTIST_NAMES;
var RELATED_ARTIST_FALLBACKS;
var STATIC_FALLBACK_TRACKS;
var PIPED_INSTANCES;
var getClientIP;
var checkIPAndAuth;
var requireAdmin;
var tokenCache;
var onRequest;
var init_route = __esm({
  "api/[[route]].js"() {
    init_functionsRoutes_0_48767123574873206();
    init_checked_fetch();
    init_dist();
    init_cloudflare_pages();
    init_jwt4();
    init_cookie2();
    import_bcryptjs = __toESM(require_bcrypt());
    app = new Hono2().basePath("/api");
    JWT_SECRET = "neonwave-secret-2026";
    MIN_PASSWORD_LENGTH = 8;
    MAX_LOCAL_TRACK_BYTES = 50 * 1024 * 1024;
    SPOTIFY_API_BASE = "https://api.spotify.com/v1";
    SPOTIFY_ACCOUNTS_BASE = "https://accounts.spotify.com/api/token";
    MUSIC_GENRE_OPTIONS = [
      "Rap",
      "Drill",
      "R&B",
      "Afro",
      "Pop",
      "Electro",
      "House",
      "Techno",
      "Trap",
      "Dancehall",
      "Amapiano",
      "Latino"
    ];
    MUSIC_GENRE_MAP = MUSIC_GENRE_OPTIONS.reduce((acc, item) => {
      acc[item.toLowerCase()] = item;
      return acc;
    }, {});
    FALLBACK_ARTIST_IMAGES = {
      "maes": "https://cdn-images.dzcdn.net/images/artist/14c919011b4dc5575aa64bcf7311aa5d/1000x1000-000000-80-0-0.jpg",
      "ninho": "https://cdn-images.dzcdn.net/images/artist/7601c5c0e2bd16cb585898316fd0dfec/1000x1000-000000-80-0-0.jpg",
      "sch": "https://cdn-images.dzcdn.net/images/artist/8d9c407bd25fab0fc961b6abf335e874/1000x1000-000000-80-0-0.jpg",
      "damso": "https://cdn-images.dzcdn.net/images/artist/f1a596b126611260994271ce4cb54bb0/1000x1000-000000-80-0-0.jpg",
      "gazo": "https://cdn-images.dzcdn.net/images/artist/54c1dc208f92240e9d56b595708ed284/1000x1000-000000-80-0-0.jpg",
      "tiakola": "https://cdn-images.dzcdn.net/images/artist/0df16db136e7417eeef74988208859c3/1000x1000-000000-80-0-0.jpg",
      "aya nakamura": "https://cdn-images.dzcdn.net/images/artist/c8bca3e6aed3da8de8cbe0edd91bc156/1000x1000-000000-80-0-0.jpg",
      "burna boy": "https://cdn-images.dzcdn.net/images/artist/ad15b7f03325752d60db9e4d39c079ae/1000x1000-000000-80-0-0.jpg",
      "drake": "https://cdn-images.dzcdn.net/images/artist/eb0ed5b21d1ea5af021fc074ded0e91f/1000x1000-000000-80-0-0.jpg",
      "the weeknd": "https://cdn-images.dzcdn.net/images/artist/581693b4724a7fcfa754455101e13a44/1000x1000-000000-80-0-0.jpg",
      "travis scott": "https://cdn-images.dzcdn.net/images/artist/8d8316146026d7e6ce377e314536df62/1000x1000-000000-80-0-0.jpg",
      "jul": "https://cdn-images.dzcdn.net/images/artist/16eb681d72934d4db17088dfc216669d/1000x1000-000000-80-0-0.jpg",
      "werenoi": "https://cdn-images.dzcdn.net/images/artist/c9a941ffdfec123385b9e0b8b20f9ac0/1000x1000-000000-80-0-0.jpg",
      "booba": "https://cdn-images.dzcdn.net/images/artist/38b687e97c6874e744d305ef2ca8d0d0/1000x1000-000000-80-0-0.jpg",
      "pnl": "https://cdn-images.dzcdn.net/images/artist/9277fdce45b79945918c24f69cb6e8e3/1000x1000-000000-80-0-0.jpg",
      "freeze corleone": "https://cdn-images.dzcdn.net/images/artist/cdac7dd9008bcce4c12809c93989e348/1000x1000-000000-80-0-0.jpg",
      "saif": "https://cdn-images.dzcdn.net/images/artist/ce23fc0a3302d65712df2dcfeef5467e/1000x1000-000000-80-0-0.jpg",
      "sa\xEFf": "https://cdn-images.dzcdn.net/images/artist/ce23fc0a3302d65712df2dcfeef5467e/1000x1000-000000-80-0-0.jpg",
      "pato": "https://cdn-images.dzcdn.net/images/artist/28e12b8806d4baa0c3affc8e28a0809e/1000x1000-000000-80-0-0.jpg"
    };
    DEFAULT_FALLBACK_IMAGES = [
      "https://cdn-images.dzcdn.net/images/artist/14c919011b4dc5575aa64bcf7311aa5d/1000x1000-000000-80-0-0.jpg",
      "https://cdn-images.dzcdn.net/images/artist/7601c5c0e2bd16cb585898316fd0dfec/1000x1000-000000-80-0-0.jpg",
      "https://cdn-images.dzcdn.net/images/artist/8d9c407bd25fab0fc961b6abf335e874/1000x1000-000000-80-0-0.jpg",
      "https://cdn-images.dzcdn.net/images/artist/f1a596b126611260994271ce4cb54bb0/1000x1000-000000-80-0-0.jpg"
    ];
    DEFAULT_FALLBACK_ARTIST_NAMES = [
      "Maes",
      "Ninho",
      "SCH",
      "Damso",
      "Gazo",
      "Tiakola",
      "Aya Nakamura",
      "Burna Boy",
      "Drake",
      "The Weeknd",
      "Travis Scott",
      "Jul"
    ];
    RELATED_ARTIST_FALLBACKS = {
      maes: ["SCH", "Ninho", "Damso", "Tiakola", "Gazo"],
      ninho: ["Maes", "SCH", "Damso", "Tiakola", "Gazo"],
      sch: ["Damso", "Maes", "Ninho", "Gazo", "Jul"],
      damso: ["SCH", "Ninho", "Maes", "The Weeknd", "Drake"],
      gazo: ["Tiakola", "Maes", "Ninho", "SCH", "Travis Scott"],
      tiakola: ["Gazo", "Ninho", "Maes", "Aya Nakamura", "Burna Boy"],
      "aya nakamura": ["Burna Boy", "Tiakola", "Drake", "The Weeknd", "Jul"],
      "burna boy": ["Aya Nakamura", "Drake", "The Weeknd", "Tiakola", "Damso"],
      drake: ["The Weeknd", "Travis Scott", "Burna Boy", "Damso", "Aya Nakamura"],
      "the weeknd": ["Drake", "Travis Scott", "Damso", "Burna Boy", "Aya Nakamura"],
      "travis scott": ["Drake", "The Weeknd", "Gazo", "Damso", "SCH"],
      jul: ["SCH", "Maes", "Ninho", "Aya Nakamura", "Tiakola"]
    };
    STATIC_FALLBACK_TRACKS = [
      {
        id: "J05Ww73KlLE",
        videoId: "J05Ww73KlLE",
        spotifyId: "",
        title: "Distant",
        artist: "Maes feat. Ninho",
        thumb: "https://cdn-images.dzcdn.net/images/cover/b0122ae8efd3951902e1f01673a4f219/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 181e3
      },
      {
        id: "3r813K1jK1k",
        videoId: "3r813K1jK1k",
        spotifyId: "",
        title: "Madrina",
        artist: "Maes feat. Booba",
        thumb: "https://cdn-images.dzcdn.net/images/cover/708aea49a3c6311ba1d83273e6a4d0e3/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 2e5
      },
      {
        id: "5wY31c9a6oM",
        videoId: "5wY31c9a6oM",
        spotifyId: "",
        title: "PARANO",
        artist: "GAULOIS feat. Maes",
        thumb: "https://cdn-images.dzcdn.net/images/cover/f53927289cf5798a4d82f92d953ea2ff/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 185e3
      },
      {
        id: "j93dSpC8T3A",
        videoId: "j93dSpC8T3A",
        spotifyId: "",
        title: "T'avais raison",
        artist: "GIMS, Maes",
        thumb: "https://cdn-images.dzcdn.net/images/cover/fe8d3b62b12560fe169d428b0d28597e/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 181e3
      },
      {
        id: "Gq4oD5k_yv4",
        videoId: "Gq4oD5k_yv4",
        spotifyId: "",
        title: "FC BEAUDOTTES",
        artist: "Maes",
        thumb: "https://cdn-images.dzcdn.net/images/cover/eb87bb36f5eaac37d553b85143bf8eed/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 185e3
      },
      {
        id: "4CgR-p1hLsk",
        videoId: "4CgR-p1hLsk",
        spotifyId: "",
        title: "HIJAMA",
        artist: "Maes",
        thumb: "https://cdn-images.dzcdn.net/images/cover/33546e8c7b544a4a20d6592af1f4ad56/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 193e3
      },
      {
        id: "d4TndR9g83M",
        videoId: "d4TndR9g83M",
        spotifyId: "",
        title: "Tout va bien",
        artist: "Alonzo feat. Ninho & Naps",
        thumb: "https://cdn-images.dzcdn.net/images/cover/444dfc082c5570458c36f0268b5a206e/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 19e4
      },
      {
        id: "c7D2aI_A1P4",
        videoId: "c7D2aI_A1P4",
        spotifyId: "",
        title: "La Kiffance",
        artist: "Naps",
        thumb: "https://cdn-images.dzcdn.net/images/cover/0846f00620ad172c934e89bcad774388/1000x1000-000000-80-0-0.jpg",
        source: "spotify",
        durationMs: 179e3
      }
    ];
    __name2(buildFallbackArtist, "buildFallbackArtist");
    __name2(searchSpotifyArtists, "searchSpotifyArtists");
    __name2(getTopTracks, "getTopTracks");
    __name2(getOfflineFallbackRecommendations, "getOfflineFallbackRecommendations");
    PIPED_INSTANCES = [
      "https://pipedapi.kavin.rocks",
      "https://piped-api.lunar.icu",
      "https://api.piped.projectsegfau.lt",
      "https://pipedapi.riverside.rocks",
      "https://api-piped.mha.fi",
      "https://pipedapi.col7.it",
      "https://piped-api.garudalinux.org",
      "https://api.piped.cre.re"
    ];
    __name2(getBannedIPs, "getBannedIPs");
    __name2(saveBannedIPs, "saveBannedIPs");
    __name2(isSetupCompleted, "isSetupCompleted");
    __name2(setSetupCompleted, "setSetupCompleted");
    __name2(parseUser, "parseUser");
    __name2(getUserById, "getUserById");
    __name2(getUserByEmail, "getUserByEmail");
    __name2(saveUser, "saveUser");
    getClientIP = /* @__PURE__ */ __name2((c) => {
      return c.req.header("cf-connecting-ip") || c.req.header("x-real-ip") || "127.0.0.1";
    }, "getClientIP");
    checkIPAndAuth = /* @__PURE__ */ __name2(async (c, next) => {
      const db = c.env.DB;
      const clientIP = getClientIP(c);
      const bannedIPs = await getBannedIPs(db);
      if (bannedIPs.includes(clientIP)) {
        return c.json({ error: "Votre adresse IP a \xE9t\xE9 bannie." }, 403);
      }
      const authHeader = c.req.header("Authorization");
      const cookieToken = getCookie(c, "token");
      const token = cookieToken || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
      if (!token) {
        return c.json({ error: "Auth requis" }, 401);
      }
      try {
        const secret = c.env.JWT_SECRET || JWT_SECRET;
        const decoded = await verify2(token, secret, "HS256");
        const user = await getUserById(db, decoded.id);
        if (!user) {
          return c.json({ error: "Session invalide ou expir\xE9e" }, 401);
        }
        if (user.banned) {
          return c.json({ error: "Votre compte a \xE9t\xE9 banni." }, 403);
        }
        c.set("user", user);
        await next();
      } catch (err) {
        return c.json({ error: "Session invalide ou expir\xE9e", details: err.message, stack: err.stack }, 401);
      }
    }, "checkIPAndAuth");
    requireAdmin = /* @__PURE__ */ __name2(async (c, next) => {
      const user = c.get("user");
      if (user.role !== "OWNER" && user.role !== "ADMIN") {
        return c.json({ error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." }, 403);
      }
      await next();
    }, "requireAdmin");
    app.get("/setup/status", async (c) => {
      const db = c.env.DB;
      const completed = await isSetupCompleted(db);
      return c.json({ setupRequired: !completed });
    });
    app.post("/setup/owner", async (c) => {
      const db = c.env.DB;
      const completed = await isSetupCompleted(db);
      if (completed) {
        return c.json({ error: "Configuration d\xE9j\xE0 effectu\xE9e." }, 400);
      }
      try {
        const body = await c.req.json();
        const email = String(body.email || "").trim();
        const username = String(body.username || "").trim();
        const password = String(body.password || "");
        if (!email || !username || !password) {
          return c.json({ error: "Champs requis." }, 400);
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
          return c.json({ error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caract\xE8res.` }, 400);
        }
        const hashedPassword = await import_bcryptjs.default.hash(password, 10);
        const owner = {
          id: `user-${crypto.randomUUID()}`,
          email,
          username,
          password: hashedPassword,
          role: "OWNER",
          banned: false,
          musicOnboardingCompleted: false,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await saveUser(db, owner);
        await setSetupCompleted(db, true);
        const secret = c.env.JWT_SECRET || JWT_SECRET;
        const token = await sign2({ id: owner.id, email: owner.email, role: owner.role }, secret, "HS256");
        setCookie(c, "token", token, {
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
          maxAge: 30 * 24 * 60 * 60
        });
        return c.json({
          token,
          user: {
            id: owner.id,
            username: owner.username,
            email: owner.email,
            role: owner.role
          }
        });
      } catch (err) {
        return c.json({ error: err.message }, 500);
      }
    });
    app.post("/auth/register", async (c) => {
      const db = c.env.DB;
      const body = await c.req.json();
      const email = String(body.email || "").trim();
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      if (!email || !username || !password) {
        return c.json({ error: "Champs requis." }, 400);
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        return c.json({ error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caract\xE8res.` }, 400);
      }
      const existing = await getUserByEmail(db, email);
      if (existing) {
        return c.json({ error: "Cet email est d\xE9j\xE0 enregistr\xE9." }, 409);
      }
      const hashedPassword = await import_bcryptjs.default.hash(password, 10);
      const user = {
        id: `user-${crypto.randomUUID()}`,
        email,
        username,
        password: hashedPassword,
        role: "USER",
        banned: false,
        musicOnboardingCompleted: false,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await saveUser(db, user);
      const secret = c.env.JWT_SECRET || JWT_SECRET;
      const token = await sign2({ id: user.id, email: user.email, role: user.role }, secret, "HS256");
      setCookie(c, "token", token, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: 7 * 24 * 60 * 60
      });
      return c.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    });
    app.post("/auth/login", async (c) => {
      const db = c.env.DB;
      const body = await c.req.json();
      const email = String(body.email || "").trim();
      const password = String(body.password || "");
      const rememberMe = body.rememberMe === true;
      if (!email || !password) {
        return c.json({ error: "Champs requis." }, 400);
      }
      const user = await getUserByEmail(db, email);
      if (!user || user.banned) {
        return c.json({ error: "Identifiants incorrects." }, 401);
      }
      const valid = await import_bcryptjs.default.compare(password, user.password);
      if (!valid) {
        return c.json({ error: "Identifiants incorrects." }, 401);
      }
      const secret = c.env.JWT_SECRET || JWT_SECRET;
      const expiresIn = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
      const token = await sign2({ id: user.id, email: user.email, role: user.role }, secret, "HS256");
      setCookie(c, "token", token, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: expiresIn
      });
      return c.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    });
    app.get("/auth/me", checkIPAndAuth, async (c) => {
      const user = c.get("user");
      return c.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    });
    app.post("/auth/logout", async (c) => {
      return c.json({ success: true });
    });
    tokenCache = { accessToken: null, expiresAt: 0 };
    __name2(getSpotifyToken, "getSpotifyToken");
    app.get("/spotify/search", checkIPAndAuth, async (c) => {
      const q = c.req.query("q");
      const token = await getSpotifyToken(c.env);
      if (!token) return c.json({ tracks: { items: [] } });
      const res = await fetch(`${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(q)}&type=track&market=FR&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return c.json(data);
    });
    app.get("/spotify/search-albums", checkIPAndAuth, async (c) => {
      const q = c.req.query("q");
      const token = await getSpotifyToken(c.env);
      if (!token) return c.json({ albums: { items: [] } });
      const res = await fetch(`${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(q)}&type=album&market=FR&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return c.json(data);
    });
    app.get("/spotify/albums/:id", checkIPAndAuth, async (c) => {
      const id = c.req.param("id");
      const token = await getSpotifyToken(c.env);
      if (!token) return c.json({ error: "Spotify non configur\xE9" }, 503);
      const res = await fetch(`${SPOTIFY_API_BASE}/albums/${id}?market=FR`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return c.json(data);
    });
    app.get("/spotify/artists/defaults", checkIPAndAuth, async (c) => {
      const env = c.env;
      const token = await getSpotifyToken(env);
      const spotifyEnabled = Boolean(token);
      let items = [];
      if (spotifyEnabled) {
        try {
          const results = await Promise.allSettled(
            DEFAULT_FALLBACK_ARTIST_NAMES.map(async (name) => {
              const matches = await searchSpotifyArtists(env, token, name, 3);
              return matches[0] || null;
            })
          );
          const seen = /* @__PURE__ */ new Set();
          results.forEach((res, index) => {
            const artist = res.status === "fulfilled" && res.value ? res.value : buildFallbackArtist(DEFAULT_FALLBACK_ARTIST_NAMES[index], index);
            const identity = (artist.spotifyId || artist.name).toLowerCase();
            if (identity && !seen.has(identity)) {
              seen.add(identity);
              items.push(artist);
            }
          });
        } catch (err) {
          console.error("Failed fetching defaults from Spotify:", err);
        }
      }
      if (items.length === 0) {
        items = DEFAULT_FALLBACK_ARTIST_NAMES.map((name, index) => buildFallbackArtist(name, index));
      }
      return c.json({ items, spotifyEnabled });
    });
    app.get("/spotify/search-artists", checkIPAndAuth, async (c) => {
      const query = (c.req.query("q") || "").trim();
      if (query.length < 2) {
        return c.json({ items: [] });
      }
      const env = c.env;
      const token = await getSpotifyToken(env);
      const spotifyEnabled = Boolean(token);
      let items = [];
      if (spotifyEnabled) {
        items = await searchSpotifyArtists(env, token, query, 8);
      }
      if (items.length === 0) {
        const fallbackNames = Array.from(/* @__PURE__ */ new Set([
          ...DEFAULT_FALLBACK_ARTIST_NAMES,
          ...Object.keys(RELATED_ARTIST_FALLBACKS),
          ...Object.values(RELATED_ARTIST_FALLBACKS).flat()
        ])).filter((name) => name.toLowerCase().includes(query.toLowerCase()));
        if (fallbackNames.length > 0) {
          items = fallbackNames.slice(0, 8).map((name, index) => buildFallbackArtist(name, index));
        } else {
          items = [buildFallbackArtist(query)];
        }
      }
      return c.json({ items, spotifyEnabled });
    });
    app.get("/spotify/artists/:id/related", checkIPAndAuth, async (c) => {
      const artistId = c.req.param("id");
      const fallbackName = (c.req.query("name") || "").trim();
      const env = c.env;
      const token = await getSpotifyToken(env);
      const spotifyEnabled = Boolean(token);
      let items = [];
      if (spotifyEnabled && artistId && artistId !== "fallback") {
        try {
          const res = await fetch(`${SPOTIFY_API_BASE}/artists/${encodeURIComponent(artistId)}/related-artists`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            items = (data?.artists || []).map((item) => ({
              spotifyId: item.id || "",
              name: item.name || "",
              imageUrl: Array.isArray(item.images) && item.images.length > 0 ? item.images[0].url || "" : "",
              spotifyUrl: item.external_urls?.spotify || "",
              genres: Array.isArray(item.genres) ? item.genres.slice(0, 5) : [],
              popularity: typeof item.popularity === "number" ? item.popularity : 0,
              followers: item.followers?.total || 0,
              source: "spotify"
            }));
          }
        } catch (err) {
          console.error("Spotify related artists failed:", err);
        }
      }
      if (items.length === 0 && fallbackName) {
        const relatedNames = RELATED_ARTIST_FALLBACKS[fallbackName.toLowerCase()] || [];
        items = relatedNames.map((name, index) => buildFallbackArtist(name, index));
      }
      return c.json({ items, spotifyEnabled });
    });
    app.get("/deezer/albums/:id", checkIPAndAuth, async (c) => {
      const id = c.req.param("id");
      const res = await fetch(`https://api.deezer.com/album/${id}`);
      const data = await res.json();
      return c.json(data);
    });
    __name2(tryPipedFetch, "tryPipedFetch");
    app.get("/music/resolve/:spotifyId", checkIPAndAuth, async (c) => {
      const title = c.req.query("title");
      const artist = c.req.query("artist");
      const query = `${title} ${artist}`;
      const pipedData = await tryPipedFetch(`/search?q=${encodeURIComponent(query)}&filter=music_songs`);
      const bestItem = pipedData?.items?.[0];
      if (bestItem) {
        return c.json({
          videoId: bestItem.videoId,
          title: bestItem.title,
          artist: bestItem.uploaderName,
          duration: bestItem.duration
        });
      }
      return c.json({ error: "Aucun flux trouv\xE9." }, 404);
    });
    app.get("/music/resolve-by-metadata", checkIPAndAuth, async (c) => {
      const title = c.req.query("title");
      const artist = c.req.query("artist");
      const query = `${title} ${artist}`;
      const pipedData = await tryPipedFetch(`/search?q=${encodeURIComponent(query)}&filter=music_songs`);
      const bestItem = pipedData?.items?.[0];
      if (bestItem) {
        return c.json({
          videoId: bestItem.videoId,
          title: bestItem.title,
          artist: bestItem.uploaderName,
          duration: bestItem.duration
        });
      }
      return c.json({ error: "Aucun flux trouv\xE9." }, 404);
    });
    app.get("/music/streams/:id", checkIPAndAuth, async (c) => {
      const videoId = c.req.param("id");
      const pipedData = await tryPipedFetch(`/streams/${encodeURIComponent(videoId)}`);
      if (pipedData && Array.isArray(pipedData.audioStreams) && pipedData.audioStreams.length > 0) {
        const sorted = [...pipedData.audioStreams].sort((l, r) => (r.bitrate || 0) - (l.bitrate || 0));
        const bestStream = sorted[0];
        if (bestStream?.url) {
          const db = c.env.DB;
          const user = c.get("user");
          const playEntry = {
            videoId,
            title: pipedData.title || "Titre inconnu",
            artist: pipedData.uploader || "Artiste inconnu",
            thumb: pipedData.thumbnailUrl || "",
            playedAt: (/* @__PURE__ */ new Date()).toISOString()
          };
          user.history.unshift(playEntry);
          if (user.history.length > 500) user.history.pop();
          user.recentlyPlayed = [
            playEntry,
            ...user.recentlyPlayed.filter((t) => t.videoId !== videoId)
          ].slice(0, 20);
          await saveUser(db, user);
          return c.redirect(bestStream.url, 307);
        }
      }
      return c.json({ error: "Impossible de charger le flux audio." }, 404);
    });
    app.get("/user/recently-played", checkIPAndAuth, async (c) => {
      const user = c.get("user");
      return c.json(user.recentlyPlayed || []);
    });
    app.get("/user/weekly-recap", checkIPAndAuth, async (c) => {
      const user = c.get("user");
      return c.json({
        week: { id: "current", label: "Mon top \xE9coutes" },
        hasData: user.history.length > 0,
        totalPlays: user.history.length,
        totalMinutes: Math.round(user.history.length * 3),
        artists: [],
        tracks: user.recentlyPlayed.slice(0, 5)
      });
    });
    app.get("/user/music-preferences", checkIPAndAuth, async (c) => {
      const user = c.get("user");
      const token = await getSpotifyToken(c.env);
      return c.json({
        completed: user.musicOnboardingCompleted,
        genres: user.musicPreferences.genres || [],
        artists: user.musicPreferences.artists || [],
        followedArtists: user.followedArtists || [],
        spotifyEnabled: Boolean(token)
      });
    });
    app.post("/user/music-preferences", checkIPAndAuth, async (c) => {
      const db = c.env.DB;
      const user = c.get("user");
      const body = await c.req.json();
      user.musicPreferences = {
        genres: body.genres || [],
        artists: body.artists || []
      };
      user.followedArtists = user.followedArtists || [];
      const existingFollowed = new Set(user.followedArtists.map((a) => (a.spotifyId || a.name || "").toLowerCase()));
      (body.artists || []).forEach((artist) => {
        const key = (artist.spotifyId || artist.name || "").toLowerCase();
        if (key && !existingFollowed.has(key)) {
          user.followedArtists.push(artist);
          existingFollowed.add(key);
        }
      });
      user.musicOnboardingCompleted = true;
      user.musicPreferencesUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
      await saveUser(db, user);
      const token = await getSpotifyToken(c.env);
      return c.json({
        completed: user.musicOnboardingCompleted,
        genres: user.musicPreferences.genres || [],
        artists: user.musicPreferences.artists || [],
        followedArtists: user.followedArtists || [],
        spotifyEnabled: Boolean(token)
      });
    });
    app.post("/user/followed-artists/toggle", checkIPAndAuth, async (c) => {
      const db = c.env.DB;
      const user = c.get("user");
      const body = await c.req.json();
      const artist = body.artist || body;
      if (!artist?.name) {
        return c.json({ error: "Artiste invalide." }, 400);
      }
      user.followedArtists = user.followedArtists || [];
      const index = user.followedArtists.findIndex((a) => (a.spotifyId || a.name) === (artist.spotifyId || artist.name));
      let followed = false;
      if (index === -1) {
        user.followedArtists.push(artist);
        followed = true;
      } else {
        user.followedArtists.splice(index, 1);
        followed = false;
      }
      await saveUser(db, user);
      return c.json({ followed, followedArtists: user.followedArtists });
    });
    app.get("/user/recommendations", checkIPAndAuth, async (c) => {
      const user = c.get("user");
      const db = c.env.DB;
      const token = await getSpotifyToken(c.env);
      const spotifyEnabled = Boolean(token);
      if (!user.musicOnboardingCompleted) {
        return c.json({ items: [] });
      }
      const artistSeeds = (user.musicPreferences?.artists || []).map((a) => a.spotifyId || a.name).filter(Boolean);
      const genreSeeds = user.musicPreferences?.genres || [];
      const artistIds = (user.musicPreferences?.artists || []).map((a) => a.spotifyId).filter(Boolean);
      let items = [];
      if (spotifyEnabled && artistIds.length > 0) {
        try {
          const seedArtists = artistIds.slice(0, 5).join(",");
          const res = await fetch(`${SPOTIFY_API_BASE}/recommendations?seed_artists=${encodeURIComponent(seedArtists)}&market=FR&limit=12`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            items = (data?.tracks || []).map((item) => ({
              id: item.id || "",
              videoId: "",
              spotifyId: item.id || "",
              title: item.name || "",
              artist: Array.isArray(item.artists) ? item.artists[0]?.name || "" : "",
              thumb: Array.isArray(item.album?.images) && item.album.images.length > 0 ? item.album.images[0].url : "",
              source: "spotify",
              durationMs: item.duration_ms || 18e4
            }));
          }
        } catch (err) {
          console.error("Failed fetching Spotify recommendations in user/recommendations:", err);
        }
      }
      if (items.length === 0) {
        items = await getOfflineFallbackRecommendations(db);
      }
      return c.json({
        items: items.slice(0, 12),
        seeds: {
          artists: artistSeeds,
          genres: genreSeeds
        }
      });
    });
    app.get("/music/recommendations", checkIPAndAuth, async (c) => {
      const seedTracks = c.req.query("seed_tracks") || "";
      const env = c.env;
      const db = c.env.DB;
      const token = await getSpotifyToken(env);
      let items = [];
      if (token && seedTracks) {
        try {
          const res = await fetch(`${SPOTIFY_API_BASE}/recommendations?seed_tracks=${encodeURIComponent(seedTracks)}&market=FR&limit=12`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            items = (data?.tracks || []).map((item) => ({
              id: item.id || "",
              videoId: "",
              spotifyId: item.id || "",
              title: item.name || "",
              artist: Array.isArray(item.artists) ? item.artists[0]?.name || "" : "",
              thumb: Array.isArray(item.album?.images) && item.album.images.length > 0 ? item.album.images[0].url : "",
              source: "spotify",
              durationMs: item.duration_ms || 18e4
            }));
          }
        } catch (err) {
          console.error("Failed fetching Spotify recommendations in music/recommendations:", err);
        }
      }
      if (items.length === 0) {
        items = await getOfflineFallbackRecommendations(db);
      }
      return c.json({ items });
    });
    app.get("/music/trending", checkIPAndAuth, async (c) => {
      const env = c.env;
      const db = c.env.DB;
      const token = await getSpotifyToken(env);
      const spotifyEnabled = Boolean(token);
      let items = [];
      if (spotifyEnabled) {
        items = await getTopTracks(env, token, 12);
      }
      if (items.length === 0) {
        items = await getOfflineFallbackRecommendations(db);
      }
      return c.json({
        items: items.slice(0, 12),
        title: "Le Top du Moment \u2014 NeonWave",
        spotifyEnabled
      });
    });
    app.post("/music/history", checkIPAndAuth, async (c) => {
      const db = c.env.DB;
      const user = c.get("user");
      const track = await c.req.json();
      if (!track?.videoId) return c.json({ error: "Track invalide." }, 400);
      const spotifyId = track.spotifyId || track?.spotify?.spotifyId || "";
      const playEntry = {
        videoId: track.videoId,
        spotifyId,
        localTrackId: track.localTrackId || "",
        source: track.source || "",
        streamUrl: track.streamUrl || "",
        title: track.title || "Sans titre",
        artist: track.artist || track.uploaderName || "Artiste inconnu",
        thumb: track.thumbnail || track.thumb || "",
        durationMs: Number(track.durationMs) || 0,
        playedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      user.history = user.history || [];
      user.history.unshift(playEntry);
      if (user.history.length > 500) user.history.pop();
      user.recentlyPlayed = [
        playEntry,
        ...(user.recentlyPlayed || []).filter((t) => {
          const currentSpotifyId = t?.spotifyId || "";
          if (spotifyId && currentSpotifyId) {
            return currentSpotifyId !== spotifyId;
          }
          return t.videoId !== track.videoId;
        })
      ].slice(0, 20);
      await saveUser(db, user);
      return c.json({ success: true });
    });
    app.get("/user/history", checkIPAndAuth, async (c) => {
      const user = c.get("user");
      return c.json(user.history || []);
    });
    app.get("/spotify/artist-profile", checkIPAndAuth, async (c) => {
      const spotifyId = (c.req.query("spotifyId") || "").trim();
      const name = (c.req.query("name") || "").trim();
      const env = c.env;
      const token = await getSpotifyToken(env);
      const spotifyEnabled = Boolean(token);
      let artist = null;
      let topTracks = [];
      let discography = { popular: [], albums: [], singles: [] };
      let relatedArtists = [];
      let appearsOn = [];
      if (spotifyEnabled && spotifyId && spotifyId !== "fallback") {
        try {
          const artistRes = await fetch(`${SPOTIFY_API_BASE}/artists/${encodeURIComponent(spotifyId)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (artistRes.ok) {
            const artistData = await artistRes.json();
            artist = {
              spotifyId: artistData.id || "",
              name: artistData.name || "",
              imageUrl: Array.isArray(artistData.images) && artistData.images.length > 0 ? artistData.images[0].url : "",
              spotifyUrl: artistData.external_urls?.spotify || "",
              genres: Array.isArray(artistData.genres) ? artistData.genres.slice(0, 5) : [],
              popularity: artistData.popularity || 0,
              followers: artistData.followers?.total || 0,
              source: "spotify"
            };
          }
          const tracksRes = await fetch(`${SPOTIFY_API_BASE}/artists/${encodeURIComponent(spotifyId)}/top-tracks?market=FR`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (tracksRes.ok) {
            const tracksData = await tracksRes.json();
            topTracks = (tracksData.tracks || []).map((item) => ({
              id: item.id || "",
              videoId: "",
              spotifyId: item.id || "",
              title: item.name || "",
              artist: Array.isArray(item.artists) ? item.artists[0]?.name || "" : "",
              thumb: Array.isArray(item.album?.images) && item.album.images.length > 0 ? item.album.images[0].url : "",
              source: "spotify",
              durationMs: item.duration_ms || 18e4
            }));
          }
          const albumsRes = await fetch(`${SPOTIFY_API_BASE}/artists/${encodeURIComponent(spotifyId)}/albums?market=FR&limit=30`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (albumsRes.ok) {
            const albumsData = await albumsRes.json();
            const items = (albumsData.items || []).map((album) => ({
              spotifyId: album.id || "",
              name: album.name || "",
              imageUrl: Array.isArray(album.images) && album.images.length > 0 ? album.images[0].url : "",
              spotifyUrl: album.external_urls?.spotify || "",
              artists: Array.isArray(album.artists) ? album.artists.map((a) => a.name) : [],
              releaseDate: album.release_date || "",
              totalTracks: album.total_tracks || 0,
              type: album.album_type || "album",
              group: album.album_group || album.album_type || "album",
              source: "spotify"
            }));
            discography.albums = items.filter((a) => a.group === "album");
            discography.singles = items.filter((a) => a.group === "single");
            discography.popular = items.slice(0, 10);
          }
          const relatedRes = await fetch(`${SPOTIFY_API_BASE}/artists/${encodeURIComponent(spotifyId)}/related-artists`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (relatedRes.ok) {
            const relatedData = await relatedRes.json();
            relatedArtists = (relatedData.artists || []).slice(0, 8).map((item) => ({
              spotifyId: item.id || "",
              name: item.name || "",
              imageUrl: Array.isArray(item.images) && item.images.length > 0 ? item.images[0].url : "",
              spotifyUrl: item.external_urls?.spotify || "",
              genres: Array.isArray(item.genres) ? item.genres.slice(0, 5) : [],
              popularity: item.popularity || 0,
              followers: item.followers?.total || 0,
              source: "spotify"
            }));
          }
        } catch (err) {
          console.error("Failed fetching Spotify artist profile:", err);
        }
      }
      if (!artist && name) {
        try {
          const deezerSearchRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}`);
          if (deezerSearchRes.ok) {
            const deezerSearchData = await deezerSearchRes.json();
            const firstArtist = deezerSearchData?.data?.[0];
            if (firstArtist) {
              artist = {
                spotifyId: "",
                name: firstArtist.name || name,
                imageUrl: firstArtist.picture_big || firstArtist.picture_medium || "",
                spotifyUrl: "",
                genres: [],
                popularity: 0,
                followers: firstArtist.nb_fan || 0,
                source: "deezer"
              };
              const topRes = await fetch(`https://api.deezer.com/artist/${firstArtist.id}/top?limit=10`);
              if (topRes.ok) {
                const topData = await topRes.json();
                topTracks = (topData.data || []).map((item) => ({
                  id: item.id || "",
                  videoId: "",
                  spotifyId: "",
                  title: item.title || "",
                  artist: item.artist?.name || "",
                  thumb: item.album?.cover_big || item.album?.cover_medium || "",
                  source: "deezer",
                  durationMs: (item.duration || 180) * 1e3
                }));
              }
              const albumsRes = await fetch(`https://api.deezer.com/artist/${firstArtist.id}/albums?limit=30`);
              if (albumsRes.ok) {
                const albumsData = await albumsRes.json();
                const items = (albumsData.data || []).map((album) => ({
                  spotifyId: "",
                  name: album.title || "",
                  imageUrl: album.cover_big || album.cover_medium || "",
                  spotifyUrl: "",
                  artists: [artist.name],
                  releaseDate: album.release_date || "",
                  totalTracks: album.nb_tracks || 0,
                  type: "album",
                  group: "album",
                  source: "deezer"
                }));
                discography.albums = items;
                discography.popular = items.slice(0, 10);
              }
            }
          }
        } catch (deezerErr) {
          console.error("Deezer fallback artist profile failed:", deezerErr);
        }
      }
      if (!artist) {
        artist = buildFallbackArtist(name || "Artiste");
      }
      return c.json({
        item: {
          artist,
          topTracks,
          discography,
          appearsOn,
          relatedArtists
        },
        spotifyEnabled
      });
    });
    app.get("/user/favorites", checkIPAndAuth, async (c) => {
      const user = c.get("user");
      return c.json(user.favorites || []);
    });
    app.post("/user/favorites", checkIPAndAuth, async (c) => {
      const db = c.env.DB;
      const user = c.get("user");
      const body = await c.req.json();
      const videoId = body.videoId;
      if (!videoId) return c.json({ error: "videoId requis" }, 400);
      const idx = user.favorites.indexOf(videoId);
      if (idx === -1) user.favorites.push(videoId);
      else user.favorites.splice(idx, 1);
      await saveUser(db, user);
      return c.json({ favorites: user.favorites });
    });
    app.get("/user/liked-tracks", checkIPAndAuth, async (c) => {
      const user = c.get("user");
      return c.json(user.likedTracks || []);
    });
    app.post("/user/liked-tracks", checkIPAndAuth, async (c) => {
      const db = c.env.DB;
      const user = c.get("user");
      const body = await c.req.json();
      const track = body.track;
      if (!track) return c.json({ error: "track requis" }, 400);
      const idx = user.likedTracks.findIndex((t) => t.id === track.id);
      if (idx === -1) {
        user.likedTracks.push(track);
        if (!user.favorites.includes(track.videoId)) user.favorites.push(track.videoId);
      } else {
        user.likedTracks.splice(idx, 1);
        user.favorites = user.favorites.filter((id) => id !== track.videoId);
      }
      await saveUser(db, user);
      return c.json({ likedTracks: user.likedTracks, favorites: user.favorites });
    });
    app.get("/user/playlists", checkIPAndAuth, async (c) => {
      const db = c.env.DB;
      const user = c.get("user");
      const rows = await db.prepare("SELECT * FROM playlists WHERE user_id = ?").bind(user.id).all();
      const playlists = (rows.results || []).map((r) => ({
        id: r.id,
        name: r.name,
        createdAt: r.created_at,
        tracks: JSON.parse(r.tracks)
      }));
      return c.json(playlists);
    });
    app.post("/user/playlists", checkIPAndAuth, async (c) => {
      const db = c.env.DB;
      const user = c.get("user");
      const body = await c.req.json();
      const name = String(body.name || "").trim();
      if (!name) return c.json({ error: "Nom requis" }, 400);
      const playlist = {
        id: `playlist-${crypto.randomUUID()}`,
        name,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        tracks: "[]"
      };
      await db.prepare("INSERT INTO playlists (id, user_id, name, created_at, tracks) VALUES (?, ?, ?, ?, ?)").bind(playlist.id, user.id, playlist.name, playlist.created_at, playlist.tracks).run();
      return c.json({ id: playlist.id, name: playlist.name, tracks: [] });
    });
    app.post("/user/playlists/:id/tracks", checkIPAndAuth, async (c) => {
      const db = c.env.DB;
      const playlistId = c.req.param("id");
      const body = await c.req.json();
      const track = body.track;
      if (!track) return c.json({ error: "track requis" }, 400);
      const row = await db.prepare("SELECT * FROM playlists WHERE id = ?").bind(playlistId).first();
      if (!row) return c.json({ error: "Playlist introuvable" }, 404);
      const tracks = JSON.parse(row.tracks);
      const exists = tracks.some((t) => t.id === track.id);
      if (!exists) {
        tracks.push(track);
        await db.prepare("UPDATE playlists SET tracks = ? WHERE id = ?").bind(JSON.stringify(tracks), playlistId).run();
      }
      return c.json({ success: true, tracks });
    });
    app.get("/user/local-tracks", checkIPAndAuth, async (c) => {
      const user = c.get("user");
      return c.json(user.localTracks || []);
    });
    app.post("/user/local-tracks", checkIPAndAuth, async (c) => {
      const db = c.env.DB;
      const bucket = c.env.BUCKET;
      const user = c.get("user");
      if (!bucket) {
        return c.json({ error: "Stockage Cloudflare R2 non configur\xE9." }, 503);
      }
      try {
        const formData = await c.req.parseBody();
        const file = formData.file;
        const title = String(formData.title || "Titre inconnu");
        const artist = String(formData.artist || "Artiste inconnu");
        if (!file || !(file instanceof File)) {
          return c.json({ error: "Fichier audio requis." }, 400);
        }
        const trackId = `local-${crypto.randomUUID()}`;
        const key = `local-tracks/${user.id}/${trackId}`;
        const arrayBuffer = await file.arrayBuffer();
        await bucket.put(key, arrayBuffer, {
          customMetadata: {
            title,
            artist,
            userId: user.id
          }
        });
        const newTrack = {
          id: trackId,
          videoId: trackId,
          localTrackId: trackId,
          source: "local",
          title,
          artist,
          thumb: "",
          durationMs: 0,
          mimeType: file.type,
          size: file.size,
          addedAt: (/* @__PURE__ */ new Date()).toISOString(),
          streamUrl: `/api/user/local-tracks/${trackId}/stream`
        };
        user.localTracks.push(newTrack);
        await saveUser(db, user);
        return c.json(newTrack);
      } catch (err) {
        return c.json({ error: err.message }, 500);
      }
    });
    app.get("/user/local-tracks/:id/stream", checkIPAndAuth, async (c) => {
      const bucket = c.env.BUCKET;
      const user = c.get("user");
      const trackId = c.req.param("id");
      const key = `local-tracks/${user.id}/${trackId}`;
      if (!bucket) {
        return c.json({ error: "Stockage Cloudflare R2 non configur\xE9." }, 503);
      }
      const object = await bucket.get(key);
      if (!object) {
        return c.json({ error: "Fichier introuvable." }, 404);
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      return new Response(object.body, { headers });
    });
    app.get("/admin/users", checkIPAndAuth, requireAdmin, async (c) => {
      const db = c.env.DB;
      const rows = await db.prepare("SELECT id, email, username, role, banned, created_at FROM users").all();
      return c.json(rows.results || []);
    });
    app.post("/admin/ban/:userId", checkIPAndAuth, requireAdmin, async (c) => {
      const db = c.env.DB;
      const userId = c.req.param("userId");
      const target = await getUserById(db, userId);
      if (!target) return c.json({ error: "Utilisateur introuvable" }, 404);
      if (target.role === "OWNER") return c.json({ error: "Impossible de bannir le propri\xE9taire" }, 400);
      target.banned = true;
      await saveUser(db, target);
      return c.json({ success: true });
    });
    app.post("/admin/unban/:userId", checkIPAndAuth, requireAdmin, async (c) => {
      const db = c.env.DB;
      const userId = c.req.param("userId");
      const target = await getUserById(db, userId);
      if (!target) return c.json({ error: "Utilisateur introuvable" }, 404);
      target.banned = false;
      await saveUser(db, target);
      return c.json({ success: true });
    });
    app.get("/admin/banned-ips", checkIPAndAuth, requireAdmin, async (c) => {
      const db = c.env.DB;
      const ips = await getBannedIPs(db);
      return c.json(ips);
    });
    app.post("/admin/ban-ip", checkIPAndAuth, requireAdmin, async (c) => {
      const db = c.env.DB;
      const body = await c.req.json();
      const ip = String(body.ip || "").trim();
      if (!ip) return c.json({ error: "IP requise" }, 400);
      const ips = await getBannedIPs(db);
      if (!ips.includes(ip)) {
        ips.push(ip);
        await saveBannedIPs(db, ips);
      }
      return c.json(ips);
    });
    onRequest = handle(app);
  }
});
var routes;
var init_functionsRoutes_0_48767123574873206 = __esm({
  "../.wrangler/tmp/pages-Sa1gDu/functionsRoutes-0.48767123574873206.mjs"() {
    init_route();
    routes = [
      {
        routePath: "/api/:route*",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest]
      }
    ];
  }
});
init_functionsRoutes_0_48767123574873206();
init_checked_fetch();
init_functionsRoutes_0_48767123574873206();
init_checked_fetch();
init_functionsRoutes_0_48767123574873206();
init_checked_fetch();
init_functionsRoutes_0_48767123574873206();
init_checked_fetch();
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse2(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse2, "parse2");
__name2(parse2, "parse");
function match2(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match2, "match2");
__name2(match2, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode3 = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode3(value, key);
        });
      } else {
        params[key.name] = decode3(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse2(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match2(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match2(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match2(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match2(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
init_functionsRoutes_0_48767123574873206();
init_checked_fetch();
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
init_functionsRoutes_0_48767123574873206();
init_checked_fetch();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
init_functionsRoutes_0_48767123574873206();
init_checked_fetch();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// ../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// ../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-6SKfb5/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// ../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-6SKfb5/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
/*! Bundled license information:

bcryptjs/dist/bcrypt.js:
  (**
   * @license bcrypt.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
   * Released under the Apache License, Version 2.0
   * see: https://github.com/dcodeIO/bcrypt.js for details
   *)
*/
//# sourceMappingURL=functionsWorker-0.19745290091012757.js.map
