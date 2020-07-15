/**
 * @brief   ggGraphs
 *
 * @author  Phil Braica  HoshiKata@aol.com
 *
 * @copyright 2020, Philip Braica, MIT License
 *
 */


/** Data hive. */
let ggGraph_DataHive = new DataHive();

/** All graphs. */
let ggGraph_Graphs = {};

/**
 * The graph class.
 */
class Graph {
    /**
     * @brief   Constructor.
     *
     * @param   id_or_guid      The key to identify this graph uniquely.
     */
    constructor(id_or_guid, graphOptions) {
        if ((graphOptions === undefined) || (graphOptions === null)) {
                
            let titleOpts = make_textBoxOptions(
                true, 
                'text',
                '#FFFFFF',
                '#404040',
                '#000000',
                1,
                14,
                'top');
            let bannerOpts = make_textBoxOptions(
                true, 
                'text',
                '#FFFFFF',
                '#404040',
                '#000000',
                1,
                14,
                'top');
            let legendOpts = make_textBoxOptions(
                true, 
                'text',
                '#FFFFFF',
                '#404040',
                '#000000',
                1,
                14,
                'top');
            let x_axisOpts = make_axisOptions(
                true,
                'axis',
                false,
                undefined,
                '#202020',
                '#808080',
                'dash',
                6,
                '#000000',
                11);
                
            let y_axisOpts = make_axisOptions(
                true,
                'axis',
                false,
                undefined,
                '#202020',
                '#808080',
                'dash',
                6,
                '#000000',
                11);
                
            let y2_axisOpts = make_axisOptions(
                true,
                'axis',
                false,
                undefined,
                '#202020',
                '#808080',
                'dash',
                6,
                '#000000',
                11);
                
            let z_axisOpts = make_axisOptions(
                true,
                'axis',
                false,
                undefined,
                '#202020',
                '#808080',
                'dash',
                6,
                '#000000',
                11);

            graphOptions = make_graphOptions(
                '#FFFFFF',
                '#404040',
                '#000000',
                11, // Text size.
                4,  // Margin
                titleOpts, bannerOpts, legendOpts,
                x_axisOpts, y_axisOpts, undefined, z_axisOpts);         
        }   
    
        this.guid = id_or_guid; // Unique HTML wide ID of this thing.
        this.series = [];       // The series to graph.
        this.graphOptions = graphOptions; // Options for the graph.
        this.lastBounds = {'x': null, 'y': null, 'y2': null, 'z': null, 'w': null, 'h': null};
        this.maxBounds = undefined; // Max bounds for scrolling.
        this.lastLayout = {};
        this.lastXY = {x:0, y: 0};
        this._legendCalcs = undefined;
        this.zoom = [];
        let $topEl = $(this.guid); 

        // Quick lookup caching of the things we check during drawing repeatedly.
        this.graphElements = {
            $top: $topEl,
            $canvas: $topEl.find('.ggGraph_canvas'),
            $overlay: $topEl.find('.ggGraph_overlay'),
            $elements: $topEl.find('.ggGraph_elements'),
            $zoomReset: $topEl.find('.ggGraph_stepReset'),
            $zoomOut: $topEl.find('.ggGraph_stepOut')    
        };            
        
        // Save off by ID.
        ggGraph_Graphs[id_or_guid] = this;
    }
    
    /**
     * @brief   Compute axis markers.
     *
     * @param   ctx             Context for string measurement.
     * @param   isHorizontal    Is horizontal vs. vertical axis.
     * @param   min             Minimum value.
     * @param   max             Maximum value.
     * @param   w               Width in pixels.
     * @param   h               Height in pixels.
     * @param   margin          Margin in pixels between things.
     * @param   opt             Options.
     */
    _computeAxisMarkers(ctx, isHorizontal, min, max, w, h, margin, opt) {
        // To measure things.
        ctx.font = "" + opt.textSizePx + "px Verdana";
        
        // We need to see the scope of things, lnMin, max are the bounds.
        // How much we care is lnDel.
        // Examples:
        // min,   max   |  scale 
        //  0.1   10.2  |  
        //  0.09   0.4  |   
        
        let lw = min < max ? min : max;
        let hg = max > min ? max : min;
        let rn = hg - lw;
        rn = rn > 0 ? rn : 0.001;
        
        let divs = Math.pow(10, Math.floor(Math.log10(rn)));
        let rndDown = (Math.floor(lw /divs) * divs);
        
        // Walk from rndDown up, keep when within lw and hg.
        // divs are 0.1, 1, 10, etc. we need to allow 2,3,4,5 to get different numbers of ticks.
        let remaining = isHorizontal ? w - margin : h - margin;
        let best = [{p: isHorizontal ? 0: 1, t: lw}, {p: 1, t: hg}];
        
        let scales = [0.25, 0.5, 1, 2, 4, 5];
        for (let s_ii = 1; s_ii < 7; s_ii++){
            let tmp = rndDown;
            let proposed = [];
            let rem = remaining;
            let step = divs * scales[s_ii];
            if (isHorizontal) {
                while ((tmp <= hg) && rem > 0) {
                    if ((tmp <= hg) && (tmp >= lw)) {
                        let pos = (tmp - lw) / rn;
                        let v_str = roundToString(tmp, divs);
                        proposed.push({ p: pos, t: v_str});
                        rem -= margin + ctx.measureText(v_str).width;
                    }
                    tmp += step;
                }
            } else {
                let rm_down = margin + opt.textSizePx;
                while ((tmp <= hg) && rem > 0) {
                    if ((tmp <= hg) && (tmp >= lw)) {
                        let pos = (tmp - lw) / rn;
                        let v_str = roundToString(tmp, divs);
                        proposed.push({ p: 1 - pos, t: v_str});
                        rem -= rm_down;
                    }
                    tmp += step;
                }
            }
            if (rem > 0) {
                best = proposed;
                break;
            }
        }
        return best;        
    }
    
    /**
     * @brief   Compute all axis min, max and axis markers.
     *
     * @param   ctx             Context.
     * @param   canvas_layout   Size/spacing for the axis.
     * @param   dataBoundsX     X bounds.
     * @param   dataBoundsY     Y bounds.  
     * @param   useMain         If true, use main else summary.     
     */
    _computeAxis(ctx, canvas_layout, dataBoundsX, dataBoundsY, useMain) {
        // Compute the bounds for x, y on the axis
        // Determine the labels to use.
        
        // Give some bounds or none, find the min/max for each axis.
        let lx = objectExists(dataBoundsX) ? dataBoundsX.min : null; 
        let hx = objectExists(dataBoundsX) ? dataBoundsX.max : null; 
        let ly = objectExists(dataBoundsY) ? dataBoundsY.min : null; 
        let hy = objectExists(dataBoundsY) ? dataBoundsY.max : null; 
        let lxf = !objectExists(lx);
        let hxf = !objectExists(hx);
        let lyf = !objectExists(ly);
        let hyf = !objectExists(hy);
        
        if (lxf || hxf || lyf || hyf) {
            for (let ii = 0; ii < this.series.length; ii++) {
                let slx = this.series[ii].min('x');
                let shx = this.series[ii].max('x');
                let sly = this.series[ii].min('y');
                let shy = this.series[ii].max('y');
                
                if (lxf && objectExists(slx)) {
                    lx = objectExists(lx) ? (slx < lx ? slx : lx) : slx;
                }

                if (hxf && objectExists(shx)) {
                    hx = objectExists(hx) ? (shx > hx ? shx : hx) : shx;
                }

                if (lyf && objectExists(sly)) {
                    ly = objectExists(ly) ? (sly < ly ? sly : ly) : sly;
                }
                
                if (hyf && objectExists(shy)) {
                    hy = objectExists(hy) ? (shy > hy ? shy : hy) : shy;
                }                
            }
        }
        
        // Now figure out the markers and scale.
        let mx = [ lx, 0, hx, 1]; // left to right.
        let my = [ hy, 0, ly, 1]; // bottom to top.
        
        if (useMain) {
            mx = this._computeAxisMarkers(ctx, true, lx, hx, canvas_layout.xAxis.w, 
                canvas_layout.xAxis.h, this.graphOptions.main.marginPx, this.graphOptions.xAxis);
            my = this._computeAxisMarkers(ctx, false, ly, hy, canvas_layout.yAxis.w, 
                canvas_layout.yAxis.h, this.graphOptions.main.marginPx, this.graphOptions.yAxis);
        } else {
            mx = this._computeAxisMarkers(ctx, true, lx, hx, canvas_layout.xAxisSum.w, 
                canvas_layout.xAxisSum.h, this.graphOptions.main.marginPx, this.graphOptions.xAxis);
            my = this._computeAxisMarkers(ctx, false, ly, hy, canvas_layout.yAxisSum.w, 
                canvas_layout.yAxisSum.h, this.graphOptions.main.marginPx, this.graphOptions.yAxis);
        }
            
        return {
            // Marker values.
            xBounds:  { min: lx, max: hx, marks: mx},
            yBounds:  { min: ly, max: hy, marks: my},
            yBounds2: undefined};
            
    }
    
    /**
     * @brief   Given a possible option, compute the layout within the bounding box.
     *
     * @param   ctx     Context 2d.
     * @param   box     Bounding box: x,y,w,h
     * @param   opt     Possible option.
     * @param   kind    Is this an axis, legend or normal
     */ 
    _computeBox(ctx, box, opt, kind) {
        let isAxis = kind === 'axis';
        let isLegend = kind === 'legend';
        
        if (isAxis && (this.graphOptions.main.graphType === '2DPolar')) {
            // unused, don't alter the box.
            return [{
                x: box.x, 
                y: box.y,
                w: 0,
                h: 0}, { 
                x: box.x,
                y: box.y,
                w: box.w,
                h: box.h}];
        }

        let margin = defaultObject(this.graphOptions.main.marginPx, 2);
        if ((this.graphOptions) && (opt) && (opt.show)) {
            // Either way, both need this.
            let textSize = defaultObject(opt.textSizePx, 11);
            
            if ((opt.loc == 'top') || (opt.loc == 'bottom')) { 
                // Textbox, top/bottom:
                //   margin + textSizePx + margin
                // Axis no text:
                //   marker + margin + textSizePx + margin
                // Axis & text:
                //   marker + margin + textSizePx + margin + textSizePx + margin
                // Legend no text:
                //   margin + rows * (margin + textSizePx)
                // Legend & text:
                //   margin + (rows + 1) * (margin + textSizePx)
                // 
                // It's mostly just about the rows ...
                //      Kind        Rows        Size
                // Textbox no text  0           margin
                // Textbox text     1           margin + rows * (textSizePx + margin)
                // Axis no text     1           marker + margin + rows * (textSizePx + margin)
                // Axis & text      2           marker + margin + rows * (textSizePx + margin)
                // Legend no text   crows       margin + rows * (textSizePx + margin)
                // Legend & text    crows + 1   margin + rows * (textSizePx + margin)
                //
                // Always += 2*opt.borderSizePx if it exists.
                let rows = 0;
                
                // Calculate rows for legend, if it's a legend.
                if (isLegend) {
                    let ws = [];
                    let w = 0;
                    ctx.font = "" + textSize + "px Verdana";  
                    let items = this.series.length;
                    for (let ii = 0; ii < items; ii++) {
                        let seriesName = defaultObject(this.series[ii].seriesOptions.name, '').trim();
                        let wi = ctx.measureText(seriesName).width;
                        w = w > wi ? w : wi; 
                        ws.push(wi);
                    }
                    w += (margin + textSize) * 2;
                    let maxCols = 0;
                    if (items > 1) {                  
                        // name, margin symbology,
                        
                        maxCols = Math.floor(box.w / w);
                        maxCols = maxCols < 1 ? 1 : maxCols;
                        rows = Math.ceil(items / maxCols);
                        
                    } else {
                        rows = 1;
                    }  
                    maxCols = maxCols > items ? items : maxCols;
                    this._legendCalcs = {r: rows, c: maxCols, w: ws, mc : w};                    
                }
                
                // Add in any text label.
                let hadLabel = objectExists(opt.textStr) && (opt.textStr.length > 0);
                if (hadLabel) {
                    rows += 1;   
                }
                                    
                // Axis add on.
                let h = margin + rows * (textSize + margin);
                if (isAxis) {
                    h += defaultObject(opt.markerSizePx, 6);
                    if (!hadLabel) {
                        h += margin;
                    }
                }
                
                // Border.
                h += (objectExists(opt.borderSizePx) ? parseInt(opt.borderSizePx) * 2 : 0) + margin;

                // Ensure minimum size.
                if (objectExists(opt.minSize)) {
                    h = h > opt.minSize ? h : opt.minSize;
                }
                
                // If it has text, 
                //let h = offset + opt.markerSizePx + (isAxis ? 2 * opt.textSizePx : opt.textSizePx);
                return [{
                    x: box.x, 
                    y: opt.loc === 'top' ? box.y : box.y + box.h - h,
                    w: box.w,
                    h: h}, { 
                    x: box.x,
                    y: opt.loc === 'top' ? box.y + h : box.y,
                    w: box.w,
                    h: box.h - h}];
            } else {
                // Textbox, left/right:
                //
                // tw = max text width.
                //
                // Textbox or legend:
                //   margin + tw + (margin * (tw != 0))
                // Axis:
                //   += marker + margin.
                let tw = 0;
                
                ctx.font = "" + textSize + "px Verdana";
                
                // Legend.
                if (isLegend) {
                    // Calculate largest width.
                    let ws = [];
                    for (let ii = 0; ii < this.series.length; ii++) {
                        let seriesName = defaultObject(this.series[ii].seriesOptions.name, '').trim();
                        let wi = ctx.measureText(seriesName).width;
                        tw = tw > wi ? tw : wi;   
                        ws.push(tw);
                    }
                    this._legendCalcs = {
                        r: this.series.length, 
                        c: 1, 
                        w: ws, 
                        mc : tw + (margin + textSize) * 2};      
                }
                // Text if it exists.
                let wi = 0;
                if (objectExists(opt.textStr) && 
                    objectExists(opt.textColor) && 
                    (opt.textSizePx > 0)) {
                    wi = ctx.measureText(opt.textStr.trim()).width;
                } 
                tw = tw > wi ? tw : wi; 
                wi = ctx.measureText('01234').width;
                tw = tw > wi ? tw : wi; 
                let w = margin + ((tw === 0) ? 0 : tw + margin);
                
                // If axis...
                if (isAxis) {
                    w += defaultObject(opt.markerSizePx, 6);
                }
                
                // Border.
                w += margin + parseInt(defaultObject(opt.borderSizePx, 0));
                
                // Minimum check.
                if (objectExists(opt.minSize)) {
                    w = w > opt.minSize ? w : opt.minSize;
                }
                return [{
                    x: opt.loc === 'left' ? box.x : box.x + box.w - w, 
                    y: box.y,
                    w: w,
                    h: box.h}, { 
                    x: opt.loc === 'left' ? box.x + w : box.x,
                    y: box.y,
                    w: box.w - w,
                    h: box.h}];
            }
        } 
        return [undefined, box];        
    }
    
    /**
     * @brief   Compute the layout for this graph.
     *
     * @param   ctx     Canvas context.
     * @param   width   Canvas width.
     * @param   height  Canvas height.
     */
    _computeLayout(ctx, width, height) {
        // Banner is used to be either top or bottom outermost box.
        let go = this.graphOptions;
        if (!objectExists(go)) {
            return {
                banner:   undefined,
                title:    undefined,
                legend:   undefined,
                graph:    {x: 0, y: 0, w: width, h: height},
                xSummary: undefined, 
                xAxisSum: undefined,
                yAxisSum: undefined,
                xAxis:    undefined,
                yAxis:    undefined,
                yAxis2:   undefined};
        }

        let banner   = undefined;
        let title    = undefined;
        let legend   = undefined;
        let xSummary = undefined;
        let margin = defaultObject(this.graphOptions.main.marginPx, 2);
        
        let box = {x: 0, y: 0, w: width, h: height};
        
        [banner, box] = this._computeBox(ctx, box, go.banner);
        [title,  box] = this._computeBox(ctx, box, go.title);
        [legend, box] = this._computeBox(ctx, box, go.legend, 'legend');
        
        let xopt = deepCopy(go.xAxis);
        let yopt = deepCopy(go.yAxis);
        let yopt2 = deepCopy(go.yAxis2);
        if (xopt && (!xopt.loc)) { 
            xopt.loc = 'bottom';
        }
        if (yopt && (!yopt.loc)) { 
            yopt.loc = 'left';
        }
        if (yopt2 && (!yopt2.loc)) { 
            yopt2.loc = 'right';
        }
        let xAxis = undefined;
        let yAxis = undefined;
        let yAxis2 = undefined;
        [xAxis,  box] = this._computeBox(ctx, box, xopt,  'axis');
        [yAxis,  box] = this._computeBox(ctx, box, yopt,  'axis');
        [yAxis2, box] = this._computeBox(ctx, box, yopt2, 'axis');

        if (yAxis) {
            yAxis.y += 1;
            yAxis.h -= 1;
        }
        if (yAxis2) {
            yAxis2.y += 1;
            yAxis2.h -= 1;
        }
        // Adjust x to be inbetween the y's
        if (xAxis) {
            xAxis.w -= 1;
            if (yAxis) {
                xAxis.x = yAxis.x + yAxis.w;
                xAxis.w -= yAxis.w;
            }
            if (yAxis2) {
                xAxis.w -= yAxis2.w;
            }
        }
        
        let xAxisSum = undefined;
        let yAxisSum = undefined;

        if (objectExists(go.main) && objectExists(go.main.xSummary)) {
            let behavior = defaultObject(go.main.xSummary.behavior, 'onzoom');
            
            if (((this.zoom.length > 0) && (behavior === 'onzoom')) || behavior === 'always') {
                // Doing a zoom.
                let percent = defaultObject(go.main.xSummary.sizePercent, 25);
                percent = percent < 1 ? 1 : (percent > 100 ? 100 : percent);
                let alignment = defaultObject(go.main.xSummary.alignment, 'top');
                let xSumHeight = box.h * percent / 100;
                let minPixels = defaultObject(go.main.xSummary.minSizePx, 0);
                xSumHeight = xSumHeight > minPixels ? xSumHeight : minPixels;
                if (objectExists(go.main.xSummary.maxSizePx)) {
                    xSumHeight = xSumHeight < go.main.xSummary.maxSizePx ? 
                        xSumHeight : go.main.xSummary.maxSizePx;
                }
                [xSummary, box] = this._computeBox(
                    ctx, 
                    box, 
                    {borderSizePx: 0, loc: alignment, show: true, minSize: xSumHeight});                
                yAxis.h -= xSummary.h;

                if (alignment === 'top') {
                    yAxis.y = xSummary.y + xSummary.h;
                    xAxisSum = {x: xAxis.x, w: xAxis.w, h: xAxis.h, y: xSummary.y + xSummary.h - xAxis.h };
                    xSummary.h -= xAxisSum.h;   
                    yAxisSum = {x: yAxis.x, w: yAxis.w, h: xSummary.h, y: xSummary.y};     
                } else if (alignment === 'bottom') {
                 /*  box: y 102, h 381
                   xsum: y 483, h 98
                   xaxis: y 611, h 29
                   xaxissum: y 582, h 29
                   xsum += xaxis
                   */
                    xSummary.y += xAxis.h;
                    xSummary.h -= xAxis.h;
                    xAxis.y = xSummary.y - xAxis.h;
                    xAxisSum = {x: xAxis.x, w: xAxis.w, h: xAxis.h, y: xSummary.y + xSummary.h };
                    //xSummary.h -= xAxisSum.h;   
                    yAxisSum = {x: yAxis.x, w: yAxis.w, h: xSummary.h, y: xSummary.y}; 
                } else {
                    xAxisSum = {x: xAxis.x, w: xAxis.w, h: xAxis.h, y: xSummary.y + xSummary.h - xAxis.h };
                    xSummary.h -= xAxisSum.h;   
                    yAxisSum = {x: yAxis.x, w: yAxis.w, h: xSummary.h, y: xSummary.y};                
                }
            }
        }        
        
        return {
            banner: banner,
            title: title,
            legend: legend,
            graph: box,
            xSummary: xSummary,
            xAxisSum: xAxisSum,
            yAxisSum: yAxisSum,
            xAxis: xAxis,
            yAxis: yAxis,
            yAxis2: yAxis};
    }
    
    /**
     * @brief   Resize event handler.
     */
    handleResize() {
        this._drawCanvas(this.lastBounds.x, this.lastBounds.y, true);
    }
    
    /** 
     * @brief   Update graph options.     
     */
    updateOptions(graphOptions) {
        this.graphOptions = graphOptions;
        this._drawCanvas(this.lastBounds.x, this.lastBounds.y, false);
    }
    
    /** 
     * @brief   Update graph options.     
     */
    redraw() {
        this._drawCanvas(this.lastBounds.x, this.lastBounds.y, false);
    }
    
    /**
     * @brief   Draw the graph.
     *
     * @param   dataBoundsX     Data x bounds.
     * @param   dataBoundsY     Data y bounds.
     */
    draw(dataBoundsX, dataBoundsY) {       
        this._drawCanvas(dataBoundsX, dataBoundsY, false);
    }
    
    /**
     * @brief   Draw the graph.
     *
     * @param   dataBoundsX     Data x bounds.
     * @param   dataBoundsY     Data y bounds.
     * @param   resizingFlag    Is this due to a resize?
     */
    _drawCanvas(dataBoundsX, dataBoundsY, resizingFlag) {
        if (this.graphElements.$top.length === 0) {
            // Didn't quite exist at graph construction, normal expected, fill it in now.
            let $topEl = $('#' + this.guid);
            this.graphElements = {
                $top: $topEl,
                $canvas: $topEl.find('.ggGraph_canvas'),
                $overlay: $topEl.find('.ggGraph_overlay'),
                $elements: $topEl.find('.ggGraph_elements'),
                $zoomReset: $topEl.find('.ggGraph_stepReset'),
                $zoomOut: $topEl.find('.ggGraph_stepOut')            
            };
        }
                         
        let canvas = this.graphElements.$canvas[0]; 
        let overlay = this.graphElements.$overlay[0];
        let cw = canvas.clientWidth;
        let ch = canvas.clientHeight;
        if (cw === undefined || ch === undefined) {
            return;
        }
        if (resizingFlag && (this.lastBounds.w === cw) && (this.lastBounds.h === ch)) { 
            return;
        } 
        canvas.width = cw;
        canvas.height = ch;
        overlay.width = cw;
        overlay.height = ch;
        this.lastBounds = {'x': dataBoundsX, 'y': dataBoundsY, 'y2': null, 'z': null, 'w': cw, 'h': ch};
      
        let ctx = canvas.getContext("2d");
        let canvas_layout = this._computeLayout(ctx, cw, ch);
        this.lastLayout = canvas_layout;
        let axisInfo = this._computeAxis(ctx, canvas_layout, dataBoundsX, dataBoundsY, true);
        let summaryAxisInfo = (canvas_layout.xSummary !== undefined) ? 
            this._computeAxis(ctx, canvas_layout, undefined, undefined, false) : undefined; 
        this.lastBounds.x = { min: axisInfo.xBounds.min, max: axisInfo.xBounds.max};
        this.lastBounds.y = { min: axisInfo.yBounds.min, max: axisInfo.yBounds.max};
        this.graphElements.$zoomOut.css('top', canvas_layout.graph.y);
        this.graphElements.$zoomReset.css('top', canvas_layout.graph.y);
        if (this.maxBounds === undefined) {
            // Do once, for pan max bounds.
            this.maxBounds = {
                'x': { min: axisInfo.xBounds.min, max: axisInfo.xBounds.max}, 
                'y': { min: axisInfo.yBounds.min, max: axisInfo.yBounds.max}, 'y2': null, 'z': null, 'w': cw, 'h': ch};
        }
        if (!objectExists(this.graphOptions)) {
            return; 
        }
        let graphOptions = this.graphOptions;
        
        // Paint the series.            
        ctx.fillStyle = graphOptions.main.backgroundColor;
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillRect(0, 0, cw, ch);
        
        // 2D polar graphs.
        if (graphOptions.main.graphType === '2DPolar') {
            if (objectExists(graphOptions.events) && 
                objectExists(graphOptions.events.onBackground)) {
                ctx.save();
                graphOptions.events.onBackground(this, ctx, canvas_layout.graph)          
                ctx.restore();
            }
            
            let ymarks  = objectExists(axisInfo.yBounds)  ? axisInfo.yBounds.marks  : undefined;

            ctx.save();
            this.drawGridPolar(ctx, true,  canvas_layout.graph, undefined,  graphOptions.xAxis);
            this.drawGridPolar(ctx, false, canvas_layout.graph, ymarks,  graphOptions.yAxis);
            ctx.restore();
                        
            ctx.save();
            for (let ii = 0; ii < this.series.length; ii++) {
                this.series[ii].draw2DPolar(ctx, axisInfo, canvas_layout.graph);                    
            }
            ctx.restore();
            
            // Clear out around the graph.
            let right = canvas_layout.graph.x + canvas_layout.graph.w;
            let bot = canvas_layout.graph.y + canvas_layout.graph.h;
            ctx.clearRect(0, 0, canvas_layout.graph.x, ch);     // Left.
            ctx.clearRect(right, 0, cw - right, ch);            // Right.
            ctx.clearRect(0, 0, cw, canvas_layout.graph.y);     // Top.
            ctx.clearRect(0, bot, cw, ch - bot);                // Bottom.

            // Paint the legend, title, banner.
            this.drawLegend(ctx, graphOptions.legend, canvas_layout.legend);
            this.drawTextOption(ctx, graphOptions.title,  canvas_layout.title);
            this.drawTextOption(ctx, graphOptions.banner, canvas_layout.banner);

        }

        // 2D graphs.
        if (graphOptions.main.graphType === '2D') {
                       
            let xmarks  = objectExists(axisInfo.xBounds)  ? axisInfo.xBounds.marks  : undefined;
            let ymarks  = objectExists(axisInfo.yBounds)  ? axisInfo.yBounds.marks  : undefined;
            let ymarks2 = objectExists(axisInfo.yBounds2) ? axisInfo.yBounds2.marks : undefined;
            
            ctx.save();
            this.drawGrid(ctx, true,  canvas_layout.graph, xmarks,  graphOptions.xAxis);
            this.drawGrid(ctx, false, canvas_layout.graph, ymarks,  graphOptions.yAxis);
            this.drawGrid(ctx, false, canvas_layout.graph, ymarks2, graphOptions.yAxis2);
            ctx.restore();

            if (objectExists(graphOptions.events) && 
                objectExists(graphOptions.events.onBackground)) {
                ctx.save();
                graphOptions.events.onBackground(this, ctx, canvas_layout.graph)          
                ctx.restore();
            }
            ctx.save();
            for (let ii = 0; ii < this.series.length; ii++) {
                this.series[ii].draw2D(ctx, axisInfo, canvas_layout.graph);                    
            }
            ctx.restore();
            
            // Clear out around the graph.
            let right = canvas_layout.graph.x + canvas_layout.graph.w;
            let bot = canvas_layout.graph.y + canvas_layout.graph.h;
            ctx.clearRect(0, 0, canvas_layout.graph.x, ch);     // Left.
            ctx.clearRect(right, 0, cw - right, ch);            // Right.
            ctx.clearRect(0, 0, cw, canvas_layout.graph.y);     // Top.
            ctx.clearRect(0, bot, cw, ch - bot);                // Bottom.
            
            if (canvas_layout.xSummary !== undefined) {
                
                let xmarksS  = objectExists(summaryAxisInfo.xBounds)  ? summaryAxisInfo.xBounds.marks  : undefined;
                let ymarksS  = objectExists(summaryAxisInfo.yBounds)  ? summaryAxisInfo.yBounds.marks  : undefined;
                
                ctx.save();
                this.drawGrid(ctx, true,  canvas_layout.xSummary, xmarksS,  graphOptions.xAxis);
                this.drawGrid(ctx, false, canvas_layout.xSummary, ymarksS,  graphOptions.yAxis);
                ctx.restore();

                ctx.save();
                for (let ii = 0; ii < this.series.length; ii++) {
                    this.series[ii].draw2D(
                        ctx, 
                        summaryAxisInfo, 
                        canvas_layout.xSummary);
                }
                ctx.restore();
                
                // Draw the zoomed box.
                // data to screen, so dividing by the data range, multiply by screen range.
                // the box is defined by: axisInfo.xBounds.min .max
                ctx.strokeStyle = defaultObject(graphOptions.main.xSummary.markerColor, '#808080');
                let xg = canvas_layout.xSummary.w / (summaryAxisInfo.xBounds.max - summaryAxisInfo.xBounds.min);
                let yg = canvas_layout.xSummary.h / (summaryAxisInfo.yBounds.max - summaryAxisInfo.yBounds.min);
                let xo = -summaryAxisInfo.xBounds.min * xg + canvas_layout.xSummary.x;
                let yo = -summaryAxisInfo.yBounds.min * yg + canvas_layout.xSummary.y; 
                let dxr = (axisInfo.xBounds.max - axisInfo.xBounds.min) * xg;
                let dyr = (axisInfo.yBounds.max - axisInfo.yBounds.min) * yg;
                ctx.lineWidth = 2;
                dxr = dxr < 8 ? 8 : dxr;
                dyr = dyr < 8 ? 8 : dyr;
                ctx.strokeRect(
                    axisInfo.xBounds.min * xg + xo, 
                    axisInfo.yBounds.min * yg + yo, 
                    dxr, dyr);
                        
                // Do the zoom axis.
                ctx.strokeStyle = defaultObject(graphOptions.xAxis.markerColor, '#000000');
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(canvas_layout.xSummary.x, canvas_layout.xSummary.y);
                ctx.lineTo(canvas_layout.xSummary.x, canvas_layout.xSummary.y + canvas_layout.xSummary.h);
                ctx.lineTo(canvas_layout.xSummary.x + canvas_layout.xSummary.w, 
                           canvas_layout.xSummary.y + canvas_layout.xSummary.h);
                ctx.stroke();
                
                // Draw the two summary axises.
                this.drawAxis(ctx, true,  graphOptions.xAxis, canvas_layout.xAxisSum, xmarksS, true);
                this.drawAxis(ctx, false, graphOptions.yAxis, canvas_layout.yAxisSum, ymarksS, true);
            
            }          
                                           
            // Fill behind the axises.
            ctx.fillStyle = graphOptions.main.backgroundColor;
            let axiss = [canvas_layout.xAxis, canvas_layout.yAxis, canvas_layout.xAxis];
            for (let ii = 0; ii < 3; ii++) {
                if (objectExists(axiss[ii])) {
                    ctx.fillRect(0, axiss[ii].y, axiss[ii].w, axiss[ii].h);
                }
            }

            // Paint the axis.            
            this.drawAxis(ctx, true,  graphOptions.xAxis,  canvas_layout.xAxis,  xmarks, false);
            this.drawAxis(ctx, false, graphOptions.yAxis,  canvas_layout.yAxis,  ymarks, false);
            this.drawAxis(ctx, false, graphOptions.yAxis2, canvas_layout.yAxis2, ymarks2, false);

            // Paint the legend, title, banner.
            this.drawLegend(ctx, graphOptions.legend, canvas_layout.legend);
            this.drawTextOption(ctx, graphOptions.title,  canvas_layout.title);
            this.drawTextOption(ctx, graphOptions.banner, canvas_layout.banner);
            
            if (objectExists(graphOptions.main.boxEdgeColor)) {
                let lw = defaultObject(graphOptions.main.boxEdgeSizePx, 1);
                ctx.lineWidth = lw; 
                let lw2 = 0.5 * lw;
                ctx.save();
                ctx.strokeStyle = graphOptions.main.boxEdgeColor;
                ctx.strokeRect(
                    canvas_layout.graph.x + lw2, 
                    canvas_layout.graph.y + lw2, 
                    canvas_layout.graph.w - lw, 
                    canvas_layout.graph.h - lw);
                if (canvas_layout.xSummary !== undefined) {
                    ctx.strokeRect(
                        canvas_layout.xSummary.x + lw2, 
                        canvas_layout.xSummary.y + lw2, 
                        canvas_layout.xSummary.w - lw, 
                        canvas_layout.xSummary.h - lw);
                }
                ctx.restore();
            }
        }
        
        if (objectExists(graphOptions.events) && 
            objectExists(graphOptions.events.onPainted)) {
            ctx.save();
            graphOptions.events.onPainted(this, ctx, canvas_layout)          
            ctx.restore();
        }    
    }
    
    /**
     * @brief   Draw the grid lines, if any.
     * 
     * @param   ctx             Context.
     * @param   isAngle    Is it horizontal or vertical?
     * @param   layout          Layout.
     * @param   marks           Where the marks go, an array.
     * @param   opts            Options for how to do it.
     */
    drawGridPolar(ctx, isAngle, layout, marks, opts) {
        if ((!objectExists(opts)) || (!objectExists(opts.graphlineColor))) {
            return;
        }
        ctx.beginPath();
        let clr = opts.graphlineColor;
        clr = (clr === undefined) || (clr === null) ? '#000000' : clr;
        ctx.strokeStyle = clr;
        ctx.setLineDash(toCanvasDash(opts.graphLineDash));
        let sx = layout.x + (0.5 * layout.w);
        let sy = layout.y + (0.5 * layout.h);
        let squared = layout.w < layout.h ? layout.w : layout.h;
        let r = squared / 2;
        if (isAngle) {
                     
            for (let ii = 0; ii < 8; ii++) {
                let a = Math.PI * ii / 4;
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + (r * Math.sin(a)), sy + (r * Math.cos(a)));
            }
        } else {
            for (let ii = 0; ii < marks.length; ii++) { 
                let rp = r * marks[ii].p;
                ctx.arc(sx, sy, rp, 0, 2*Math.PI);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    /**
     * @brief   Draw the grid lines, if any.
     * 
     * @param   ctx             Context.
     * @param   isHorizontal    Is it horizontal or vertical?
     * @param   layout          Layout.
     * @param   marks           Where the marks go, an array.
     * @param   opts            Options for how to do it.
     */
    drawGrid(ctx, isHorizontal, layout, marks, opts) {
        if ((!objectExists(opts)) || (!objectExists(opts.graphlineColor))) {
            return;
        }
        ctx.beginPath();
        let clr = opts.graphlineColor;
        clr = (clr === undefined) || (clr === null) ? '#000000' : clr;
        ctx.strokeStyle = clr;
        ctx.setLineDash(toCanvasDash(opts.graphLineDash));
        
        if (isHorizontal) {
            for (let ii = 0; ii < marks.length; ii++) { 
                let x = layout.x + layout.w * marks[ii].p;
                ctx.moveTo(x, layout.y);
                ctx.lineTo(x, layout.y + layout.h);
            }
        } else {
            for (let ii = 0; ii < marks.length; ii++) { 
                let y = layout.y + layout.h * marks[ii].p;
                ctx.moveTo(layout.x, y);
                ctx.lineTo(layout.x + layout.w, y);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    /** 
     * @brief   Draw an axis.
     * 
     * @param   ctx             Context.
     * @param   isHorizontal    Is horizontal or vertical.
     * @param   opt             Options.
     * @param   loc             Location layout.
     * @param   marks           Axis markings array.
     * @param   skipAxisText    Flag, if true no axis text.
     */
    drawAxis(ctx, isHorizontal, opt, loc, marks, skipAxisText) {
        if ((!objectExists(opt)) || (!objectExists(loc)) || (opt.show === false)) {
            return;
        }
        ctx.save();
        let hasMarker = objectExists(opt.markerColor);
        let hasText = objectExists(opt.textColor) && (opt.textSizePx > 0);
        
        if (objectExists(opt.backgroundColor)) {
            ctx.fillStyle = opt.backgroundColor;
            ctx.fillRect(loc.x, loc.y, loc.w, loc.h);
        }

        if (objectExists(opt.textStr) && hasText && (!skipAxisText)) {  
            if (isHorizontal) {
                drawCenteredFloorText(ctx, opt.textColor, 'Verdana', opt.textSizePx, loc, opt.textStr);
            } else {
                drawCenteredText(ctx, opt.textColor, 'Verdana', opt.textSizePx, loc, opt.textStr);
            }
        } 
        
        // Any more to do?
        if (!(hasText || hasMarker)) {
            ctx.restore();
            return;
        }
        
        // Note:
        // loc is the bounding box, axis is min, max, marks = array
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.strokeStyle = hasMarker ? opt.markerColor : '#000000';
        ctx.lineWidth = 2;
        ctx.fillStyle = opt.textColor;
        let margin = defaultObject(this.graphOptions.main.marginPx, 2);
        let mark = objectExists(opt.markerSizePx) ? opt.markerSizePx : 6;
        
        if (isHorizontal) {
            
            let txt_min = loc.x + loc.w * 2;
            let txt_max = txt_min + 1;
            if (hasText && (loc.h <= mark + margin + margin + opt.textStr * 2)) {
                if (objectExists(opt.textStr) && opt.textStr.length > 0) {
                    let titleWidth = ctx.measureText(opt.textStr.trim()).width;
                    txt_min = loc.x + (loc.w - titleWidth)/2 - margin;
                    txt_max = txt_min + titleWidth + margin;
                }
            }
            
            // Line.
            if (hasMarker) {
                ctx.moveTo(loc.x, loc.y);
                ctx.lineTo(loc.x + loc.w, loc.y);
            }
            
            let textY = loc.y + mark + margin + (opt.textSizePx *0.5);  
            
            // Marks and or Text.
            let min_x = loc.x;
            let max_x = loc.x + loc.w;
                        
            for (let ii = 0; ii < marks.length; ii++) { 
              
                // Value then (0-1) interval of location.
                let m = min_x + loc.w * marks[ii].p;
                
                if (hasMarker && (m > min_x + 4) && (m < max_x - 4)) {
                    ctx.moveTo(m, loc.y + mark);
                    ctx.lineTo(m, loc.y);
                }
                if (hasText) {
                    let tw = ctx.measureText(marks[ii].t).width;
                    let x_pos = m - (tw / 2);
                    x_pos = x_pos > min_x + margin ? x_pos : min_x + margin;
                    x_pos = x_pos < max_x - tw ? x_pos : max_x - tw;
                    
                    if ((x_pos + tw < txt_min) || (x_pos > txt_max)) {
                        ctx.fillText(marks[ii].t, x_pos, textY);          
                    }                    
                }
            }
        } else {
            let right = loc.x + loc.w;
            if (hasMarker) {
                ctx.moveTo(right, loc.y);
                ctx.lineTo(right, loc.y + loc.h);
            }
            for (let ii = 0; ii < marks.length; ii++) {
                               
                let m = loc.y + loc.h * marks[ii].p;
                if (hasMarker) {
                    ctx.moveTo(right - mark, m);
                    ctx.lineTo(right, m);
                }
                let tw = ctx.measureText(marks[ii].t).width;
                
                if (hasText) {
                    ctx.fillStyle = opt.textColor;                        
                    ctx.fillText(marks[ii].t, loc.x + loc.w - tw - margin - mark, m + (ii == 0 ? opt.textSizePx : 0));
                }
            }
        }
        ctx.stroke(); 
        ctx.restore();        
    }
    
    /**
     * @brief   Draw the legend
     *
     * @param   ctx     Context 2d.
     * @param   opt     Options structure.
     * @param   loc     Location structure.
     */
    drawLegend(ctx, opt, loc) {
        if (objectNotExist(opt) || objectNotExist(loc) || (opt.show === false)) {
            return;
        }
        
        ctx.save();
        
        let margin = defaultObject(this.graphOptions.main.marginPx, 2);
        
        // Background.
        if (objectExists(opt.backgroundColor)) {
            ctx.fillStyle = opt.backgroundColor;
            ctx.fillRect(loc.x, loc.y, loc.w, loc.h);
        }
        
        // Border.
        if (objectExists(opt.boxEdgeColor) && (opt.borderSizePx > 0)) {
            ctx.strokeStyle = opt.boxEdgeColor;
            ctx.lineWidth = opt.borderSizePx;
            ctx.strokeRect(loc.x, loc.y, loc.w, loc.h);
        }
        
        // Vertical or horizontal it is the same, calculate the row, 
        // determine offset and step, and go for it.
        
        // Compute the rows.
        let textSize = defaultObject(opt.textSizePx, 11);
        let items = this.series.length;
        let rows = this._legendCalcs.r;
        let widths = this._legendCalcs.w
        let maxCols = this._legendCalcs.c;
        let maxColWidth = this._legendCalcs.mc;

        let hasText = objectExists(opt.textStr) && (opt.textStr.length > 0);
        if (hasText) {
            rows += 1
            let w = ctx.measureText(opt.textStr.trim()).width;
            widths.push(w);
        }
        
        // Center vertically.
        let idealHeight = (margin + textSize) * rows + margin;
        let vertical_margin = margin;
        let offset = 0;
        if (loc.h < idealHeight) {            
            // Not big enough, shrink margin.
            vertical_margin = (loc.h - textSize * rows) / (rows + 1);
            vertical_margin = vertical_margin < 1 ? 1 : vertical_margin; 
            idealHeight = (vertical_margin + textSize) * rows + vertical_margin;            
        }
        offset = 0.5 * (loc.h - idealHeight) + textSize - 1;
        
        // Draw the title text if it exists.
        ctx.fillStyle = defaultObject(opt.textColor, '#000000');
        if (hasText) {
            ctx.fillText(
                opt.textStr.trim(), 
                loc.x + (loc.w - widths[widths.length-1]) / 2, 
                loc.y + offset); 
            offset += textSize + vertical_margin;
        }
        
        let row = 0;
        let col = 0;
        let colSize = loc.w / maxCols;
        let xAlign = (colSize - maxColWidth) * 0.5;
        for (let ii = 0; ii < items; ii++) {
            this.series[ii].draw_legend_item(
                ctx, textSize, widths[ii], maxColWidth, margin, 
                margin + loc.x + col * colSize + xAlign, 
                loc.y + offset + row * (textSize + vertical_margin));

            col += 1;
            if (col >= maxCols) {
                col = 0;
                row += 1;
            }
        }
        ctx.restore();
    }
    
    /**
     * @brief   Draw a text box.
     *
     * @param   ctx     Context 2d.
     * @param   opt     Options structure.
     * @param   loc     Location structure.
     */
    drawTextOption(ctx, opt, loc) {
        if ((opt === undefined) || (opt === null) || (loc === undefined) ||(loc === null) || (opt.show === false)) {
            return;
        }
        ctx.save();
        if (objectExists(opt.backgroundColor)) {
            ctx.fillStyle = opt.backgroundColor;
            ctx.fillRect(loc.x, loc.y, loc.w, loc.h);
        }
        if (objectExists(opt.boxEdgeColor) && (opt.borderSizePx > 0)) {
            ctx.strokeStyle = opt.boxEdgeColor;
            ctx.lineWidth = defaultObject(opt.borderSizePx, 1);
            ctx.strokeRect(loc.x, loc.y, loc.w, loc.h);
        }
        if (objectExists(opt.textStr) && objectExists(opt.textColor) && (opt.textSizePx > 0)) {
            drawCenteredText(ctx, opt.textColor, 'Verdana', opt.textSizePx, loc, opt.textStr);    
        }        
        ctx.restore();
    }

    /**
     * @brief   Using "this" and mouse offset x,y, do a pan operation.
     *
     * @param   offsetX     Event's offsetX mouse value.
     * @param   offsetY     Event's offsetY mouse value.
     */
    _doPan(offsetX, offsetY) {
        
        // If not valid state of things, return.
        if ((this.lastXY.x === -1)                 || 
            (this.lastXY.y === -1)                 ||
            (!objectExists(this.lastLayout))       ||
            (!objectExists(this.lastLayout.graph)) ||
            (!objectExists(this.lastBounds))       ||
            (!objectExists(this.lastBounds.x))     ||
            (!objectExists(this.lastBounds.y))) {
            return;
        }
        
        let bounds = this.lastBounds;
        let layout = this.lastLayout.graph;
        let sign = 1;
        if (inBox(this.lastXY.x, this.lastXY.y, this.lastLayout.xSummary)) {
            bounds = this.maxBounds;
            layout = this.lastLayout.xSummary;
            sign = -1;
        }
        
        // dlx, dly is the screen to data scaling of the given
        // summary or graph region for the change in x,y
        let sx = (bounds.x.max - bounds.x.min) / layout.w;
        let sy = (bounds.y.max - bounds.y.min) / layout.h;
        let dlx = sign * sx * (this.lastXY.x - offsetX);
        let dly = sign * sy * (this.lastXY.y - offsetY);
        
        if ((dlx === 0) && (dly === 0)) {
            // nothing to do.
            return;
        }
        
        let lx = this.lastBounds.x.min + dlx;
        let gx = this.lastBounds.x.max - this.lastBounds.x.min;
        let ly = this.lastBounds.y.min + dly;
        let gy = this.lastBounds.y.max - this.lastBounds.y.min;
        this.lastXY.x = offsetX;
        this.lastXY.y = offsetY;
        if (objectExists(this.maxBounds)) {
            lx = (lx + gx < this.maxBounds.x.max) ? lx : this.maxBounds.x.max - gx;
            lx = (lx > this.maxBounds.x.min) ? lx : this.maxBounds.x.min;
            ly = (ly + gy < this.maxBounds.y.max) ? ly : this.maxBounds.y.max - gy;
            ly = (ly > this.maxBounds.y.min) ? ly : this.maxBounds.y.min;
            
            // Limit to data bounds.
            lx = minMax(lx, this.maxBounds.x.min, this.maxBounds.x.max);
            ly = minMax(ly, this.maxBounds.y.min, this.maxBounds.y.max);
        }
        this.graphElements.$zoomOut.css('display', 'block');
        this.graphElements.$zoomReset.css('display', 'block'); 
        if (objectExists(this.graphOptions.events) && 
            objectExists(this.graphOptions.events.onPanStart)) {
            if (!this.graphOptions.events.onPanStart(this, dlx, lx, lx + gx, dly, ly, ly + gy)){
                return;
            }
        }        
        this.draw({min: lx, max: lx + gx}, {min: ly, max : ly + gy});
        if (objectExists(this.graphOptions.events) && 
            objectExists(this.graphOptions.events.onPanEnd)) {
            this.graphOptions.events.onPanEnd(this, dlx, lx, lx + gx, dly, ly, ly + gy);            
        }  
    }

    /**
     * @brief   Using "this" and mouse offset x,y, do a pan operation.
     *
     * @param   ctx         2D overlay context.
     * @param   offsetX     Event's offsetX mouse value.
     * @param   offsetY     Event's offsetY mouse value.
     */
    _doMouseOver(ctx, offsetX, offsetY) {
        if ((offsetX < this.lastLayout.graph.x) ||
            (offsetY < this.lastLayout.graph.y) ||
            (offsetX > this.lastLayout.graph.x + this.lastLayout.graph.w) || 
            (offsetY > this.lastLayout.graph.y + this.lastLayout.graph.h)) {
            return;
        }
            
        // Look for hover over, sx,sy scales screen to data, px,py is data space x,y.
        let sx = (this.lastBounds.x.max - this.lastBounds.x.min) / this.lastLayout.graph.w;
        let sy = (this.lastBounds.y.max - this.lastBounds.y.min) / this.lastLayout.graph.h;
        let px = ((offsetX - this.lastLayout.graph.x) * sx) + this.lastBounds.x.min;
        let py = ((offsetY - this.lastLayout.graph.y) * sy) + this.lastBounds.y.min;
        
        // Not over anything if not +/- 20 pixels.
        let dx = 20 * sx; 
        let dy = 20 * sy;
        
        // We use inverse sx and sy in the loop.
        sx = 1 / sx;
        sy = 1 / sy;
        
        let best = {range: undefined, series: undefined, cache: -1, index: -1 };
        if (this.graphOptions.main.graphType === '2D') {
            for (let ii = 0; ii < this.series.length; ii++) {
                best = this.series[ii].mouseOver2D(px, py, dx, dy, sx, sy, best);
            }
            if (best.series !== undefined) {
                // Show it.
                best.series.drawMouseOver2D(ctx, this.lastLayout.graph, this.lastBounds, best);
            }
        }                   
    }
    
    /**
     * @brief   Canvas event.
     * 
     * @param   eventId         What the event is.
     * @param   eventObj        The UI event.
     * @param   $canvasParent   Parent of canvases.
     */
    canvasEvent(eventId, eventObj, $canvasParent) {
        if (this.graphElements.$overlay.length === 0) {
            return;
        }
        let overlayCanvas = this.graphElements.$overlay[0];
        let ctx = overlayCanvas.getContext("2d");
        if (eventObj.target.nodeName === 'BUTTON'){
            return;
        }
        let wasButton = eventObj.which;
        let dragKey = eventObj.shiftKey;
        if (eventId > 10) {
            let evtStr =  (eventId === 14)? 'move' : eventId === 15 ? 'down' : eventId === 16 ? 'up' : eventId;
            console.log("Touch event: " + eventId + ' ' + evtStr);
            eventId -= 10;
            eventObj.preventDefault();   
            if (objectExists(eventObj.touches) &&
                (eventObj.touches.length > 1)) {
                // Treat as drag.
                dragKey = true;
            }
            if (objectExists(eventObj.targetTouches) && 
                (eventObj.targetTouches.length > 0)) {
                eventObj.offsetX = eventObj.targetTouches[0].clientX;
                eventObj.offsetY = eventObj.targetTouches[0].clientY;
                eventObj.buttons = 1;
            } else {
                if (objectExists(eventObj.changedTouches) && 
                    (eventObj.changedTouches.length > 0)) {
                    // Touch release.
                    eventObj.offsetX = eventObj.changedTouches[0].clientX;
                    eventObj.offsetY = eventObj.changedTouches[0].clientY;
                    eventObj.buttons = 1;
                    wasButton = 1;
                }
            }
        }
        switch(eventId){
            case 0: // click.
                break;
            case 1: // dblclick.
                break;
                
            case 2: // mouse enter.
                this.graphElements.$elements.css('opacity', 1);
                break;
                
            case 3: // mouse leave.
                this.graphElements.$elements.css('opacity', 0.2);
                ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                this.lastXY = {x: -1, y: -1};
                break;
                
            case 4: // mouse move.
                if (eventObj.buttons === 0) {
                    // No mouse button.
                    this.lastXY = {x: -1, y: -1};
                    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                    this._doMouseOver(ctx, eventObj.offsetX, eventObj.offsetY);
                    break;
                }
                
                if (eventObj.buttons === 1) {
                    if ((this.lastXY.x === -1) || (this.lastXY.y === -1)) {
                        return; // Do nothing.
                    }
                    let in_normal = 
                        inBox(this.lastXY.x, this.lastXY.y, this.lastLayout.graph) &&
                        inBox(eventObj.offsetX, eventObj.offsetY, this.lastLayout.graph);
                    let in_summary = 
                        inBox(this.lastXY.x, this.lastXY.y, this.lastLayout.xSummary) &&
                        inBox(eventObj.offsetX, eventObj.offsetY, this.lastLayout.xSummary);
                    if ((!in_normal) && (!in_summary)) {
                        // One of the points is out of bounds, don't do anything.
                        return;
                    }
                    if (!dragKey) {
                        // left move zoom.
                        // Going to do something, so clear.
                        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                        let lx = this.lastXY.x;
                        let wi = eventObj.offsetX - this.lastXY.x;
                        let ly = this.lastXY.y;
                        let he = eventObj.offsetY - this.lastXY.y;
                        let mode = 'auto';
                        ctx.fillStyle = '#80808080'; // Default.
                        let strokeColor = '';
                        if (objectExists(this.graphOptions.main.zoom)) {
                            mode = defaultObject(this.graphOptions.main.zoom.currentMode, 'auto');
                            ctx.fillStyle = defaultObject(this.graphOptions.main.zoom.fillColor, '#80808080');
                            strokeColor = defaultObject(this.graphOptions.main.zoom.strokeColor, '');                          
                        }
                        let wi_abs = Math.abs(wi);
                        let he_abs = Math.abs(he);
                        if (mode === 'auto') {
                            if ((wi_abs < 10) && (he_abs > 100)) {
                                mode = 'x';
                            }
                            if ((he_abs < 10) && (wi_abs > 100)) {
                                mode = 'y';
                            }
                        }
                        let layoutInside = in_normal ? this.lastLayout.graph : this.lastLayout.xSummary;
                        if (mode === 'x') {
                            // x only zoom.
                            ly = layoutInside.y;
                            he = layoutInside.h;
                        }
                        if (mode === 'y') {
                            lx = layoutInside.x;
                            wi = layoutInside.w;
                        }
                    
                        ctx.fillRect(lx, ly, wi, he);
                        if (strokeColor !== '') {
                            ctx.lineWidth = 1;
                            ctx.strokeStyle = strokeColor;
                            ctx.strokeRect(lx, ly, wi, he);
                        }
                    } else {
                        // Pan.                        
                        this._doPan(eventObj.offsetX, eventObj.offsetY);                        
                    }
                }
                break;
                
            case 5: // down.
                ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                if (eventObj.buttons === 1) {
                    this.lastXY = {x: eventObj.offsetX, y: eventObj.offsetY};
                }
                break;
                
            case 6: // up.
                ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                if ((this.lastXY.x === -1) || (this.lastXY.y === -1)) {
                    return;
                }
                if ((!objectExists(this.lastLayout))       ||
                    (!objectExists(this.lastLayout.graph)) ||
                    (!objectExists(this.lastBounds))       ||
                    (!objectExists(this.lastBounds.x))     ||
                    (!objectExists(this.lastBounds.y))) {
                    return;
                }
                let lx = eventObj.offsetX;
                let hx = this.lastXY.x;
                let ly = eventObj.offsetY;
                let hy = this.lastXY.y;
                if (this.lastXY.x < eventObj.offsetX) {
                    lx = this.lastXY.x;
                    hx = eventObj.offsetX;
                } 
                if (this.lastXY.y < eventObj.offsetY) {
                    ly = this.lastXY.y;
                    hy = eventObj.offsetY;
                } 
                
                if (wasButton === 1) {
                    let in_normal = 
                        inBox(this.lastXY.x, this.lastXY.y, this.lastLayout.graph) &&
                        inBox(eventObj.offsetX, eventObj.offsetY, this.lastLayout.graph);
                        inBox(this.lastXY.x, this.lastXY.y, this.lastLayout.xSummary);
                    let in_summary = 
                        inBox(this.lastXY.x, this.lastXY.y, this.lastLayout.xSummary) &&
                        inBox(eventObj.offsetX, eventObj.offsetY, this.lastLayout.xSummary);
                    if ((!in_normal) && (!in_summary)) {
                        // One of the points is out of bounds, don't do anything.
                        return;
                    }

                    if (!dragKey) { 
                        if ((hx - lx < 4) || (hy - ly < 4)) {
                            return;
                        }
                        
                        let mode = 'auto';
                        if (objectExists(this.graphOptions.main.zoom)) {
                            mode = defaultObject(this.graphOptions.main.zoom.currentMode, 'auto');
                        }
                        let wi = Math.abs(hx - lx);
                        let he = Math.abs(hy - ly);
                        if (mode === 'auto') {
                            if ((wi < 10) && (he > 100)) {
                                mode = 'x';
                            }
                            if ((he < 10) && (wi > 100)) {
                                mode = 'y';
                            }
                        }
                        let layoutInside = in_normal ? this.lastLayout.graph : this.lastLayout.xSummary;
                        let bounds = in_normal ? this.lastBounds : this.maxBounds;
                        if (mode === 'x') {
                            // x only zoom.
                            ly = layoutInside.y;
                            hy = layoutInside.h + ly;
                        }
                        if (mode === 'y') {
                            lx = layoutInside.x;
                            hx = layoutInside.w + lx;
                        }
                        
                        // Release of left click, no shift key so, zoom!
                        // Compute the data lx, hx, ly, hy from screen.
                        let sx = (bounds.x.max - bounds.x.min) / layoutInside.w;
                        let sy = (bounds.y.max - bounds.y.min) / layoutInside.h;
                        lx = ((lx - layoutInside.x) * sx) + bounds.x.min;
                        hx = ((hx - layoutInside.x) * sx) + bounds.x.min;
                        ly = ((ly - layoutInside.y) * sy) + bounds.y.min;
                        hy = ((hy - layoutInside.y) * sy) + bounds.y.min;
                        
                        // Limit to data bounds.
                        lx = minMax(lx, this.maxBounds.x.min, this.maxBounds.x.max);
                        hx = minMax(hx, this.maxBounds.x.min, this.maxBounds.x.max);
                        ly = minMax(ly, this.maxBounds.y.min, this.maxBounds.y.max);
                        hy = minMax(hy, this.maxBounds.y.min, this.maxBounds.y.max);
                        
                        this.zoom.push( {x:{min: lx, max: hx}, y:{min: ly, max : hy}});
                        this.graphElements.$zoomOut.css('display', 'block');
                        this.graphElements.$zoomReset.css('display', 'block'); 
                        
                        if (objectExists(this.graphOptions.events) && 
                            objectExists(this.graphOptions.events.onZoomStart)) {
                            if (!this.graphOptions.events.onZoomStart(this, lx, hx, ly, hy)){
                                return;
                            }
                        }        
                        this.draw({min: lx, max: hx}, {min: ly, max : hy});
                        if (objectExists(this.graphOptions.events) && 
                            objectExists(this.graphOptions.events.onZoomEnd)) {
                            this.graphOptions.events.onZoomEnd(this, lx, hx, ly, hy);                             
                        }  
                        
                    } else {
                        // On mouse up push the pan change.
                        this.zoom.push( {
                            x:{min: this.lastBounds.x.min, max: this.lastBounds.x.max}, 
                            y:{min: this.lastBounds.y.min, max: this.lastBounds.y.max}});
                    }
                }
                break;
                
            default: // 
                break;
        }
    }
    
    /**
     * @brief   Zoom out one step.
     */
    zoomOut() {
        if (this.zoom.length > 0) {
            this.zoom.pop();
        }
        if (this.zoom.length > 0) {
            let lvl = this.zoom[this.zoom.length-1];
            this.draw(lvl.x, lvl.y);
        } else {
            this.zoomReset();   
        }
    }
    
    /**
     * @brief   Reset the zoom.
     */
    zoomReset() {
        this.zoom = [];
        let $el = $('#' + this.guid);
        $el.find('.ggGraph_stepOut').css('display', 'none');
        $el.find('.ggGraph_stepReset').css('display', 'none');
        this.draw(undefined, undefined);
    }
    
    /**
     * @brief   Add series to the graph and update it.
     *
     * @param   series  Series to add.     
     */
    addSeries(series) {
        this.series.push(series);
        ggGraph_Graphs[this.guid] = this;
    }	
}

/**
 * @brief   Event.
 * 
 * @param   eventId     Which event.
 * @param   that        Which element passed in.
 */
function _canvasEvent(eventId, that) {
    let e = window.event;
    let gp_id = that.parentElement.parentElement.id;
    let g = ggGraph.getGraph(gp_id);
    
    g.canvasEvent(eventId, e, $(that).parent());   
}

/**
 * Setup a series of JQuery elements that are graphs.
 */
function _setup($graphs) {
    // Each item should become:
    // <div class=ggGraph_line>
    // |------------------------------|
    // |           _content           |
    // |------------------------------|
    const events = 
        ' onclick="ggGraph.canvasEvent(0, this);"' + 
        ' ondblclick="ggGraph.canvasEvent(1, this);"' +
        ' onmouseenter="ggGraph.canvasEvent(2, this);"' +
        ' onmouseleave="ggGraph.canvasEvent(3, this);"' +
        ' onmousemove="ggGraph.canvasEvent(4, this);"' +
        ' onmousedown="ggGraph.canvasEvent(5, this);"' +
        ' onmouseup="ggGraph.canvasEvent(6, this);"' +
        // > 10, are touches that remap to mouse like things.
        ' onTouchstart="ggGraph.canvasEvent(15, this);"' +
        ' onTouchend="ggGraph.canvasEvent(16, this);"' +
        ' onTouchmove="ggGraph.canvasEvent(14, this);"';
    const stackedStyle = 'style="position: absolute; top: 0; left: 0;float:none; width:100%; height:100%"';
    const stackedStyle2 = 'style="position: absolute; top: 0; left: 0;float:none; width:100%; height:100%; opacity: 0.2; transition: opacity 0.5s;"';
    const btnStyleStart = 'style="position:relative; display:none; width:30px; height: 30px; left:calc(100% - 30px);" ';
    const graph_elements = 
        '<button class="ggGraph_stepOut" ' + btnStyleStart +        
        'onclick="ggGraph.getGraph(this.parentElement.parentElement.parentElement.id).zoomOut();" ' + 
        'title="Pan/Zoom out">-</button>' +
        '<button class="ggGraph_stepReset" ' + btnStyleStart + 
        'onclick="ggGraph.getGraph(this.parentElement.parentElement.parentElement.id).zoomReset();" ' + 
        'title="Reset pan/zoom">X</button>';
        
    for (let ii = 0; ii < $graphs.length; ii++) {
        let $g = $($graphs[ii]);
        if ($g.children('.ggGraph_content').length == 0) {
            // The graph's top level container doesn't contain a top, 
            // we need to rebuild it!
            
            $g.html(
                '<div class="ggGraph_content" style="position: relative; width: 100%; height: 100%;">' + 
                '<canvas class="ggGraph_canvas" ' + stackedStyle + 
                events + '></canvas><canvas class="ggGraph_overlay" ' + stackedStyle +
                events + '></canvas><div class="ggGraph_elements" ' + stackedStyle + events +
                '>' + graph_elements + '</div></div>\n');
            ggGraph_Graphs[$g[0].id] = new Graph($g[0].id);
        }
    }
}

/**
 * @brief   Resize.
 */
function _resize(item) { 
    let g = ggGraph.getGraph(item.id);
    if ((g !== undefined) && (g !== null)) {
        g.handleResize();
    }
}

/**
 * @brief   Find all ggGraphs and set them up.
 */
function _init() {		
    _setup($('.ggGraph_line'));
    _setup($('.ggGraph_scatter'));
    setInterval(function () {
        $('.ggGraph_line').each(function () { _resize(this);});
        $('.ggGraph_scatter').each(function () { _resize(this);});
    }, 250);
}

/**
 * @brief   Setup test data in the data hive.
 */
function _setupTestData() {
    dsx1 = new DataSeries('test_guid_1x');
    dsx2 = new DataSeries('test_guid_2x');
    dsxr = new DataSeries('test_guid_rx');
    dsy1 = new DataSeries('test_guid_1y');
    dsy2 = new DataSeries('test_guid_2y');
    dsy3 = new DataSeries('test_guid_3y');
    dsy4 = new DataSeries('test_guid_4y');
    dsy5 = new DataSeries('test_guid_5y');
    ggGraph_DataHive.add_dataSeries(dsx1);
    ggGraph_DataHive.add_dataSeries(dsx2);
    ggGraph_DataHive.add_dataSeries(dsxr);
    ggGraph_DataHive.add_dataSeries(dsy1);
    ggGraph_DataHive.add_dataSeries(dsy2);
    ggGraph_DataHive.add_dataSeries(dsy3);
    ggGraph_DataHive.add_dataSeries(dsy4);
    ggGraph_DataHive.add_dataSeries(dsy5);

    for (let jj = 0; jj < 4; jj++) {
        let dx1 = [];
        let dx2 = [];
        let dxr = [];
        let dy1 = [];
        let dy2 = [];
        let dy3 = [];
        let dy4 = [];
        let dy5 = [];
        for (let ii = 0; ii < 250; ii++) {
            let x = jj + (ii * 0.004);
            dx1.push(jj + (ii * 0.004));
            dy1.push(x * x);
            dy2.push(2 - x * x);
        }
        for (let ii = 0; ii < 5; ii++) {
            let x = jj + (ii * 0.2);
            dx2.push(x);
            dxr.push(x);
            dy3.push(5 + 0.5 * x * x);
            dy4.push(2 - 0.25 * x * x);
            dy5.push(ii);
        }
        dsx1.push(dx1);
        dsx2.push(dx2);
        dsxr.push(dxr);
        dsy1.push(dy1);
        dsy2.push(dy2);
        dsy3.push(dy3);
        dsy4.push(dy4);
        dsy5.push(dy5);
    }
}

/**
 * @brief   Create a test line graph.
 *
 * @param   targetElement   Element to turn into a graph.
 */
function _setupTestLineGraph(targetElement) {
    let g = new Graph(targetElement);
    let opt1 = make_seriesOptions('red series', '#ff0000', 'none', 'none', 0, 0, 0);
    let opt2 = make_seriesOptions('green series', '#00ff00', 'none', 'none', 0, 0, 0);
    g.addSeries(new LineSeries(
        opt1,
        'test_guid_1x', 
        'test_guid_1y'));
    g.addSeries(new LineSeries(
        opt2,
        'test_guid_1x', 
        'test_guid_2y'));
}

/**
 * The design takes the view that you know jquery, and can find either:
 * * Let the library handle the things by finding ggGraph class elements ...
 * * Or you can find the html element containing your own graph, and pass the
 *   element to the API to get an API object to act on that element.
 */
ggGraph = {
	/**
	 * Call to discover any 
	 * Initializes all ggGraph_line, ggGraph_scatter, etc. element classes and html elements.
	 */
	initialize : _init,
	
	/**
	 * Get the graph class for a given thing.
	 */
	getGraph : function(id_or_guid) {
		return (id_or_guid in ggGraph_Graphs) ? ggGraph_Graphs[id_or_guid] : null;
	},
	
	/**
	 * Make a graph.
	 */
	makeGraph : function(id_or_guid) {
        _setup($(id_or_guid));
		return new Graph(id_or_guid);
	},
	
	/**
	 * Data hive.
	 */
	dataHive : ggGraph_DataHive,

	/**
	 * Setup test data.
	 */
	setupTestData : _setupTestData,
	
	/** 
	 * Setup a test graph.
	 */
	setupTestLineGraph : _setupTestLineGraph,
    
    /**
     * Canvas event.
     */
    canvasEvent: _canvasEvent    
};
