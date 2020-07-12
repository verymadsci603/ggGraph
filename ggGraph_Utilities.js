/**
 * @brief   ggGraph_Utilities
 *
 * @author  Phil Braica  HoshiKata@aol.com
 *
 * @copyright 2020, Philip Braica, MIT License
 *
 */
 
/** 
 * @brief   Check to see if an object is "real".
 *
 * @note    Checks for undefined and null, but also 'none' and ''
 *          to support servers that generate 'none' in JSON
 *          like Python does (against the standard).
 *
 * @param   obj     Object to check.
 * 
 * @return  Checks against undefined, null and 'none'.
 */
function objectExists(obj) {
    return !((obj === undefined) || (obj === null) || (obj === 'none') || (obj === ''));        
}

/** 
 * @brief   Check to see if an object is not "real".
 *
 * @note    Checks for undefined and null, but also 'none'
 *          to support servers that generate 'none' in JSON
 *          like Python does (against the standard).
 *
 * @param   obj     Object to check.
 * 
 * @return  Checks against undefined, null and 'none'.
 */
function objectNotExist(obj) {
    return ((obj === undefined) || (obj === null) || (obj === 'none'));        
}

/** 
 * @brief   If Obj is real return it, else return default.
 *
 * @note    Checks for undefined and null, but also 'none'
 *          to support servers that generate 'none' in JSON
 *          like Python does (against the standard).
 *
 * @param   obj             Object to check.
 * @param   defaultValue    The default to use.
 * 
 * @return  Either obj, or defaultValue.
 */
function defaultObject(obj, defaultValue) {
    return ((obj === undefined) || (obj === null) || (obj === 'none')) ?
        defaultValue : obj;    
}

/** 
 * @brief   Bound value to within min, max.
 * 
 * @param   value   Value to bound.
 * @param   min     Minimum value.
 * @param   max     Maximum value.
 *
 * @return  A value between the bounds.
 */
function minMax(value, min, max) {
    value = value > min ? value : min;
    return value < max ? value : max;
}

/**
 * @brief   Is x,y inside the box?
 *
 * @param   x   X coordinate.
 * @param   y   Y coordinate.
 * @param   box Structure of {x: y: w: h: }
 *
 * @return  True if inside.
 */
function inBox(x, y, box) {
    if ((box === undefined) || (box === null)) { 
        return false;
    }
    
    return ((x > box.x) && (x < box.x + box.w) &&
            (y > box.y) && (y < box.y + box.h));       
}
                        
/**
 * @brief   Turn 'solid', 'dash' or 'dashdot', etc. or array for canvas.setLineDash
 * 
 * @param   dashOption
 *
 * @return  Array. 
 */
function toCanvasDash(dashOption) {
    dashOption = objectExists(dashOption) ? dashOption : 'solid';
    if (dashOption === 'solid') return [];
    if (dashOption === 'dash') return [8, 8];
    if (dashOption === 'dot') return [2, 8];
    if (dashOption === 'dashdot') return [8, 8, 2, 8];
    if (dashOption === 'dashdotdot') return [8, 8, 2, 8, 2, 8];
    if (dashOption === 'dashdashdot') return [8, 8, 8, 8, 2, 8];
    if (dashOption === 'dashdashdotdot') return [8, 8, 8, 8, 2, 8, 2, 8];
    return dashOption;
}

/**
 * @brief   Deep copy an object.
 *
 * @param   x   Object to deep copy.
 * 
 * @return  Deep copied object.
 */
function deepCopy(x){
    if (x === null) return null;
    if (x === undefined) return undefined;
    return JSON.parse(JSON.stringify(x));
}

/**
 * @brief   Polyfill, for internet explorer, ugh.
 */
Math.log10 = Math.log10 || function(x) {
  return Math.log(x) / Math.LN10;
};

/**
 * @brief   Draw centered text.
 * 
 * @param   ctx         Context2D
 * @param   color       Text fill color.
 * @param   fontName    Font name.
 * @param   textSizePx  Font size in pixels.
 * @param   layout      a .x, .y, .w, .h object.
 * @param   textStr     The text string.
 */
function drawCenteredText(ctx, color, fontName, textSizePx, layout, textStr) {
    if (!objectExists(layout)) {
        return;
    }
    if ((textStr === undefined) || (textStr === null)) {
        return;
    }
    textStr = textStr.trim();
    let tw = ctx.measureText(textStr).width;
    ctx.fillStyle = color;
    ctx.font = "" + textSizePx + "px " + fontName;
    ctx.fillText(
        textStr, 
        layout.x + (layout.w - tw) / 2, 
        layout.y + (layout.h + textSizePx) / 2 - 1);  
}  

/**
 * @brief   Draw centered width but floor height text.
 * 
 * @param   ctx         Context2D
 * @param   color       Text fill color.
 * @param   fontName    Font name.
 * @param   textSizePx  Font size in pixels.
 * @param   layout      a .x, .y, .w, .h object.
 * @param   textStr     The text string.
 */
function drawCenteredFloorText(ctx, color, fontName, textSizePx, layout, textStr) {
    if (!objectExists(layout)) {
        return;
    }
    if ((textStr === undefined) || (textStr === null)) {
        return;
    }
    textStr = textStr.trim();
    let tw = ctx.measureText(textStr).width;
    ctx.fillStyle = color;
    ctx.font = "" + textSizePx + "px " + fontName;
    ctx.fillText(
        textStr, 
        layout.x + (layout.w - tw) / 2, 
        layout.y + 1 + layout.h - (textSizePx / 2));  
}    

/**
 * @brief   Is this a DOM object?
 *
 * @param   obj     Object like thing to check.
 *
 * @return  True if part of DOM.
 */
function isNode(obj) {
    if (typeof Node === "object") {
        return (obj instanceof Node);
    } 
    return 
        (obj) && 
        (typeof obj === "object") && 
        (typeof obj.nodeType === "number") && 
        (typeof obj.nodeName === "string");
}

/**
 * @brief   Is this an HTML element?
 *
 * @param   obj     Object like thing to check.
 *
 * @return  True if an HTML element.
 */  
function isElement(obj) {
    if (typeof HTMLElement === "object") {
        return (obj instanceof HTMLElement); // DOM2.
    } 
    return 
        (obj) && 
        (typeof obj === "object") && 
        (obj !== null) &&
        (obj !== undefined) &&
        (typeof obj.nodeType === 1) && 
        (typeof obj.nodeName === "string");
}

/** 
 * @brief   Turn a value to a color.
 *
 * @param   val     Value to turn into HTML color, 0 to 1 float.
 *
 * @return  HTML color string such as '#000000'.
 */
function valueToColor(val) {
    const interp = [ 
        255,   0,   0,  // red
        255, 165,   0,  // orange
        255, 255,   0,  // yellow
        0,   255,   0,  // green
        0,    80,  80,  // teal
        0,     0, 255,  // blue
        75,    0, 130,  // indigo
        238, 130, 238]; // violet
    const interp_len = (interp.length/3) - 1;
    let l = Math.floor(val * interp_len);
    let f = (val * interp_len) - l;
    let h = l < interp_len ? l + 1 : interp_len;
    let f1 = 1 - f;
    l = l * 3;
    h = h * 3;
    let r = interp[l] * f1 + interp[h] * f;
    let g = interp[l + 1] * f1 + interp[h + 1] * f;
    let b = interp[l + 2] * f1 + interp[h + 2] * f;
    r = Math.round(r);
    g = Math.round(g);
    b = Math.round(b);    
    r = r < 0 ? 0 : r > 255 ? 255 : r;
    g = g < 0 ? 0 : g > 255 ? 255 : g;
    b = b < 0 ? 0 : b > 255 ? 255 : b;
    r = r.toString(16);
    g = g.toString(16);
    b = b.toString(16);
    r = r.length < 2 ? '0' + r : r;
    g = g.length < 2 ? '0' + g : g;
    b = b.length < 2 ? '0' + b : b;
    return '#' + r + g + b;
}    

/**
 * @brief   Turn a value into a short string for axis markings.
 *
 * @param   val     Value to round.
 * @param   divs    Scale as power of tens of min/max range the text is relevant to.
 */
function roundToString(val, divs) {
    // How rounding works:
    // say val = 0.150000001, and divs = 0.1 That means the whole span range is >0 and < 1
    // Round to nearest 1/100th of divs.
    // val              divs      result
    // 0.15000001       0.1       Math.round(val*10000)/10000
    // 0.15000001       1         Math.round(val*1000)/1000
    // 0.15000001       10        Math.round(val*100)/100
    // 0.15000001       100       Math.round(val*10)/10
    // 0.15000001       1000      Math.round(val)
    // 0.15000001       10000     Math.round(val/10)*10
    // 0.15000001       100000    Math.round(val/100)*100
    // 0.15000001       1000000   Math.round(val/1000)*1000
    if (divs < 1000) {
        let s = 1000/divs;
        val = Math.round(val * s) / s;
    }
    if (divs > 1000) {
        let s = divs / 1000;
        val = Math.round(val / s) * s;
    }
    
    // To string.
    let valStr = '' + val;
    let period = valStr.indexOf('.');
    if (period < 0) {
        let clipPos = valStr.length;
        for (let ii = clipPos - 1; ii > period; ii--){
            if (valStr[ii] === '0') {
                clipPos--;
            } else {
                break;
            }
        }
        if (clipPos < valStr.length) {   
            if (valStr.length - clipPos > 12) {
                valStr = ''  + (val/1000000000000) + ' T';
            } else if (valStr.length - clipPos > 9) {
                valStr = ''  + (val/1000000000) + ' B';
            } else if (valStr.length - clipPos > 6) {
                valStr = ''  + (val/1000000) + ' M';
            } else if (valStr.length - clipPos > 3) {
                valStr = ''  + (val/1000) + ' k';                
            }                
        }
    }
    return valStr;        
}
