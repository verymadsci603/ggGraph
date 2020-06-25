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
 * @note    Checks for undefined and null, but also 'none'
 *          to support servers that generate 'none' in JSON
 *          like Python does (against the standard).
 *
 * @param   obj     Object to check.
 * 
 * @return  Checks against undefined, null and 'none'.
 */
function objectExists(obj) {
    return !((obj === undefined) || (obj === null) || (obj === 'none'));        
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

function minMax(value, min, max) {
    value = value > min ? value : min;
    return value < max ? value : max;
}
                        
/**
 * @brief   Turn 'solid', 'dash' or 'dashdot' or array for canvas.setLineDash
 * 
 * @param   dashOption
 *
 * @return  Array.
 */
function toCanvasDash(dashOption) {
    dashOption = objectExists(dashOption) ? dashOption : 'solid';
    if (dashOption == 'solid') return [];
    if (dashOption == 'dash') return [10, 10];
    if (dashOption == 'dashdot') return [10, 10, 2, 10];
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
    let tw = ctx.measureText(textStr).width;
    ctx.fillStyle = color;
    ctx.font = "" + textSizePx + "px " + fontName;
    ctx.fillText(
        textStr, 
        layout.x + (layout.w - tw) / 2, 
        layout.y + (layout.h + textSizePx) / 2);  
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
    let tw = ctx.measureText(textStr).width;
    ctx.fillStyle = color;
    ctx.font = "" + textStr + "px " + fontName;
    ctx.fillText(
        textStr, 
        layout.x + (layout.w - tw) / 2, 
        layout.y + layout.h);  
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