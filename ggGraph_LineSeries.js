/**
 * @brief   ggGraphs
 *
 * @author  Phil Braica  HoshiKata@aol.com
 *
 * @copyright 2020, Philip Braica, MIT License
 *
 */

/**
 * @brief   Base class for a series.
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
     * @param 	lpx		Last pixel X position.
     * @param 	lpy		Last pixel Y position.
     * @param 	xData	X series data values array.
     * @param 	yData	Y series data values array.
     * @param 	xg 		X gain.
     * @param   xo		X offset.
     * @param 	yg 		Y gain.
     * @param   yo		Y offset.
     * @param   xso     X screen offset.
     * @param   yso     Y screen offset.
     */
    _draw2DPolarSegment_Line(ctx, lpx, lpy, xData, yData, xg, xo, yg, yo, xso, yso) {
        let len = xData.length < yData.length ? xData.length : yData.length;
        let xp = lpx;
        let yp = lpy;
        if (lpx === null || lpy === null) {            
            let a = (xData[0] * xg) + xo;
            let r = (yData[0] * yg) + yo; 
            xp = r * Math.sin(a) + xso;
            yp = r * Math.cos(a) + yso;
        }
        for (let ii = 0; ii < len; ii++) {
            ctx.moveTo(xp, yp);				
            let a = (xData[ii] * xg) + xo;
            let r = (yData[ii] * yg) + yo; 
            xp = r * Math.sin(a) + xso;
            yp = r * Math.cos(a) + yso;
            ctx.lineTo(xp, yp);
        }
        return xp, yp;
    }
          
    /**
     * @brief   Draw legend entry.
     *
     * @param   ctx         Draw context.
     * @param   textSize    Text size in pixels.
     * @param   textWidth   Premeasured textWidth.
     * @param   colWidth    Column width.
     * @param   margin      Space between things.
     * @param   x           X position.
     * @param   y           Y position.
     */
    draw_legend_item(ctx, textSize, textWidth, colWidth, margin, x, y) {
        let textAligned = textSize / 4;
        ctx.fillText(this.seriesOptions.name.trim(), x, y);
        ctx.strokeStyle = this.seriesOptions.defaultLineColor;
        ctx.setLineDash(toCanvasDash(this.seriesOptions.graphLineDash));
        y -= textAligned;
        x += colWidth - margin - textSize - textSize;
        ctx.beginPath();           
        ctx.moveTo(x, y);
        ctx.lineTo(x + textSize * 2, y);
        ctx.stroke();
        
        if ((this.seriesOptions.defaultMarkerSize > 0) && 
            objectExists(this.seriesOptions.defaultMarkerColor)) {
            ctx.fillStyle = ctx.fillStyle = this.seriesOptions.defaultMarkerColor;
            this._draw2DSegment_Marker(
                ctx,
                [x + textSize],
                [y], 
                1, 0, 1, 0);
        }           
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
        const pi2 = Math.PI * 2;
        let len = xData.length < yData.length ? xData.length : yData.length;
        let s = this.seriesOptions.defaultMarkerSize;
        let s2 = s * 0.5;  
      
        // Circle.
        if (this.seriesOptions.defaultMarkerShape === 'circle') {            
            for (let ii = 0; ii < len; ii++) {
                let xp = (xData[ii] * xg) + xo;
                let yp = (yData[ii] * yg) + yo;                
                ctx.beginPath();
                ctx.arc(xp, yp, s2, 0, pi2, false);
                ctx.fill();
            }
            return;
        }
        
        // Square.
        if (this.seriesOptions.defaultMarkerShape === 'square') {
            for (let ii = 0; ii < len; ii++) {
                let xp = (xData[ii] * xg) + xo;
                let yp = (yData[ii] * yg) + yo;
                ctx.fillRect(xp - s2, yp - s2, s, s);
            }
            return;
        }
        
        // Diamond.
        if (this.seriesOptions.defaultMarkerShape === 'diamond') {
            for (let ii = 0; ii < len; ii++) {
                let xp = (xData[ii] * xg) + xo;
                let yp = (yData[ii] * yg) + yo;
                ctx.beginPath();
                ctx.moveTo(xp - s2, yp);
                ctx.lineTo(xp, yp - s2);
                ctx.lineTo(xp + s2, yp);
                ctx.lineTo(xp, yp + s2);
                ctx.lineTo(xp - s2, yp);
                ctx.fill();
            }
            return;
        }
        
        // Triangles
        if (this.seriesOptions.defaultMarkerShape === 'triangle') {
            // Point up.
            let s3 = s2 * 0.866025403784;
            let s4 = s2 * 0.5;
            for (let ii = 0; ii < len; ii++) {
                let xp = (xData[ii] * xg) + xo;
                let yp = (yData[ii] * yg) + yo;
                ctx.beginPath();
                ctx.moveTo(xp - s3, yp + s4);
                ctx.lineTo(xp, yp - s2);
                ctx.lineTo(xp + s3, yp + s4);
                ctx.lineTo(xp - s3, yp + s4);
                ctx.fill();
            }
            return;
        }
        if (this.seriesOptions.defaultMarkerShape === 'triangle2') {
            // Point down
            let s3 = s2 * 0.866025403784;
            let s4 = s2 * 0.5;
            for (let ii = 0; ii < len; ii++) {
                let xp = (xData[ii] * xg) + xo;
                let yp = (yData[ii] * yg) + yo;
                ctx.beginPath();
                ctx.moveTo(xp - s3, yp - s4);
                ctx.lineTo(xp + s3, yp - s4);
                ctx.lineTo(xp, yp + s2);
                ctx.lineTo(xp - s3, yp - s4);
                ctx.fill();
            }
            return;
        }
        
        // Plus
        if (this.seriesOptions.defaultMarkerShape === 'plus') {
            let s6 = s * 0.3333333 * 0.5;
            for (let ii = 0; ii < len; ii++) {
                let xp = (xData[ii] * xg) + xo;
                let yp = (yData[ii] * yg) + yo;
                ctx.beginPath();
                ctx.moveTo(xp - s6, yp - s2);
                ctx.lineTo(xp + s6, yp - s2);
                ctx.lineTo(xp + s6, yp - s6);
                ctx.lineTo(xp + s2, yp - s6);
                ctx.lineTo(xp + s2, yp + s6);
                ctx.lineTo(xp + s6, yp + s6);
                ctx.lineTo(xp + s6, yp + s2);
                ctx.lineTo(xp - s6, yp + s2);
                ctx.lineTo(xp - s6, yp + s6);
                ctx.lineTo(xp - s2, yp + s6);
                ctx.lineTo(xp - s2, yp - s6);
                ctx.lineTo(xp - s6, yp - s6);
                ctx.lineTo(xp - s6, yp - s2);
                ctx.fill();
            }
            return;
        }
        
        // Cross
        if (this.seriesOptions.defaultMarkerShape === 'cross') {
            let sw = s2 * 0.5;
            let sl = sw; 
            for (let ii = 0; ii < len; ii++) {
                let xp = (xData[ii] * xg) + xo;
                let yp = (yData[ii] * yg) + yo;
                ctx.beginPath();
                ctx.moveTo(xp, yp - sw);
                ctx.lineTo(xp + sl, yp - sl - sw);
                ctx.lineTo(xp + sl + sw, yp - sl);
                ctx.lineTo(xp + sw, yp);
                ctx.lineTo(xp + sl + sw, yp + sl);
                ctx.lineTo(xp + sl, yp + sl + sw);
                ctx.lineTo(xp, yp + sw);
                ctx.lineTo(xp - sl, yp + sl + sw);
                ctx.lineTo(xp - sl - sw, yp + sl);
                ctx.lineTo(xp - sw, yp);
                ctx.lineTo(xp - sl - sw, yp - sl);
                ctx.lineTo(xp - sl, yp - sl - sw);
                ctx.lineTo(xp, yp - sw);                
                ctx.fill();
            }
            return;
        }        
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
     * @param   xso     X screen offset.
     * @param   yso     Y screen offset.
     */
    _draw2DPolarSegment_Marker(ctx, xData, yData, xg, xo, yg, yo, xso, yso) {
        const pi2 = Math.PI * 2;
        let len = xData.length < yData.length ? xData.length : yData.length;
        let s = this.seriesOptions.defaultMarkerSize;
        let s2 = s * 0.5;  

        // Circle.
        if (this.seriesOptions.defaultMarkerShape === 'circle') {            
            for (let ii = 0; ii < len; ii++) {
                let a = (xData[ii] * xg) + xo;
                let r = (yData[ii] * yg) + yo; 
                let xp = r * Math.sin(a) + xso;
                let yp = r * Math.cos(a) + yso;
                ctx.beginPath();
                ctx.arc(xp, yp, s2, 0, pi2, false);
                ctx.fill();
            }
            return;
        }
        
        // Square.
        if (this.seriesOptions.defaultMarkerShape === 'square') {
            for (let ii = 0; ii < len; ii++) {
                let a = (xData[ii] * xg) + xo;
                let r = (yData[ii] * yg) + yo; 
                let xp = r * Math.sin(a) + xso;
                let yp = r * Math.cos(a) + yso;

                ctx.fillRect(xp - s2, yp - s2, s, s);
            }
            return;
        }
        
        // Diamond.
        if (this.seriesOptions.defaultMarkerShape === 'diamond') {
            for (let ii = 0; ii < len; ii++) {
                let a = (xData[ii] * xg) + xo;
                let r = (yData[ii] * yg) + yo; 
                let xp = r * Math.sin(a) + xso;
                let yp = r * Math.cos(a) + yso;

                ctx.beginPath();
                ctx.moveTo(xp - s2, yp);
                ctx.lineTo(xp, yp - s2);
                ctx.lineTo(xp + s2, yp);
                ctx.lineTo(xp, yp + s2);
                ctx.lineTo(xp - s2, yp);
                ctx.fill();
            }
            return;
        }
        
        // Triangles
        if (this.seriesOptions.defaultMarkerShape === 'triangle') {
            // Point up.
            let s3 = s2 * 0.866025403784;
            let s4 = s2 * 0.5;
            for (let ii = 0; ii < len; ii++) {
                let a = (xData[ii] * xg) + xo;
                let r = (yData[ii] * yg) + yo; 
                let xp = r * Math.sin(a) + xso;
                let yp = r * Math.cos(a) + yso;

                ctx.beginPath();
                ctx.moveTo(xp - s3, yp + s4);
                ctx.lineTo(xp, yp - s2);
                ctx.lineTo(xp + s3, yp + s4);
                ctx.lineTo(xp - s3, yp + s4);
                ctx.fill();
            }
            return;
        }
        if (this.seriesOptions.defaultMarkerShape === 'triangle2') {
            // Point down
            let s3 = s2 * 0.866025403784;
            let s4 = s2 * 0.5;
            for (let ii = 0; ii < len; ii++) {
                let a = (xData[ii] * xg) + xo;
                let r = (yData[ii] * yg) + yo; 
                let xp = r * Math.sin(a) + xso;
                let yp = r * Math.cos(a) + yso;

                ctx.beginPath();
                ctx.moveTo(xp - s3, yp - s4);
                ctx.lineTo(xp + s3, yp - s4);
                ctx.lineTo(xp, yp + s2);
                ctx.lineTo(xp - s3, yp - s4);
                ctx.fill();
            }
            return;
        }
        
        // Plus
        if (this.seriesOptions.defaultMarkerShape === 'plus') {
            let s6 = s * 0.3333333 * 0.5;
            for (let ii = 0; ii < len; ii++) {
                let a = (xData[ii] * xg) + xo;
                let r = (yData[ii] * yg) + yo; 
                let xp = r * Math.sin(a) + xso;
                let yp = r * Math.cos(a) + yso;

                ctx.beginPath();
                ctx.moveTo(xp - s6, yp - s2);
                ctx.lineTo(xp + s6, yp - s2);
                ctx.lineTo(xp + s6, yp - s6);
                ctx.lineTo(xp + s2, yp - s6);
                ctx.lineTo(xp + s2, yp + s6);
                ctx.lineTo(xp + s6, yp + s6);
                ctx.lineTo(xp + s6, yp + s2);
                ctx.lineTo(xp - s6, yp + s2);
                ctx.lineTo(xp - s6, yp + s6);
                ctx.lineTo(xp - s2, yp + s6);
                ctx.lineTo(xp - s2, yp - s6);
                ctx.lineTo(xp - s6, yp - s6);
                ctx.lineTo(xp - s6, yp - s2);
                ctx.fill();
            }
            return;
        }
        
        // Cross
        if (this.seriesOptions.defaultMarkerShape === 'cross') {
            let sw = s2 * 0.5;
            let sl = sw; 
            for (let ii = 0; ii < len; ii++) {
                let a = (xData[ii] * xg) + xo;
                let r = (yData[ii] * yg) + yo; 
                let xp = r * Math.sin(a) + xso;
                let yp = r * Math.cos(a) + yso;

                ctx.beginPath();
                ctx.moveTo(xp, yp - sw);
                ctx.lineTo(xp + sl, yp - sl - sw);
                ctx.lineTo(xp + sl + sw, yp - sl);
                ctx.lineTo(xp + sw, yp);
                ctx.lineTo(xp + sl + sw, yp + sl);
                ctx.lineTo(xp + sl, yp + sl + sw);
                ctx.lineTo(xp, yp + sw);
                ctx.lineTo(xp - sl, yp + sl + sw);
                ctx.lineTo(xp - sl - sw, yp + sl);
                ctx.lineTo(xp - sw, yp);
                ctx.lineTo(xp - sl - sw, yp - sl);
                ctx.lineTo(xp - sl, yp - sl - sw);
                ctx.lineTo(xp, yp - sw);                
                ctx.fill();
            }
            return;
        }        
    }
    
    /**
     * @brief 	Draw extended, for per-color, per-size and or per-label series.
     * 
     * @param 	ctx		Canvas context.
     * @param 	xData	X series data values array.
     * @param 	yData	Y series data values array.
     * @param   mData   Marker kind data.
     * @param   sData   Symbol size data.
     * @param   cData   Color data.
     * @param   lData   Label data.
     * @param 	xg 		X gain.
     * @param   xo		X offset.
     * @param 	yg 		Y gain.
     * @param   yo		Y offset.
     * @param 	sg 		X gain.
     * @param   so		X offset.
     * @param 	cg 		Y gain.
     * @param   co		Y offset.
     */    
    _draw2DSegment_MarkerEx(ctx, xData, yData, sData, mData, cData, lData, 
        xg, xo, yg, yo, sg, so, cg, co) {
        
        let len = xData.length < yData.length ? xData.length : yData.length;
        let defShape = this.seriesOptions.defaultMarkerShape;
        let defSize  = this.seriesOptions.defaultMarkerSize;
        let defColor = this.seriesOptions.defaultMarkerColor;
    
        
        // Too hard to not do this per-point.
        // 
        // These graphs are complex, so typically not many (<10k) points,
        // we can always make this faster later.
        for (let ii = 0; ii < len; ii++) {
            let xp = (xData[ii] * xg) + xo;
            let yp = (yData[ii] * yg) + yo;
            let shape = mData !== undefined ? mData[ii] : defShape;
            let size  = sData !== undefined ? (sData[ii] * sg) + so : defSize;
            let color = cData !== undefined ? valueToColor((cData[ii] * cg) + co) : defColor;
            this._drawOneMarker(ctx, shape, size, color, xp, yp);
        }      
    }
    
    /**
     * @brief 	Draw extended, for per-color, per-size and or per-label series.
     * 
     * @param 	ctx		Canvas context.
     * @param 	xData	X series data values array.
     * @param 	yData	Y series data values array.
     * @param   mData   Marker kind data.
     * @param   sData   Symbol size data.
     * @param   cData   Color data.
     * @param   lData   Label data.
     * @param 	xg 		X gain.
     * @param   xo		X offset.
     * @param 	yg 		Y gain.
     * @param   yo		Y offset.
     * @param 	sg 		X gain.
     * @param   so		X offset.
     * @param 	cg 		Y gain.
     * @param   co		Y offset.
     * @param   xso     X screen center.
     * @param   yso     Y screen center.
     */    
    _draw2DPolarSegment_MarkerEx(ctx, xData, yData, sData, mData, cData, lData, 
        xg, xo, yg, yo, sg, so, cg, co, xso, yso) {
        
        let len = xData.length < yData.length ? xData.length : yData.length;
        let defShape = this.seriesOptions.defaultMarkerShape;
        let defSize  = this.seriesOptions.defaultMarkerSize;
        let defColor = this.seriesOptions.defaultMarkerColor;
    
        
        // Too hard to not do this per-point.
        // 
        // These graphs are complex, so typically not many (<10k) points,
        // we can always make this faster later.
        for (let ii = 0; ii < len; ii++) {
            let a = (xData[0] * xg) + xo;
            let r = (yData[0] * yg) + yo; 
            let xp = r * Math.sin(a) + xso;
            let yp = r * Math.cos(a) + yso;            
            let shape = mData !== undefined ? mData[ii] : defShape;
            let size  = sData !== undefined ? (sData[ii] * sg) + so : defSize;
            let color = cData !== undefined ? valueToColor((cData[ii] * cg) + co) : defColor;
            this._drawOneMarker(ctx, shape, size, color, xp, yp);
        }      
    }
    
    /** 
     * @brief   Draw a marker of a given shape, size and color centered at xp,yp.
     *
     * @param   ctx     Context 2D.
     * @param   shape   Shape name or index.
     * @param   s       Size.
     * @param   color   Fill color
     * @param   xp      X coordinate.
     * @param   yp      Y coordinate.
     */
    _drawOneMarker(ctx, shape, s, color, xp, yp) {
        const pi2 = Math.PI * 2;
        
        ctx.fillStyle = color;

        // Circle.
        if ((shape === 0) || (shape === 'circle')) {            
            ctx.beginPath();
            ctx.arc(xp, yp, s, 0, pi2, false);
            ctx.fill();
            return;
        }
        
        // Square.
        let s2 = s * 0.5;
        if ((shape === 1) || (shape === 'square')) { 
            ctx.fillStyle = color;
            ctx.fillRect(xp - s2, yp - s2, s, s);
            return;
        }
        
        // Diamond.
        if ((shape === 2) || (shape === 'diamond')) { 
            ctx.beginPath();
            ctx.moveTo(xp - s2, yp);
            ctx.lineTo(xp, yp - s2);
            ctx.lineTo(xp + s2, yp);
            ctx.lineTo(xp, yp + s2);
            ctx.lineTo(xp - s2, yp);
            ctx.fill();
            return;
        }
        
        // Triangles
        if ((shape === 3) || (shape === 'triangle')) { 
            // Point up.
            let s3 = s2 * 0.866025403784;
            let s4 = s2 * 0.5;
            ctx.beginPath();
            ctx.moveTo(xp - s3, yp + s4);
            ctx.lineTo(xp, yp - s2);
            ctx.lineTo(xp + s3, yp + s4);
            ctx.lineTo(xp - s3, yp + s4);
            ctx.fill();
            return;
        }
        if ((shape === 4) || (shape === 'triangle2')) { 
            // Point down
            let s3 = s2 * 0.866025403784;
            let s4 = s2 * 0.5;
            ctx.beginPath();
            ctx.moveTo(xp - s3, yp - s4);
            ctx.lineTo(xp + s3, yp - s4);
            ctx.lineTo(xp, yp + s2);
            ctx.lineTo(xp - s3, yp - s4);
            ctx.fill();
            return;
        }
        
        // Plus
        if ((shape === 5) || (shape === 'plus')) { 
            let s6 = s * 0.3333333 * 0.5;
            ctx.beginPath();
            ctx.moveTo(xp - s6, yp - s2);
            ctx.lineTo(xp + s6, yp - s2);
            ctx.lineTo(xp + s6, yp - s6);
            ctx.lineTo(xp + s2, yp - s6);
            ctx.lineTo(xp + s2, yp + s6);
            ctx.lineTo(xp + s6, yp + s6);
            ctx.lineTo(xp + s6, yp + s2);
            ctx.lineTo(xp - s6, yp + s2);
            ctx.lineTo(xp - s6, yp + s6);
            ctx.lineTo(xp - s2, yp + s6);
            ctx.lineTo(xp - s2, yp - s6);
            ctx.lineTo(xp - s6, yp - s6);
            ctx.lineTo(xp - s6, yp - s2);
            ctx.fill();
            return;
        }
        
        // Cross
        if ((shape === 6) || (shape === 'cross')) { 
            let sw = s2 * 0.5;
            let sl = sw; 
            ctx.beginPath();
            ctx.moveTo(xp, yp - sw);
            ctx.lineTo(xp + sl, yp - sl - sw);
            ctx.lineTo(xp + sl + sw, yp - sl);
            ctx.lineTo(xp + sw, yp);
            ctx.lineTo(xp + sl + sw, yp + sl);
            ctx.lineTo(xp + sl, yp + sl + sw);
            ctx.lineTo(xp, yp + sw);
            ctx.lineTo(xp - sl, yp + sl + sw);
            ctx.lineTo(xp - sl - sw, yp + sl);
            ctx.lineTo(xp - sw, yp);
            ctx.lineTo(xp - sl - sw, yp - sl);
            ctx.lineTo(xp - sl, yp - sl - sw);
            ctx.lineTo(xp, yp - sw);                
            ctx.fill();
            return;
        }        
    }    
    
    /**
     * @brief   Find the "best" mouse over point.
     *
     * @param   x       Data converted "x" value.
     * @param   y       Data converted "y" value.
     * @param   dx      20 pixels, in x-screen data space.
     * @param   dy      20 pixels, in y-screen data space.
     * @param   sx      Scale x value to x screen.
     * @param   sy      Scale y value to y screen.
     * @param   best    {found: false, range: undefined, series: undefined, cache: -1, index: -1 };
     *
     * @return  Updated best (or existing best).
     */
    mouseOver2D(x, y, dx, dy, sx, sy, best) {
        
        let xd = this.getData('x');
        let yd = this.getData('y');
        let cacheLen = xd.cache.length;
        let lx = x - dx;
        let hx = x + dx;
        let ly = y - dy;
        let hy = y + dy;
        let bestCache = -1;
        let bestIndex = -1;
        // We do squared range so. 
        sx = sx * sx;
        sy = sy * sy;
        let bestRange = best.range !== undefined ? best.range : 1 + dx * dx * sx + dy * dy * sy;
        for (let ii = 0; ii < cacheLen; ii++) {
            if ((xd.mins[ii] > hx) || (xd.maxs[ii] < lx) || 
                (yd.mins[ii] > hy) || (yd.maxs[ii] < ly)) {					
                continue;
            }
            let xData = xd.cache[ii];
            let yData = yd.cache[ii];            
            let len = xData.length < yData.length ? xData.length : yData.length;
            
            for (let jj = 0; jj < len; jj++) {
                let dex = xData[jj] - x;
                let dey = yData[jj] - y;
                let rng = (dex * dex * sx) + (dey * dey * sy);
                if (rng < bestRange) { 
                    bestCache = ii;
                    bestIndex = jj;
                    bestRange = rng;
                }
            }
        }
        if (bestCache !== -1) {
            best = {
                range: bestRange,
                series: this,
                cache: bestCache,
                index: bestIndex};
        }
        return best;
    }
    
    /**
     * @brief   Given a "best", compute the sundry info to plot it, then call the easy to over ride plot.
     *
     * @param   ctx         Context to plot on.
     * @param   layout      Layout.
     * @param   bounds      Data bounds of the axis for scaling.
     * @param   best        The "best" object.
     * @param   x_screen    X screen position.
     * @param   y_screen    Y screen position.
     * @param   x_value     X data value.
     * @param   y_value     Y data value.
     */
    drawMouseOverMarkerAndText(ctx, layout, bounds, best, x_screen, y_screen, x_value, y_value) {
        let rad = objectExists(this.seriesOptions.defaultMarkerSize) ? this.seriesOptions.defaultMarkerSize : 2;
        rad = rad < 4 ? 4 : rad;
        let radh = rad / 2;

        let clr = this.seriesOptions.defaultMarkerColor;
        clr = objectExists(clr) ? clr : this.seriesOptions.defaultLineColor;
        clr = objectExists(clr) ? clr : '#000000';
        ctx.strokeStyle = clr;
        // Box it.
        ctx.strokeRect(x_screen - radh + 1, y_screen - radh, rad, rad);

        let x_str = 'x: ' + x_value;
        let y_str = 'y: ' + y_value;
        let seriesName = defaultObject(this.seriesOptions.name, '').trim();
        let tw_n = ctx.measureText(seriesName).width;
        let tw_x = ctx.measureText(x_str).width;
        let tw_y = ctx.measureText(y_str).width;
        let tw = tw_x > tw_y ? 
            (tw_x > tw_n ? tw_x : tw_n) : 
            (tw_y > tw_n ? tw_y : tw_n);
        
        // Background.
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        let triangle = 4;
        let fontSize = 11;
        let fontSize2 = fontSize + fontSize;
        let fontSize3 = fontSize2 + fontSize
        let yoff = (tw_n > 0) ? y_screen - triangle - fontSize3 - fontSize : y_screen - triangle - fontSize3;
        let ybot = (tw_n > 0) ? yoff + fontSize3 + 4 : yoff + fontSize2 + 4;
        ctx.moveTo(x_screen - tw/2 - 2, yoff);
        ctx.lineTo(x_screen - tw/2 - 2 + tw + 4, yoff);
        ctx.lineTo(x_screen - tw/2 - 2 + tw + 4, ybot);
        ctx.lineTo(x_screen - tw/2 - 2 + tw/2 + 4 + triangle, ybot);
        ctx.lineTo(x_screen - tw/2 - 2 + tw/2 + 4, ybot + triangle);
        ctx.lineTo(x_screen - tw/2 - 2 + tw/2 + 4 - triangle, ybot);
        ctx.lineTo(x_screen - tw/2 - 2, ybot);
        ctx.lineTo(x_screen - tw/2 - 2, yoff);
        ctx.stroke();
        ctx.fill();
        
        // Text.
        ctx.font = "11px verdana";        
        ctx.fillStyle = '#000000';        
        if (tw_n > 0) {            
            ctx.fillText(seriesName, x_screen - tw/2, yoff + fontSize - 1);
            ctx.fillText(x_str, x_screen - tw/2, yoff + fontSize2 - 1);
            ctx.fillText(y_str, x_screen - tw/2, yoff + fontSize3 - 1);
        } else {            
            ctx.fillText(x_str, x_screen - tw/2, yoff + fontSize - 1);
            ctx.fillText(y_str, x_screen - tw/2, yoff + fontSize2 - 1);
        }
    }
    
    /**
     * @brief   Given a "best", compute the sundry info to plot it, then call the easy to over ride plot.
     *
     * @param   ctx     Context to plot on.
     * @param   layout  Layout.
     * @param   bounds  Data bounds of the axis for scaling.
     * @param   best    The "best" object.
     */
    drawMouseOver2D(ctx, layout, bounds, best) {
        let x = this.getData('x').cache[best.cache][best.index];
        let y = this.getData('y').cache[best.cache][best.index];
        
        // pixel = (data - db[0])* (cb[1] - cb[0])/(db[1] - db[0]) + cb[0]
        //       = data * (cb[1] - cb[0])/(db[1] - db[0]) - db[0] * (cb[1] - cb[0])/(db[1] - db[0]) + cb[0]
        let xg = layout.w / (bounds.x.max - bounds.x.min);
        let xo = -bounds.x.min * xg + layout.x;
        let yg = layout.h / (bounds.y.max - bounds.y.min);
        let yo = -bounds.y.min * yg + layout.y;
        let xp = x * xg + xo;
        let yp = y * yg + yo;
        this.drawMouseOverMarkerAndText(ctx, layout, bounds, best, xp, yp, x, y);
    }
    
    /**
     * @brief   Calculate how we are (or not) accelerating this graph.
     *
     * @return  Either -1, 0, 1 or 2.
     *
     * @details
     * -1 = no accel
     *  0 = Line only, 1 color.
     *  1 = Marker only, 1 color.
     *  2 = Marker and line 1 color each.
     */
    _drawAccelerationType() {
        if (objectExists(this.vGuid) || objectExists(this.cGuid) || 
            objectExists(this.sGuid) || objectExists(this.lGuid)) {
            // Don't accelerate.
            return -1;
        }
        
        if (!objectExists(this.seriesOptions)) {
            return -1;
        }
        
        let hasMarker = objectExists(this.seriesOptions.defaultMarkerShape);
        let hasLine = objectExists(this.seriesOptions.defaultLineColor);
        if (hasLine) {
            return hasMarker ? 2 : 0;
        }
        return hasMarker ? 1 : -1;
    }
    
    /**
     * @brief   Render to the context.
     *
     * @param   ctx             Context 2D.
     * @param   dataBounds      Restriction bounds.
     * @param   layout          Where to paint.
     */
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
        
        let accel = this._drawAccelerationType();
        let cacheLen = x.cache.length;
        let dashStyle = toCanvasDash(this.seriesOptions.graphLineDash);
        let lineWidth = defaultObject(this.seriesOptions.lineSizePx, 1);
        lineWidth = lineWidth < 0 ? 0 : lineWidth;
        
        // Generic line plot?
        if (accel == 0) {					
        
            // Setup outside the loop, then do it.
            ctx.strokeStyle = this.seriesOptions.defaultLineColor;
            ctx.setLineDash(dashStyle);
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            
            // Do all relevant ones.
            for (let ii = 0; ii < cacheLen; ii++) {
                if (x.mins[ii] > dataBounds.xBounds.max || x.maxs[ii] < dataBounds.xBounds.min || 
                    y.mins[ii] > dataBounds.yBounds.max || y.maxs[ii] < dataBounds.yBounds.min) {					
                    continue;
                }
                lpx, lpy = this._draw2DSegment_Line(ctx, lpx, lpy, x.cache[ii], y.cache[ii], xg, xo, yg, yo);                
            }
            ctx.stroke();
            ctx.setLineDash([]);
            return;
        }
            
        // Generic marker plot?
        if (accel == 1)  {
            
            // Just markers.
            ctx.fillStyle = this.seriesOptions.defaultMarkerColor;
            for (let ii = 0; ii < cacheLen; ii++) {
                if (x.mins[ii] > dataBounds.xBounds.max || x.maxs[ii] < dataBounds.xBounds.min ||
                    y.mins[ii] > dataBounds.yBounds.max || y.maxs[ii] < dataBounds.yBounds.min) {
                    continue;
                }
                this._draw2DSegment_Marker(ctx, x.cache[ii], y.cache[ii], xg, xo, yg, yo);                
            }
            return;
        }
        
        // Generic line & marker plot?
        if (accel == 2)  {	

            // Both line and marker, skip within the loop to avoid redundant logic checks.
            ctx.fillStyle = this.seriesOptions.defaultMarkerColor;
            for (let ii = 0; ii < cacheLen; ii++) {
                if (x.mins[ii] > dataBounds.xBounds.max || x.maxs[ii] < dataBounds.xBounds.min ||
                    y.mins[ii] > dataBounds.yBounds.max || y.maxs[ii] < dataBounds.yBounds.min) {
                    continue;
                }
                // Do the lines of this segment.
                ctx.strokeStyle = this.seriesOptions.defaultLineColor;
                ctx.setLineDash(dashStyle);
                ctx.lineWidth = lineWidth;
                ctx.beginPath();                    
                lpx, lpy = this._draw2DSegment_Line(ctx, lpx, lpy, x.cache[ii], y.cache[ii], xg, xo, yg, yo);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Do the symbols of this segment.
                this._draw2DSegment_Marker(ctx, x.cache[ii], y.cache[ii], xg, xo, yg, yo);				
            }
            return;
        }
        
        
        let vData = !objectExists(this.vGuid) ? undefined : ggGraph_DataHive.get_dataSeries(this.vGuid);
        let cData = !objectExists(this.cGuid) ? undefined : ggGraph_DataHive.get_dataSeries(this.cGuid);
        let sData = !objectExists(this.sGuid) ? undefined : ggGraph_DataHive.get_dataSeries(this.sGuid);
        let lData = !objectExists(this.lGuid) ? undefined : ggGraph_DataHive.get_dataSeries(this.lGuid);        
        
        // Size and color conversion stuff.
        let vmin = vData === undefined ? 0 : vData.min();
        let vmax = vData === undefined ? 1 : vData.max();
        let cmin = cData === undefined ? 0 : cData.min();
        let cmax = cData === undefined ? 1 : cData.max();
        let maxs = defaultObject(this.seriesOptions.defaultMarkerSize, 40);
        let vg = (maxs - 2) / (vmax - vmin);
        let vo = maxs - (vg * vmax);
        let cg = 1.0 / (cmax - cmin);
        let co = 0;
        
        // Lines, if any.
        for (let ii = 0; ii < cacheLen; ii++) {
            if (x.mins[ii] > dataBounds.xBounds.max || x.maxs[ii] < dataBounds.xBounds.min ||
                y.mins[ii] > dataBounds.yBounds.max || y.maxs[ii] < dataBounds.yBounds.min) {
                continue;
            }
            // Do the lines of this segment.
            ctx.strokeStyle = this.seriesOptions.defaultLineColor;
            ctx.setLineDash(dashStyle);
            ctx.lineWidth = lineWidth;
            ctx.beginPath();                    
            lpx, lpy = this._draw2DSegment_Line(ctx, lpx, lpy, x.cache[ii], y.cache[ii], xg, xo, yg, yo);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Markers, if any.
        for (let ii = 0; ii < cacheLen; ii++) {
            if (x.mins[ii] > dataBounds.xBounds.max || x.maxs[ii] < dataBounds.xBounds.min ||
                y.mins[ii] > dataBounds.yBounds.max || y.maxs[ii] < dataBounds.yBounds.min) {
                continue;
            }
            // Not super accelerated.
            this._draw2DSegment_MarkerEx(ctx, 
                x.cache[ii], y.cache[ii], 
                vData === undefined ? undefined : vData.cache[ii], // Size like
                sData === undefined ? undefined : sData.cache[ii], // Shape like
                cData === undefined ? undefined : cData.cache[ii], // Color like
                lData === undefined ? undefined : lData.cache[ii], // Label like                
                xg, xo, yg, yo, vg, vo, cg, co);            
        }
    }


    /**
     * @brief   Render to the context.
     *
     * @param   ctx             Context 2D.
     * @param   dataBounds      Restriction bounds.
     * @param   layout          Where to paint.
     */
    draw2DPolar(ctx, dataBounds, layout) {
        
        let x = this.getData('x');
        let y = this.getData('y');
        let lpx = null;
        let lpy = null;
        
        // For polar, we want to treat the 'x' axis as an angle, and 'y' as range.
        // Also square this up so we aren't stretching it.
        // Thus:
        // a = x*xg + xo
        // r = y*yg + yo
        // xp = r * sin(a) + xso
        // yp = r * cos(a) + yso
               
        let squaredUp = layout.w < layout.h ? layout.w : layout.h;
        let squaredUp2 = squaredUp / 2;
        let xso = layout.x + layout.w / 2;
        let yso = layout.y + layout.h / 2;
        
        // This does most negative is center (0), we can do zero center (1)
        // as an option passed in for the y-axis, use yAxisOptions.polar
        let ygt = objectExists(this.seriesOptions) ? defaultObject(this.seriesOptions.polarRange, 1) : 1;
        let yg = squaredUp2 / (dataBounds.yBounds.max - dataBounds.yBounds.min);            
        let yo = -dataBounds.yBounds.min * yg;
        if (ygt === '1' || ygt === 1) {
            let absmax = Math.abs(dataBounds.yBounds.max);
            let absmin = Math.abs(dataBounds.yBounds.min);
            let max_ex = absmax > absmin ? absmax : absmin;
            yg = squaredUp2 / max_ex;           
            yo = 0;
        }
        
        let xo = 0;
        let xgt = objectExists(this.seriesOptions) ? defaultObject(this.seriesOptions.polarAngle, 'rad') : 'rad';
        let xg = xgt === 'rad' ? 1 : xgt === 'mills' ? Math.PI / 1800 : Math.PI / 180;
        
        let accel = this._drawAccelerationType();
        let cacheLen = x.cache.length;
        let dashStyle = toCanvasDash(this.seriesOptions.graphLineDash);
        let lineWidth = defaultObject(this.seriesOptions.lineSizePx, 1);
        lineWidth = lineWidth < 0 ? 0 : lineWidth;
        
        // Generic line plot?
        if (accel == 0) {					
        
            // Setup outside the loop, then do it.
            ctx.strokeStyle = this.seriesOptions.defaultLineColor;
            ctx.setLineDash(dashStyle);
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            
            // Do all relevant ones.
            for (let ii = 0; ii < cacheLen; ii++) {
                if (x.mins[ii] > dataBounds.xBounds.max || x.maxs[ii] < dataBounds.xBounds.min || 
                    y.mins[ii] > dataBounds.yBounds.max || y.maxs[ii] < dataBounds.yBounds.min) {					
                    continue;
                }
                lpx, lpy = this._draw2DPolarSegment_Line(ctx, lpx, lpy, x.cache[ii], y.cache[ii], xg, xo, yg, yo, xso, yso);                
            }
            ctx.stroke();
            ctx.setLineDash([]);
            return;
        }
            
        // Generic marker plot?
        if (accel == 1)  {
            
            // Just markers.
            ctx.fillStyle = this.seriesOptions.defaultMarkerColor;
            for (let ii = 0; ii < cacheLen; ii++) {
                if (x.mins[ii] > dataBounds.xBounds.max || x.maxs[ii] < dataBounds.xBounds.min ||
                    y.mins[ii] > dataBounds.yBounds.max || y.maxs[ii] < dataBounds.yBounds.min) {
                    continue;
                }
                this._draw2DPolarSegment_Marker(ctx, x.cache[ii], y.cache[ii], xg, xo, yg, yo, xso, yso);               
            }
            return;
        }
        
        // Generic line & marker plot?
        if (accel == 2)  {	

            // Both line and marker, skip within the loop to avoid redundant logic checks.
            ctx.fillStyle = this.seriesOptions.defaultMarkerColor;
            for (let ii = 0; ii < cacheLen; ii++) {
                if (x.mins[ii] > dataBounds.xBounds.max || x.maxs[ii] < dataBounds.xBounds.min ||
                    y.mins[ii] > dataBounds.yBounds.max || y.maxs[ii] < dataBounds.yBounds.min) {
                    continue;
                }
                // Do the lines of this segment.
                ctx.strokeStyle = this.seriesOptions.defaultLineColor;
                ctx.setLineDash(dashStyle);
                ctx.lineWidth = lineWidth;
                ctx.beginPath();                    
                lpx, lpy = this._draw2DPolarSegment_Line(ctx, lpx, lpy, x.cache[ii], y.cache[ii], xg, xo, yg, yo, xso, yso);  
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Do the symbols of this segment.
                this._draw2DPolarSegment_Marker(ctx, x.cache[ii], y.cache[ii], xg, xo, yg, yo, xso, yso);  				
            }
            return;
        }
        
        
        let vData = !objectExists(this.vGuid) ? undefined : ggGraph_DataHive.get_dataSeries(this.vGuid);
        let cData = !objectExists(this.cGuid) ? undefined : ggGraph_DataHive.get_dataSeries(this.cGuid);
        let sData = !objectExists(this.sGuid) ? undefined : ggGraph_DataHive.get_dataSeries(this.sGuid);
        let lData = !objectExists(this.lGuid) ? undefined : ggGraph_DataHive.get_dataSeries(this.lGuid);        
        
        // Size and color conversion stuff.
        let vmin = vData === undefined ? 0 : vData.min();
        let vmax = vData === undefined ? 1 : vData.max();
        let cmin = cData === undefined ? 0 : cData.min();
        let cmax = cData === undefined ? 1 : cData.max();
        let maxs = defaultObject(this.seriesOptions.defaultMarkerSize, 40);
        let vg = (maxs - 2) / (vmax - vmin);
        let vo = maxs - (vg * vmax);
        let cg = 1.0 / (cmax - cmin);
        let co = 0;
        
        // Lines, if any.
        for (let ii = 0; ii < cacheLen; ii++) {
            if (x.mins[ii] > dataBounds.xBounds.max || x.maxs[ii] < dataBounds.xBounds.min ||
                y.mins[ii] > dataBounds.yBounds.max || y.maxs[ii] < dataBounds.yBounds.min) {
                continue;
            }
            // Do the lines of this segment.
            ctx.strokeStyle = this.seriesOptions.defaultLineColor;
            ctx.setLineDash(dashStyle);
            ctx.lineWidth = lineWidth;
            ctx.beginPath();                    
            lpx, lpy = this._draw2DPolarSegment_Line(ctx, lpx, lpy, x.cache[ii], y.cache[ii], xg, xo, yg, yo, xso, yso);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Markers, if any.
        for (let ii = 0; ii < cacheLen; ii++) {
            if (x.mins[ii] > dataBounds.xBounds.max || x.maxs[ii] < dataBounds.xBounds.min ||
                y.mins[ii] > dataBounds.yBounds.max || y.maxs[ii] < dataBounds.yBounds.min) {
                continue;
            }
            
            // Not super accelerated.
            this._draw2DPolarSegment_MarkerEx(ctx, 
                x.cache[ii], y.cache[ii], 
                vData === undefined ? undefined : vData.cache[ii], // Size like
                sData === undefined ? undefined : sData.cache[ii], // Shape like
                cData === undefined ? undefined : cData.cache[ii], // Color like
                lData === undefined ? undefined : lData.cache[ii], // Label like                
                xg, xo, yg, yo, vg, vo, cg, co, xso, yso);            
        }
    }    
}

/** 
 * Mild simplification of LineSeries.
 */
class Line2DSeries extends LineSeries {
    constructor(seriesOptions, xGuid, yGuid, valuesGuid = '', colorsGuid = '', symbolsGuid = '', labelsGuid = '') {
        super(seriesOptions, xGuid, yGuid, '', valuesGuid, colorsGuid, symbolsGuid, labelsGuid);
    }
}

