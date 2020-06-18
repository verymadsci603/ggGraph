/**
 * @brief   ggGraphs
 *
 * @author  Phil Braica  HoshiKata@aol.com
 *
 * @copyright 2020, Philip Braica, MIT License
 *
 */


ggGraph_DataHive = new DataHive();

    
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
                
            let titleLike = make_textBoxOptions(
                true, 
                'text',
                '#FFFFFF',
                '#404040',
                '#000000',
                1,
                14,
                'top');
            let axisLike = make_axisOptions(
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
                titleLike, titleLike, titleLike,
                axisLike, axisLike, undefined, axisLike);         
        }   
    
        this.guid = id_or_guid;
        this.series = [];
        this.graphOptions = graphOptions;
        this.lastBounds = {'x': null, 'y': null, 'y2': null, 'z': null, 'w': null, 'h': null};
        this.lastLayout = {};
        this.lastXY = {x:0, y: 0};
        this.zoom = [];
        let $topEl = $(this.guid);        
        this.graphElements = {
            $top: $topEl,
            $canvas: $topEl.find('.ggGraph_canvas'),
            $overlay: $topEl.find('.ggGraph_overlay'),
            $elements: $topEl.find('.ggGraph_elements'),
            $zoomReset: $topEl.find('.ggGraph_zoomReset'),
            $zoomOut: $topEl.find('.ggGraph_zoomOut')    
        };            
        ggGraph_Graphs[id_or_guid] = this;
    }
    
    _roundGraphValue(val, divs) {
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
                if (valStr.length - clipPos > 6) {
                    valStr = ''  + (val/1000000) + ' m';
                } else { 
                    if (valStr.length - clipPos > 3) {
                        valStr = ''  + (val/1000) + ' k';
                    }
                }
            }
        }
        return valStr;        
    }

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
                        let v_str = this._roundGraphValue(tmp, divs);
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
                        let v_str = this._roundGraphValue(tmp, divs);
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
     */
    _computeAxis(ctx, canvas_layout, dataBoundsX, dataBoundsY) {
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
        
        mx = this._computeAxisMarkers(ctx, true, lx, hx, canvas_layout.xAxis.w, 
            canvas_layout.xAxis.h, this.graphOptions.main.margin, this.graphOptions.xAxis);
        my = this._computeAxisMarkers(ctx, false, ly, hy, canvas_layout.yAxis.w, 
            canvas_layout.yAxis.h, this.graphOptions.main.margin, this.graphOptions.yAxis);
            
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
     * @param   isAxis  Is this an axis.
     */
    _computeBox(ctx, box, opt, isAxis) {
        
        let margin = objectExists(this.graphOptions.main.margin) ? this.graphOptions.main.margin : 4;
        if ((this.graphOptions) && (opt) && (opt.show)) {
            let offset = (objectExists(opt.borderSizePx) ? parseInt(opt.borderSizePx) * 2 : 0) + margin;
            if ((opt.loc == 'top') || (opt.loc == 'bottom')) { 
                let h = offset;
                if (objectExists(opt.textStr) && (opt.textStr.length > 0)) {
                    h += opt.textSizePx;
                    if (isAxis) {                        
                        h += margin;
                    }
                } 
                if (isAxis) {
                    h += opt.textSizePx + (objectExists(opt.markerSizePx) ? opt.markerSizePx : 6);
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
                ctx.font = "" + opt.textSizePx + "px Verdana";
                let w = offset + ctx.measureText(opt.textStr).width;
                w = w > opt.textSizePx * 5 ? w : opt.textSizePx * 5;
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
        let box = {x: 0, y: 0, w: width, h: height};
        if (!objectExists(this.graphOptions)) {
            return {
                banner: null,
                title:  null,
                legend: null,
                graph:  box,
                xAxis:  null,
                yAxis:  null,
                yAxis2: null};
        }
        let banner = undefined;
        let title = undefined;
        let legend = undefined;
        
        [banner, box] = this._computeBox(ctx, box, this.graphOptions.banner, false);
        [title,  box] = this._computeBox(ctx, box, this.graphOptions.title,  false);
        [legend, box] = this._computeBox(ctx, box, this.graphOptions.legend, false);
        
        let xopt = deepCopy(this.graphOptions.xAxis);
        let yopt = deepCopy(this.graphOptions.yAxis);
        let yopt2 = deepCopy(this.graphOptions.yAxis2);
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
        [xAxis,  box] = this._computeBox(ctx, box, xopt, true);
        [yAxis,  box] = this._computeBox(ctx, box, yopt, true);
        [yAxis2, box] = this._computeBox(ctx, box, yopt2, true);

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
        return {
            banner: banner,
            title: title,
            legend: legend,
            graph: box,
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
                $zoomReset: $topEl.find('.ggGraph_zoomReset'),
                $zoomOut: $topEl.find('.ggGraph_zoomOut')            
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
        let axisInfo = this._computeAxis(ctx, canvas_layout, dataBoundsX, dataBoundsY);
        this.lastBounds.x = { min: axisInfo.xBounds.min, max: axisInfo.xBounds.max};
        this.lastBounds.y = { min: axisInfo.yBounds.min, max: axisInfo.yBounds.max};
        this.graphElements.$zoomOut.css('top', canvas_layout.graph.y);
        this.graphElements.$zoomReset.css('top', canvas_layout.graph.y);
        
        if (this.graphOptions) {
            if (this.graphOptions.main.graphType === '2D') {
                
                // Paint the series.
                ctx.fillStyle = this.graphOptions.main.backgroundColor;
                ctx.clearRect(0, 0, cw, ch);
                ctx.fillRect(0, 0, cw, ch);
                
                let xmarks  = objectExists(axisInfo.xBounds)  ? axisInfo.xBounds.marks  : undefined;
                let ymarks  = objectExists(axisInfo.yBounds)  ? axisInfo.yBounds.marks  : undefined;
                let ymarks2 = objectExists(axisInfo.yBounds2) ? axisInfo.yBounds2.marks : undefined;
                
                this.drawGrid(ctx, true,  canvas_layout.graph, xmarks,  this.graphOptions.xAxis);
                this.drawGrid(ctx, false, canvas_layout.graph, ymarks,  this.graphOptions.yAxis);
                this.drawGrid(ctx, false, canvas_layout.graph, ymarks2, this.graphOptions.yAxis2);
                
                for (let ii = 0; ii < this.series.length; ii++) {
                    this.series[ii].draw2D(ctx, axisInfo, canvas_layout.graph);
                }
                
                // Now clear behind the axis.
                ctx.fillStyle = this.graphOptions.main.backgroundColor;
                let axiss = [canvas_layout.xAxis, canvas_layout.yAxis, canvas_layout.xAxis];
                for (let ii = 0; ii < 3; ii++) {
                    if (objectExists(axiss[ii])) {
                        ctx.clearRect(0, axiss[ii].y, axiss[ii].w, axiss[ii].h);
                        ctx.fillRect(0, axiss[ii].y, axiss[ii].w, axiss[ii].h);
                    }
                }
                
                // Paint the axis.
                this.drawAxis(ctx, true,  this.graphOptions.xAxis,  canvas_layout.xAxis,  xmarks);
                this.drawAxis(ctx, false, this.graphOptions.yAxis,  canvas_layout.yAxis,  ymarks);
                this.drawAxis(ctx, false, this.graphOptions.yAxis2, canvas_layout.yAxis2, ymarks2);
                
                // Paint the legend, title, banner.
                this.drawTextOption(ctx, this.graphOptions.legend, canvas_layout.legend);
                this.drawTextOption(ctx, this.graphOptions.title,  canvas_layout.title);
                this.drawTextOption(ctx, this.graphOptions.banner, canvas_layout.banner);
            }
        }
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
        ctx.fillStyle = clr
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
     */
    drawAxis(ctx, isHorizontal, opt, loc, marks) {
        if ((!objectExists(opt)) || (!objectExists(loc)) || (opt.show === false)) {
            return;
        }
        let hasMarker = objectExists(opt.markerColor);
        let hasText = objectExists(opt.textColor) && (opt.textSizePx > 0);
        
        if (objectExists(opt.backgroundColor)) {
            ctx.fillStyle = opt.backgroundColor;
            ctx.fillRect(loc.x, loc.y, loc.w, loc.h);
        }

        if (objectExists(opt.textStr) && hasText) {  
            if (isHorizontal) {
                drawCenteredFloorText(ctx, opt.textColor, 'Verdana', opt.textSizePx, loc, opt.textStr);
            } else {
                drawCenteredText(ctx, opt.textColor, 'Verdana', opt.textSizePx, loc, opt.textStr);
            }
        } 
        
        // Any more to do?
        if (!(hasText || hasMarker)) {
            return;
        }
        
        // Note:
        // loc is the bounding box, axis is min, max, marks = array
        ctx.beginPath();
        ctx.strokeStyle = hasMarker ? opt.markerColor : '#000000';
        ctx.lineWidth = 2;
        ctx.fillStyle = opt.textColor;
        let margin = objectExists(this.graphOptions.main.margin) ? this.graphOptions.main.margin : 4;
        let mark = objectExists(opt.markerSizePx) ? opt.markerSizePx : 6;
        
        
        if (isHorizontal) {
            
            let txt_min = loc.x + loc.w * 2;
            let txt_max = txt_min + 1;
            if (hasText && (loc.h <= mark + margin + margin + opt.textStr * 2)) {
                if (objectExists(opt.textStr) && opt.textStr.length > 0) {
                    let titleWidth = ctx.measureText(opt.textStr).width;
                    txt_min = loc.x + (loc.w - titleWidth)/2 - margin;
                    txt_max = txt_min + titleWidth + margin;
                }
            }
            
            // Line.
            if (hasMarker) {
                ctx.moveTo(loc.x, loc.y);
                ctx.lineTo(loc.x + loc.w, loc.y);
            }
            
            let textY = loc.y + mark + margin + opt.textSizePx;  
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
        if (objectExists(opt.backgroundColor)) {
            ctx.fillStyle = opt.backgroundColor;
            ctx.fillRect(loc.x, loc.y, loc.w, loc.h);
        }
        if (objectExists(opt.boxEdgeColor) && (opt.borderSizePx > 0)) {
            ctx.strokeStyle = opt.boxEdgeColor;
            ctx.lineWidth = opt.borderSizePx;
            ctx.strokeRect(loc.x, loc.y, loc.w, loc.h);
        }
        if (objectExists(opt.textStr) && objectExists(opt.textColor) && (opt.textSizePx > 0)) {
            drawCenteredText(ctx, opt.textColor, 'Verdana', opt.textSizePx, loc, opt.textStr);    
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
        let overlayCanvas = $canvasParent.children('.ggGraph_overlay')[0]
        let ctx = overlayCanvas.getContext("2d");
        if (eventObj.target.nodeName === 'BUTTON'){
            return;
        }
        switch(eventId){
            case 0: // click.
            case 1: // dblclick.
            case 2: // enter.
            case 3: // leave.                
                ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                this.lastXY = {x: -1, y: -1};
                break;
            case 4: // move.
                if (eventObj.buttons === 0) {
                    this.lastXY = {x: -1, y: -1};
                }
                if (eventObj.buttons === 1) {
                    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                    ctx.fillStyle = '#80808080';
                    ctx.fillRect(this.lastXY.x, this.lastXY.y, eventObj.offsetX - this.lastXY.x, eventObj.offsetY - this.lastXY.y);
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
                    hx = eventObj.x;
                } 
                if (this.lastXY.y < eventObj.offsetY) {
                    ly = this.lastXY.y;
                    hy = eventObj.y;
                } 
                if ((hx - lx < 4) || (hy - ly < 4)) {
                    return;
                }
                if (eventObj.which === 1) { 
                    // Release of left click.
                    let sx = (this.lastBounds.x.max - this.lastBounds.x.min) / this.lastLayout.graph.w;
                    let sy = (this.lastBounds.y.max - this.lastBounds.y.min) / this.lastLayout.graph.h;
                    lx = ((lx - this.lastLayout.graph.x) * sx) + this.lastBounds.x.min;
                    hx = ((hx - this.lastLayout.graph.x) * sx) + this.lastBounds.x.min;
                    ly = ((ly - this.lastLayout.graph.y) * sy) + this.lastBounds.y.min;
                    hy = ((hy - this.lastLayout.graph.y) * sy) + this.lastBounds.y.min;
                    this.zoom.push( {x:{min: lx, max: hx}, y:{min: ly, max : hy}});
                    $canvasParent.find('.ggGraph_zoomOut').css('display', 'block');
                    $canvasParent.find('.ggGraph_zoomReset').css('display', 'block');                
                    this.draw({min: lx, max: hx}, {min: ly, max : hy});
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
        $el.find('.ggGraph_zoomOut').css('display', 'none');
        $el.find('.ggGraph_zoomReset').css('display', 'none');
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
        ' onmouseup="ggGraph.canvasEvent(6, this);"';
    const stackedStyle = 'style="position: absolute; top: 0; left: 0;float:none; width:100%; height:100%"';
    const btnStyleStart = 'style="position:relative; display:none; width:30px; height: 30px; left:calc(100% - 30px);" ';
    const graph_elements = 
        '<button class="ggGraph_zoomOut" ' + btnStyleStart +        
        'onclick="ggGraph.getGraph(this.parentElement.parentElement.parentElement.id).zoomOut();" ' + 
        'title="Zoomout">-</button>' +
        '<button class="ggGraph_zoomReset" ' + btnStyleStart + 
        'onclick="ggGraph.getGraph(this.parentElement.parentElement.parentElement.id).zoomReset();" ' + 
        'title="Reset zoom">X</button>';
        
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
 * Find all ggGraphs and set them up.
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
    dsx = new DataSeries('test_guid_1x');
    dsy1 = new DataSeries('test_guid_1y');
    dsy2 = new DataSeries('test_guid_2y');
    ggGraph_DataHive.add_dataSeries(dsx);
    ggGraph_DataHive.add_dataSeries(dsy1);
    ggGraph_DataHive.add_dataSeries(dsy2);

    for (let jj = 0; jj < 4; jj++) {
        let dx = [];
        let dy1 = [];
        let dy2 = [];
        for (let ii = 0; ii < 250; ii++) {
            let x = jj + (ii * 0.004);
            dx.push(jj + (ii * 0.004));
            dy1.push(x * x);
            dy2.push(2 - x * x);
        }
        dsx.push(dx);
        dsy1.push(dy1);
        dsy2.push(dy2);
    }
}

/**
 * @brief   Create a test line graph.
 *
 * @param   targetElement   Element to turn into a graph.
 */
function _setupTestLineGraph(targetElement) {
    let g = new Graph(targetElement);
    let opt1 = make_seriesOptions('#ff0000', 'none', 'none', 0, 0, 0);
    let opt2 = make_seriesOptions('#00ff00', 'none', 'none', 0, 0, 0);
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
