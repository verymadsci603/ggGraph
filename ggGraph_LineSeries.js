/**
 * @brief   ggGraphs
 *
 * @author  Phil Braica  HoshiKata@aol.com
 *
 * @copyright 2020, Philip Braica, MIT License
 *
 */

class LineSeries {
    constructor(seriesOptions, xGuid, yGuid, zGuid = '', valuesGuid = '', colorsGuid = '', symbolsGuid = '', labelsGuid = '') {
        this.seriesOptions = seriesOptions;
        this.xGuid = xGuid;
        this.yGuid = yGuid;
        this.zGuid = zGuid;
        this.vGuid = valuesGuid;
        this.cGuid = colorsGuid;
        this.sGuid = symbolsGuid;
        this.lGuid = labelsGuid;
    }
            
    getDataGuid(axis) {
        return axis === 'z' ? this.zGuid : (axis === 'y' ? this.yGuid : this.xGuid);
    }
    
    getData(axis) {
        return ggGraph_DataHive.get_dataSeries(this.getDataGuid(axis));
    }
            
    min(axis) {
        let d = this.getDataGuid(axis);
        return ggGraph_DataHive.min(d);
    }
    
    max(axis) {
        let d = this.getDataGuid(axis);
        return ggGraph_DataHive.max(d);
    }

    fixBounds(bounds, seriesData) {
        if (bounds === null || bounds === undefined) {
            return [seriesData.min(), seriesData.max()];
        }	
        return bounds;
    }
    
    getBounds(is2D) {
        if (is2D) {
            return [[min('x'), max('x')], [min('y'), max('y')]]
        }
        return [[min('x'), max('x')], [min('y'), max('y')], [min('z'), max('z')]]
    }
    
    /**
     * @brief 	Draw a line graph, one color, no markers.
     * 
     * @param 	ctx		Canvas context.
     * @param 	lpx		Last pixel X position.
     * @param 	lpy		Last pixel Y position.
     * @param 	xData	X series data values array.
     * @param 	yData	Y series data values array.
     * @param 	xg 		X gain.
     * @param   xo		X offset.
     * @param 	yg 		Y gain.
     * @param   yo		Y offset.
     */
    _draw2DSegment_Line(ctx, lpx, lpy, xData, yData, xg, xo, yg, yo) {
        let len = xData.length < yData.length ? xData.length : yData.length;
        let xp = lpx === null ? (xData[0] * xg) + xo : lpx;
        let yp = lpy === null ? (yData[0] * yg) + yo : lpy;
        for (let ii = 0; ii < len; ii++) {
            ctx.moveTo(xp, yp);				
            xp = (xData[ii] * xg) + xo;
            yp = (yData[ii] * yg) + yo;
            ctx.lineTo(xp, yp);
        }
        return xp, yp;
    }
    
    /**
     * @brief 	Draw a line graph, one color, no markers.
     * 
     * @param 	ctx		Canvas context.
     * @param 	xData	X series data values array.
     * @param 	yData	Y series data values array.
     * @param 	xg 		X gain.
     * @param   xo		X offset.
     * @param 	yg 		Y gain.
     * @param   yo		Y offset.
     */
    _draw2DSegment_Marker(ctx, xData, yData, xg, xo, yg, yo) {
        
        let len = xData.length < yData.length ? xData.length : yData.length;
        let rad = this.seriesOptions.defaultMarkerSize / 2;
        for (let ii = 0; ii < len; ii++) {
            let xp = xData[ii]*xg + xo;
            let yp = yData[ii]*yg + yo;
            
            // Just squares for now.
            ctx.strokeRect(xp - rad, yp - rad, xp + rad, yp + rad);
        }
    }
    
    
    draw2D(ctx, dataBounds, layout) {
        
        let x = this.getData('x');
        let y = this.getData('y');
        let lpx = null;
        let lpy = null;
        
        // pixel = (data - db[0])* (cb[1] - cb[0])/(db[1] - db[0]) + cb[0]
        //       = data * (cb[1] - cb[0])/(db[1] - db[0]) - db[0] * (cb[1] - cb[0])/(db[1] - db[0]) + cb[0]
        let xg = layout.w / (dataBounds.xBounds.max - dataBounds.xBounds.min);
        let xo = -dataBounds.xBounds.min * xg + layout.x;
        let yg = layout.h / (dataBounds.yBounds.max - dataBounds.yBounds.min);
        let yo = -dataBounds.yBounds.min * yg + layout.y;
        
        let accel = _drawAccelerationType(this.seriesOptions);
        let cacheLen = x.cache.length;
        
        // Generic line plot?
        if (accel == 0) {					
            ctx.strokeStyle = this.seriesOptions.defaultLineColor;
            ctx.beginPath();
            for (let ii = 0; ii < cacheLen; ii++) {
                if (x.mins[ii] >= dataBounds.xBounds.min && x.maxs[ii] <= dataBounds.xBounds.max && 
                    y.mins[ii] >= dataBounds.yBounds.min && y.maxs[ii] <= dataBounds.yBounds.max) {					

                    lpx, lpy = this._draw2DSegment_Line(ctx, lpx, lpy, x.cache[ii], y.cache[ii], xg, xo, yg, yo);
                }
            }
            ctx.stroke();
        }
            
        // Generic marker plot?
        if (accel == 1)  {
            ctx.strokeStyle = this.seriesOptions.defaultMarkerColor;
            for (let ii = 0; ii < cacheLen; ii++) {
                if (x.mins[ii] >= dataBounds.xBounds.min && x.maxs[ii] <= dataBounds.xBounds.max && 
                    y.mins[ii] >= dataBounds.yBounds.min && y.maxs[ii] <= dataBounds.yBounds.max) {					

                    this._draw2DSegment_Marker(ctx, x.cache[ii], y.cache[ii], xg, xo, yg, yo);
                }
            }
        }
        
        // Generic line & marker plot?
        if (accel == 2)  {				
            for (let ii = 0; ii < x.length; ii++) {
                if (x.mins[ii] >= dataBounds.xBounds.min && x.maxs[ii] <= dataBounds.xBounds.max && 
                    y.mins[ii] >= dataBounds.yBounds.min && y.maxs[ii] <= dataBounds.yBounds.max) {

                    ctx.strokeStyle = this.seriesOptions.defaultLineColor;
                    ctx.beginPath();                    
                    lpx, lpy = this._draw2DSegment_Line(ctx, lpx, lpy, x.cache[ii], y.cache[ii], xg, xo, yg, yo);
                    ctx.stroke();
                    
                    ctx.strokeStyle = this.seriesOptions.defaultMarkerColor;		
                    this._draw2DSegment_Marker(ctx, x.cache[ii], y.cache[ii], xg, xo, yg, yo);				
                }
            }
        }
    }			
}