"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var _React = React,
  useState = _React.useState,
  useEffect = _React.useEffect,
  useMemo = _React.useMemo,
  useRef = _React.useRef,
  useCallback = _React.useCallback;
var MUSEUMS = window.CANVAS_MUSEUMS || [];
var WORKS = (window.CANVAS_ARTWORKS || []).map(function (w) {
  return w.artist == null ? _objectSpread(_objectSpread({}, w), {}, {
    artist: ""
  }) : w;
});
var AD = window.CANVAS_ART_DATA || {
  museums: {},
  artworks: {},
  artists: {}
};
var MUS_BY_ID = {};
var _iterator = _createForOfIteratorHelper(MUSEUMS),
  _step;
try {
  for (_iterator.s(); !(_step = _iterator.n()).done;) {
    var m = _step.value;
    MUS_BY_ID[m.id] = m;
  }
} catch (err) {
  _iterator.e(err);
} finally {
  _iterator.f();
}
var DECK_QUEUE_KEY = "canvas-deck-queue";
var readDeckQueue = function readDeckQueue() {
  try {
    var a = JSON.parse(localStorage.getItem(DECK_QUEUE_KEY));
    return Array.isArray(a) ? a : [];
  } catch (e) {
    return [];
  }
};
var writeDeckQueue = function writeDeckQueue(arr) {
  try {
    localStorage.setItem(DECK_QUEUE_KEY, JSON.stringify(arr));
  } catch (e) {}
};
var isQueued = function isQueued(qid) {
  return readDeckQueue().some(function (w) {
    return w.qid === qid;
  });
};
var addToDeckQueue = function addToDeckQueue(w) {
  var arr = readDeckQueue();
  if (arr.some(function (x) {
    return x.qid === w.qid;
  })) return arr;
  var next = [].concat(_toConsumableArray(arr), [{
    qid: w.qid,
    title: w.title,
    artist: w.artist,
    year: w.year || null,
    img: w.img || null
  }]);
  writeDeckQueue(next);
  return next;
};
var COUNTRY = {
  jp: "Japan",
  us: "United States",
  fr: "France",
  ie: "Ireland",
  gb: "United Kingdom",
  at: "Austria",
  pl: "Poland",
  se: "Sweden",
  au: "Australia",
  nl: "Netherlands",
  ch: "Switzerland",
  de: "Germany",
  ca: "Canada",
  it: "Italy",
  gr: "Greece",
  kr: "South Korea"
};
var HIRES = window.CANVAS_HIRES || {};
function enrich(w) {
  var d = AD.artworks[w.id] || {};
  var artist = AD.artists[w.artistId] || {};
  var venues = (Array.isArray(w.seenAt) ? w.seenAt : w.seenAt ? [w.seenAt] : []).map(function (id) {
    return MUS_BY_ID[id];
  }).filter(Boolean);
  var hires = HIRES[w.id] || null;
  var mImg = d.img || null,
    mGrid = d.imgGrid || null,
    mZoom = d.imgZoom || null;
  var hi = hires && hires.img ? hires.img : null;
  return _objectSpread(_objectSpread(_objectSpread({}, w), d), {}, {
    artistData: artist,
    venues: venues,
    year: w.year || d.year || null,
    hires: hires,
    img: w.img || mImg || hi || null,
    imgGrid: w.imgGrid || mGrid || (mImg ? null : hi) || (w.img ? w.img.replace(/width=\d+/, "width=440") : null),
    imgZoom: w.imgZoom || hi || mZoom || null
  });
}
function LazyImg(_ref) {
  var src = _ref.src,
    alt = _ref.alt,
    className = _ref.className,
    title = _ref.title,
    loading = _ref.loading;
  var ref = useRef(null);
  var _useState = useState(false),
    _useState2 = _slicedToArray(_useState, 2),
    show = _useState2[0],
    setShow = _useState2[1];
  useEffect(function () {
    if (show || !src) return;
    var el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    var io = new IntersectionObserver(function (ents) {
      var _iterator2 = _createForOfIteratorHelper(ents),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var e = _step2.value;
          if (e.isIntersecting) {
            setShow(true);
            io.disconnect();
            return;
          }
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
    }, {
      rootMargin: "500px"
    });
    io.observe(el);
    return function () {
      return io.disconnect();
    };
  }, [show, src]);
  return React.createElement("img", {
    ref: ref,
    className: className,
    alt: alt || "",
    title: title,
    src: show ? src : undefined,
    loading: loading || "lazy",
    decoding: "async"
  });
}
function RevealChunks(_ref2) {
  var items = _ref2.items,
    _ref2$initial = _ref2.initial,
    initial = _ref2$initial === void 0 ? 24 : _ref2$initial,
    _ref2$step = _ref2.step,
    step = _ref2$step === void 0 ? 24 : _ref2$step,
    render = _ref2.render;
  var _useState3 = useState(Math.min(initial, items.length)),
    _useState4 = _slicedToArray(_useState3, 2),
    n = _useState4[0],
    setN = _useState4[1];
  var sentinel = useRef(null);
  useEffect(function () {
    setN(Math.min(initial, items.length));
  }, [items, initial]);
  useEffect(function () {
    if (n >= items.length) return;
    var el = sentinel.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setN(items.length);
      return;
    }
    var io = new IntersectionObserver(function (ents) {
      var _iterator3 = _createForOfIteratorHelper(ents),
        _step3;
      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var e = _step3.value;
          if (e.isIntersecting) {
            setN(function (v) {
              return Math.min(v + step, items.length);
            });
            return;
          }
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }
    }, {
      rootMargin: "600px"
    });
    io.observe(el);
    return function () {
      return io.disconnect();
    };
  }, [n, items, step]);
  return React.createElement(React.Fragment, null, render(items.slice(0, n)), n < items.length && React.createElement("div", {
    ref: sentinel,
    className: "cv-reveal-sentinel",
    "aria-hidden": "true"
  }));
}
function useRoute() {
  var parse = function parse() {
    var h = (location.hash || "#/").replace(/^#\/?/, "");
    var segs = h.split("/");
    return {
      view: segs[0] || "wall",
      id: segs[1] || null,
      part: segs[2] ? parseInt(segs[2], 10) || 1 : 1
    };
  };
  var _useState5 = useState(parse),
    _useState6 = _slicedToArray(_useState5, 2),
    route = _useState6[0],
    setRoute = _useState6[1];
  useEffect(function () {
    var on = function on() {
      return setRoute(parse());
    };
    window.addEventListener("hashchange", on);
    return function () {
      return window.removeEventListener("hashchange", on);
    };
  }, []);
  return route;
}
function ConfChip(_ref3) {
  var conf = _ref3.conf;
  var label = conf === "sure" ? "seen — sure" : conf === "probably" ? "seen — probably" : "seen — unsure";
  return React.createElement("span", {
    className: "cv-chip",
    "data-k": "conf-" + conf
  }, label);
}
function Card(_ref4) {
  var w = _ref4.w,
    go = _ref4.go;
  var img = w.imgGrid;
  return React.createElement("div", {
    className: "cv-card" + (img ? "" : " cv-text"),
    "data-conf": w.seenConfidence,
    onClick: function onClick() {
      return go("work", w.id);
    },
    title: w.title
  }, w.favorite || w.floored ? React.createElement("span", {
    className: "cv-fav"
  }, "\u2605") : w.liked ? React.createElement("span", {
    className: "cv-fav"
  }, "\u2661") : null, img && React.createElement("img", {
    src: img,
    alt: w.title,
    loading: "lazy"
  }), React.createElement("div", {
    className: "cv-label"
  }, React.createElement("div", {
    className: "cv-title"
  }, w.label && !/^TBC/.test(w.title) ? w.title : w.title.replace(/^TBC — /, "")), React.createElement("div", {
    className: "cv-artist"
  }, w.artist.replace(/\s*\(.*\)$/, ""), w.year ? " · " + w.year : ""), !img && w.note && React.createElement("div", {
    className: "cv-note"
  }, w.note.split(" NOTE:")[0].split(" Attribution")[0]), !img && React.createElement("div", {
    className: "cv-why"
  }, /TBC/.test(w.title) ? "awaiting the recall deck" : "image withheld — in-copyright artist")));
}
var CAP = 48;
var FILTERS = [["all", "all"], ["floored", "★ floored"], ["loved", "♥ loved"], ["sure", "seen — sure"], ["unsure", "unsure"], ["wish", "pilgrimage"]];
var weight = function weight(w) {
  return w.floored || w.favorite ? 0 : w.liked ? 1 : 2;
};
var palHueOf = function palHueOf(w) {
  var p = (window.CANVAS_PALETTE || {})[w.id];
  if (!p || !p[0]) return 999;
  var h = hexHue(p[0]);
  return h < 0 ? 998 : h;
};
var centuryOf = function centuryOf(w) {
  return w.year ? Math.floor(w.year / 100) * 100 : null;
};
var MOV_DROP = new Set(["potato"]);
var MOV_ALIAS = {
  "Baroque painting": "Baroque"
};
var movLabel = function movLabel(s) {
  return (MOV_ALIAS[s] || s).replace(/^[a-zà-ÿ]/, function (c) {
    return c.toUpperCase();
  }).replace(/ ([a-zà-ÿ])/g, function (m, c) {
    return " " + c.toUpperCase();
  });
};
var movSlug = function movSlug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
};
var movsOf = function movsOf(w) {
  var a = AD.artists[w.artistId];
  if (!a || !a.movementQids) return [];
  var out = [];
  var _iterator4 = _createForOfIteratorHelper(a.movementQids),
    _step4;
  try {
    for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
      var q = _step4.value;
      var raw = (AD.movements || {})[q];
      if (!raw || MOV_DROP.has(raw)) continue;
      var l = movLabel(raw);
      if (!out.includes(l)) out.push(l);
    }
  } catch (err) {
    _iterator4.e(err);
  } finally {
    _iterator4.f();
  }
  return out;
};
var movOf = function movOf(w) {
  return movsOf(w)[0] || null;
};
var movIndex = function movIndex() {
  var counts = {};
  var _iterator5 = _createForOfIteratorHelper(WORKS),
    _step5;
  try {
    for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
      var w = _step5.value;
      var _iterator6 = _createForOfIteratorHelper(movsOf(w)),
        _step6;
      try {
        for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
          var m = _step6.value;
          counts[m] = (counts[m] || 0) + 1;
        }
      } catch (err) {
        _iterator6.e(err);
      } finally {
        _iterator6.f();
      }
    }
  } catch (err) {
    _iterator5.e(err);
  } finally {
    _iterator5.f();
  }
  return Object.entries(counts).sort(function (a, b) {
    return b[1] - a[1] || a[0].localeCompare(b[0]);
  }).map(function (_ref5) {
    var _ref6 = _slicedToArray(_ref5, 2),
      label = _ref6[0],
      n = _ref6[1];
    return {
      label: label,
      n: n,
      slug: movSlug(label)
    };
  });
};
var STYLE_CHIPS = 12;
function Wall(_ref7) {
  var go = _ref7.go,
    _ref7$mode = _ref7.mode,
    mode = _ref7$mode === void 0 ? "collage" : _ref7$mode,
    styleIds = _ref7.styleIds;
  var all = useMemo(function () {
    return WORKS.map(enrich);
  }, []);
  var _useState7 = useState("all"),
    _useState8 = _slicedToArray(_useState7, 2),
    filt = _useState8[0],
    setFilt = _useState8[1];
  var _useState9 = useState(""),
    _useState0 = _slicedToArray(_useState9, 2),
    mus = _useState0[0],
    setMus = _useState0[1];
  var _useState1 = useState("hang"),
    _useState10 = _slicedToArray(_useState1, 2),
    sort = _useState10[0],
    setSort = _useState10[1];
  var _useState11 = useState(0),
    _useState12 = _slicedToArray(_useState11, 2),
    extra = _useState12[0],
    setExtra = _useState12[1];
  var _useState13 = useState(false),
    _useState14 = _slicedToArray(_useState13, 2),
    allStyles = _useState14[0],
    setAllStyles = _useState14[1];
  var movs = useMemo(movIndex, []);
  var sel = useMemo(function () {
    var bySlug = new Map(movs.map(function (m) {
      return [m.slug, m.label];
    }));
    return (styleIds || "").split("+").map(function (s) {
      return bySlug.get(s);
    }).filter(Boolean);
  }, [styleIds, movs]);
  var setSel = function setSel(labels) {
    return go("wall", labels.length ? labels.map(movSlug).join("+") : null);
  };
  var toggle = function toggle(label) {
    return setSel(sel.includes(label) ? sel.filter(function (x) {
      return x !== label;
    }) : [].concat(_toConsumableArray(sel), [label]));
  };
  useEffect(function () {
    setExtra(0);
  }, [filt, mus, sort, mode, styleIds]);
  var shown = useMemo(function () {
    var list = all;
    if (filt === "floored") list = list.filter(function (w) {
      return w.floored || w.favorite;
    });
    if (filt === "loved") list = list.filter(function (w) {
      return w.floored || w.favorite || w.liked;
    });
    if (filt === "sure") list = list.filter(function (w) {
      return w.seenConfidence === "sure";
    });
    if (filt === "unsure") list = list.filter(function (w) {
      return w.seenConfidence !== "sure";
    });
    if (filt === "wish") list = list.filter(function (w) {
      return w.wish;
    });
    if (mus) list = list.filter(function (w) {
      return (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at]).includes(mus);
    });
    if (sel.length) list = list.filter(function (w) {
      return movsOf(w).some(function (m) {
        return sel.includes(m);
      });
    });
    var arr = _toConsumableArray(list);
    if (mode === "spectrum") arr.sort(function (a, b) {
      return palHueOf(a) - palHueOf(b) || weight(a) - weight(b);
    });else if (mode === "timeline") arr.sort(function (a, b) {
      return (a.year || 9999) - (b.year || 9999) || weight(a) - weight(b);
    });else if (mode === "movements") arr.sort(function (a, b) {
      var ma = movOf(a),
        mb = movOf(b);
      return (ma ? 0 : 1) - (mb ? 0 : 1) || String(ma).localeCompare(String(mb)) || (a.year || 0) - (b.year || 0);
    });else {
      if (sort === "hang") arr.sort(function (a, b) {
        return (b.imgGrid ? 1 : 0) - (a.imgGrid ? 1 : 0) || weight(a) - weight(b);
      });
      if (sort === "year") arr.sort(function (a, b) {
        return (a.year || 9999) - (b.year || 9999);
      });
      if (sort === "artist") arr.sort(function (a, b) {
        return a.artist.localeCompare(b.artist) || (a.year || 0) - (b.year || 0);
      });
      if (sort === "museum") arr.sort(function (a, b) {
        return String(a.seenAt).localeCompare(String(b.seenAt)) || weight(a) - weight(b);
      });
    }
    return arr;
  }, [all, filt, mus, sort, mode, sel]);
  var visN = CAP + extra;
  var musOpts = useMemo(function () {
    var counts = {};
    var _iterator7 = _createForOfIteratorHelper(all),
      _step7;
    try {
      for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
        var w = _step7.value;
        var _iterator8 = _createForOfIteratorHelper(Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at]),
          _step8;
        try {
          for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
            var id = _step8.value;
            if (id) counts[id] = (counts[id] || 0) + 1;
          }
        } catch (err) {
          _iterator8.e(err);
        } finally {
          _iterator8.f();
        }
      }
    } catch (err) {
      _iterator7.e(err);
    } finally {
      _iterator7.f();
    }
    return MUSEUMS.filter(function (m) {
      return counts[m.id];
    }).map(function (m) {
      return {
        id: m.id,
        label: m.name.replace(/\s*\(.*\)$/, "") + " (" + counts[m.id] + ")"
      };
    });
  }, [all]);
  var vis = shown.slice(0, visN);
  var grouped = (mode === "timeline" || mode === "movements") && vis.length > 0;
  var sections = useMemo(function () {
    if (!grouped) return null;
    var keyOf = mode === "timeline" ? centuryOf : movOf;
    var labelOf = mode === "timeline" ? function (k) {
      return k == null ? "Undated" : k + "s";
    } : function (k) {
      return k || "Other movements";
    };
    var out = [];
    var cur = null;
    var _iterator9 = _createForOfIteratorHelper(vis),
      _step9;
    try {
      for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
        var w = _step9.value;
        var k = keyOf(w);
        if (!cur || cur.k !== k) {
          cur = {
            k: k == null ? "∅" : k,
            label: labelOf(k),
            items: []
          };
          out.push(cur);
        }
        cur.items.push(w);
      }
    } catch (err) {
      _iterator9.e(err);
    } finally {
      _iterator9.f();
    }
    return out;
  }, [vis, mode, grouped]);
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "cv-filters"
  }, FILTERS.map(function (_ref8) {
    var _ref9 = _slicedToArray(_ref8, 2),
      v = _ref9[0],
      label = _ref9[1];
    return React.createElement("button", {
      key: v,
      "data-on": filt === v,
      onClick: function onClick() {
        return setFilt(v);
      }
    }, label);
  }), React.createElement("select", {
    value: mus,
    onChange: function onChange(e) {
      return setMus(e.target.value);
    }
  }, React.createElement("option", {
    value: ""
  }, "every museum"), musOpts.map(function (o) {
    return React.createElement("option", {
      key: o.id,
      value: o.id
    }, o.label);
  })), mode === "collage" && React.createElement("select", {
    value: sort,
    onChange: function onChange(e) {
      return setSort(e.target.value);
    }
  }, React.createElement("option", {
    value: "hang"
  }, "hang order"), React.createElement("option", {
    value: "year"
  }, "by year"), React.createElement("option", {
    value: "artist"
  }, "by artist"), React.createElement("option", {
    value: "museum"
  }, "by museum")), React.createElement("span", {
    className: "cv-count"
  }, Math.min(visN, shown.length), " of ", shown.length)), React.createElement("div", {
    className: "cv-styles"
  }, React.createElement("span", {
    className: "cv-styles-lbl",
    title: "Wikidata files movement on the artist, not the artwork"
  }, "styles"), movs.slice(0, allStyles ? movs.length : STYLE_CHIPS).map(function (m) {
    return React.createElement("button", {
      key: m.slug,
      "data-on": sel.includes(m.label),
      onClick: function onClick() {
        return toggle(m.label);
      }
    }, m.label, React.createElement("i", null, m.n));
  }), movs.length > STYLE_CHIPS && React.createElement("button", {
    className: "cv-styles-more",
    onClick: function onClick() {
      return setAllStyles(function (v) {
        return !v;
      });
    }
  }, allStyles ? "fewer" : "+ ".concat(movs.length - STYLE_CHIPS, " more")), sel.length > 0 && React.createElement("button", {
    className: "cv-styles-clear",
    onClick: function onClick() {
      return setSel([]);
    }
  }, "\u2715 clear")), sel.length > 0 && React.createElement("div", {
    className: "cv-styles-note"
  }, shown.length, " ", shown.length === 1 ? "work" : "works", " by artists working in ", sel.join(" or ")), grouped ? sections.map(function (g) {
    return React.createElement("section", {
      className: "cv-section",
      key: g.k
    }, React.createElement("h3", {
      className: "cv-section-h"
    }, g.label, React.createElement("span", {
      className: "cv-section-n"
    }, g.items.length)), React.createElement("div", {
      className: "cv-wall"
    }, g.items.map(function (w) {
      return React.createElement(Card, {
        key: w.id,
        w: w,
        go: go
      });
    })));
  }) : React.createElement("div", {
    className: "cv-wall"
  }, vis.map(function (w) {
    return React.createElement(Card, {
      key: w.id,
      w: w,
      go: go
    });
  })), shown.length > visN && React.createElement("div", {
    className: "cv-more"
  }, React.createElement("button", {
    onClick: function onClick() {
      return setExtra(function (e) {
        return e + CAP;
      });
    }
  }, "hang ", Math.min(CAP, shown.length - visN), " more")));
}
function Zoom(_ref0) {
  var src = _ref0.src,
    onClose = _ref0.onClose;
  var imgRef = useRef(null);
  var overlayRef = useRef(null);
  var _useState15 = useState({
      s: 1.6,
      x: 0,
      y: 0
    }),
    _useState16 = _slicedToArray(_useState15, 2),
    committed = _useState16[0],
    setCommitted = _useState16[1];
  var live = useRef({
    s: 1.6,
    x: 0,
    y: 0
  });
  var drag = useRef(null);
  var raf = useRef(0);
  var applyTransform = useCallback(function (s, x, y) {
    if (!imgRef.current) return;
    imgRef.current.style.transform = "translate(".concat(x, "px,").concat(y, "px) scale(").concat(s, ")");
  }, []);
  useEffect(function () {
    live.current = _objectSpread({}, committed);
    applyTransform(committed.s, committed.x, committed.y);
  }, [committed]);
  useEffect(function () {
    var on = function on(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", on, true);
    return function () {
      window.removeEventListener("keydown", on, true);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [onClose]);
  useEffect(function () {
    var el = overlayRef.current;
    if (!el) return;
    var onWheel = function onWheel(e) {
      e.preventDefault();
      var _live$current = live.current,
        s = _live$current.s,
        x = _live$current.x,
        y = _live$current.y;
      var ns = Math.min(8, Math.max(1, s * (e.deltaY < 0 ? 1.15 : 0.87)));
      var rect = el.getBoundingClientRect();
      var cx = e.clientX - rect.left - rect.width / 2;
      var cy = e.clientY - rect.top - rect.height / 2;
      var nx = cx + (x - cx) * (ns / s);
      var ny = cy + (y - cy) * (ns / s);
      live.current = {
        s: ns,
        x: nx,
        y: ny
      };
      if (!raf.current) raf.current = requestAnimationFrame(function () {
        raf.current = 0;
        applyTransform(live.current.s, live.current.x, live.current.y);
      });
    };
    el.addEventListener("wheel", onWheel, {
      passive: false
    });
    return function () {
      return el.removeEventListener("wheel", onWheel);
    };
  }, [applyTransform]);
  var onPointerDown = function onPointerDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest(".cv-zoom-close") || e.target.closest(".cv-zoom-hint")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: live.current.x,
      baseY: live.current.y
    };
  };
  var onPointerMove = function onPointerMove(e) {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    var nx = drag.current.baseX + (e.clientX - drag.current.startX);
    var ny = drag.current.baseY + (e.clientY - drag.current.startY);
    live.current = _objectSpread(_objectSpread({}, live.current), {}, {
      x: nx,
      y: ny
    });
    if (!raf.current) raf.current = requestAnimationFrame(function () {
      raf.current = 0;
      if (!imgRef.current) return;
      imgRef.current.style.transform = "translate(".concat(live.current.x, "px,").concat(live.current.y, "px) scale(").concat(live.current.s, ")");
    });
  };
  var onPointerUp = function onPointerUp(e) {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    drag.current = null;
    setCommitted(_objectSpread({}, live.current));
  };
  var onDoubleClick = function onDoubleClick() {
    drag.current = null;
    setCommitted({
      s: 1.6,
      x: 0,
      y: 0
    });
  };
  return React.createElement("div", {
    className: "cv-zoom",
    ref: overlayRef,
    onPointerDown: onPointerDown,
    onPointerMove: onPointerMove,
    onPointerUp: onPointerUp,
    onPointerCancel: onPointerUp,
    onDoubleClick: onDoubleClick
  }, React.createElement("img", {
    ref: imgRef,
    src: src.replace(/width=\d+/, "width=3200"),
    alt: "",
    style: {
      transform: "translate(".concat(committed.x, "px,").concat(committed.y, "px) scale(").concat(committed.s, ")")
    },
    draggable: "false"
  }), React.createElement("button", {
    className: "cv-r-close cv-zoom-close",
    onClick: onClose
  }, "\u2715"), React.createElement("div", {
    className: "cv-zoom-hint"
  }, "scroll to zoom \xB7 drag to pan \xB7 double-click resets \xB7 Esc closes"));
}
var osdLoad = null;
var osdFailed = false;
function loadOSD() {
  if (window.OpenSeadragon) return Promise.resolve();
  if (osdFailed) return Promise.reject(new Error("osd previously failed"));
  if (osdLoad) return osdLoad;
  osdLoad = new Promise(function (resolve, reject) {
    var s = document.getElementById("osd-js");
    if (!s) {
      s = document.createElement("script");
      s.id = "osd-js";
      s.src = "vendor/openseadragon/openseadragon.min.js";
      document.body.appendChild(s);
    }
    s.addEventListener("load", function () {
      return resolve();
    });
    s.addEventListener("error", function () {
      osdLoad = null;
      osdFailed = true;
      reject(new Error("osd load failed"));
    });
  });
  return osdLoad;
}
function resolveOSDSource(work) {
  if (!work) return null;
  if (work.hires && work.hires.iiif) {
    var src = (work.hires.src || "").toUpperCase();
    return {
      tileSource: work.hires.iiif,
      cors: "Anonymous",
      label: src ? "deep zoom via ".concat(src) : "deep zoom"
    };
  }
  if (work.hires && work.hires.img) {
    var _src = (work.hires.src || "").toUpperCase();
    return {
      tileSource: {
        type: "image",
        url: work.hires.img
      },
      cors: "Anonymous",
      label: _src ? "deep zoom via ".concat(_src) : "deep zoom"
    };
  }
  var simpleUrl = work.imgZoom || work.img;
  if (simpleUrl) {
    return {
      tileSource: {
        type: "image",
        url: simpleUrl
      },
      cors: false,
      label: work.title.replace(/^TBC — /, "")
    };
  }
  return null;
}
function flyToAnchor(viewer, a, immediately) {
  if (!viewer || !a) return;
  try {
    var item = viewer.world.getItemAt(0);
    if (!item) return;
    var size = item.getContentSize();
    var rect = viewer.viewport.imageToViewportRectangle(a.x * size.x, a.y * size.y, a.w * size.x, a.h * size.y);
    viewer.viewport.fitBounds(rect, !!immediately);
  } catch (e) {}
}
function useOSDViewer(work, onOsdFail) {
  var elRef = useRef(null);
  var viewerRef = useRef(null);
  var _useState17 = useState(false),
    _useState18 = _slicedToArray(_useState17, 2),
    err = _useState18[0],
    setErr = _useState18[1];
  var _useState19 = useState(false),
    _useState20 = _slicedToArray(_useState19, 2),
    ready = _useState20[0],
    setReady = _useState20[1];
  var _useState21 = useState(null),
    _useState22 = _slicedToArray(_useState21, 2),
    fallbackUrl = _useState22[0],
    setFallbackUrl = _useState22[1];
  useEffect(function () {
    setFallbackUrl(null);
    setErr(false);
    setReady(false);
  }, [work]);
  var osdSrc = useMemo(function () {
    if (fallbackUrl) return {
      tileSource: {
        type: "image",
        url: fallbackUrl
      },
      cors: false,
      label: work ? work.title.replace(/^TBC — /, "") : ""
    };
    return resolveOSDSource(work);
  }, [work, fallbackUrl]);
  useEffect(function () {
    var cancelled = false;
    if (!osdSrc) {
      setErr(true);
      return;
    }
    loadOSD().then(function () {
      if (cancelled || !elRef.current || !window.OpenSeadragon) return;
      try {
        var viewer = window.OpenSeadragon({
          element: elRef.current,
          prefixUrl: "vendor/openseadragon/images/",
          tileSources: osdSrc.tileSource,
          showNavigator: true,
          navigatorPosition: "BOTTOM_RIGHT",
          showNavigationControl: false,
          maxZoomPixelRatio: 2,
          gestureSettingsMouse: {
            clickToZoom: false,
            dblClickToZoom: true
          },
          crossOriginPolicy: osdSrc.cors,
          ajaxWithCredentials: false
        });
        viewer.addHandler("open-failed", function () {
          if (cancelled) return;
          var simple = work && (work.imgZoom || work.img);
          if (!fallbackUrl && work && work.hires && simple) setFallbackUrl(simple);else setErr(true);
        });
        viewer.addHandler("open", function () {
          if (!cancelled) setReady(true);
        });
        viewerRef.current = viewer;
      } catch (e) {
        if (!cancelled) setErr(true);
      }
    })["catch"](function () {
      if (!cancelled) {
        if (onOsdFail) onOsdFail();else setErr(true);
      }
    });
    return function () {
      cancelled = true;
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch (e) {}
        viewerRef.current = null;
      }
    };
  }, [osdSrc]);
  return {
    elRef: elRef,
    viewerRef: viewerRef,
    err: err,
    ready: ready,
    osdSrc: osdSrc
  };
}
function OSDControls(_ref1) {
  var viewerRef = _ref1.viewerRef;
  var zoom = function zoom(f) {
    var v = viewerRef.current;
    if (v) {
      v.viewport.zoomBy(f);
      v.viewport.applyConstraints();
    }
  };
  var home = function home() {
    var v = viewerRef.current;
    if (v) v.viewport.goHome(false);
  };
  return React.createElement("div", {
    className: "cv-osd-ctl"
  }, React.createElement("button", {
    type: "button",
    onClick: function onClick() {
      return zoom(1.5);
    },
    title: "Zoom in"
  }, "+"), React.createElement("button", {
    type: "button",
    onClick: function onClick() {
      return zoom(1 / 1.5);
    },
    title: "Zoom out"
  }, "\u2212"), React.createElement("button", {
    type: "button",
    onClick: home,
    title: "Full view"
  }, "\u2302"));
}
function DeepZoom(_ref10) {
  var work = _ref10.work,
    onClose = _ref10.onClose,
    onOsdFail = _ref10.onOsdFail;
  var _useOSDViewer = useOSDViewer(work, onOsdFail),
    elRef = _useOSDViewer.elRef,
    viewerRef = _useOSDViewer.viewerRef,
    err = _useOSDViewer.err,
    osdSrc = _useOSDViewer.osdSrc;
  var details = useMemo(function () {
    var hd = work.hires && work.hires.details || [];
    if (hd.length) return hd;
    var insp = (window.CANVAS_INSPECT || {})[work.id];
    var deeper = insp && insp.deeper || [];
    return deeper.filter(function (c) {
      return typeof c.x === "number" && typeof c.y === "number" && typeof c.w === "number" && typeof c.h === "number";
    }).map(function (c) {
      return {
        t: c.t,
        x: c.x,
        y: c.y,
        w: c.w,
        h: c.h,
        n: c.body
      };
    });
  }, [work]);
  var _useState23 = useState(null),
    _useState24 = _slicedToArray(_useState23, 2),
    activeDetail = _useState24[0],
    setActiveDetail = _useState24[1];
  var goToDetail = useCallback(function (idx) {
    var viewer = viewerRef.current;
    if (!viewer) return;
    if (idx === null) {
      setActiveDetail(null);
      viewer.viewport.goHome(false);
      return;
    }
    var d = details[idx];
    if (!d) return;
    setActiveDetail(idx);
    flyToAnchor(viewer, d, false);
  }, [details]);
  useEffect(function () {
    var onKey = function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (!details.length) return;
      if (e.key === "ArrowRight") {
        e.stopPropagation();
        setActiveDetail(function (prev) {
          var next = prev === null ? 0 : Math.min(prev + 1, details.length - 1);
          setTimeout(function () {
            return goToDetail(next);
          }, 0);
          return next;
        });
      }
      if (e.key === "ArrowLeft") {
        e.stopPropagation();
        setActiveDetail(function (prev) {
          if (prev === null || prev === 0) {
            setTimeout(function () {
              return goToDetail(null);
            }, 0);
            return null;
          }
          var next = prev - 1;
          setTimeout(function () {
            return goToDetail(next);
          }, 0);
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey, true);
    return function () {
      return window.removeEventListener("keydown", onKey, true);
    };
  }, [goToDetail, onClose]);
  var activeDet = activeDetail !== null ? details[activeDetail] : null;
  var capLabel = osdSrc ? osdSrc.label : work.title.replace(/^TBC — /, "");
  return React.createElement("div", {
    className: "cv-osd"
  }, React.createElement("div", {
    className: "cv-osd-view",
    ref: elRef
  }), React.createElement(OSDControls, {
    viewerRef: viewerRef
  }), err && React.createElement("div", {
    className: "cv-osd-err"
  }, "zoom unavailable \u2014 the tile source didn't load"), React.createElement("button", {
    className: "cv-r-close cv-osd-close",
    onClick: onClose
  }, "\u2715"), details.length > 0 && React.createElement("div", {
    className: "cv-osd-tour"
  }, React.createElement("button", {
    className: "cv-osd-chip" + (activeDetail === null ? " cv-osd-chip-home" : ""),
    onClick: function onClick() {
      return goToDetail(null);
    },
    title: "Return to full view"
  }, "\u2302 full view"), details.map(function (d, i) {
    return React.createElement("button", {
      key: i,
      className: "cv-osd-chip" + (activeDetail === i ? " cv-osd-chip-on" : ""),
      onClick: function onClick() {
        return goToDetail(i);
      },
      title: d.t
    }, React.createElement("span", {
      className: "cv-osd-chip-n"
    }, i + 1), React.createElement("span", {
      className: "cv-osd-chip-t"
    }, d.t));
  }), details.length > 1 && React.createElement("span", {
    className: "cv-osd-tour-hint"
  }, "\u2190 \u2192 to step")), activeDet ? React.createElement("div", {
    className: "cv-osd-det-cap"
  }, React.createElement("span", {
    className: "cv-osd-det-n"
  }, activeDetail + 1, "/", details.length), React.createElement("span", {
    className: "cv-osd-det-title"
  }, activeDet.t), React.createElement("span", {
    className: "cv-osd-det-note"
  }, activeDet.n)) : React.createElement("div", {
    className: "cv-osd-cap"
  }, capLabel, details.length ? " · click a detail below to explore" : ""));
}
var STUDY_LENS_LABELS = {
  see: "What you see",
  about: "What it's about",
  craft: "Why it sings",
  context: "The moment"
};
var STUDY_LENS_ORDER = ["see", "about", "craft", "context"];
function StudyView(_ref11) {
  var id = _ref11.id,
    go = _ref11.go;
  var work = useMemo(function () {
    var x = WORKS.find(function (x) {
      return x.id === id;
    });
    return x ? enrich(x) : null;
  }, [id]);
  var inspect = (window.CANVAS_INSPECT || {})[id] || null;
  var _useOSDViewer2 = useOSDViewer(work, null),
    elRef = _useOSDViewer2.elRef,
    viewerRef = _useOSDViewer2.viewerRef,
    err = _useOSDViewer2.err,
    ready = _useOSDViewer2.ready;
  var _useState25 = useState(null),
    _useState26 = _slicedToArray(_useState25, 2),
    activeDetail = _useState26[0],
    setActiveDetail = _useState26[1];
  var _useState27 = useState(true),
    _useState28 = _slicedToArray(_useState27, 2),
    autoFollow = _useState28[0],
    setAutoFollow = _useState28[1];
  var autoRef = useRef(true);
  autoRef.current = autoFollow;
  var paneRef = useRef(null);
  var tourRef = useRef(null);
  var sections = useMemo(function () {
    if (!inspect) return [];
    var out = [];
    var _iterator0 = _createForOfIteratorHelper(STUDY_LENS_ORDER),
      _step0;
    try {
      for (_iterator0.s(); !(_step0 = _iterator0.n()).done;) {
        var k = _step0.value;
        if (inspect[k]) out.push({
          key: "lens-" + k,
          label: STUDY_LENS_LABELS[k],
          body: inspect[k],
          anchor: null
        });
      }
    } catch (err) {
      _iterator0.e(err);
    } finally {
      _iterator0.f();
    }
    (inspect.deeper || []).forEach(function (c, i) {
      var anchor = typeof c.x === "number" && typeof c.y === "number" && typeof c.w === "number" && typeof c.h === "number" ? {
        x: c.x,
        y: c.y,
        w: c.w,
        h: c.h
      } : null;
      out.push({
        key: "deep-" + i,
        label: c.t,
        body: c.body,
        anchor: anchor,
        chapter: true
      });
    });
    return out;
  }, [inspect]);
  var firstDeep = sections.findIndex(function (s) {
    return s.chapter;
  });
  var tour = useMemo(function () {
    return sections.filter(function (s) {
      return s.chapter && s.anchor;
    }).map(function (s) {
      return {
        key: s.key,
        t: s.label,
        anchor: s.anchor
      };
    });
  }, [sections]);
  var SPLIT_MIN = 0.4,
    SPLIT_MAX = 0.72;
  var _useState29 = useState(function () {
      var v = parseFloat(localStorage.getItem("canvas-study-split"));
      return isFinite(v) && v >= SPLIT_MIN && v <= SPLIT_MAX ? v : 0.57;
    }),
    _useState30 = _slicedToArray(_useState29, 2),
    split = _useState30[0],
    setSplit = _useState30[1];
  var _useState31 = useState(false),
    _useState32 = _slicedToArray(_useState31, 2),
    collapsed = _useState32[0],
    setCollapsed = _useState32[1];
  var splitRef = useRef(null);
  var dragSplit = useRef(false);
  var onSplitDown = useCallback(function (e) {
    if (!splitRef.current) return;
    dragSplit.current = true;
    e.preventDefault();
    var move = function move(cx, cy) {
      var el = splitRef.current,
        r = el.getBoundingClientRect();
      var vertical = getComputedStyle(el).flexDirection === "column";
      var f = vertical ? r.height > 0 ? (cy - r.top) / r.height : null : r.width > 0 ? (cx - r.left) / r.width : null;
      if (f == null) return;
      setSplit(Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, f)));
    };
    var mm = function mm(ev) {
      if (dragSplit.current) move(ev.clientX, ev.clientY);
    };
    var tm = function tm(ev) {
      if (dragSplit.current && ev.touches[0]) {
        move(ev.touches[0].clientX, ev.touches[0].clientY);
        ev.preventDefault();
      }
    };
    var _up = function up() {
      dragSplit.current = false;
      window.removeEventListener("pointermove", mm);
      window.removeEventListener("pointerup", _up);
      window.removeEventListener("touchmove", tm);
      window.removeEventListener("touchend", _up);
    };
    window.addEventListener("pointermove", mm);
    window.addEventListener("pointerup", _up);
    window.addEventListener("touchmove", tm, {
      passive: false
    });
    window.addEventListener("touchend", _up);
  }, [split]);
  useEffect(function () {
    try {
      localStorage.setItem("canvas-study-split", String(split));
    } catch (e) {}
  }, [split]);
  var flyTo = useCallback(function (anchor, immediately) {
    var viewer = viewerRef.current;
    if (!viewer || !anchor) return;
    flyToAnchor(viewer, anchor, immediately);
  }, []);
  var goHome = useCallback(function () {
    setActiveDetail(null);
    var viewer = viewerRef.current;
    if (viewer) {
      try {
        viewer.viewport.goHome(false);
      } catch (e) {}
    }
  }, []);
  var suppressFollow = useRef(false);
  var goToDetail = useCallback(function (idx) {
    if (idx === null) {
      goHome();
      return;
    }
    var stop = tour[idx];
    if (!stop) return;
    setActiveDetail(idx);
    flyTo(stop.anchor, false);
    if (paneRef.current) {
      var el = paneRef.current.querySelector("[data-skey=\"".concat(stop.key, "\"]"));
      if (el) {
        suppressFollow.current = true;
        el.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
        setTimeout(function () {
          suppressFollow.current = false;
        }, 650);
      }
    }
  }, [tour, flyTo, goHome]);
  var stepTour = useCallback(function (dir) {
    setActiveDetail(function (prev) {
      var next;
      if (dir > 0) next = prev === null ? 0 : Math.min(prev + 1, tour.length - 1);else {
        if (prev === null || prev === 0) {
          setTimeout(function () {
            return goToDetail(null);
          }, 0);
          return null;
        }
        next = prev - 1;
      }
      setTimeout(function () {
        return goToDetail(next);
      }, 0);
      return next;
    });
  }, [tour, goToDetail]);
  useEffect(function () {
    var onKey = function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        history.back();
        return;
      }
      if (!tour.length) return;
      if (e.key === "ArrowRight") {
        e.stopPropagation();
        stepTour(1);
      } else if (e.key === "ArrowLeft") {
        e.stopPropagation();
        stepTour(-1);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return function () {
      return window.removeEventListener("keydown", onKey, true);
    };
  }, [tour, stepTour]);
  useEffect(function () {
    if (!work) history.back();
  }, [work]);
  useEffect(function () {
    var pane = paneRef.current;
    if (!pane || !sections.length) return;
    var byKey = {};
    var _iterator1 = _createForOfIteratorHelper(sections),
      _step1;
    try {
      for (_iterator1.s(); !(_step1 = _iterator1.n()).done;) {
        var s = _step1.value;
        if (s.anchor) byKey[s.key] = s.anchor;
      }
    } catch (err) {
      _iterator1.e(err);
    } finally {
      _iterator1.f();
    }
    var tourIdx = {};
    tour.forEach(function (t, i) {
      tourIdx[t.key] = i;
    });
    var raf = 0,
      lastKey = null;
    var pick = function pick() {
      raf = 0;
      if (suppressFollow.current) return;
      var box = pane.getBoundingClientRect();
      var line = box.top + box.height * 0.4;
      var key = null;
      var _iterator10 = _createForOfIteratorHelper(sections),
        _step10;
      try {
        for (_iterator10.s(); !(_step10 = _iterator10.n()).done;) {
          var s = _step10.value;
          var el = pane.querySelector("[data-skey=\"".concat(s.key, "\"]"));
          if (!el) continue;
          if (el.getBoundingClientRect().top <= line) key = s.key;else break;
        }
      } catch (err) {
        _iterator10.e(err);
      } finally {
        _iterator10.f();
      }
      if (key === null) key = sections[0].key;
      if (pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 24) key = sections[sections.length - 1].key;
      if (key === lastKey) return;
      lastKey = key;
      setActiveDetail(key in tourIdx ? tourIdx[key] : null);
      if (autoRef.current && ready && byKey[key]) flyTo(byKey[key], false);
    };
    var onScroll = function onScroll() {
      if (!raf) raf = requestAnimationFrame(pick);
    };
    pane.addEventListener("scroll", onScroll, {
      passive: true
    });
    window.addEventListener("resize", onScroll);
    pick();
    return function () {
      pane.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ready, sections, tour, flyTo]);
  useEffect(function () {
    var strip = tourRef.current;
    if (!strip || activeDetail === null) return;
    var chip = strip.children[activeDetail + 1];
    if (!chip) return;
    var pad = 24;
    var left = chip.offsetLeft - pad;
    var right = chip.offsetLeft + chip.offsetWidth + pad;
    var target = strip.scrollLeft;
    if (left < strip.scrollLeft) target = left;else if (right > strip.scrollLeft + strip.clientWidth) target = right - strip.clientWidth;
    if (target !== strip.scrollLeft) strip.scrollTo({
      left: Math.max(0, target),
      behavior: "smooth"
    });
  }, [activeDetail]);
  if (!work) return null;
  var a = work.artistData || {};
  var life = a.born ? "".concat(a.born, "\u2013").concat(a.died || "") : null;
  var activeKey = activeDetail !== null && tour[activeDetail] ? tour[activeDetail].key : null;
  return React.createElement("div", {
    className: "cv-study" + (collapsed ? " cv-study-collapsed" : ""),
    ref: splitRef
  }, React.createElement("div", {
    className: "cv-study-viewer",
    style: {
      flexBasis: collapsed ? "100%" : split * 100 + "%"
    }
  }, React.createElement("div", {
    className: "cv-osd-view",
    ref: elRef
  }), React.createElement(OSDControls, {
    viewerRef: viewerRef
  }), err && React.createElement("div", {
    className: "cv-osd-err"
  }, "zoom unavailable \u2014 the tile source didn't load", " · ", React.createElement("a", {
    href: "#/work/" + id,
    style: {
      color: "inherit",
      textDecoration: "underline"
    }
  }, "open in reader \u2192")), tour.length > 0 && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "cv-study-tourarrows"
  }, React.createElement("button", {
    className: "cv-study-arrow",
    onClick: function onClick() {
      return stepTour(-1);
    },
    disabled: activeDetail === null,
    title: "Previous detail (\u2190)",
    "aria-label": "Previous detail"
  }, "\u2039"), React.createElement("span", {
    className: "cv-study-arrow-lbl"
  }, activeDetail === null ? "walk the details" : "".concat(activeDetail + 1, " / ").concat(tour.length)), React.createElement("button", {
    className: "cv-study-arrow",
    onClick: function onClick() {
      return stepTour(1);
    },
    disabled: activeDetail === tour.length - 1,
    title: "Next detail (\u2192)",
    "aria-label": "Next detail"
  }, "\u203A")), React.createElement("div", {
    className: "cv-osd-tour cv-study-tour",
    ref: tourRef
  }, React.createElement("button", {
    className: "cv-osd-chip" + (activeDetail === null ? " cv-osd-chip-home" : ""),
    onClick: goHome,
    title: "Return to full view"
  }, "\u2302 full view"), tour.map(function (d, i) {
    return React.createElement("button", {
      key: d.key,
      className: "cv-osd-chip" + (activeDetail === i ? " cv-osd-chip-on" : ""),
      onClick: function onClick() {
        return goToDetail(i);
      },
      title: d.t
    }, React.createElement("span", {
      className: "cv-osd-chip-n"
    }, i + 1), React.createElement("span", {
      className: "cv-osd-chip-t"
    }, d.t));
  }))), collapsed && React.createElement("button", {
    className: "cv-study-restore",
    onClick: function onClick() {
      return setCollapsed(false);
    },
    title: "Show the study pane"
  }, "\u2630 study"), React.createElement("button", {
    className: "cv-study-exit",
    onClick: function onClick() {
      return history.back();
    },
    title: "Leave the study (Esc)",
    "aria-label": "Close study"
  }, "\u2715")), !collapsed && React.createElement("div", {
    className: "cv-study-divider",
    onPointerDown: onSplitDown,
    onTouchStart: onSplitDown,
    role: "separator",
    "aria-orientation": "vertical",
    title: "Drag to resize"
  }, React.createElement("span", {
    className: "cv-study-divider-grip"
  })), !collapsed && React.createElement("div", {
    className: "cv-study-pane",
    ref: paneRef
  }, React.createElement("div", {
    className: "cv-study-panehead"
  }, React.createElement("button", {
    className: "cv-study-back",
    onClick: function onClick() {
      return history.back();
    },
    title: "Leave the study (Esc)"
  }, "\u2715 close"), React.createElement("button", {
    className: "cv-study-collapse",
    onClick: function onClick() {
      return setCollapsed(true);
    },
    title: "Hide the study pane (full-bleed viewer)"
  }, "\u2922 hide pane"), React.createElement("label", {
    className: "cv-study-follow",
    title: "Let the viewer follow your reading"
  }, React.createElement("input", {
    type: "checkbox",
    checked: autoFollow,
    onChange: function onChange(e) {
      return setAutoFollow(e.target.checked);
    }
  }), "auto-follow")), React.createElement("div", {
    className: "cv-study-body"
  }, React.createElement("h1", {
    className: "cv-study-title"
  }, work.title.replace(/^TBC — /, "")), React.createElement("div", {
    className: "cv-study-meta"
  }, React.createElement("b", {
    onClick: function onClick() {
      return go("artist", work.artistId);
    },
    style: {
      cursor: "pointer"
    }
  }, work.artist.replace(/\s*\(.*\)$/, "")), life ? " \xB7 ".concat(life) : "", work.year ? " \xB7 ".concat(work.year) : ""), !inspect && React.createElement("p", {
    className: "cv-study-empty"
  }, "No study written for this work yet."), sections.map(function (s, i) {
    return React.createElement(React.Fragment, {
      key: s.key
    }, s.chapter && i === firstDeep && React.createElement("div", {
      className: "cv-study-chaprule"
    }, React.createElement("span", null, "The study")), React.createElement("section", {
      className: "cv-study-sec" + (s.chapter ? " cv-study-chapter" : "") + (s.key === activeKey ? " cv-study-sec-on" : "")
    }, React.createElement("h2", {
      className: "cv-study-sec-h",
      "data-skey": s.key
    }, React.createElement("span", null, s.label), s.anchor && React.createElement("button", {
      className: "cv-study-look",
      onClick: function onClick() {
        return flyTo(s.anchor, false);
      },
      title: "Fly the viewer to this detail"
    }, "\u2316 look")), React.createElement("p", {
      className: "cv-study-sec-txt"
    }, s.body)));
  }), React.createElement("div", {
    className: "cv-study-foot"
  }, React.createElement("button", {
    className: "cv-study-home",
    onClick: goHome
  }, "\u2302 full view")))));
}
function Reader(_ref12) {
  var id = _ref12.id,
    go = _ref12.go;
  var w = useMemo(function () {
    var x = WORKS.find(function (x) {
      return x.id === id;
    });
    return x ? enrich(x) : null;
  }, [id]);
  var _useState33 = useState(false),
    _useState34 = _slicedToArray(_useState33, 2),
    zoom = _useState34[0],
    setZoom = _useState34[1];
  var _useState35 = useState(false),
    _useState36 = _slicedToArray(_useState35, 2),
    deep = _useState36[0],
    setDeep = _useState36[1];
  var _useState37 = useState("about"),
    _useState38 = _slicedToArray(_useState37, 2),
    tier = _useState38[0],
    setTier = _useState38[1];
  var _useState39 = useState(false),
    _useState40 = _slicedToArray(_useState39, 2),
    inspOpen = _useState40[0],
    setInspOpen = _useState40[1];
  var close = function close() {
    history.back();
  };
  useEffect(function () {
    setZoom(false);
    setDeep(false);
    setTier("about");
    setInspOpen(false);
  }, [id]);
  useEffect(function () {
    var on = function on(e) {
      if (e.key === "Escape" && !zoom && !deep) close();
    };
    window.addEventListener("keydown", on);
    return function () {
      return window.removeEventListener("keydown", on);
    };
  }, [zoom, deep]);
  var styleTags = useMemo(function () {
    var ad = w && AD.artists && AD.artists[w.artistId] || null;
    var qids = ad && ad.movementQids || [];
    var seen = new Set();
    return qids.map(function (q) {
      return AD.movements && AD.movements[q];
    }).filter(function (l) {
      return l && !seen.has(l) && seen.add(l);
    }).slice(0, 2);
  }, [w]);
  if (!w) return null;
  var a = w.artistData;
  var life = a.born ? "".concat(a.born, "\u2013").concat(a.died || "") : null;
  var pal = (window.CANVAS_PALETTE || {})[id];
  var read = (window.CANVAS_ART_ABOUT || {})[id];
  var inspect = (window.CANVAS_INSPECT || {})[id] || null;
  var hasDetailTour = !!(w.hires && w.hires.details && w.hires.details.length || inspect && (inspect.deeper || []).some(function (c) {
    return typeof c.x === "number" && typeof c.y === "number" && typeof c.w === "number" && typeof c.h === "number";
  }));
  var hasDeepZoom = !!resolveOSDSource(w);
  var openZoom = function openZoom() {
    if (hasDeepZoom && !osdFailed) {
      setDeep(true);
      return;
    }
    var fallbackSrc = w.imgZoom || w.img;
    if (fallbackSrc) setZoom(true);
  };
  var handleOsdFail = function handleOsdFail() {
    setDeep(false);
    var fallbackSrc = w.imgZoom || w.img;
    if (fallbackSrc) setZoom(true);
  };
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "cv-reader-bg",
    onClick: close
  }), React.createElement("div", {
    className: "cv-reader"
  }, React.createElement("button", {
    className: "cv-r-close",
    onClick: close
  }, "\u2715"), w.img && React.createElement("img", {
    className: "hero",
    src: w.img,
    alt: w.title,
    title: inspect ? "click to open the study" : "click to zoom",
    style: {
      cursor: inspect ? "pointer" : "zoom-in"
    },
    role: "button",
    tabIndex: 0,
    "aria-label": (inspect ? "open the study of " : "zoom into ") + w.title,
    onKeyDown: function onKeyDown(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        (inspect ? function () {
          return go("study", w.id);
        } : openZoom)();
      }
    },
    onClick: inspect ? function () {
      return go("study", w.id);
    } : openZoom
  }), React.createElement("div", {
    className: "cv-r-body"
  }, React.createElement("h1", {
    className: "cv-r-title"
  }, w.title.replace(/^TBC — /, "")), React.createElement("div", {
    className: "cv-r-meta"
  }, React.createElement("b", {
    style: {
      cursor: "pointer"
    },
    title: "artist page",
    onClick: function onClick() {
      return go("artist", w.artistId);
    }
  }, w.artist.replace(/\s*\(.*\)$/, "")), life ? " \xB7 ".concat(life) : "", w.year ? " \xB7 ".concat(w.year) : "", a.desc ? " \xB7 ".concat(a.desc) : ""), React.createElement("div", {
    className: "cv-chips"
  }, React.createElement(ConfChip, {
    conf: w.seenConfidence
  }), styleTags.map(function (t) {
    return React.createElement("span", {
      key: t,
      className: "cv-chip cv-chip-style",
      title: "movement — " + t,
      onClick: function onClick() {
        return go("artist", w.artistId);
      }
    }, t);
  }), w.floored && React.createElement("span", {
    className: "cv-chip",
    "data-k": "floored"
  }, "\u2605 floored me"), w.favorite && React.createElement("span", {
    className: "cv-chip",
    "data-k": "floored"
  }, "\u2605 favorite"), w.liked && !w.floored && React.createElement("span", {
    className: "cv-chip",
    "data-k": "floored"
  }, "\u2661 liked"), w.wish && React.createElement("span", {
    className: "cv-chip"
  }, "pilgrimage \u2014 not yet seen"), w.via === "exhibition" && React.createElement("span", {
    className: "cv-chip"
  }, "temporary exhibition"), inspect && React.createElement("button", {
    type: "button",
    className: "cv-chip cv-chip-study",
    onClick: function onClick() {
      return go("study", w.id);
    }
  }, "Open the full study \u2192")), w.venues.length > 0 && React.createElement("div", {
    className: "cv-r-sec"
  }, React.createElement("span", {
    className: "lbl"
  }, "Where I saw it", w.venues.length > 1 ? " — an impression at each" : ""), w.venues.map(function (v, vi) {
    return React.createElement(React.Fragment, {
      key: v.id
    }, vi > 0 ? " · " : "", React.createElement("a", {
      className: "cv-r-venue",
      href: "#/museum/" + v.id,
      onClick: function onClick(e) {
        e.preventDefault();
        go("museum", v.id);
      }
    }, v.name.replace(/\s*\(.*\)$/, ""), ", ", v.city));
  }), w.exhibition ? " \u2014 ".concat(w.exhibition) : ""), read && React.createElement("div", {
    className: "cv-r-read"
  }, React.createElement("div", {
    className: "cv-r-read-head"
  }, React.createElement("span", {
    className: "lbl"
  }, "The read"), React.createElement("div", {
    className: "cv-r-tiers"
  }, React.createElement("button", {
    "data-on": tier === "about",
    onClick: function onClick() {
      return setTier("about");
    }
  }, "Info"), React.createElement("button", {
    "data-on": tier === "deep",
    onClick: function onClick() {
      return setTier("deep");
    }
  }, "Interpretation"))), React.createElement("div", {
    className: "cv-r-read-txt"
  }, tier === "deep" ? read.deep : read.about), React.createElement("div", {
    className: "cv-r-read-by"
  }, "via ", tier === "deep" && read.deepBy ? read.deepBy : read.by || "Fable")), pal && React.createElement("div", {
    className: "cv-r-sec"
  }, React.createElement("span", {
    className: "lbl"
  }, "Palette"), React.createElement("span", {
    className: "cv-pal"
  }, pal.map(function (c) {
    return React.createElement("i", {
      key: c,
      style: {
        background: c
      },
      title: c
    });
  }))), w.note && React.createElement("div", {
    className: "cv-r-note"
  }, w.note), inspect && React.createElement("div", {
    className: "cv-r-inspect"
  }, React.createElement("div", {
    className: "cv-r-inspect-rule"
  }), React.createElement("div", {
    className: "cv-r-inspect-kicker"
  }, "Inspection \u2014 a close reading by ", inspect.by || "Fable"), React.createElement("div", {
    className: "cv-r-inspect-lens"
  }, React.createElement("span", {
    className: "lbl"
  }, "What you see"), React.createElement("p", {
    className: "cv-r-inspect-txt"
  }, inspect.see)), inspOpen && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "cv-r-inspect-lens"
  }, React.createElement("span", {
    className: "lbl"
  }, "What it's about"), React.createElement("p", {
    className: "cv-r-inspect-txt"
  }, inspect.about)), React.createElement("div", {
    className: "cv-r-inspect-lens"
  }, React.createElement("span", {
    className: "lbl"
  }, "Why it sings"), React.createElement("p", {
    className: "cv-r-inspect-txt"
  }, inspect.craft)), React.createElement("div", {
    className: "cv-r-inspect-lens"
  }, React.createElement("span", {
    className: "lbl"
  }, "The moment"), React.createElement("p", {
    className: "cv-r-inspect-txt"
  }, inspect.context)), hasDetailTour && React.createElement("button", {
    type: "button",
    className: "cv-r-inspect-zoom",
    onClick: function onClick() {
      return setDeep(true);
    }
  }, "\u2922 walk the details in deep zoom"), React.createElement("button", {
    type: "button",
    className: "cv-r-inspect-study",
    onClick: function onClick() {
      return go("study", w.id);
    }
  }, "Open the full study \u2192")), !inspOpen && React.createElement(React.Fragment, null, React.createElement("button", {
    type: "button",
    className: "cv-r-inspect-more",
    onClick: function onClick() {
      return setInspOpen(true);
    }
  }, "continue the inspection \u25BE"), React.createElement("button", {
    type: "button",
    className: "cv-r-inspect-study",
    onClick: function onClick() {
      return go("study", w.id);
    }
  }, "Open the full study \u2192"))), React.createElement("div", {
    className: "cv-r-links"
  }, hasDeepZoom && React.createElement("button", {
    type: "button",
    className: "cv-r-deep",
    onClick: function onClick() {
      return setDeep(true);
    }
  }, "\u2922 Deep zoom"), w.qid && React.createElement("a", {
    href: "https://www.wikidata.org/wiki/".concat(w.qid),
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Wikidata \u2197"), w.imgZoom && React.createElement("a", {
    href: w.imgZoom,
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Full resolution \u2197"), a.qid && React.createElement("a", {
    href: "https://www.wikidata.org/wiki/".concat(a.qid),
    target: "_blank",
    rel: "noopener noreferrer"
  }, w.artist.split(" ").pop(), " on Wikidata \u2197")))), zoom && (w.imgZoom || w.img) && React.createElement(Zoom, {
    src: w.imgZoom || w.img,
    onClose: function onClose() {
      return setZoom(false);
    }
  }), deep && React.createElement(DeepZoom, {
    work: w,
    onClose: function onClose() {
      return setDeep(false);
    },
    onOsdFail: handleOsdFail
  }));
}
function countryName(cc) {
  if (COUNTRY[cc]) return COUNTRY[cc];
  try {
    return new Intl.DisplayNames(["en"], {
      type: "region"
    }).of((cc || "").toUpperCase()) || (cc || "").toUpperCase();
  } catch (e) {
    return (cc || "").toUpperCase();
  }
}
function MuseumCard(_ref13) {
  var m = _ref13.m,
    go = _ref13.go,
    quiet = _ref13.quiet;
  var DATA = (window.CANVAS_MUSEUM_DATA || {})[m.id] || null;
  var hasRead = !!(window.CANVAS_MUSEUM_ABOUT || {})[m.id];
  var hasDeck = !!(m.deck && m.deck.length);
  var img = DATA && DATA.img ? DATA.img : null;
  var name = m.name.replace(/\s*\(.*\)$/, "");
  return React.createElement("div", {
    className: "cv-musidx-card" + (img ? "" : " cv-musidx-text") + (quiet ? " cv-musidx-quiet" : ""),
    "data-kind": m.kind,
    onClick: function onClick() {
      return go("museum", m.id);
    },
    title: "open " + name
  }, img ? React.createElement("div", {
    className: "cv-musidx-thumb"
  }, React.createElement(LazyImg, {
    src: img,
    alt: name
  })) : null, React.createElement("div", {
    className: "cv-musidx-body"
  }, React.createElement("div", {
    className: "cv-musidx-name"
  }, name, hasRead ? React.createElement("span", {
    className: "cv-musidx-read",
    title: "has a read"
  }, " \u2726") : null), React.createElement("div", {
    className: "cv-musidx-city"
  }, m.city), React.createElement("div", {
    className: "cv-musidx-meta"
  }, m.met ? React.createElement("span", {
    className: "cv-musidx-met"
  }, m.met, " met") : React.createElement("span", {
    className: "cv-musidx-met cv-musidx-none"
  }, "no works met yet"), m.floored ? React.createElement("span", {
    className: "cv-musidx-floored"
  }, "\u2605 ", m.floored) : null, hasDeck ? React.createElement("a", {
    className: "cv-musidx-deck",
    href: "#/deck/" + m.id,
    onClick: function onClick(e) {
      return e.stopPropagation();
    },
    title: "deal the recall deck"
  }, "deck") : null)));
}
function Museums(_ref14) {
  var go = _ref14.go;
  var HL = window.CANVAS_HIGHLIGHTS || {};
  var sections = useMemo(function () {
    var met = {},
      floored = {};
    var _iterator11 = _createForOfIteratorHelper(WORKS.map(enrich)),
      _step11;
    try {
      for (_iterator11.s(); !(_step11 = _iterator11.n()).done;) {
        var w = _step11.value;
        var _iterator13 = _createForOfIteratorHelper(Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt]),
          _step13;
        try {
          for (_iterator13.s(); !(_step13 = _iterator13.n()).done;) {
            var id = _step13.value;
            if (!id) continue;
            met[id] = (met[id] || 0) + 1;
            if (w.floored || w.favorite) floored[id] = (floored[id] || 0) + 1;
          }
        } catch (err) {
          _iterator13.e(err);
        } finally {
          _iterator13.f();
        }
      }
    } catch (err) {
      _iterator11.e(err);
    } finally {
      _iterator11.f();
    }
    var by = {};
    var _iterator12 = _createForOfIteratorHelper(MUSEUMS),
      _step12;
    try {
      for (_iterator12.s(); !(_step12 = _iterator12.n()).done;) {
        var m = _step12.value;
        var row = _objectSpread(_objectSpread(_objectSpread({}, m), AD.museums[m.id] || {}), {}, {
          met: met[m.id] || 0,
          floored: floored[m.id] || 0,
          deck: HL[m.id] || null
        });
        (by[m.country] = by[m.country] || []).push(row);
      }
    } catch (err) {
      _iterator12.e(err);
    } finally {
      _iterator12.f();
    }
    return Object.entries(by).map(function (_ref15) {
      var _ref16 = _slicedToArray(_ref15, 2),
        cc = _ref16[0],
        list = _ref16[1];
      var metWorks = list.reduce(function (s, m) {
        return s + m.met;
      }, 0);
      var has = function has(m) {
        return m.deck || (window.CANVAS_MUSEUM_ABOUT || {})[m.id] || (window.CANVAS_MUSEUM_DATA || {})[m.id];
      };
      var withMet = list.filter(function (m) {
        return m.met > 0;
      }).sort(function (a, b) {
        return b.met - a.met || b.floored - a.floored || a.name.localeCompare(b.name);
      });
      var quiet = list.filter(function (m) {
        return m.met === 0 && has(m);
      }).sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
      var rest = list.filter(function (m) {
        return m.met === 0 && !has(m);
      }).sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
      return {
        cc: cc,
        metWorks: metWorks,
        count: list.length,
        withMet: withMet,
        quiet: quiet,
        rest: rest
      };
    }).sort(function (a, b) {
      return b.metWorks - a.metWorks || b.count - a.count;
    });
  }, []);
  return React.createElement("div", {
    className: "cv-musidx"
  }, sections.map(function (sec) {
    return React.createElement(MuseumSection, {
      key: sec.cc,
      sec: sec,
      go: go
    });
  }));
}
function MuseumSection(_ref17) {
  var sec = _ref17.sec,
    go = _ref17.go;
  var _useState41 = useState(true),
    _useState42 = _slicedToArray(_useState41, 2),
    open = _useState42[0],
    setOpen = _useState42[1];
  return React.createElement("section", {
    className: "cv-musidx-sec"
  }, React.createElement("header", {
    className: "cv-musidx-head"
  }, React.createElement("h2", {
    className: "cv-musidx-country"
  }, countryName(sec.cc)), React.createElement("p", {
    className: "cv-musidx-tally"
  }, sec.count, " museum", sec.count === 1 ? "" : "s", sec.metWorks ? " \xB7 ".concat(sec.metWorks, " works met") : "")), sec.withMet.length || sec.quiet.length ? React.createElement("div", {
    className: "cv-musidx-grid"
  }, sec.withMet.map(function (m) {
    return React.createElement(MuseumCard, {
      key: m.id,
      m: m,
      go: go
    });
  }), sec.quiet.map(function (m) {
    return React.createElement(MuseumCard, {
      key: m.id,
      m: m,
      go: go,
      quiet: true
    });
  })) : null, sec.rest.length ? open ? React.createElement("div", {
    className: "cv-musidx-grid cv-musidx-rest"
  }, sec.rest.map(function (m) {
    return React.createElement(MuseumCard, {
      key: m.id,
      m: m,
      go: go,
      quiet: true
    });
  })) : React.createElement("button", {
    className: "cv-musidx-more",
    onClick: function onClick() {
      return setOpen(true);
    }
  }, "\u2026and ", sec.rest.length, " more venue", sec.rest.length === 1 ? "" : "s") : null);
}
var museumNormT = function museumNormT(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\bwomen\b/g, "woman").replace(/\bmen\b/g, "man").replace(/\b(series|study|no\s*\d+)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
};
var hexRGB = function hexRGB(h) {
  var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h || "");
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
};
var hexClose = function hexClose(a, b) {
  var x = hexRGB(a),
    y = hexRGB(b);
  if (!x || !y) return false;
  return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]) < 46;
};
function MuseumView(_ref18) {
  var museumId = _ref18.museumId,
    go = _ref18.go;
  var m = MUS_BY_ID[museumId];
  var HL = window.CANVAS_HIGHLIGHTS || {};
  var PAL = window.CANVAS_PALETTE || {};
  var ABOUT = (window.CANVAS_MUSEUM_ABOUT || {})[museumId] || null;
  var DATA = (window.CANVAS_MUSEUM_DATA || {})[museumId] || null;
  var READS = window.CANVAS_ART_ABOUT || {};
  var INSPECT = window.CANVAS_INSPECT || {};
  var _useState43 = useState("about"),
    _useState44 = _slicedToArray(_useState43, 2),
    tier = _useState44[0],
    setTier = _useState44[1];
  var _useState45 = useState(function () {
      return new Set(readDeckQueue().map(function (w) {
        return w.qid;
      }));
    }),
    _useState46 = _slicedToArray(_useState45, 2),
    queuedQids = _useState46[0],
    setQueuedQids = _useState46[1];
  var queueMajor = function queueMajor(n) {
    addToDeckQueue(n);
    setQueuedQids(function (prev) {
      return new Set(prev).add(n.qid);
    });
  };
  var met = useMemo(function () {
    return WORKS.map(enrich).filter(function (w) {
      return (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt]).includes(museumId);
    });
  }, [museumId]);
  var hasRead = function hasRead(w) {
    return !!(READS[w.id] || INSPECT[w.id]);
  };
  var hangSort = function hangSort(a, b) {
    var wa = a.floored || a.favorite ? 0 : a.liked ? 1 : 2,
      wb = b.floored || b.favorite ? 0 : b.liked ? 1 : 2;
    return wa - wb || (b.imgGrid ? 1 : 0) - (a.imgGrid ? 1 : 0);
  };
  var encounters = met.filter(function (w) {
    return w.via !== "exhibition";
  }).sort(hangSort);
  var onLoan = met.filter(function (w) {
    return w.via === "exhibition";
  }).sort(hangSort);
  var floored = met.filter(function (w) {
    return w.floored || w.favorite;
  });
  var liked = met.filter(function (w) {
    return w.liked;
  }).length;
  var conf = {
    sure: 0,
    probably: 0,
    unsure: 0
  };
  var _iterator14 = _createForOfIteratorHelper(met),
    _step14;
  try {
    for (_iterator14.s(); !(_step14 = _iterator14.n()).done;) {
      var w = _step14.value;
      conf[w.seenConfidence === "sure" ? "sure" : w.seenConfidence === "probably" ? "probably" : "unsure"]++;
    }
  } catch (err) {
    _iterator14.e(err);
  } finally {
    _iterator14.f();
  }
  var artistRows = useMemo(function () {
    var by = {};
    var _iterator15 = _createForOfIteratorHelper(met),
      _step15;
    try {
      for (_iterator15.s(); !(_step15 = _iterator15.n()).done;) {
        var w = _step15.value;
        if (!w.artistId) continue;
        var r = by[w.artistId] = by[w.artistId] || {
          id: w.artistId,
          name: w.artist.replace(/\s*\(.*\)$/, ""),
          n: 0
        };
        r.n++;
      }
    } catch (err) {
      _iterator15.e(err);
    } finally {
      _iterator15.f();
    }
    return Object.values(by).sort(function (a, b) {
      return b.n - a.n || a.name.localeCompare(b.name);
    });
  }, [met]);
  var canonQids = new Set(met.map(function (w) {
    return w.qid;
  }).filter(Boolean));
  var canonT = met.map(function (w) {
    return museumNormT(w.title);
  }).filter(Boolean);
  var isMet = function isMet(n) {
    if (n.qid && canonQids.has(n.qid)) return true;
    var nt = museumNormT(n.title);
    if (nt.length < 4) return false;
    var series = /\bseries\b/i.test(n.title);
    return canonT.some(function (ct) {
      return ct === nt || nt.length >= 5 && (ct.startsWith(nt + " ") || nt.startsWith(ct + " ")) || series && (ct.includes(nt) || nt.includes(ct));
    });
  };
  var highlights = HL[museumId] || [];
  var unmet = useMemo(function () {
    var seen = new Set();
    return highlights.filter(function (n) {
      if (isMet(n) || n.qid && seen.has(n.qid)) return false;
      if (n.qid) seen.add(n.qid);
      return true;
    });
  }, [museumId, met]);
  var wishWorks = met.filter(function (w) {
    return w.wish;
  });
  var palette = useMemo(function () {
    var out = [];
    var _iterator16 = _createForOfIteratorHelper(met),
      _step16;
    try {
      for (_iterator16.s(); !(_step16 = _iterator16.n()).done;) {
        var w = _step16.value;
        var p = PAL[w.id];
        if (!p) continue;
        var _iterator17 = _createForOfIteratorHelper(p),
          _step17;
        try {
          var _loop = function _loop() {
            var hex = _step17.value;
            if (out.length >= 12) return 1;
            if (!out.some(function (o) {
              return hexClose(o, hex);
            })) out.push(hex);
          };
          for (_iterator17.s(); !(_step17 = _iterator17.n()).done;) {
            if (_loop()) break;
          }
        } catch (err) {
          _iterator17.e(err);
        } finally {
          _iterator17.f();
        }
      }
    } catch (err) {
      _iterator16.e(err);
    } finally {
      _iterator16.f();
    }
    return out;
  }, [met]);
  if (!m) return React.createElement("div", {
    className: "cv-mus"
  }, React.createElement("p", null, "No museum here (yet)."));
  var pilgrimagePlaces = (window.CANVAS_PILGRIMAGE || []).filter(function (p) {
    return p.museumId === museumId || p.holder === museumId || p.at === museumId || p.museumId == null && p.holder == null && p.at == null && p.city === m.city && p.country === m.country;
  });
  var cityLine = "".concat(m.city, " \xB7 ").concat((COUNTRY[m.country] || m.country || "").toUpperCase());
  var fmtVisitors = function fmtVisitors(n) {
    return n >= 1e6 ? +(n / 1e6).toFixed(1) + "M" : n >= 1e3 ? +(n / 1e3).toFixed(0) + "K" : String(n);
  };
  var fmtWorks = function fmtWorks(n) {
    return n.toLocaleString("en-US");
  };
  var architectsLine = DATA && Array.isArray(DATA.architects) && DATA.architects.length ? DATA.architects.join(" · ") : null;
  var hasReadPane = !!(ABOUT && (ABOUT.about || ABOUT.deep));
  var _useState47 = useState("all"),
    _useState48 = _slicedToArray(_useState47, 2),
    musFilt = _useState48[0],
    setMusFilt = _useState48[1];
  var MUS_FILTERS = [["all", "all"], ["floored", "★ floored"], ["loved", "♥ loved"], ["sure", "seen — sure"], ["unsure", "unsure"], ["read", "✦ has a read"]];
  var applyMusFilt = function applyMusFilt(list) {
    if (musFilt === "floored") return list.filter(function (w) {
      return w.floored || w.favorite;
    });
    if (musFilt === "loved") return list.filter(function (w) {
      return w.liked || w.floored || w.favorite;
    });
    if (musFilt === "sure") return list.filter(function (w) {
      return w.seenConfidence === "sure";
    });
    if (musFilt === "unsure") return list.filter(function (w) {
      return w.seenConfidence !== "sure";
    });
    if (musFilt === "read") return list.filter(function (w) {
      return hasRead(w);
    });
    return list;
  };
  var flooredRef = useRef(null);
  useEffect(function () {
    var el = flooredRef.current;
    if (!el) return;
    var down = false,
      moved = false,
      x0 = 0,
      left0 = 0;
    var onDown = function onDown(e) {
      if (e.button !== 0) return;
      down = true;
      moved = false;
      x0 = e.clientX;
      left0 = el.scrollLeft;
      try {
        el.setPointerCapture(e.pointerId);
      } catch (err) {}
    };
    var onMove = function onMove(e) {
      if (!down) return;
      var dx = e.clientX - x0;
      if (!moved && Math.abs(dx) < 4) return;
      moved = true;
      e.preventDefault();
      el.scrollLeft = left0 - dx;
    };
    var onUp = function onUp(e) {
      if (moved) {
        var kill = function kill(ev) {
          ev.stopPropagation();
          ev.preventDefault();
        };
        el.addEventListener("click", kill, {
          capture: true,
          once: true
        });
      }
      down = false;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch (err) {}
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return function () {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, []);
  var eligible = function eligible(dateStr, country) {
    return dateStr < "2024-06" || dateStr > "2025-12" || country === "au";
  };
  var visitDate = (Array.isArray(m.visits) ? m.visits : []).find(function (d) {
    return /^\d{4}-\d{2}/.test(d);
  }) || null;
  var visitMonthLabel = function visitMonthLabel(dateStr) {
    var dt = new Date(dateStr + (dateStr.length === 7 ? "-01" : ""));
    return isNaN(dt) ? null : dt.toLocaleString("en-US", {
      month: "short",
      year: "numeric"
    });
  };
  var showVisitChip = visitDate && eligible(visitDate, m.country) ? visitMonthLabel(visitDate) : null;
  var Wall = function Wall(_ref19) {
    var works = _ref19.works;
    return React.createElement(RevealChunks, {
      items: works,
      initial: 30,
      step: 30,
      render: function render(slice) {
        return React.createElement("div", {
          className: "cv-wall cv-mus-wall"
        }, slice.map(function (w) {
          return React.createElement("div", {
            className: "cv-mus-cardwrap",
            key: w.id
          }, hasRead(w) && React.createElement("span", {
            className: "cv-mus-read",
            title: "has a read / study"
          }, "\u2726"), React.createElement(Card, {
            w: w,
            go: go
          }));
        }));
      }
    });
  };
  return React.createElement("div", {
    className: "cv-museum"
  }, React.createElement("div", {
    className: "cv-mus-head",
    "data-kind": m.kind
  }, React.createElement("div", {
    className: "cv-mus-head-main"
  }, React.createElement("h1", {
    className: "cv-mus-h1"
  }, m.name.replace(/\s*\(.*\)$/, "")), React.createElement("div", {
    className: "cv-mus-sub"
  }, cityLine), DATA && (DATA.founded || architectsLine || DATA.style || DATA.visitors || DATA.site || showVisitChip) && React.createElement("div", {
    className: "cv-mus-chips"
  }, DATA.founded && React.createElement("span", {
    className: "cv-mus-chip"
  }, "est. ", DATA.founded), architectsLine && React.createElement("span", {
    className: "cv-mus-chip"
  }, architectsLine), DATA.style && React.createElement("span", {
    className: "cv-mus-chip"
  }, DATA.style), DATA.visitors && React.createElement("span", {
    className: "cv-mus-chip"
  }, fmtVisitors(DATA.visitors), " visitors/yr"), showVisitChip && React.createElement("span", {
    className: "cv-mus-chip"
  }, "visited \xB7 ", showVisitChip), DATA.site && React.createElement("a", {
    className: "cv-mus-chip cv-mus-chip-link",
    href: DATA.site,
    target: "_blank",
    rel: "noopener noreferrer"
  }, "site \u2197")), floored.length > 0 && React.createElement("div", {
    className: "cv-mus-floored",
    ref: flooredRef
  }, floored.filter(function (w) {
    return w.imgGrid;
  }).map(function (w) {
    return React.createElement("button", {
      className: "cv-mus-floored-item",
      key: w.id,
      onClick: function onClick() {
        return go("work", w.id);
      },
      title: w.title
    }, React.createElement(LazyImg, {
      src: w.imgGrid,
      alt: w.title
    }));
  })), React.createElement("div", {
    className: "cv-mus-stats"
  }, DATA && DATA.works ? React.createElement("span", {
    title: "your coverage of the collection"
  }, met.length, " work", met.length !== 1 ? "s" : "", " met \xB7 of ~", fmtWorks(DATA.works)) : React.createElement("span", {
    title: "sure ".concat(conf.sure, " \xB7 probably ").concat(conf.probably, " \xB7 unsure ").concat(conf.unsure)
  }, met.length, " work", met.length !== 1 ? "s" : "", " met"), floored.length ? React.createElement("span", null, "\u2605 ", floored.length, " floored") : null, liked ? React.createElement("span", null, "\u2661 ", liked, " loved") : null, unmet.length ? React.createElement("span", null, unmet.length, " unmet major", unmet.length !== 1 ? "s" : "") : null, highlights.length > 0 && React.createElement("a", {
    className: "cv-mus-gradebtn",
    href: "#/deck/" + museumId
  }, "grade this museum's deck \u2192"))), DATA && DATA.img && React.createElement("figure", {
    className: "cv-mus-postcard"
  }, React.createElement("img", {
    src: DATA.img,
    alt: m.name.replace(/\s*\(.*\)$/, ""),
    loading: "lazy"
  }), React.createElement("figcaption", null, "the building"))), hasReadPane && React.createElement("div", {
    className: "cv-r-read cv-mus-read-pane"
  }, React.createElement("div", {
    className: "cv-r-read-head"
  }, React.createElement("span", {
    className: "lbl"
  }, "The museum"), ABOUT.deep && React.createElement("div", {
    className: "cv-r-tiers"
  }, React.createElement("button", {
    "data-on": tier === "about",
    onClick: function onClick() {
      return setTier("about");
    }
  }, "Info"), React.createElement("button", {
    "data-on": tier === "deep",
    onClick: function onClick() {
      return setTier("deep");
    }
  }, "Interpretation"))), React.createElement("div", {
    className: "cv-r-read-txt"
  }, tier === "deep" && ABOUT.deep ? ABOUT.deep : ABOUT.about), React.createElement("div", {
    className: "cv-r-read-by"
  }, "via ", tier === "deep" && ABOUT.deepBy ? ABOUT.deepBy : ABOUT.by || "Fable")), encounters.length > 0 && function () {
    var shown = applyMusFilt(encounters);
    return React.createElement(React.Fragment, null, React.createElement("div", {
      className: "cv-a-secl"
    }, "The encounters \u2014 what I met here"), React.createElement("div", {
      className: "cv-mus-filters"
    }, MUS_FILTERS.map(function (_ref20) {
      var _ref21 = _slicedToArray(_ref20, 2),
        k = _ref21[0],
        label = _ref21[1];
      return React.createElement("button", {
        key: k,
        className: "cv-mus-filt",
        "data-on": musFilt === k,
        onClick: function onClick() {
          return setMusFilt(k);
        }
      }, label);
    }), musFilt !== "all" && React.createElement("span", {
      className: "cv-mus-filt-n"
    }, shown.length, " of ", encounters.length)), shown.length ? React.createElement(Wall, {
      works: shown
    }) : React.createElement("p", {
      className: "cv-mus-filt-none"
    }, "Nothing here matches that."));
  }(), onLoan.length > 0 && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "cv-a-secl"
  }, "Met on loan here \u2014 temporary exhibitions"), React.createElement(Wall, {
    works: onLoan
  })), artistRows.length > 0 && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "cv-a-secl"
  }, "The artists"), React.createElement("div", {
    className: "cv-mus-artists"
  }, artistRows.map(function (r) {
    return React.createElement("button", {
      className: "cv-mus-artchip",
      key: r.id,
      onClick: function onClick() {
        return go("artist", r.id);
      }
    }, r.name, React.createElement("i", null, "\xD7", r.n));
  }))), unmet.length > 0 && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "cv-a-secl"
  }, "Still in the building \u2014 majors you haven't met"), React.createElement(RevealChunks, {
    items: unmet,
    initial: 18,
    step: 18,
    render: function render(slice) {
      return React.createElement("div", {
        className: "cv-a-unmet"
      }, slice.map(function (n) {
        var q = queuedQids.has(n.qid);
        return React.createElement("div", {
          className: "cv-a-unmet-item",
          key: n.qid || n.title
        }, React.createElement("a", {
          href: n.qid ? "https://www.wikidata.org/wiki/".concat(n.qid) : undefined,
          target: "_blank",
          rel: "noopener noreferrer",
          title: n.title
        }, React.createElement(LazyImg, {
          src: n.img,
          alt: n.title
        }), React.createElement("span", null, n.title, n.artist ? " \xB7 ".concat(n.artist) : "", n.year ? " \xB7 ".concat(n.year) : "")), React.createElement("button", {
          type: "button",
          className: "cv-a-unmet-add",
          "data-q": q,
          disabled: q,
          title: q ? "queued for the By Your Artists deck" : "add to the By Your Artists deck",
          onClick: function onClick() {
            return queueMajor(n);
          }
        }, q ? "queued ✓" : "+ deck"));
      }));
    }
  })), (wishWorks.length > 0 || pilgrimagePlaces.length > 0) && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "cv-a-secl"
  }, "Reasons to return \u2014 the pilgrimage"), wishWorks.length > 0 && React.createElement("div", {
    className: "cv-wall cv-mus-wall"
  }, wishWorks.map(function (w) {
    return React.createElement(Card, {
      key: w.id,
      w: w,
      go: go
    });
  })), pilgrimagePlaces.map(function (p) {
    return React.createElement("div", {
      className: "cv-mus-row",
      key: p.id
    }, React.createElement("span", {
      className: "cv-mus-name"
    }, p.title), React.createElement("span", {
      className: "cv-mus-city"
    }, p.city), p.note && React.createElement("span", {
      className: "cv-mus-note"
    }, p.note));
  })), palette.length >= 4 && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "cv-a-secl"
  }, "The colour of the place"), React.createElement("div", {
    className: "cv-mus-palette"
  }, palette.map(function (c, i) {
    return React.createElement("i", {
      key: i,
      style: {
        background: c
      },
      title: c
    });
  }))));
}
var DECK_PART_SIZE = 40;
var SEEN_OPTS = [["no", "didn't see it"], ["unsure", "not sure"], ["yes", "saw it"]];
var LOVE_OPTS = [[0, "○ nothing special"], [1, "♡ like it"], [2, "♥ love it"]];
var migrateVerdict = function migrateVerdict(v) {
  return typeof v === "string" ? {
    seen: v === "floored" ? "yes" : v,
    love: v === "floored" ? 2 : 0
  } : v;
};
function Deck(_ref22) {
  var museumId = _ref22.museumId,
    part = _ref22.part,
    go = _ref22.go;
  var HL = window.CANVAS_HIGHLIGHTS || {};
  var VIRTUAL = museumId === "by-artists";
  var mus = VIRTUAL ? {
    name: "Works by artists you love"
  } : MUS_BY_ID[museumId];
  var canonQids = useMemo(function () {
    return new Set(WORKS.map(function (w) {
      return (AD.artworks[w.id] || {}).qid;
    }).filter(Boolean));
  }, []);
  var _useState49 = useState(function () {
      return museumId === "by-artists" ? readDeckQueue() : [];
    }),
    _useState50 = _slicedToArray(_useState49, 1),
    queued = _useState50[0];
  var fullDeck = useMemo(function () {
    if (VIRTUAL) {
      var shipped = window.CANVAS_BY_ARTISTS || [];
      var seen = new Set();
      var merged = [];
      for (var _i = 0, _arr = [].concat(_toConsumableArray(queued), _toConsumableArray(shipped)); _i < _arr.length; _i++) {
        var _w = _arr[_i];
        if (!_w.qid || seen.has(_w.qid) || canonQids.has(_w.qid)) continue;
        seen.add(_w.qid);
        merged.push(_w);
      }
      return merged;
    }
    return (HL[museumId] || []).filter(function (w) {
      return !canonQids.has(w.qid);
    });
  }, [museumId, queued]);
  var queuedCount = VIRTUAL ? fullDeck.filter(function (w) {
    return queued.some(function (q) {
      return q.qid === w.qid;
    });
  }).length : 0;
  var numParts = Math.max(1, Math.ceil(fullDeck.length / DECK_PART_SIZE));
  var safePart = Math.min(Math.max(part || 1, 1), numParts);
  var partStart = (safePart - 1) * DECK_PART_SIZE;
  var deck = fullDeck.slice(partStart, partStart + DECK_PART_SIZE);
  var partHref = function partHref(p) {
    return "#/deck/" + museumId + (p > 1 ? "/" + p : "");
  };
  var storeKey = "canvas-deck-" + museumId;
  var _useState51 = useState(function () {
      try {
        var raw = JSON.parse(localStorage.getItem(storeKey)) || {};
        var out = {};
        for (var _i2 = 0, _Object$keys = Object.keys(raw); _i2 < _Object$keys.length; _i2++) {
          var q = _Object$keys[_i2];
          out[q] = migrateVerdict(raw[q]);
        }
        return out;
      } catch (e) {
        return {};
      }
    }),
    _useState52 = _slicedToArray(_useState51, 2),
    verdicts = _useState52[0],
    setVerdicts = _useState52[1];
  var firstOpen = deck.findIndex(function (w) {
    return !verdicts[w.qid];
  });
  var _useState53 = useState(firstOpen < 0 ? deck.length : firstOpen),
    _useState54 = _slicedToArray(_useState53, 2),
    i = _useState54[0],
    setI = _useState54[1];
  var _useState55 = useState(0),
    _useState56 = _slicedToArray(_useState55, 2),
    love = _useState56[0],
    setLove = _useState56[1];
  var _useState57 = useState(false),
    _useState58 = _slicedToArray(_useState57, 2),
    copied = _useState58[0],
    setCopied = _useState58[1];
  var _useState59 = useState(false),
    _useState60 = _slicedToArray(_useState59, 2),
    saveWarn = _useState60[0],
    setSaveWarn = _useState60[1];
  useEffect(function () {
    var fo = deck.findIndex(function (w) {
      return !verdicts[w.qid];
    });
    setI(fo < 0 ? deck.length : fo);
    setCopied(false);
  }, [safePart, museumId]);
  useEffect(function () {
    var w = deck[i];
    setLove(w && verdicts[w.qid] ? verdicts[w.qid].love : 0);
  }, [i]);
  var judge = function judge(seenV) {
    if (i >= deck.length) return;
    var gradedQid = deck[i].qid;
    var next = _objectSpread(_objectSpread({}, verdicts), {}, _defineProperty({}, gradedQid, {
      seen: seenV,
      love: love
    }));
    setVerdicts(next);
    try {
      localStorage.setItem(storeKey, JSON.stringify(next));
      setSaveWarn(false);
    } catch (e) {
      setSaveWarn(true);
    }
    if (VIRTUAL && isQueued(gradedQid)) writeDeckQueue(readDeckQueue().filter(function (w) {
      return w.qid !== gradedQid;
    }));
    setI(i + 1);
  };
  useEffect(function () {
    var on = function on(e) {
      if (e.key >= "1" && e.key <= "3") judge(SEEN_OPTS[+e.key - 1][0]);
      if (e.key === "4") setLove(love === 1 ? 0 : 1);
      if (e.key === "5") setLove(love === 2 ? 0 : 2);
      if (e.key === "Backspace" && i > 0) setI(i - 1);
      if (e.key === "Escape") go("museums");
    };
    window.addEventListener("keydown", on);
    return function () {
      return window.removeEventListener("keydown", on);
    };
  }, [i, verdicts, love]);
  if (!mus || !fullDeck.length) return React.createElement("div", {
    className: "cv-mus"
  }, React.createElement("p", null, "No deck for this museum (yet)."));
  var partNav = numParts > 1 ? React.createElement("div", {
    className: "cv-deck-parts"
  }, Array.from({
    length: numParts
  }, function (_, pi) {
    var pn = pi + 1;
    var pStart = pi * DECK_PART_SIZE;
    var pSlice = fullDeck.slice(pStart, pStart + DECK_PART_SIZE);
    var pCount = pSlice.length;
    return React.createElement("a", {
      key: pn,
      className: "cv-deck-part" + (pn === safePart ? " cv-deck-part-on" : ""),
      href: partHref(pn)
    }, "Part ", pn, " ", React.createElement("span", {
      className: "cv-deck-part-n"
    }, "\xB7", pCount));
  })) : null;
  if (i >= deck.length) {
    var rows = fullDeck.filter(function (w) {
      return verdicts[w.qid] && (verdicts[w.qid].seen !== "no" || verdicts[w.qid].love > 0);
    }).map(function (w) {
      return _objectSpread({
        qid: w.qid,
        title: w.title,
        artist: w.artist,
        year: w.year,
        museum: VIRTUAL ? null : museumId
      }, verdicts[w.qid]);
    });
    var seen = rows.filter(function (r) {
      return r.seen === "yes";
    });
    var discoveries = rows.filter(function (r) {
      return r.seen !== "yes" && r.love > 0;
    });
    var json = JSON.stringify(rows, null, 1);
    var nextPart = safePart < numParts ? safePart + 1 : null;
    return React.createElement("div", {
      className: "cv-deck"
    }, partNav, React.createElement("div", {
      className: "cv-deck-head"
    }, VIRTUAL ? mus.name.replace(/\s*\(.*\)$/, "") : React.createElement("a", {
      className: "cv-deck-headlink",
      onClick: function onClick() {
        return go("museum", museumId);
      }
    }, mus.name.replace(/\s*\(.*\)$/, "")), " \u2014 Part ", safePart, " done", queuedCount > 0 ? React.createElement("span", {
      className: "cv-deck-queued"
    }, " \xB7 ", queuedCount, " from artist pages") : null), React.createElement("p", {
      className: "cv-deck-sum"
    }, seen.length, " recognised across all parts (", seen.filter(function (r) {
      return r.love === 2;
    }).length, " floored) \xB7 ", rows.filter(function (r) {
      return r.seen === "unsure";
    }).length, " unsure \xB7 ", discoveries.length, " discoveries you'd love to see."), nextPart && React.createElement("a", {
      className: "cv-deck-btn cv-deck-btn-next",
      href: partHref(nextPart)
    }, "Continue to Part ", nextPart, " \u2192"), seen.length > 0 && React.createElement(React.Fragment, null, React.createElement("div", {
      className: "cv-deck-secl"
    }, "Seen"), React.createElement("ul", {
      className: "cv-deck-picks"
    }, seen.map(function (p) {
      return React.createElement("li", {
        key: p.qid
      }, p.love === 2 ? "★ " : p.love === 1 ? "♡ " : "", p.title, p.artist ? " — " + p.artist : "");
    }))), discoveries.length > 0 && React.createElement(React.Fragment, null, React.createElement("div", {
      className: "cv-deck-secl"
    }, "Discoveries \u2192 pilgrimage"), React.createElement("ul", {
      className: "cv-deck-picks"
    }, discoveries.map(function (p) {
      return React.createElement("li", {
        key: p.qid
      }, p.love === 2 ? "♥ " : "♡ ", p.title, p.artist ? " — " + p.artist : "");
    }))), rows.length > 0 && React.createElement(React.Fragment, null, React.createElement("button", {
      className: "cv-deck-btn",
      onClick: function onClick() {
        navigator.clipboard.writeText(json).then(function () {
          return setCopied(true);
        });
      }
    }, copied ? "copied ✓" : "copy picks as JSON"), React.createElement("textarea", {
      className: "cv-deck-json",
      readOnly: true,
      value: json,
      rows: 6
    })), React.createElement("button", {
      className: "cv-deck-btn",
      onClick: function onClick() {
        setI(0);
        setCopied(false);
      }
    }, "re-deal this part"), React.createElement("a", {
      className: "cv-deal",
      href: "#/museums"
    }, "\u2190 back to museums"));
  }
  var w = deck[i];
  return React.createElement("div", {
    className: "cv-deck"
  }, partNav, React.createElement("div", {
    className: "cv-deck-head"
  }, VIRTUAL ? mus.name.replace(/\s*\(.*\)$/, "") : React.createElement("a", {
    className: "cv-deck-headlink",
    onClick: function onClick() {
      return go("museum", museumId);
    }
  }, mus.name.replace(/\s*\(.*\)$/, "")), numParts > 1 ? " · Part " + safePart : "", " \xB7 did you see this?", queuedCount > 0 ? React.createElement("span", {
    className: "cv-deck-queued"
  }, " \xB7 ", queuedCount, " from artist pages") : null), React.createElement("div", {
    className: "cv-deck-prog"
  }, i + 1, " / ", deck.length, " \xB7 1\u20133 seen \xB7 4 \u2661 \xB7 5 \u2665", i > 0 ? " · Backspace = back" : ""), React.createElement("div", {
    className: "cv-deck-card",
    key: w.qid
  }, w.img ? React.createElement("img", {
    src: w.img,
    alt: w.title,
    loading: "eager",
    onError: function onError(e) {
      e.currentTarget.style.display = "none";
    }
  }) : React.createElement("div", {
    className: "cv-deck-noimg",
    style: {
      padding: "60px 20px",
      color: "var(--ink-faint)",
      font: "400 14px/1.5 var(--serif)"
    }
  }, "no image \u2014 judge from the title"), React.createElement("div", {
    className: "cv-deck-label"
  }, React.createElement("div", {
    className: "cv-title"
  }, w.title), React.createElement("div", {
    className: "cv-artist"
  }, w.artist || "—", w.year ? " · " + w.year : ""))), React.createElement("div", {
    className: "cv-deck-love"
  }, LOVE_OPTS.map(function (_ref23) {
    var _ref24 = _slicedToArray(_ref23, 2),
      v = _ref24[0],
      label = _ref24[1];
    return React.createElement("button", {
      key: v,
      "data-on": love === v,
      "data-love": v,
      onClick: function onClick() {
        return setLove(v);
      }
    }, label);
  })), React.createElement("div", {
    className: "cv-deck-btns"
  }, SEEN_OPTS.map(function (_ref25, k) {
    var _ref26 = _slicedToArray(_ref25, 2),
      v = _ref26[0],
      label = _ref26[1];
    return React.createElement("button", {
      key: v,
      "data-v": v,
      onClick: function onClick() {
        return judge(v);
      }
    }, React.createElement("span", {
      className: "key"
    }, k + 1), label);
  })), React.createElement("div", {
    className: "cv-deck-hint"
  }, saveWarn ? "⚠ grades aren't being saved (storage unavailable — private mode?) — they'll be lost on reload" : "feeling first (optional), then the seen answer deals the next card — \"didn't see it\" + ♥ builds your pilgrimage list"));
}
function ArtistView(_ref27) {
  var artistId = _ref27.artistId,
    go = _ref27.go;
  var AD2 = AD.artists[artistId] || {};
  var works = useMemo(function () {
    return WORKS.map(enrich).filter(function (w) {
      return w.artistId === artistId;
    });
  }, [artistId]);
  var _useState61 = useState(function () {
      return new Set(readDeckQueue().map(function (w) {
        return w.qid;
      }));
    }),
    _useState62 = _slicedToArray(_useState61, 2),
    queuedQids = _useState62[0],
    setQueuedQids = _useState62[1];
  var queueMajor = function queueMajor(n) {
    addToDeckQueue(n);
    setQueuedQids(function (prev) {
      return new Set(prev).add(n.qid);
    });
  };
  if (!works.length && !AD2.qid) return React.createElement("div", {
    className: "cv-mus"
  }, React.createElement("p", null, "No artist here (yet)."));
  var name = works[0] && works[0].artist.replace(/\s*\(.*\)$/, "") || AD2.label;
  var normT = function normT(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\bwomen\b/g, "woman").replace(/\bmen\b/g, "man").replace(/\b(series|study|no\s*\d+)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  };
  var canonQids = new Set(works.map(function (w) {
    return w.qid;
  }).filter(Boolean));
  var canonT = works.map(function (w) {
    return normT(w.title);
  }).filter(Boolean);
  var isMet = function isMet(n) {
    if (canonQids.has(n.qid)) return true;
    var nt = normT(n.title);
    if (nt.length < 4) return false;
    var series = /\bseries\b/i.test(n.title);
    return canonT.some(function (ct) {
      return ct === nt || nt.length >= 5 && (ct.startsWith(nt + " ") || nt.startsWith(ct + " ")) || series && (ct.includes(nt) || nt.includes(ct));
    });
  };
  var unmet = (AD2.notable || []).filter(function (n) {
    return !isMet(n);
  });
  var movements = movsOf({
    artistId: artistId
  });
  var venues = _toConsumableArray(new Set(works.flatMap(function (w) {
    return (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at]).filter(Boolean);
  }))).map(function (id) {
    return MUS_BY_ID[id];
  }).filter(Boolean);
  var floored = works.filter(function (w) {
    return w.floored || w.favorite;
  }).length;
  var liked = works.filter(function (w) {
    return w.liked;
  }).length;
  return React.createElement("div", {
    className: "cv-artist"
  }, React.createElement("div", {
    className: "cv-a-head"
  }, AD2.image && React.createElement("img", {
    className: "cv-a-face",
    src: AD2.image,
    alt: name
  }), React.createElement("div", null, React.createElement("h1", {
    className: "cv-a-name"
  }, name), React.createElement("div", {
    className: "cv-a-meta"
  }, AD2.born ? "".concat(AD2.born, "\u2013").concat(AD2.died || "") : "", AD2.desc ? " \xB7 ".concat(AD2.desc.replace(/\s*\(\d{4}[–-]?\d{0,4}\)$/, "")) : ""), movements.length > 0 && React.createElement("div", {
    className: "cv-a-mov"
  }, movements.map(function (m, i) {
    return React.createElement(React.Fragment, {
      key: m
    }, i > 0 ? " · " : "", React.createElement("span", {
      className: "cv-a-movlink",
      onClick: function onClick() {
        return go("wall", movSlug(m));
      },
      title: "see every work on the wall by artists working in ".concat(m)
    }, m));
  })), React.createElement("div", {
    className: "cv-a-stats"
  }, works.length, " in your canon", floored ? " \xB7 \u2605 ".concat(floored, " floored") : "", liked ? " \xB7 \u2661 ".concat(liked, " liked") : "", venues.length ? " \xB7 met at ".concat(venues.map(function (v) {
    return v.name.replace(/\s*\(.*\)$/, "");
  }).join(", ")) : ""))), React.createElement("div", {
    className: "cv-a-secl"
  }, "In your canon"), React.createElement(RevealChunks, {
    items: works,
    initial: 30,
    step: 30,
    render: function render(slice) {
      return React.createElement("div", {
        className: "cv-wall cv-a-wall"
      }, slice.map(function (w) {
        return React.createElement(Card, {
          key: w.id,
          w: w,
          go: go
        });
      }));
    }
  }), unmet.length > 0 && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "cv-a-secl"
  }, "Their majors you haven't met"), React.createElement(RevealChunks, {
    items: unmet,
    initial: 18,
    step: 18,
    render: function render(slice) {
      return React.createElement("div", {
        className: "cv-a-unmet"
      }, slice.map(function (n) {
        var q = queuedQids.has(n.qid);
        return React.createElement("div", {
          className: "cv-a-unmet-item",
          key: n.qid
        }, React.createElement("a", {
          href: "https://www.wikidata.org/wiki/".concat(n.qid),
          target: "_blank",
          rel: "noopener noreferrer",
          title: n.title
        }, React.createElement(LazyImg, {
          src: n.img,
          alt: n.title
        }), React.createElement("span", null, n.title, n.year ? " \xB7 ".concat(n.year) : "")), React.createElement("button", {
          type: "button",
          className: "cv-a-unmet-add",
          "data-q": q,
          disabled: q,
          title: q ? "queued for the By Your Artists deck" : "add to the By Your Artists deck",
          onClick: function onClick() {
            return queueMajor(n);
          }
        }, q ? "queued ✓" : "+ deck"));
      }));
    }
  })), (AD2.similar || []).length > 0 && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "cv-a-secl"
  }, "Who's next \u2014 kin, teachers, students"), React.createElement("div", {
    className: "cv-a-kin"
  }, AD2.similar.slice(0, 8).map(function (s2) {
    var inCanon = Object.entries(AD.artists).find(function (_ref28) {
      var _ref29 = _slicedToArray(_ref28, 2),
        k = _ref29[0],
        v = _ref29[1];
      return v.qid === s2.qid;
    });
    return inCanon ? React.createElement("a", {
      key: s2.qid,
      className: "cv-a-kin-chip",
      "data-in": "true",
      href: "#/artist/" + inCanon[0]
    }, s2.label, React.createElement("i", null, "in your canon")) : React.createElement("a", {
      key: s2.qid,
      className: "cv-a-kin-chip",
      href: "https://www.wikidata.org/wiki/" + s2.qid,
      target: "_blank",
      rel: "noopener noreferrer"
    }, s2.label, s2.desc ? React.createElement("i", null, s2.desc.slice(0, 40)) : null);
  }))), AD2.qid && React.createElement("div", {
    className: "cv-r-links",
    style: {
      padding: "18px 0 0"
    }
  }, React.createElement("a", {
    href: "https://www.wikidata.org/wiki/".concat(AD2.qid),
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Wikidata \u2197")));
}
var strHue = function strHue(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};
var initialsOf = function initialsOf(name) {
  return name.split(/\s+/).map(function (s) {
    return s[0];
  }).filter(function (c) {
    return /[A-Za-zÀ-ÿ]/.test(c || "");
  }).slice(0, 2).join("").toUpperCase();
};
function Artists(_ref30) {
  var go = _ref30.go;
  var rows = useMemo(function () {
    var by = {};
    var _iterator18 = _createForOfIteratorHelper(WORKS.map(enrich)),
      _step18;
    try {
      for (_iterator18.s(); !(_step18 = _iterator18.n()).done;) {
        var w = _step18.value;
        if (!w.artistId) continue;
        var r = by[w.artistId] = by[w.artistId] || {
          id: w.artistId,
          name: w.artist.replace(/\s*\(.*\)$/, ""),
          n: 0,
          fl: 0,
          lk: 0
        };
        r.n++;
        if (w.floored || w.favorite) r.fl++;
        if (w.liked) r.lk++;
      }
    } catch (err) {
      _iterator18.e(err);
    } finally {
      _iterator18.f();
    }
    return Object.values(by).sort(function (a, b) {
      return b.fl * 3 + b.lk - (a.fl * 3 + a.lk) || b.n - a.n;
    });
  }, []);
  return React.createElement("div", {
    className: "cv-artists"
  }, React.createElement("p", {
    className: "cv-deck-sum"
  }, rows.length, " artists in the canon, ranked by how hard they hit."), React.createElement("div", {
    className: "cv-artgrid"
  }, rows.map(function (r) {
    var a = AD.artists[r.id] || {};
    var life = a.born ? "".concat(a.born, "\u2013").concat(a.died || "") : a.desc ? a.desc.replace(/\s*\(\d{4}[–-]?\d{0,4}\)$/, "") : "";
    return React.createElement("button", {
      className: "cv-artblob",
      key: r.id,
      onClick: function onClick() {
        return go("artist", r.id);
      },
      title: r.name
    }, React.createElement("span", {
      className: "cv-artblob-face",
      "data-empty": a.image ? "false" : "true",
      style: a.image ? {
        backgroundImage: "url(\"".concat(a.image, "\")")
      } : {
        background: "hsl(".concat(strHue(r.id), " 34% 52%)")
      }
    }, !a.image && React.createElement("i", null, initialsOf(r.name)), r.fl > 0 && React.createElement("b", {
      className: "cv-artblob-star"
    }, "\u2605", r.fl)), React.createElement("span", {
      className: "cv-artblob-name"
    }, r.name), life && React.createElement("span", {
      className: "cv-artblob-life"
    }, life), React.createElement("span", {
      className: "cv-artblob-n"
    }, r.n, " work", r.n > 1 ? "s" : "", r.lk ? " \xB7 \u2661".concat(r.lk) : ""));
  })));
}
function MapView(_ref31) {
  var go = _ref31.go;
  var world = window.CANVAS_WORLD || null;
  var _useState63 = useState(function () {
      return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 620px)").matches ? 1.7 : 1;
    }),
    _useState64 = _slicedToArray(_useState63, 1),
    dotMul = _useState64[0];
  var P = function P(lat, lng) {
    return [(lng + 180) / 360 * 1000, (90 - lat) / 180 * 500];
  };
  var coordOf = function coordOf(id) {
    var d = AD.museums[id] || {};
    return d.lat == null ? null : P(d.lat, d.lng);
  };
  var landPath = useMemo(function () {
    return world && world.land ? world.land.join(" ") : "";
  }, []);
  var cities = useMemo(function () {
    var counts = {};
    var _iterator19 = _createForOfIteratorHelper(WORKS),
      _step19;
    try {
      for (_iterator19.s(); !(_step19 = _iterator19.n()).done;) {
        var w = _step19.value;
        var _iterator24 = _createForOfIteratorHelper(Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at]),
          _step24;
        try {
          for (_iterator24.s(); !(_step24 = _iterator24.n()).done;) {
            var id = _step24.value;
            if (id) counts[id] = (counts[id] || 0) + 1;
          }
        } catch (err) {
          _iterator24.e(err);
        } finally {
          _iterator24.f();
        }
      }
    } catch (err) {
      _iterator19.e(err);
    } finally {
      _iterator19.f();
    }
    var byCity = {};
    var _iterator20 = _createForOfIteratorHelper(MUSEUMS),
      _step20;
    try {
      for (_iterator20.s(); !(_step20 = _iterator20.n()).done;) {
        var m = _step20.value;
        var _d = AD.museums[m.id] || {};
        if (_d.lat == null) continue;
        var _P = P(_d.lat, _d.lng),
          _P2 = _slicedToArray(_P, 2),
          x = _P2[0],
          y = _P2[1];
        var _c = byCity[m.city] = byCity[m.city] || {
          city: m.city,
          xs: 0,
          ys: 0,
          k: 0,
          wxs: 0,
          wys: 0,
          wk: 0,
          n: 0,
          museums: []
        };
        var n = counts[m.id] || 0;
        _c.xs += x;
        _c.ys += y;
        _c.k++;
        _c.n += n;
        var wt = n + 1;
        _c.wxs += x * wt;
        _c.wys += y * wt;
        _c.wk += wt;
        _c.museums.push({
          id: m.id,
          name: m.name.replace(/\s*\(.*\)$/, ""),
          x: x,
          y: y,
          n: n
        });
      }
    } catch (err) {
      _iterator20.e(err);
    } finally {
      _iterator20.f();
    }
    var arr = Object.values(byCity).map(function (c) {
      return _objectSpread(_objectSpread({}, c), {}, {
        x: c.wxs / c.wk,
        y: c.wys / c.wk
      });
    });
    var _iterator21 = _createForOfIteratorHelper(arr),
      _step21;
    try {
      for (_iterator21.s(); !(_step21 = _iterator21.n()).done;) {
        var _c2 = _step21.value;
        _c2.ox = _c2.x;
        _c2.oy = _c2.y;
      }
    } catch (err) {
      _iterator21.e(err);
    } finally {
      _iterator21.f();
    }
    var rOf = function rOf(c) {
      return 1.4 + Math.sqrt(c.n) * 0.8;
    };
    for (var it = 0; it < 30; it++) {
      var moved = false;
      for (var i = 0; i < arr.length; i++) for (var j = i + 1; j < arr.length; j++) {
        var a = arr[i],
          b = arr[j],
          min = rOf(a) + rOf(b) + 0.6;
        var dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.hypot(dx, dy);
        if (d >= min) continue;
        if (d < 0.01) {
          dx = 0.5;
          dy = 0.3;
          d = Math.hypot(dx, dy);
        }
        var push = (min - d) / d / 2;
        a.x -= dx * push;
        a.y -= dy * push;
        b.x += dx * push;
        b.y += dy * push;
        moved = true;
      }
      var _iterator22 = _createForOfIteratorHelper(arr),
        _step22;
      try {
        for (_iterator22.s(); !(_step22 = _iterator22.n()).done;) {
          var c = _step22.value;
          c.x += (c.ox - c.x) * 0.3;
          c.y += (c.oy - c.y) * 0.3;
          var ex = c.x - c.ox,
            ey = c.y - c.oy,
            e = Math.hypot(ex, ey);
          if (e > 5) {
            c.x = c.ox + ex / e * 5;
            c.y = c.oy + ey / e * 5;
          }
        }
      } catch (err) {
        _iterator22.e(err);
      } finally {
        _iterator22.f();
      }
      if (!moved) break;
    }
    var map = {};
    var _iterator23 = _createForOfIteratorHelper(arr),
      _step23;
    try {
      for (_iterator23.s(); !(_step23 = _iterator23.n()).done;) {
        var _c3 = _step23.value;
        map[_c3.city] = _c3;
      }
    } catch (err) {
      _iterator23.e(err);
    } finally {
      _iterator23.f();
    }
    return {
      list: arr,
      byCity: map
    };
  }, []);
  var _useMemo = useMemo(function () {
      var wishes = WORKS.map(enrich).filter(function (w) {
        return w.wish;
      });
      var byCity = {},
        byMus = {};
      var _iterator25 = _createForOfIteratorHelper(wishes),
        _step25;
      try {
        for (_iterator25.s(); !(_step25 = _iterator25.n()).done;) {
          var w = _step25.value;
          var _mid = (Array.isArray(w.seenAt) ? w.seenAt[0] : w.seenAt) || w.at;
          var _m = _mid ? MUS_BY_ID[_mid] : null;
          (byMus[_mid || "_tbc"] = byMus[_mid || "_tbc"] || []).push(w);
          if (_m && cities.byCity[_m.city]) (byCity[_m.city] = byCity[_m.city] || {
            c: cities.byCity[_m.city],
            list: []
          }).list.push({
            w: w,
            venue: _m.name.replace(/\s*\(.*\)$/, "")
          });
        }
      } catch (err) {
        _iterator25.e(err);
      } finally {
        _iterator25.f();
      }
      var markers = [];
      var _loop2 = function _loop2() {
        var _Object$values$_i = _Object$values[_i3],
          c = _Object$values$_i.c,
          list = _Object$values$_i.list;
        var bx = c.x,
          by = c.y;
        var cr = c.n ? 1.4 + Math.sqrt(c.n) * 0.8 : 1.1;
        var R = 2,
          sep = 1.0,
          GAP = 0.6,
          minR = cr + R + GAP,
          GA = 2.399963;
        var nodes = list.map(function (e, i) {
          var rr = minR + 0.7 * Math.sqrt(i),
            a = i * GA;
          return {
            e: e,
            x: bx + rr * Math.cos(a),
            y: by + rr * Math.sin(a)
          };
        });
        var clear = function clear(nd) {
          var ex = nd.x - bx,
            ey = nd.y - by,
            e = Math.hypot(ex, ey) || 0.001;
          var floor = cr + R + GAP;
          if (e < floor) {
            nd.x = bx + ex / e * floor;
            nd.y = by + ey / e * floor;
          }
        };
        for (var pass = 0; pass < 16; pass++) {
          for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) {
            var a = nodes[i],
              b = nodes[j],
              min = R + R + sep;
            var dx = b.x - a.x,
              dy = b.y - a.y,
              d = Math.hypot(dx, dy);
            if (d >= min) continue;
            if (d < 0.001) {
              dx = Math.cos(i) * 0.5;
              dy = Math.sin(i) * 0.5;
              d = Math.hypot(dx, dy);
            }
            var push = (min - d) / d / 2;
            a.x -= dx * push;
            a.y -= dy * push;
            b.x += dx * push;
            b.y += dy * push;
          }
          var _iterator26 = _createForOfIteratorHelper(nodes),
            _step26;
          try {
            for (_iterator26.s(); !(_step26 = _iterator26.n()).done;) {
              var nd = _step26.value;
              clear(nd);
            }
          } catch (err) {
            _iterator26.e(err);
          } finally {
            _iterator26.f();
          }
        }
        var _iterator27 = _createForOfIteratorHelper(nodes),
          _step27;
        try {
          for (_iterator27.s(); !(_step27 = _iterator27.n()).done;) {
            var _nd = _step27.value;
            clear(_nd);
          }
        } catch (err) {
          _iterator27.e(err);
        } finally {
          _iterator27.f();
        }
        var _iterator28 = _createForOfIteratorHelper(nodes),
          _step28;
        try {
          for (_iterator28.s(); !(_step28 = _iterator28.n()).done;) {
            var _nd2 = _step28.value;
            markers.push({
              w: _nd2.e.w,
              x: _nd2.x,
              y: _nd2.y,
              bx: bx,
              by: by,
              city: c.city,
              venue: _nd2.e.venue
            });
          }
        } catch (err) {
          _iterator28.e(err);
        } finally {
          _iterator28.f();
        }
      };
      for (var _i3 = 0, _Object$values = Object.values(byCity); _i3 < _Object$values.length; _i3++) {
        _loop2();
      }
      var cityDot = 2,
        cityGap = 1.2;
      var cRad = function cRad(c) {
        return c.n ? 1.4 + Math.sqrt(c.n) * 0.8 : 1.1;
      };
      for (var pass = 0; pass < 4; pass++) {
        var _iterator29 = _createForOfIteratorHelper(markers),
          _step29;
        try {
          for (_iterator29.s(); !(_step29 = _iterator29.n()).done;) {
            var mk = _step29.value;
            var _iterator30 = _createForOfIteratorHelper(cities.list),
              _step30;
            try {
              for (_iterator30.s(); !(_step30 = _iterator30.n()).done;) {
                var c = _step30.value;
                var need = cRad(c) + cityDot + cityGap;
                var ex = mk.x - c.x,
                  ey = mk.y - c.y,
                  e = Math.hypot(ex, ey);
                if (e >= need) continue;
                if (e < 0.001) {
                  ex = mk.x - mk.bx;
                  ey = mk.y - mk.by;
                  e = Math.hypot(ex, ey) || 0.001;
                  ex /= e;
                  ey /= e;
                } else {
                  ex /= e;
                  ey /= e;
                }
                mk.x = c.x + ex * need;
                mk.y = c.y + ey * need;
              }
            } catch (err) {
              _iterator30.e(err);
            } finally {
              _iterator30.f();
            }
          }
        } catch (err) {
          _iterator29.e(err);
        } finally {
          _iterator29.f();
        }
      }
      var groups = {};
      for (var _i4 = 0, _Object$entries = Object.entries(byMus); _i4 < _Object$entries.length; _i4++) {
        var _Object$entries$_i = _slicedToArray(_Object$entries[_i4], 2),
          mid = _Object$entries$_i[0],
          l = _Object$entries$_i[1];
        var m = MUS_BY_ID[mid];
        groups[m ? m.city + " — " + m.name.replace(/\s*\(.*\)$/, "") : "location TBC"] = l;
      }
      return {
        wishMarkers: markers,
        wishList: Object.entries(groups).sort(function (a, b) {
          return b[1].length - a[1].length;
        })
      };
    }, [cities]),
    wishMarkers = _useMemo.wishMarkers,
    wishList = _useMemo.wishList;
  var trips = useMemo(function () {
    var by = {};
    var _iterator31 = _createForOfIteratorHelper(MUSEUMS),
      _step31;
    try {
      for (_iterator31.s(); !(_step31 = _iterator31.n()).done;) {
        var m = _step31.value;
        var _iterator32 = _createForOfIteratorHelper(m.visits || []),
          _step32;
        try {
          for (_iterator32.s(); !(_step32 = _iterator32.n()).done;) {
            var v = _step32.value;
            var y = String(v).match(/^(~?)(\d{4})/);
            if (!y) continue;
            (by[y[2]] = by[y[2]] || new Set()).add(m.city);
          }
        } catch (err) {
          _iterator32.e(err);
        } finally {
          _iterator32.f();
        }
      }
    } catch (err) {
      _iterator31.e(err);
    } finally {
      _iterator31.f();
    }
    return Object.entries(by).map(function (_ref32) {
      var _ref33 = _slicedToArray(_ref32, 2),
        y = _ref33[0],
        s = _ref33[1];
      return [y, _toConsumableArray(s)];
    }).sort(function (a, b) {
      return b[0] - a[0];
    });
  }, []);
  var AR = 380 / 880;
  var HOME = {
    x: 60,
    y: 40,
    w: 880,
    h: 380
  };
  var svgRef = React.useRef(null);
  var drag = React.useRef(null);
  var raf = React.useRef(0);
  var _useState65 = useState(HOME),
    _useState66 = _slicedToArray(_useState65, 2),
    vb = _useState66[0],
    setVb = _useState66[1];
  var vbRef = React.useRef(vb);
  vbRef.current = vb;
  var _useState67 = useState(null),
    _useState68 = _slicedToArray(_useState67, 2),
    hover = _useState68[0],
    setHover = _useState68[1];
  var k = vb.w / 880;
  var commit = function commit(next) {
    vbRef.current = next;
    if (!raf.current) raf.current = requestAnimationFrame(function () {
      raf.current = 0;
      setVb(vbRef.current);
    });
  };
  var _useState69 = useState(null),
    _useState70 = _slicedToArray(_useState69, 2),
    lens = _useState70[0],
    setLens = _useState70[1];
  var lensRaf = React.useRef(0);
  var LENS_R = 26;
  var LENS_MAG = 2.1;
  var lensR = LENS_R * k;
  var setLensThrottled = function setLensThrottled(p) {
    if (lensRaf.current) return;
    lensRaf.current = requestAnimationFrame(function () {
      lensRaf.current = 0;
      setLens(p);
    });
  };
  var fish = function fish(x, y, r) {
    if (!lens) return [x, y, 1];
    var dx = x - lens.x,
      dy = y - lens.y,
      d = Math.hypot(dx, dy);
    if (d >= lensR) return [x, y, 1];
    var t = 0.5 + 0.5 * Math.cos(Math.PI * d / lensR);
    var damp = r ? Math.max(0.25, Math.min(1, 3 / r)) : 1;
    return [x, y, 1 + (LENS_MAG - 1) * t * damp];
  };
  var clientToMap = function clientToMap(cx, cy) {
    var el = svgRef.current;
    if (!el) return null;
    var r = el.getBoundingClientRect();
    var v = vbRef.current;
    return {
      x: v.x + (cx - r.left) / r.width * v.w,
      y: v.y + (cy - r.top) / r.height * v.h
    };
  };
  var _useState71 = useState(null),
    _useState72 = _slicedToArray(_useState71, 2),
    focus = _useState72[0],
    setFocus = _useState72[1];
  var relaxFan = function relaxFan(px, py, items, opt) {
    var n = items.length;
    if (!n) return [];
    var GA = 2.399963;
    var minR = opt.minR,
      step = opt.step,
      sep = opt.sep,
      rOf = opt.rOf,
      seedAng = opt.seedAng || 0;
    var parentR = opt.parentR || 0,
      gap = opt.gap == null ? 1.2 : opt.gap;
    var nodes = items.map(function (it, i) {
      var rr = minR + step * Math.sqrt(i);
      var a = seedAng + i * GA;
      return {
        it: it,
        x: px + rr * Math.cos(a),
        y: py + rr * Math.sin(a),
        r: rOf(it, i)
      };
    });
    var clearParent = function clearParent(nd) {
      var need = parentR + nd.r + gap;
      var ex = nd.x - px,
        ey = nd.y - py,
        e = Math.hypot(ex, ey) || 0.001;
      var floor = Math.max(minR, need);
      if (e < floor) {
        nd.x = px + ex / e * floor;
        nd.y = py + ey / e * floor;
      }
    };
    for (var pass = 0; pass < 16; pass++) {
      for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) {
        var a = nodes[i],
          b = nodes[j],
          min = a.r + b.r + sep;
        var dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.hypot(dx, dy);
        if (d >= min) continue;
        if (d < 0.001) {
          dx = Math.cos(i) * 0.5;
          dy = Math.sin(i) * 0.5;
          d = Math.hypot(dx, dy);
        }
        var push = (min - d) / d / 2;
        a.x -= dx * push;
        a.y -= dy * push;
        b.x += dx * push;
        b.y += dy * push;
      }
      var _iterator33 = _createForOfIteratorHelper(nodes),
        _step33;
      try {
        for (_iterator33.s(); !(_step33 = _iterator33.n()).done;) {
          var nd = _step33.value;
          clearParent(nd);
        }
      } catch (err) {
        _iterator33.e(err);
      } finally {
        _iterator33.f();
      }
    }
    var _iterator34 = _createForOfIteratorHelper(nodes),
      _step34;
    try {
      for (_iterator34.s(); !(_step34 = _iterator34.n()).done;) {
        var _nd3 = _step34.value;
        clearParent(_nd3);
      }
    } catch (err) {
      _iterator34.e(err);
    } finally {
      _iterator34.f();
    }
    return nodes;
  };
  var branch = useMemo(function () {
    if (!focus) return null;
    var c = cities.byCity[focus];
    if (!c) return null;
    var museums = c.museums.filter(function (m) {
      return m.n > 0;
    });
    var nm = museums.length || 1;
    var enriched = WORKS.map(enrich);
    var cityR = c.n ? 1.4 + Math.sqrt(c.n) * 0.8 : 1.1;
    var musR = function musR(m) {
      return 3.0 + Math.min(m.n, 8) * 0.16;
    };
    var mFan = relaxFan(c.x, c.y, museums, {
      minR: cityR + musR({
        n: 0
      }) + 0.4,
      step: 1.3,
      sep: 1.4,
      seedAng: -Math.PI / 2,
      parentR: cityR,
      gap: 0.8,
      rOf: musR
    });
    var nodes = mFan.map(function (mn, i) {
      var m = mn.it,
        mx = mn.x,
        my = mn.y;
      var works = enriched.filter(function (w) {
        return !w.wish && (w.floored || w.liked) && (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt]).includes(m.id);
      });
      var nw = works.length;
      var outAng = Math.atan2(my - c.y, mx - c.x);
      var wRof = function wRof(w) {
        return w.floored ? 1.8 : 1.5;
      };
      var wFan = relaxFan(mx, my, works, {
        minR: mn.r + 1.8 + 0.4,
        step: 0.8,
        sep: 0.7,
        seedAng: outAng - Math.PI / 2,
        parentR: mn.r,
        gap: 0.6,
        rOf: wRof
      });
      var wnodes = wFan.map(function (wn, j) {
        return {
          w: wn.it,
          x: wn.x,
          y: wn.y,
          r: wRof(wn.it)
        };
      });
      return {
        m: m,
        x: mx,
        y: my,
        mr: mn.r,
        wnodes: wnodes,
        nw: nw,
        lx: mx,
        ly: my - (mn.r + 4.2)
      };
    });
    var reach = cityR + 4;
    var _iterator35 = _createForOfIteratorHelper(nodes),
      _step35;
    try {
      for (_iterator35.s(); !(_step35 = _iterator35.n()).done;) {
        var nd = _step35.value;
        reach = Math.max(reach, Math.hypot(nd.x - c.x, nd.y - c.y) + nd.mr + 5.2);
        var _iterator36 = _createForOfIteratorHelper(nd.wnodes),
          _step36;
        try {
          for (_iterator36.s(); !(_step36 = _iterator36.n()).done;) {
            var wn = _step36.value;
            reach = Math.max(reach, Math.hypot(wn.x - c.x, wn.y - c.y) + wn.r);
          }
        } catch (err) {
          _iterator36.e(err);
        } finally {
          _iterator36.f();
        }
      }
    } catch (err) {
      _iterator35.e(err);
    } finally {
      _iterator35.f();
    }
    return {
      c: c,
      nodes: nodes,
      cityR: cityR,
      reach: reach
    };
  }, [focus]);
  var _useState73 = useState(0),
    _useState74 = _slicedToArray(_useState73, 2),
    grow = _useState74[0],
    setGrow = _useState74[1];
  var growRaf = React.useRef(0),
    growFrom = React.useRef(0),
    growTo = React.useRef(0),
    growT0 = React.useRef(0);
  var animateGrow = function animateGrow(to, from) {
    growFrom.current = from == null ? grow : from;
    growTo.current = to;
    growT0.current = performance.now();
    if (growRaf.current) cancelAnimationFrame(growRaf.current);
    var DUR = 420;
    var _tick = function tick(now) {
      var p = Math.min(1, (now - growT0.current) / DUR);
      var e = 1 - Math.pow(1 - p, 3);
      setGrow(growFrom.current + (growTo.current - growFrom.current) * e);
      if (p < 1) growRaf.current = requestAnimationFrame(_tick);else growRaf.current = 0;
    };
    growRaf.current = requestAnimationFrame(_tick);
  };
  var framePending = React.useRef(false);
  var focusCity = function focusCity(c) {
    setFocus(c.city);
    setGrow(0);
    animateGrow(1, 0);
    framePending.current = true;
  };
  React.useEffect(function () {
    if (!branch || !framePending.current) return;
    framePending.current = false;
    var half = Math.max(28, branch.reach + 6);
    var w = half * 2,
      h = w * AR;
    commit({
      x: branch.c.x - half,
      y: branch.c.y - h / 2,
      w: w,
      h: h
    });
  }, [branch]);
  var clearFocus = function clearFocus() {
    setHover(null);
    commit(HOME);
    animateGrow(0);
    setTimeout(function () {
      return setFocus(null);
    }, 440);
  };
  React.useEffect(function () {
    var el = svgRef.current;
    if (!el) return;
    var onWheel = function onWheel(e) {
      e.preventDefault();
      var r = el.getBoundingClientRect();
      var mx = (e.clientX - r.left) / r.width,
        my = (e.clientY - r.top) / r.height;
      var f = e.deltaY < 0 ? 1 / 1.18 : 1.18,
        v = vbRef.current;
      var w = Math.min(880, Math.max(70, v.w * f)),
        h = w * AR;
      commit({
        x: v.x + mx * v.w - mx * w,
        y: v.y + my * v.h - my * h,
        w: w,
        h: h
      });
    };
    el.addEventListener("wheel", onWheel, {
      passive: false
    });
    return function () {
      el.removeEventListener("wheel", onWheel);
      if (raf.current) cancelAnimationFrame(raf.current);
      if (lensRaf.current) cancelAnimationFrame(lensRaf.current);
      if (growRaf.current) cancelAnimationFrame(growRaf.current);
    };
  }, []);
  var onDown = function onDown(e) {
    if (e.button !== 0) return;
    drag.current = {
      mx: e.clientX,
      my: e.clientY,
      v: vbRef.current,
      moved: false
    };
  };
  var onMove = function onMove(e) {
    if (drag.current && svgRef.current) {
      var r = svgRef.current.getBoundingClientRect(),
        d = drag.current;
      if (Math.abs(e.clientX - d.mx) + Math.abs(e.clientY - d.my) > 3) d.moved = true;
      commit(_objectSpread(_objectSpread({}, d.v), {}, {
        x: d.v.x - (e.clientX - d.mx) / r.width * d.v.w,
        y: d.v.y - (e.clientY - d.my) / r.height * d.v.h
      }));
      return;
    }
    var p = clientToMap(e.clientX, e.clientY);
    if (p) setLensThrottled(p);
  };
  var stop = function stop() {
    drag.current = null;
  };
  var onLeave = function onLeave() {
    drag.current = null;
    setLensThrottled(null);
  };
  var touch = React.useRef(null);
  var pinch = React.useRef(null);
  var fingerDist = function fingerDist(a, b) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };
  var onTouchStart = function onTouchStart(e) {
    if (e.touches.length >= 2) {
      var _ref34 = [e.touches[0], e.touches[1]],
        a = _ref34[0],
        b = _ref34[1];
      pinch.current = {
        d: fingerDist(a, b) || 1,
        v: vbRef.current
      };
      touch.current = null;
      drag.current = null;
      return;
    }
    var t = e.touches[0];
    if (t) touch.current = {
      x: t.clientX,
      y: t.clientY,
      moved: false,
      t: Date.now()
    };
  };
  var onTouchMove = function onTouchMove(e) {
    if (pinch.current && e.touches.length >= 2 && svgRef.current) {
      var _ref35 = [e.touches[0], e.touches[1]],
        a = _ref35[0],
        b = _ref35[1],
        p = pinch.current;
      var nd = fingerDist(a, b);
      if (nd < 1) return;
      var f = p.d / nd;
      var r = svgRef.current.getBoundingClientRect();
      var fx = ((a.clientX + b.clientX) / 2 - r.left) / r.width,
        fy = ((a.clientY + b.clientY) / 2 - r.top) / r.height;
      var w = Math.min(880, Math.max(70, p.v.w * f)),
        h = w * AR;
      commit({
        x: p.v.x + fx * p.v.w - fx * w,
        y: p.v.y + fy * p.v.h - fy * h,
        w: w,
        h: h
      });
      return;
    }
    var t = e.touches[0],
      d = touch.current;
    if (!t || !d || !svgRef.current) return;
    if (Math.abs(t.clientX - d.x) + Math.abs(t.clientY - d.y) > 6) {
      if (!drag.current) drag.current = {
        mx: d.x,
        my: d.y,
        v: vbRef.current,
        moved: true
      };
      var _r = svgRef.current.getBoundingClientRect(),
        dr = drag.current;
      commit(_objectSpread(_objectSpread({}, dr.v), {}, {
        x: dr.v.x - (t.clientX - dr.mx) / _r.width * dr.v.w,
        y: dr.v.y - (t.clientY - dr.my) / _r.height * dr.v.h
      }));
      d.moved = true;
    }
  };
  var onTouchEnd = function onTouchEnd(e) {
    if (pinch.current) {
      if (e.touches.length >= 2) {
        var _ref36 = [e.touches[0], e.touches[1]],
          a = _ref36[0],
          b = _ref36[1];
        pinch.current = {
          d: fingerDist(a, b) || 1,
          v: vbRef.current
        };
      } else pinch.current = null;
      touch.current = null;
      drag.current = null;
      return;
    }
    var d = touch.current;
    drag.current = null;
    touch.current = null;
    if (!d || d.moved) return;
    var p = clientToMap(d.x, d.y);
    if (!p) return;
    setLens(p);
    var v = vbRef.current,
      out = v.w < 300,
      f = out ? 1.6 : 1 / 1.6;
    var w = Math.min(880, Math.max(70, v.w * f)),
      h = w * AR;
    var el = svgRef.current,
      r = el.getBoundingClientRect();
    var fx = (d.x - r.left) / r.width,
      fy = (d.y - r.top) / r.height;
    commit({
      x: v.x + fx * v.w - fx * w,
      y: v.y + fy * v.h - fy * h,
      w: w,
      h: h
    });
  };
  var zoomCenter = function zoomCenter(f) {
    var v = vbRef.current;
    var w = Math.min(880, Math.max(70, v.w * f)),
      h = w * AR;
    commit({
      x: v.x + 0.5 * v.w - 0.5 * w,
      y: v.y + 0.5 * v.h - 0.5 * h,
      w: w,
      h: h
    });
  };
  return React.createElement("div", {
    className: "cv-map"
  }, React.createElement("p", {
    className: "cv-deck-sum"
  }, "Every city where a work entered your canon, sized by how much it gave you \u2014 ", React.createElement("b", null, "click a city"), " to branch out to its museums and the works you loved there (hover a work for a look). The ", React.createElement("b", {
    style: {
      color: "oklch(0.55 0.19 18)"
    }
  }, "\u2665 markers"), " are works you're still chasing. Scroll or pinch to zoom, drag to pan \u2014 hover to magnify the bubbles under your cursor (tap on touch)."), React.createElement("div", {
    className: "cv-map-wrap",
    onMouseLeave: onLeave
  }, React.createElement("div", {
    className: "cv-map-zoom"
  }, React.createElement("button", {
    type: "button",
    onClick: function onClick() {
      return zoomCenter(1 / 1.4);
    },
    "aria-label": "Zoom in",
    title: "Zoom in"
  }, "+"), React.createElement("button", {
    type: "button",
    onClick: function onClick() {
      return zoomCenter(1.4);
    },
    "aria-label": "Zoom out",
    title: "Zoom out"
  }, "\u2212"), React.createElement("button", {
    type: "button",
    onClick: function onClick() {
      return setVb(HOME);
    },
    "aria-label": "Reset view",
    title: "Reset view"
  }, "\u2302")), React.createElement("svg", {
    ref: svgRef,
    viewBox: "".concat(vb.x, " ").concat(vb.y, " ").concat(vb.w, " ").concat(vb.h),
    onMouseDown: onDown,
    onMouseMove: onMove,
    onMouseUp: stop,
    onTouchStart: onTouchStart,
    onTouchMove: onTouchMove,
    onTouchEnd: onTouchEnd
  }, landPath && React.createElement("path", {
    d: landPath,
    fill: "#d3c4ab",
    stroke: "none"
  }), !focus && wishMarkers.map(function (mk, i) {
    if (mk.x === mk.bx && mk.y === mk.by) return null;
    var _fish = fish(mk.x, mk.y),
      _fish2 = _slicedToArray(_fish, 2),
      fx = _fish2[0],
      fy = _fish2[1];
    return React.createElement("line", {
      key: "wl" + mk.w.id + "-" + i,
      x1: mk.bx,
      y1: mk.by,
      x2: fx,
      y2: fy,
      stroke: "oklch(0.55 0.19 18 / .4)",
      strokeWidth: 0.5 * k
    });
  }), !focus && cities.list.map(function (c) {
    var cr = c.n ? 1.4 + Math.sqrt(c.n) * 0.8 : 1.1;
    var _fish3 = fish(c.x, c.y, cr),
      _fish4 = _slicedToArray(_fish3, 3),
      fx = _fish4[0],
      fy = _fish4[1],
      fs = _fish4[2];
    return React.createElement("g", {
      key: c.city,
      className: "cv-pin",
      onClick: function onClick() {
        return focusCity(c);
      },
      style: {
        cursor: "pointer"
      }
    }, React.createElement("circle", {
      cx: fx,
      cy: fy,
      r: cr * fs * k * dotMul,
      fill: c.n ? "oklch(0.55 0.13 46 / .82)" : "rgba(58,47,34,.45)",
      stroke: "#f4ecdf",
      strokeWidth: 0.6 * k
    }), React.createElement("title", null, c.city, " \u2014 ", c.n, " work", c.n !== 1 ? "s" : "", " \xB7 ", c.museums.length, " museum", c.museums.length !== 1 ? "s" : "", c.n ? " · click to open" : ""), (c.n >= 8 || fs > 1.25) && React.createElement("text", {
      x: fx,
      y: fy - (cr * fs * dotMul + 1) * k,
      textAnchor: "middle",
      style: {
        fontSize: 8 * k * dotMul
      }
    }, c.city));
  }), !focus && wishMarkers.map(function (mk, i) {
    var _fish5 = fish(mk.x, mk.y),
      _fish6 = _slicedToArray(_fish5, 3),
      fx = _fish6[0],
      fy = _fish6[1],
      fs = _fish6[2];
    return React.createElement("g", {
      key: mk.w.id + "-" + i,
      className: "cv-wishpin",
      onClick: function onClick() {
        return go("work", mk.w.id);
      },
      onMouseEnter: function onMouseEnter(e) {
        return setHover({
          w: mk.w,
          mx: e.clientX,
          my: e.clientY,
          venue: mk.venue,
          city: mk.city
        });
      },
      onMouseMove: function onMouseMove(e) {
        return setHover(function (h) {
          return h && h.w === mk.w ? _objectSpread(_objectSpread({}, h), {}, {
            mx: e.clientX,
            my: e.clientY
          }) : h;
        });
      },
      onMouseLeave: function onMouseLeave() {
        return setHover(null);
      }
    }, React.createElement("circle", {
      cx: fx,
      cy: fy,
      r: 2 * fs * k * dotMul,
      fill: "oklch(0.55 0.19 18 / .9)",
      stroke: "#f7efe2",
      strokeWidth: 0.6 * k
    }));
  }), branch && function () {
    var cx = branch.c.x,
      cy = branch.c.y,
      N = branch.nodes.length;
    var mProg = function mProg(i) {
      var s = N > 1 ? 0.45 * i / (N - 1) : 0;
      return Math.max(0, Math.min(1, (grow - s) / (1 - s || 1)));
    };
    var lerp = function lerp(a, b, t) {
      return a + (b - a) * t;
    };
    return React.createElement("g", {
      className: "cv-branch"
    }, branch.nodes.map(function (nd, i) {
      var g = mProg(i),
        mx = lerp(cx, nd.x, g),
        my = lerp(cy, nd.y, g);
      return React.createElement("line", {
        key: "cm" + nd.m.id,
        x1: cx,
        y1: cy,
        x2: mx,
        y2: my,
        stroke: "rgba(58,47,34,.5)",
        strokeWidth: 0.5 * k,
        style: {
          opacity: g
        }
      });
    }), branch.nodes.map(function (nd, i) {
      var g = mProg(i),
        mx = lerp(cx, nd.x, g),
        my = lerp(cy, nd.y, g),
        wg = Math.max(0, (g - 0.3) / 0.7);
      return nd.wnodes.map(function (wn, j) {
        var wx0 = lerp(mx, wn.x, wg),
          wy0 = lerp(my, wn.y, wg);
        var _fish7 = fish(wx0, wy0),
          _fish8 = _slicedToArray(_fish7, 3),
          fx = _fish8[0],
          fy = _fish8[1],
          fs = _fish8[2];
        return React.createElement("g", {
          key: nd.m.id + "-w" + j,
          className: "cv-wishpin",
          style: {
            opacity: wg
          },
          onClick: function onClick() {
            return go("work", wn.w.id);
          },
          onMouseEnter: function onMouseEnter(e) {
            return setHover({
              w: wn.w,
              mx: e.clientX,
              my: e.clientY,
              venue: nd.m.name,
              city: branch.c.city,
              seen: true
            });
          },
          onMouseMove: function onMouseMove(e) {
            return setHover(function (h) {
              return h && h.w === wn.w ? _objectSpread(_objectSpread({}, h), {}, {
                mx: e.clientX,
                my: e.clientY
              }) : h;
            });
          },
          onMouseLeave: function onMouseLeave() {
            return setHover(null);
          }
        }, React.createElement("line", {
          x1: mx,
          y1: my,
          x2: fx,
          y2: fy,
          stroke: "rgba(58,47,34,.26)",
          strokeWidth: 0.3 * k
        }), React.createElement("circle", {
          cx: fx,
          cy: fy,
          r: (wn.w.floored ? 1.8 : 1.5) * fs * k * dotMul,
          fill: wn.w.floored ? "oklch(0.55 0.19 18 / .92)" : "oklch(0.62 0.12 52 / .9)",
          stroke: "#f7efe2",
          strokeWidth: 0.4 * k
        }));
      });
    }), branch.nodes.map(function (nd, i) {
      var g = mProg(i),
        mx = lerp(cx, nd.x, g),
        my = lerp(cy, nd.y, g);
      var _fish9 = fish(mx, my),
        _fish0 = _slicedToArray(_fish9, 3),
        fx = _fish0[0],
        fy = _fish0[1],
        fs = _fish0[2];
      var lx = fx,
        ly = fy - (nd.mr * fs + 3.6) * k;
      var chW = Math.max(nd.m.name.length * 3.05 + 6, 14) * k,
        chH = 8.4 * k;
      return React.createElement("g", {
        key: "m" + nd.m.id,
        className: "cv-mus",
        style: {
          opacity: g
        },
        onClick: function onClick() {
          return go("museum", nd.m.id);
        }
      }, ly + chH / 2 < fy - nd.mr * fs * k - 0.4 * k && React.createElement("line", {
        x1: fx,
        y1: fy - nd.mr * fs * k,
        x2: fx,
        y2: ly + chH / 2,
        stroke: "rgba(58,47,34,.4)",
        strokeWidth: 0.35 * k
      }), React.createElement("circle", {
        cx: fx,
        cy: fy,
        r: nd.mr * fs * k,
        fill: "oklch(0.5 0.14 46 / .95)",
        stroke: "#f4ecdf",
        strokeWidth: 0.7 * k
      }), React.createElement("rect", {
        className: "cv-map-chip",
        x: lx - chW / 2,
        y: ly - chH / 2,
        width: chW,
        height: chH,
        rx: chH / 2
      }), React.createElement("text", {
        x: lx,
        y: ly + 1.9 * k,
        textAnchor: "middle",
        style: {
          fontSize: 5 * k
        }
      }, nd.m.name));
    }), React.createElement("circle", {
      cx: cx,
      cy: cy,
      r: branch.cityR * 1.55 * k,
      fill: "oklch(0.42 0.15 30 / .96)",
      stroke: "#f4ecdf",
      strokeWidth: 0.9 * k
    }), React.createElement("text", {
      x: cx,
      y: cy + 1.5 * k,
      textAnchor: "middle",
      style: {
        fontSize: 5.6 * k,
        fontWeight: 700,
        fill: "#f4ecdf"
      }
    }, branch.c.city));
  }()), hover && React.createElement("div", {
    className: "cv-map-preview",
    style: {
      left: Math.min(hover.mx + 16, (window.innerWidth || 1200) - 210),
      top: Math.min(hover.my + 16, (window.innerHeight || 800) - 160)
    }
  }, hover.w.imgGrid && React.createElement("img", {
    src: hover.w.imgGrid,
    alt: ""
  }), React.createElement("div", {
    className: "cv-map-preview-t"
  }, hover.w.title), React.createElement("div", {
    className: "cv-map-preview-s"
  }, hover.w.artist.replace(/\s*\(.*\)$/, ""), hover.w.year ? " · " + hover.w.year : ""), hover.venue && React.createElement("div", {
    className: "cv-map-preview-s"
  }, hover.seen ? "seen at " : "to see at ", hover.venue, ", ", hover.city)), (focus || vb.w < 880) && React.createElement("button", {
    className: "cv-map-reset",
    onClick: clearFocus
  }, focus ? "← all cities" : "reset view")), React.createElement("div", {
    className: "cv-map-legend"
  }, React.createElement("span", null, React.createElement("i", {
    className: "lg-seen"
  }), " museums you've walked"), React.createElement("span", null, React.createElement("i", {
    className: "lg-wish"
  }), " works you're chasing")), React.createElement("div", {
    className: "cv-trips"
  }, trips.map(function (_ref37) {
    var _ref38 = _slicedToArray(_ref37, 2),
      y = _ref38[0],
      cities = _ref38[1];
    return React.createElement("div", {
      className: "cv-trip-row",
      key: y
    }, React.createElement("span", {
      className: "cv-trip-year"
    }, y), React.createElement("span", {
      className: "cv-trip-cities"
    }, cities.join(" · ")));
  })), wishList.length > 0 && React.createElement("div", {
    className: "cv-map-tosee"
  }, React.createElement("div", {
    className: "cv-a-secl"
  }, "To see \u2014 the pilgrimage"), wishList.map(function (_ref39) {
    var _ref40 = _slicedToArray(_ref39, 2),
      key = _ref40[0],
      list = _ref40[1];
    return React.createElement(React.Fragment, {
      key: key
    }, React.createElement("div", {
      className: "cv-mus-country"
    }, key, " ", React.createElement("span", {
      style: {
        opacity: .55,
        fontWeight: 400
      }
    }, "\xB7 ", list.length)), list.map(function (w) {
      return React.createElement("div", {
        className: "cv-mus-row",
        key: w.id,
        style: {
          cursor: "pointer"
        },
        onClick: function onClick() {
          return go("work", w.id);
        }
      }, w.imgGrid && React.createElement("img", {
        className: "cv-pil-thumb",
        src: w.imgGrid,
        alt: "",
        loading: "lazy"
      }), React.createElement("span", {
        className: "cv-mus-name"
      }, w.floored || w.liked && w.wish ? "♥ " : "♡ ", w.title), React.createElement("span", {
        className: "cv-mus-city"
      }, w.artist.replace(/\s*\(.*\)$/, ""), w.year ? " · " + w.year : ""));
    }));
  }), (window.CANVAS_PILGRIMAGE || []).length > 0 && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "cv-mus-country"
  }, "Places"), (window.CANVAS_PILGRIMAGE || []).map(function (p) {
    return React.createElement("div", {
      className: "cv-mus-row",
      key: p.id
    }, React.createElement("span", {
      className: "cv-mus-name"
    }, p.title), React.createElement("span", {
      className: "cv-mus-city"
    }, p.city), p.note && React.createElement("span", {
      className: "cv-mus-note"
    }, p.note));
  }))));
}
var hexHue = function hexHue(hex) {
  var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return 0;
  var r = parseInt(m[1], 16) / 255,
    g = parseInt(m[2], 16) / 255,
    b = parseInt(m[3], 16) / 255;
  var mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    d = mx - mn;
  if (!d) return -1;
  var h;
  if (mx === r) h = (g - b) / d % 6;else if (mx === g) h = (b - r) / d + 2;else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
var AFFINITY = new Set(window.CANVAS_AFFINITY || []);
function Portrait(_ref41) {
  var go = _ref41.go;
  var PAL = window.CANVAS_PALETTE || {};
  var data = useMemo(function () {
    var works = WORKS.map(enrich);
    var loved = works.filter(function (w) {
      return w.floored || w.favorite || w.liked;
    });
    var museums = new Set(),
      countries = new Set();
    var _iterator37 = _createForOfIteratorHelper(works),
      _step37;
    try {
      for (_iterator37.s(); !(_step37 = _iterator37.n()).done;) {
        var w = _step37.value;
        var _iterator42 = _createForOfIteratorHelper(Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at]),
          _step42;
        try {
          for (_iterator42.s(); !(_step42 = _iterator42.n()).done;) {
            var id = _step42.value;
            var m = MUS_BY_ID[id];
            if (m) {
              museums.add(m.id);
              countries.add(m.country);
            }
          }
        } catch (err) {
          _iterator42.e(err);
        } finally {
          _iterator42.f();
        }
      }
    } catch (err) {
      _iterator37.e(err);
    } finally {
      _iterator37.f();
    }
    var byArtist = {};
    var _iterator38 = _createForOfIteratorHelper(works),
      _step38;
    try {
      for (_iterator38.s(); !(_step38 = _iterator38.n()).done;) {
        var _w2 = _step38.value;
        if (!_w2.artistId) continue;
        var r = byArtist[_w2.artistId] = byArtist[_w2.artistId] || {
          id: _w2.artistId,
          name: _w2.artist.replace(/\s*\(.*\)$/, ""),
          n: 0,
          love: 0
        };
        r.n++;
        if (_w2.floored || _w2.favorite) r.love += 3;
        if (_w2.liked) r.love += 1;
      }
    } catch (err) {
      _iterator38.e(err);
    } finally {
      _iterator38.f();
    }
    var artists = Object.values(byArtist).sort(function (a, b) {
      return b.love - a.love || b.n - a.n;
    });
    var found = artists.filter(function (a) {
      return !AFFINITY.has(a.id) && a.love >= 4;
    }).slice(0, 8);
    var movCount = {};
    var _iterator39 = _createForOfIteratorHelper(loved),
      _step39;
    try {
      for (_iterator39.s(); !(_step39 = _iterator39.n()).done;) {
        var _w3 = _step39.value;
        var _iterator43 = _createForOfIteratorHelper(movsOf(_w3)),
          _step43;
        try {
          for (_iterator43.s(); !(_step43 = _iterator43.n()).done;) {
            var _m2 = _step43.value;
            movCount[_m2] = (movCount[_m2] || 0) + 1;
          }
        } catch (err) {
          _iterator43.e(err);
        } finally {
          _iterator43.f();
        }
      }
    } catch (err) {
      _iterator39.e(err);
    } finally {
      _iterator39.f();
    }
    var movements = Object.entries(movCount).sort(function (a, b) {
      return b[1] - a[1];
    }).slice(0, 8);
    var cent = {};
    var _iterator40 = _createForOfIteratorHelper(works),
      _step40;
    try {
      for (_iterator40.s(); !(_step40 = _iterator40.n()).done;) {
        var _w4 = _step40.value;
        if (!_w4.year) continue;
        var c = Math.floor((_w4.year - 1) / 100) + 1;
        cent[c] = (cent[c] || 0) + 1;
      }
    } catch (err) {
      _iterator40.e(err);
    } finally {
      _iterator40.f();
    }
    var centuries = Object.entries(cent).map(function (_ref42) {
      var _ref43 = _slicedToArray(_ref42, 2),
        c = _ref43[0],
        n = _ref43[1];
      return {
        c: +c,
        n: n
      };
    }).sort(function (a, b) {
      return a.c - b.c;
    });
    var swatches = [];
    var _iterator41 = _createForOfIteratorHelper(works),
      _step41;
    try {
      for (_iterator41.s(); !(_step41 = _iterator41.n()).done;) {
        var _w5 = _step41.value;
        var p = PAL[_w5.qid ? _w5.id : _w5.id];
        if (p && p[0]) swatches.push(p[0]);
      }
    } catch (err) {
      _iterator41.e(err);
    } finally {
      _iterator41.f();
    }
    swatches.sort(function (a, b) {
      return hexHue(a) - hexHue(b);
    });
    return {
      total: works.length,
      loved: loved.length,
      floored: works.filter(function (w) {
        return w.floored || w.favorite;
      }).length,
      museums: museums.size,
      countries: countries.size,
      artists: artists,
      found: found,
      movements: movements,
      centuries: centuries,
      swatches: swatches,
      topMovement: movements[0],
      favArtist: artists[0]
    };
  }, []);
  var cy = function cy(c) {
    return c >= 1 ? c + (["th", "st", "nd", "rd"][c % 100 - c % 10 !== 10 && c % 10 < 4 ? c % 10 : 0] || "th") : "";
  };
  var maxCent = Math.max.apply(Math, _toConsumableArray(data.centuries.map(function (c) {
    return c.n;
  })).concat([1]));
  var maxMov = data.movements.length ? data.movements[0][1] : 1;
  return React.createElement("div", {
    className: "cv-portrait"
  }, React.createElement("p", {
    className: "cv-p-read"
  }, "You've stood in front of ", React.createElement("b", null, data.total), " works across ", React.createElement("b", null, data.museums), " museums in ", React.createElement("b", null, data.countries), " countries \u2014", " ", React.createElement("b", null, data.loved), " of them moved you, ", React.createElement("b", null, data.floored), " stopped you cold.", data.favArtist && React.createElement(React.Fragment, null, " The artist you return to most is ", React.createElement("b", {
    onClick: function onClick() {
      return go("artist", data.favArtist.id);
    },
    style: {
      cursor: "pointer",
      color: "var(--accent)"
    }
  }, data.favArtist.name), "."), data.topMovement && React.createElement(React.Fragment, null, " Your eye lives in ", React.createElement("b", {
    onClick: function onClick() {
      return go("wall", movSlug(data.topMovement[0]));
    },
    style: {
      cursor: "pointer",
      color: "var(--accent)"
    }
  }, data.topMovement[0]), " \u2014 it accounts for more of what you love than any other movement, by far.")), React.createElement("div", {
    className: "cv-p-sec"
  }, React.createElement("div", {
    className: "cv-p-lbl"
  }, "The palette of your taste"), React.createElement("div", {
    className: "cv-p-spectrum"
  }, data.swatches.map(function (c, i) {
    return React.createElement("i", {
      key: i,
      style: {
        background: c
      }
    });
  })), React.createElement("div", {
    className: "cv-p-note"
  }, "every work's dominant colour, ", data.swatches.length, " of them, sorted across the spectrum")), React.createElement("div", {
    className: "cv-p-cols"
  }, React.createElement("div", {
    className: "cv-p-sec"
  }, React.createElement("div", {
    className: "cv-p-lbl"
  }, "Where your love lives \u2014 movements"), data.movements.map(function (_ref44) {
    var _ref45 = _slicedToArray(_ref44, 2),
      m = _ref45[0],
      n = _ref45[1];
    return React.createElement("div", {
      className: "cv-p-bar cv-p-barlink",
      key: m,
      onClick: function onClick() {
        return go("wall", movSlug(m));
      },
      title: "see every work on the wall by artists working in ".concat(m)
    }, React.createElement("span", {
      className: "cv-p-barlbl"
    }, m), React.createElement("span", {
      className: "cv-p-bartrack"
    }, React.createElement("i", {
      style: {
        width: n / maxMov * 100 + "%"
      }
    })), React.createElement("span", {
      className: "cv-p-barn"
    }, n));
  })), React.createElement("div", {
    className: "cv-p-sec"
  }, React.createElement("div", {
    className: "cv-p-lbl"
  }, "Across the centuries"), React.createElement("div", {
    className: "cv-p-cent"
  }, data.centuries.map(function (_ref46) {
    var c = _ref46.c,
      n = _ref46.n;
    return React.createElement("div", {
      className: "cv-p-centcol",
      key: c,
      title: "".concat(cy(c), " century \u2014 ").concat(n, " works")
    }, React.createElement("span", {
      className: "cv-p-centbar",
      style: {
        height: n / maxCent * 100 + "%"
      }
    }), React.createElement("span", {
      className: "cv-p-centlbl"
    }, c, "00s"));
  })))), data.found.length > 0 && React.createElement("div", {
    className: "cv-p-sec"
  }, React.createElement("div", {
    className: "cv-p-lbl"
  }, "Who your eye chose"), React.createElement("div", {
    className: "cv-p-note",
    style: {
      marginTop: 0,
      marginBottom: 12
    }
  }, "your most-loved artists beyond the handful you walked in naming \u2014 ranked by how hard they hit"), React.createElement("div", {
    className: "cv-p-found"
  }, data.found.map(function (a) {
    return React.createElement("div", {
      className: "cv-p-foundchip",
      key: a.id,
      onClick: function onClick() {
        return go("artist", a.id);
      }
    }, AD.artists[a.id] && AD.artists[a.id].image && React.createElement("img", {
      src: AD.artists[a.id].image,
      alt: ""
    }), React.createElement("div", null, React.createElement("b", null, a.name), React.createElement("span", null, a.n, " work", a.n > 1 ? "s" : "", " \xB7 ", a.love, " pts")));
  }))));
}
var HOME_LEAD_IDS = ["monet-woman-with-a-parasol", "podkowinski-szal-uniesien"];
var HOME_LEECH_IDS = ["leech-the-sunshade", "leech-convent-garden"];
var homeDaySeed = function homeDaySeed() {
  var d = new Date();
  return d.getFullYear() * 1000 + Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
};
var mulberry32 = function mulberry32(a) {
  return function () {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};
var seededShuffle = function seededShuffle(arr, rnd) {
  var a = _toConsumableArray(arr);
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(rnd() * (i + 1));
    var _ref47 = [a[j], a[i]];
    a[i] = _ref47[0];
    a[j] = _ref47[1];
  }
  return a;
};
var IMPRESSIONIST_RE = /impressionis/i;
var HOME_SPREAD_CAP = 24;
function HomeView(_ref48) {
  var go = _ref48.go;
  var all = useMemo(function () {
    return WORKS.map(enrich);
  }, []);
  var wall = useMemo(function () {
    var placed = new Set();
    var movLabel = function movLabel(w) {
      var a = AD.artists[w.artistId];
      var q = a && a.movementQids && a.movementQids[0];
      return q && (AD.movements || {})[q] || null;
    };
    var byId = {};
    var _iterator44 = _createForOfIteratorHelper(all),
      _step44;
    try {
      for (_iterator44.s(); !(_step44 = _iterator44.n()).done;) {
        var _w6 = _step44.value;
        byId[_w6.id] = _w6;
      }
    } catch (err) {
      _iterator44.e(err);
    } finally {
      _iterator44.f();
    }
    var leadExplicit = HOME_LEAD_IDS.map(function (id) {
      return byId[id];
    }).filter(Boolean);
    var _iterator45 = _createForOfIteratorHelper(leadExplicit),
      _step45;
    try {
      for (_iterator45.s(); !(_step45 = _iterator45.n()).done;) {
        var _w7 = _step45.value;
        placed.add(_w7.id);
      }
    } catch (err) {
      _iterator45.e(err);
    } finally {
      _iterator45.f();
    }
    var impPool = all.filter(function (w) {
      return !placed.has(w.id) && (w.floored || w.favorite || w.liked) && (w.imgGrid || w.img) && IMPRESSIONIST_RE.test(movLabel(w));
    });
    impPool.sort(function (a, b) {
      return weight(a) - weight(b) || (a.year || 9999) - (b.year || 9999);
    });
    var impByArtist = {};
    var _iterator46 = _createForOfIteratorHelper(impPool),
      _step46;
    try {
      for (_iterator46.s(); !(_step46 = _iterator46.n()).done;) {
        var _w8 = _step46.value;
        var _key2 = _w8.artistId || _w8.id;
        if (!impByArtist[_key2]) impByArtist[_key2] = _w8;
      }
    } catch (err) {
      _iterator46.e(err);
    } finally {
      _iterator46.f();
    }
    var impRnd = mulberry32(homeDaySeed());
    var impLeads = seededShuffle(Object.values(impByArtist), impRnd).slice(0, 5);
    var _iterator47 = _createForOfIteratorHelper(impLeads),
      _step47;
    try {
      for (_iterator47.s(); !(_step47 = _iterator47.n()).done;) {
        var _w9 = _step47.value;
        placed.add(_w9.id);
      }
    } catch (err) {
      _iterator47.e(err);
    } finally {
      _iterator47.f();
    }
    var leechWorks = HOME_LEECH_IDS.map(function (id) {
      return byId[id];
    }).filter(function (w) {
      return w && (w.imgGrid || w.img);
    });
    var _iterator48 = _createForOfIteratorHelper(leechWorks),
      _step48;
    try {
      for (_iterator48.s(); !(_step48 = _iterator48.n()).done;) {
        var _w0 = _step48.value;
        placed.add(_w0.id);
      }
    } catch (err) {
      _iterator48.e(err);
    } finally {
      _iterator48.f();
    }
    var lead = [].concat(_toConsumableArray(leadExplicit), _toConsumableArray(impLeads.slice(0, 3)), _toConsumableArray(leechWorks), _toConsumableArray(impLeads.slice(3)));
    var pool = all.filter(function (w) {
      return !placed.has(w.id) && (w.floored || w.favorite || w.liked) && (w.imgGrid || w.img);
    });
    var byArtist = {};
    var _iterator49 = _createForOfIteratorHelper(pool),
      _step49;
    try {
      for (_iterator49.s(); !(_step49 = _iterator49.n()).done;) {
        var _w1 = _step49.value;
        var _key3 = _w1.artistId || _w1.id;
        (byArtist[_key3] = byArtist[_key3] || []).push(_w1);
      }
    } catch (err) {
      _iterator49.e(err);
    } finally {
      _iterator49.f();
    }
    for (var _i5 = 0, _Object$keys2 = Object.keys(byArtist); _i5 < _Object$keys2.length; _i5++) {
      var key = _Object$keys2[_i5];
      byArtist[key].sort(function (a, b) {
        return weight(a) - weight(b);
      });
    }
    var seed = homeDaySeed();
    var rnd = mulberry32(seed);
    var artistKeys = seededShuffle(Object.keys(byArtist).sort(), rnd);
    var picks = [];
    var round = 0;
    outer: while (picks.length < HOME_SPREAD_CAP) {
      var any = false;
      var _iterator50 = _createForOfIteratorHelper(artistKeys),
        _step50;
      try {
        for (_iterator50.s(); !(_step50 = _iterator50.n()).done;) {
          var _key = _step50.value;
          var bucket = byArtist[_key];
          if (round >= bucket.length) continue;
          var w = bucket[(seed + round) % bucket.length];
          if (!w || picks.includes(w)) continue;
          picks.push(w);
          any = true;
          if (picks.length >= HOME_SPREAD_CAP) break outer;
        }
      } catch (err) {
        _iterator50.e(err);
      } finally {
        _iterator50.f();
      }
      if (!any) break;
      round++;
    }
    return [].concat(_toConsumableArray(lead), picks);
  }, [all]);
  var artistCount = useMemo(function () {
    return new Set(wall.map(function (w) {
      return w.artistId || w.id;
    })).size;
  }, [wall]);
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "cv-home-intro"
  }, React.createElement("p", null, "Works I've stood in front of \u2014 a selection across ", artistCount, " artists. ", React.createElement("a", {
    href: "#/wall"
  }, "See the full wall \u2192"))), React.createElement("div", {
    className: "cv-wall"
  }, wall.map(function (w) {
    return React.createElement(Card, {
      key: w.id,
      w: w,
      go: go
    });
  })));
}
var fold = function fold(s) {
  return (s || "").normalize("NFD").replace(/(?:[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u0897-\u089F\u08CA-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B55-\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3C\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0CF3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D81-\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EBC\u0EC8-\u0ECE\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1715\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u180F\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ADD\u1AE0-\u1AEB\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA82C\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]|\uD800[\uDDFD\uDEE0\uDF76-\uDF7A]|\uD802[\uDE01-\uDE03\uDE05\uDE06\uDE0C-\uDE0F\uDE38-\uDE3A\uDE3F\uDEE5\uDEE6]|\uD803[\uDD24-\uDD27\uDD69-\uDD6D\uDEAB\uDEAC\uDEFA-\uDEFF\uDF46-\uDF50\uDF82-\uDF85]|\uD804[\uDC00-\uDC02\uDC38-\uDC46\uDC70\uDC73\uDC74\uDC7F-\uDC82\uDCB0-\uDCBA\uDCC2\uDD00-\uDD02\uDD27-\uDD34\uDD45\uDD46\uDD73\uDD80-\uDD82\uDDB3-\uDDC0\uDDC9-\uDDCC\uDDCE\uDDCF\uDE2C-\uDE37\uDE3E\uDE41\uDEDF-\uDEEA\uDF00-\uDF03\uDF3B\uDF3C\uDF3E-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF57\uDF62\uDF63\uDF66-\uDF6C\uDF70-\uDF74\uDFB8-\uDFC0\uDFC2\uDFC5\uDFC7-\uDFCA\uDFCC-\uDFD0\uDFD2\uDFE1\uDFE2]|\uD805[\uDC35-\uDC46\uDC5E\uDCB0-\uDCC3\uDDAF-\uDDB5\uDDB8-\uDDC0\uDDDC\uDDDD\uDE30-\uDE40\uDEAB-\uDEB7\uDF1D-\uDF2B]|\uD806[\uDC2C-\uDC3A\uDD30-\uDD35\uDD37\uDD38\uDD3B-\uDD3E\uDD40\uDD42\uDD43\uDDD1-\uDDD7\uDDDA-\uDDE0\uDDE4\uDE01-\uDE0A\uDE33-\uDE39\uDE3B-\uDE3E\uDE47\uDE51-\uDE5B\uDE8A-\uDE99\uDF60-\uDF67]|\uD807[\uDC2F-\uDC36\uDC38-\uDC3F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD31-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD45\uDD47\uDD8A-\uDD8E\uDD90\uDD91\uDD93-\uDD97\uDEF3-\uDEF6\uDF00\uDF01\uDF03\uDF34-\uDF3A\uDF3E-\uDF42\uDF5A]|\uD80D[\uDC40\uDC47-\uDC55]|\uD818[\uDD1E-\uDD2F]|\uD81A[\uDEF0-\uDEF4\uDF30-\uDF36]|\uD81B[\uDF4F\uDF51-\uDF87\uDF8F-\uDF92\uDFE4\uDFF0\uDFF1]|\uD82F[\uDC9D\uDC9E]|\uD833[\uDF00-\uDF2D\uDF30-\uDF46]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A\uDC8F\uDD30-\uDD36\uDEAE\uDEEC-\uDEEF]|\uD839[\uDCEC-\uDCEF\uDDEE\uDDEF\uDEE3\uDEE6\uDEEE\uDEEF\uDEF5]|\uD83A[\uDCD0-\uDCD6\uDD44-\uDD4A]|\uDB40[\uDD00-\uDDEF])/g, "").toLowerCase();
};
var SEARCH_INDEX = function () {
  var enriched = WORKS.map(enrich);
  return enriched.map(function (w) {
    var musNames = w.venues.map(function (v) {
      return v.name.replace(/\s*\(.*\)$/, "");
    }).join(" ");
    return {
      id: w.id,
      title: w.title.replace(/^TBC — /, ""),
      artist: w.artist.replace(/\s*\(.*\)$/, ""),
      musNames: musNames,
      musIds: w.venues.map(function (v) {
        return v.id;
      }),
      imgGrid: w.imgGrid || null,
      hay: fold(w.title + " " + w.artist + " " + musNames)
    };
  });
}();
var ARTIST_SEARCH_INDEX = function () {
  var by = {};
  var _iterator51 = _createForOfIteratorHelper(WORKS),
    _step51;
  try {
    for (_iterator51.s(); !(_step51 = _iterator51.n()).done;) {
      var w = _step51.value;
      if (!w.artistId) continue;
      var r = by[w.artistId] = by[w.artistId] || {
        id: w.artistId,
        name: (w.artist || "").replace(/\s*\(.*\)$/, ""),
        n: 0
      };
      r.n++;
    }
  } catch (err) {
    _iterator51.e(err);
  } finally {
    _iterator51.f();
  }
  return Object.values(by).map(function (r) {
    var a = AD.artists[r.id] || {};
    var name = a.label || r.name;
    return {
      kind: "artist",
      id: r.id,
      title: name,
      artist: "".concat(r.n, " ").concat(r.n === 1 ? "work" : "works", " in the canon").concat(a.desc ? " · " + a.desc : ""),
      imgGrid: a.image ? a.image.replace(/width=\d+/, "width=160") : null,
      hay: fold(name)
    };
  });
}();
function SearchBar(_ref49) {
  var go = _ref49.go;
  var _useState75 = useState(false),
    _useState76 = _slicedToArray(_useState75, 2),
    open = _useState76[0],
    setOpen = _useState76[1];
  var _useState77 = useState(""),
    _useState78 = _slicedToArray(_useState77, 2),
    q = _useState78[0],
    setQ = _useState78[1];
  var _useState79 = useState(0),
    _useState80 = _slicedToArray(_useState79, 2),
    sel = _useState80[0],
    setSel = _useState80[1];
  var inputRef = useRef(null);
  var wrapRef = useRef(null);
  var results = useMemo(function () {
    var needle = fold(q);
    if (!needle || needle.length < 1) return [];
    var hits = [];
    var musHits = new Map();
    var _iterator52 = _createForOfIteratorHelper(SEARCH_INDEX),
      _step52;
    try {
      for (_iterator52.s(); !(_step52 = _iterator52.n()).done;) {
        var it = _step52.value;
        if (!it.hay.includes(needle)) continue;
        var inTitle = fold(it.title).includes(needle) || fold(it.artist).includes(needle);
        var inMus = fold(it.musNames).includes(needle);
        if (inTitle || inMus) {
          hits.push(_objectSpread({
            kind: "work"
          }, it));
          if (inMus && !inTitle) {
            for (var i = 0; i < it.musIds.length; i++) {
              var mid = it.musIds[i];
              if (!musHits.has(mid)) musHits.set(mid, true);
            }
          }
        }
        if (hits.length >= 20) break;
      }
    } catch (err) {
      _iterator52.e(err);
    } finally {
      _iterator52.f();
    }
    var musResults = [];
    var _iterator53 = _createForOfIteratorHelper(musHits),
      _step53;
    try {
      for (_iterator53.s(); !(_step53 = _iterator53.n()).done;) {
        var _step53$value = _slicedToArray(_step53.value, 1),
          _mid2 = _step53$value[0];
        var mn = MUS_BY_ID[_mid2];
        if (mn && fold(mn.name).includes(needle)) {
          musResults.push({
            kind: "museum",
            id: _mid2,
            title: mn.name.replace(/\s*\(.*\)$/, ""),
            artist: mn.city,
            imgGrid: null
          });
        }
      }
    } catch (err) {
      _iterator53.e(err);
    } finally {
      _iterator53.f();
    }
    var artistResults = ARTIST_SEARCH_INDEX.filter(function (a) {
      return a.hay.includes(needle);
    }).slice(0, 3);
    return [].concat(_toConsumableArray(artistResults), musResults, hits).slice(0, 12);
  }, [q]);
  useEffect(function () {
    setSel(0);
  }, [results]);
  useEffect(function () {
    if (!open) return;
    var handler = function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQ("");
      }
    };
    document.addEventListener("mousedown", handler);
    return function () {
      return document.removeEventListener("mousedown", handler);
    };
  }, [open]);
  var openResult = function openResult(r) {
    if (r.kind === "museum") {
      go("museum", r.id);
    } else if (r.kind === "artist") {
      go("artist", r.id);
    } else {
      go("work", r.id);
    }
    setOpen(false);
    setQ("");
  };
  var onKeyDown = function onKeyDown(e) {
    if (e.key === "Escape") {
      setOpen(false);
      setQ("");
      return;
    }
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel(function (s) {
        return Math.min(s + 1, results.length - 1);
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel(function (s) {
        return Math.max(s - 1, 0);
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[sel]) openResult(results[sel]);
    }
  };
  var expand = function expand() {
    setOpen(true);
    setTimeout(function () {
      return inputRef.current && inputRef.current.focus();
    }, 0);
  };
  useEffect(function () {
    var onKey = function onKey(e) {
      var el = e.target;
      var typing = el && (/(input|textarea|select)/i.test(el.tagName || "") || el.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" || e.key === "/" && !typing) {
        e.preventDefault();
        expand();
      }
    };
    window.addEventListener("keydown", onKey);
    return function () {
      return window.removeEventListener("keydown", onKey);
    };
  }, []);
  return React.createElement("div", {
    className: "cv-search",
    ref: wrapRef
  }, !open ? React.createElement("button", {
    className: "cv-search-icon",
    onClick: expand,
    "aria-label": "Search artworks"
  }, "\uD83D\uDD0D") : React.createElement("div", {
    className: "cv-search-box"
  }, React.createElement("input", {
    ref: inputRef,
    className: "cv-search-input",
    type: "search",
    placeholder: "title, artist, museum\u2026",
    value: q,
    onChange: function onChange(e) {
      return setQ(e.target.value);
    },
    onKeyDown: onKeyDown,
    autoComplete: "off",
    autoCorrect: "off",
    spellCheck: "false"
  }), q && React.createElement("button", {
    className: "cv-search-dismiss",
    onClick: function onClick() {
      setQ("");
      inputRef.current && inputRef.current.focus();
    },
    "aria-label": "Clear"
  }, "\u2715")), open && results.length > 0 && React.createElement("div", {
    className: "cv-search-drop"
  }, results.map(function (r, i) {
    return React.createElement("div", {
      key: r.kind + r.id,
      className: "cv-search-hit" + (i === sel ? " cv-search-hit-sel" : ""),
      onMouseEnter: function onMouseEnter() {
        return setSel(i);
      },
      onMouseDown: function onMouseDown(e) {
        e.preventDefault();
        openResult(r);
      }
    }, r.imgGrid ? React.createElement("img", {
      className: "cv-search-thumb",
      src: r.imgGrid,
      alt: ""
    }) : React.createElement("span", {
      className: "cv-search-thumb cv-search-thumb-empty"
    }), React.createElement("span", {
      className: "cv-search-hit-text"
    }, React.createElement("span", {
      className: "cv-search-hit-title"
    }, r.title), React.createElement("span", {
      className: "cv-search-hit-sub"
    }, r.kind === "museum" ? "Museum · " : r.kind === "artist" ? "Artist · " : "", r.artist)));
  })));
}
function App() {
  var route = useRoute();
  var _useState81 = useState("collage"),
    _useState82 = _slicedToArray(_useState81, 2),
    mode = _useState82[0],
    setMode = _useState82[1];
  var go = function go(view, id) {
    location.hash = id ? "/" + view + "/" + id : view === "home" ? "/" : "/" + view;
  };
  var isHome = route.view === "wall" && !route.id && (location.hash === "#/" || location.hash === "#" || location.hash === "");
  var view = route.view === "work" ? "work" : isHome ? "home" : route.view;
  return React.createElement(React.Fragment, null, React.createElement("header", {
    className: "cv-head"
  }, React.createElement("a", {
    className: "cv-brand",
    href: "#/"
  }, "Canvas", React.createElement("i", null, ".")), React.createElement("nav", {
    className: "cv-nav"
  }, React.createElement("a", {
    href: "#/",
    "data-on": view === "home"
  }, "Home"), React.createElement("a", {
    href: "#/wall",
    "data-on": view === "wall"
  }, "The Wall"), React.createElement("a", {
    href: "#/portrait",
    "data-on": view === "portrait"
  }, "Portrait"), React.createElement("a", {
    href: "#/museums",
    "data-on": view === "museums" || route.view === "museum" || route.view === "deck" && route.id !== "by-artists"
  }, "Museums"), React.createElement("a", {
    href: "#/artists",
    "data-on": view === "artists" || route.view === "artist"
  }, "Artists"), React.createElement("a", {
    href: "#/deck/by-artists",
    "data-on": route.view === "deck" && route.id === "by-artists"
  }, "By Your Artists"), React.createElement("a", {
    href: "#/map",
    "data-on": view === "map" || view === "pilgrimage"
  }, "Map")), view === "wall" && React.createElement("div", {
    className: "cv-mode"
  }, [["collage", "Collage"], ["spectrum", "Spectrum"], ["timeline", "Timeline"], ["movements", "Movements"]].map(function (_ref50) {
    var _ref51 = _slicedToArray(_ref50, 2),
      m = _ref51[0],
      lbl = _ref51[1];
    return React.createElement("button", {
      key: m,
      "data-on": mode === m,
      onClick: function onClick() {
        return setMode(m);
      }
    }, lbl);
  })), React.createElement(SearchBar, {
    go: go
  })), route.view === "deck" ? React.createElement(Deck, {
    museumId: route.id,
    part: route.part,
    go: go,
    key: route.id + "-" + route.part
  }) : route.view === "museum" ? React.createElement(MuseumView, {
    museumId: route.id,
    go: go,
    key: route.id
  }) : view === "museums" ? React.createElement(Museums, {
    go: go
  }) : view === "portrait" ? React.createElement(Portrait, {
    go: go
  }) : view === "map" || view === "pilgrimage" ? React.createElement(MapView, {
    go: go
  }) : route.view === "artist" ? React.createElement(ArtistView, {
    artistId: route.id,
    go: go,
    key: route.id
  }) : view === "artists" ? React.createElement(Artists, {
    go: go
  }) : view === "wall" ? React.createElement(Wall, {
    go: go,
    mode: mode,
    styleIds: route.id
  }) : React.createElement(HomeView, {
    go: go
  }), route.view === "work" && React.createElement(Reader, {
    id: route.id,
    go: go
  }), route.view === "study" && React.createElement(StudyView, {
    id: route.id,
    go: go,
    key: route.id
  }), React.createElement("footer", {
    className: "cv-foot"
  }, React.createElement("span", {
    className: "cv-foot-main"
  }, "canvas \xB7 a personal gallery, reconstructed from memory \xB7 images via ", React.createElement("a", {
    href: "https://commons.wikimedia.org",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Wikimedia Commons"), " / ", React.createElement("a", {
    href: "https://www.wikidata.org",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Wikidata")), React.createElement("nav", {
    className: "site-switch"
  }, "part of ", React.createElement("a", {
    href: "/"
  }, "fuad.au"), " \xB7 ", React.createElement("a", {
    href: "/rotation/"
  }, "Rotation"), " \xB7 ", React.createElement("a", {
    href: "/canvas/"
  }, "Canvas"), " \xB7 ", React.createElement("a", {
    href: "/culture/"
  }, "Culture"))));
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App, null));