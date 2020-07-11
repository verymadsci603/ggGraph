/**
 * @brief   ggGraph_Options
 *
 * @author  Phil Braica  HoshiKata@aol.com
 *
 * @copyright 2020, Philip Braica, MIT License
 *
 */
 
 
 /** 
  * @brief  Construct the options for a series line with standard options filled in.
  *
  * Shapes: '', 'none', null, undefined are the same.
  *         circle, square, diamond, triangle, triangle2
  *
  * @param  lineColor	Either HTML color starting with "#" or "perPoint", or "none"
  * @param  markerShape Either "perPoint" for per point symbols or a symbol name, or "none"
  * @param  markerColor Either HTML color or "perPoint"
  * @param  markerSize	Marker diameter in pixels.
  *
  * @return Object with a line's options set.
  */
function make_seriesOptions(
    name,
    lineColor, 
    markerShape, 
    markerColor, 
    markerSize,
    xAxisIndex,
    yAxisIndex) {
    
    return {
        name:               name,
        defaultLineColor:   lineColor,
        defaultMarkerColor: markerColor,
        defaultMarkerShape: markerShape,
        defaultMarkerSize:  markerSize,
        graphLineDash:      'solid',
        lineSizePx:         1,
        xAxisIndex:         xAxisIndex,
        yAxisIndex:         yAxisIndex};        
}

/** 
 * @brief   Fill in an options object based on what is already there.
 * 
 * @param   seriesOptions   Input options.
 * @param   themeColor      Color to use if none.
 * 
 * @return  Complete seriesOptions object.
 */
function default_seriesOptions(seriesOptions, themeColor) {
    if ((seriesOptions === undefined) || (seriesOptions === none)) {
        return {
            name: '',
            defaultLineColor:   themeColor,
            defaultMarkerColor: undefined,
            defaultMarkerShape: undefined,
            defaultMarkerSize:  undefined,
            xAxisIndex:         0,
            yAxisIndex:         0};
    }
    return {
        name:               defaultObject(seriesOptions.name,        ''),
        defaultLineColor:   defaultObject(seriesOptions.lineColor,   themeColor),
        defaultMarkerColor: defaultObject(seriesOptions.markerColor, undefined),
        defaultMarkerShape: defaultObject(seriesOptions.markerShape, undefined),
        defaultMarkerSize:  defaultObject(seriesOptions.markerSize,  undefined),
        xAxisIndex:         defaultObject(seriesOptions.xAxisIndex,  undefined),
        yAxisIndex:         defaultObject(seriesOptions.yAxisIndex,  undefined)};
}
    
/**
 * @brief   Is this line's options fancy or does it have default behavior?
 *
 * @param   seriesOptions   Options to check.
 *
 * @return  True if no options are 'perPoint'.
 */
function _isDefaults(seriesOptions) {
    return (seriesOptions.defaultLineColor != 'perPoint') &&
        (seriesOptions.defaultMarkerColor != 'perPoint') &&
        (seriesOptions.defaultMarkerShape != 'perPoint');
}
    
/**
 * @brief   Does this seriesOption have line like properties?
 * 
 * @param   seriesOptions   Options to check.
 *
 * @return  True if it has line properties.
 */
function _hasLine(seriesOptions) {
    return objectExists(seriesOptions.defaultLineColor);
}
 
/**
 * @brief   Does this seriesOption have marker like properties?
 * 
 * @param   seriesOptions   Options to check.
 *
 * @return  True if it has marker properties.
 */ 
function _hasMarker(seriesOptions) {
    return objectExists(seriesOptions.defaultMarkerShape);
}

/**
 * @brief   Kind of graphics draw acceleration to use.
 *
 * @param   seriesOptions   Options JSON.
 *
 * @return  Either -1, 0, 1 or 2.
 *
 * @details
 * -1 = no accel
 *  0 = Line only, 1 color.
 *  1 = Marker only, 1 color.
 *  2 = Marker and line 1 color each.
 *  3 = Bubbles, all same color shape, but size is by value.
 */
function _drawAccelerationType(seriesOptions) { 
    if (!_isDefaults(seriesOptions)) return -1;
    if (_hasLine(seriesOptions)) {
        if (_hasMarker(seriesOptions)) return 2;
        return 0;
    }
    if (_hasMarker(seriesOptions)) return 1;
    return -1;
}

/** 
 * @brief   Used to make title, banner, legend options.
 *
 * @param   show            Show or hide this.
 * @param   textStr         The text.
 * @param   backgroundColor Box background color.
 * @param   boxEdgeColor    Edge color.
 * @param   textColor       Text fill color.
 * @param   borderSizePx    Border size in pixels.
 * @param   textSizePx      Text size in pixels.
 * @param   alignment       Either 'top' (default), 'bottom', 'left' or 'right'.
 */
function make_textBoxOptions(
    show,
    textStr, 
    backgroundColor,
    boxEdgeColor,
    textColor,
    borderSizePx,
    textSizePx,
    alignment) {
    return {
        show: show,
        textStr: textStr,
        backgroundColor: backgroundColor,
        boxEdgeColor: boxEdgeColor,
        borderSizePx: borderSizePx,
        textColor: textColor,
        textSizePx: textSizePx,
        loc: alignment};
}

/** 
 * @brief   Fill in an textBoxOptions object based on what is already there.
 * 
 * @param   tbOptions       Input textBoxOptions.
 * @param   themeColor      Color to use if none.
 * @param   textColor       Text fill color.
 * @param   alignment       Either 'top' (default), 'bottom', 'left' or 'right'.
 *
 * @return  Complete seriesOptions object.
 */
function default_textBoxOptions(
    tbOptions, themeColor, textColor, alignment) {

    if ((tbOptions === undefined) || (tbOptions === none)) {
        return {
            show: false,
            textStr: '',
            backgroundColor: undefined,
            boxEdgeColor: themeColor,
            borderSizePx: 1,
            textColor: textColor,
            textSizePx: 11,
            loc: alignment};
    }
    let hasText = objectExists(tbOptions.textStr);
    return {
        show:            defaultObject(tbOptions.show,            hasText),
        textStr:         defaultObject(tbOptions.textStr,         ''),
        backgroundColor: defaultObject(tbOptions.backgroundColor, undefined),
        boxEdgeColor:    defaultObject(tbOptions.boxEdgeColor,    themeColor),
        borderSizePx:    defaultObject(tbOptions.borderSizePx,    1),
        textColor:       defaultObject(tbOptions.textColor,       textColor),
        textSizePx:      defaultObject(tbOptions.textSizePx,      11),
        loc:             defaultObject(tbOptions.loc,             alignment)};
}

/** 
 * @brief   Used for axis options.
 *
 * @param   show            Show or hide this.
 * @param   textStr         The text.
 * @param   isLog           Axis is a log.
 * @param   backgroundColor Box background color.
 * @param   markerColor     Marker tic color, used for edge like drawing.
 * @param   graphlineColor  Graph background below lines color lines up with tics.
 * @param   graphLineDash   Either: 'solid', 'dash' or 'dashdot' or array for canvas.setLineDash
 * @param   markerSizePx    Marker detent size in pixels.
 * @param   textColor       Text fill color.
 * @param   textSizePx      Text size in pixels.
 */
function make_axisOptions(
    show,
    textStr,
    isLog,
    backgroundColor,
    markerColor,
    graphlineColor, 
    graphLineDash,
    markerSizePx,
    textColor,
    textSizePx) {
    return {
        show: show,
        textStr: textStr,
        isLog: isLog,
        backgroundColor: backgroundColor,
        markerColor: markerColor,
        graphlineColor: graphlineColor,
        graphLineDash: graphLineDash,
        markerSizePx: markerSizePx,
        textColor: textColor,
        textSizePx: textSizePx};
}

/**
 * @brief   Make event options struct.
 *
 * @param   onZoomStart     About to zoom function, can reject.
 * @param   onZoomEnd       Zoom completed function.
 * @param   onPanStart      Panned about to occur, can reject.
 * @param   onPanEnd        Panned completed. 
 * @param   onBackground    Paint the background function.
 * @param   onPainted       After painted function.
 *
 * onZoomStart(graph, minx, maxx, miny, maxy);
 *     return false to skip the zoom and just return.
 * onZoomEnd(graph, minx, maxx, miny, maxy);
 *
 * onPanStart(graphClass, changeInX, minx, maxx, changey, miny, maxy);
 *     return false to not actually do the zoom (reject the action).
 * onPanEnd(graphClass, changeInX, minx, maxx, changey, miny, maxy);  
 *
 * onBackground(graphClass, canvasContext, layout {x:, y:, w:, h:});
 * onPainted(graphClass, canvasContext, allLayouts{ graph: {}, etc.});
 */
function make_eventOptions(
    onZoomStart,
    onZoomEnd,
    onPanStart,
    onPanEnd,
    onBackground,
    onPainted) {
    return {
        onZoomStart:  onZoomStart,
        onZoomEnd:    onZoomEnd,
        onPanStart:   onPanStart,
        onPanEnd:     onPanEnd,
        onBackground: onBackground,
        onPainted:    onPainted};
}

/** 
 * @brief   Fill in an axisOptions object based on what is already there.
 * 
 * @param   axOptions       Input axisOptions.
 * @param   themeColor      Color to use if none.
 * @param   textColor       Text fill color.
 *
 * @return  Complete axisOptions object.
 */
function default_axisOptions(
    axOptions, themeColor, textColor, alignment) {

    if ((axOptions === undefined) || (axOptions === none)) {
        return {
            show: true,
            textStr: '',
            isLog: false,
            backgroundColor: undefined,
            markerColor: themeColor,
            graphlineColor: themeColor,
            graphLineDash: 'dash',
            markerSizePx: 6,
            textColor: textColor,
            textSizePx: 11};
    }
    return {
        show:            defaultObject(tbOptions.show,            true),
        textStr:         defaultObject(tbOptions.textStr,         ''),
        isLog:           defaultObject(tbOptions.isLog,           false),
        backgroundColor: defaultObject(tbOptions.backgroundColor, undefined),
        markerColor:     defaultObject(tbOptions.markerColor,     themeColor),
        graphlineColor:  defaultObject(tbOptions.graphlineColor,  themeColor),
        graphLineDash:   defaultObject(tbOptions.graphLineDash,   'dash'),
        markerSizePx:    defaultObject(tbOptions.markerSizePx,    6),
        textColor:       defaultObject(tbOptions.textColor,       textColor),
        textSizePx:      defaultObject(tbOptions.textSizePx,      11)};
}

    
/** 
 * @brief   Graph wide options.
 */
function make_graphOptions(

    // Main graph frame layout.
    backgroundColor,
    boxEdgeColor,
    textColor,
    textSizePx,
    marginPx,
    
    // Title options.
    titleOptions,
    
    // Banner options.
    bannerOptions,
    
    // Legend options.
    legendOptions,
    
    // Axis options.
    xAxisOptions, yAxisOptions, yAxisOptions2, zAxisOptions,
    
    // Events
    events
    ) {
        
    return {
        // Main graph frame layout.
        main : {
            graphType: '2D',
            backgroundColor: backgroundColor,
            boxEdgeColor: boxEdgeColor,
            boxEdgeSizePx: 1,
            textColor: textColor,
            textSizePx: textSizePx,
            marginPx: marginPx,
            zoom: {
                kindsAllowed: 'auto x xy y', // What is allowed, space delminited.
                currentMode: 'auto', // Kind of zoom starting with.
                fillColor: '#80808080',
                strokeColor: ''},
            xSummary: { 
                behavior: 'onzoom', // or 'always' or 'none'
                sizePercent: 25,    // 0 to 100%.
                minSizePx: 100, // Min pixels.
                maxSizePx: 400, // Max pixels.                
                markerColor: '#808080',
                alignment: 'top'} // 'top' or 'bottom'
        },
        title : titleOptions,
        banner: bannerOptions,
        legend: legendOptions,
        xAxis:  xAxisOptions,
        yAxis:  yAxisOptions,
        yAxis2: yAxisOptions2,
        zAxis:  zAxisOptions,
        events: events
    };       
}





