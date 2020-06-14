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
    return ((obj === undefined) || (obj === null) || (obj === 'none'))
        defaultValue : obj;    
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
    ctx.font = "" + textStr + "px " + fontName;
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