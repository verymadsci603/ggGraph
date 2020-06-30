/**
 * @brief   ggTreeEdit
 *
 * @author  Phil Braica  HoshiKata@aol.com
 *
 * @copyright 2020, Philip Braica, MIT License
 *
 */


class ggTreeEdit {
    
    /**
     * @brief   Constructor.
     *
     * @param   obj     Takes an object.
     */
    constructor(obj) {
        this.names = [];
        this.obj = obj;
        this.html = '';
        this.rules = [
            { k: 'Color',       v: 'color'},    // End in color, edit as color.
            { k: 'SizePx',      v: 'number'},   // Pixels as size.
            { k: 'marginPx',    v: 'number'},   // Pixels as size.
            { k: 'sizePercent', v: 'percent'},  // Percent
            { k: 'textStr',     v: 'text'},     // Text
            { k: '.show',       v: 'show'},     // Show hide.
            { k: '.isLog',      v: 'bool'},     // isLog flag. 
            { k: '.graphLineDash',  v: 'select:solid|dash|dashdot'},
            { k: '.loc',            v: 'select:top|bottom|left|right'},
            { k: '.alignment',      v: 'select:top|bottom'},
            { k: '.behavior',       v: 'select:onzoom|always|none'},
            { k: 'om.currentMode',  v: 'select:auto|x|xy|y'},
            { k: '.kindsAllowed',   v: 'text'},
            { k: '.graphType',      v: 'text'}
        
        ];
        this._tree_create(obj, 0, undefined);
    }
    
    /**
     * @brief   Get the object we updated.
     *
     * @return  Object we're wrapping.
     */
    get_object() {
        return this.obj;
    }
    
    /**
     * @brief   Given an object tree, construct a '.' delimited list of sub-objects.
     *
     * @param   obj         Object to traverse.
     * @param   count       Indention.
     * @param   prefix      Prefix to use in the name.
     *
     * @return  Array of strings.
     */
    _tree_create(obj, count, prefix) {
        if ((obj === undefined) || (obj === null)) {
            return;
        }
        prefix = prefix === undefined ? '' : prefix;
        
        let k = Object.keys(obj); 
        let onclickstr = 
            'onclick=\"let isplus = this.textContent === \'+\';\n' + 
            '$(this).siblings(\'div\').css(\'display\', isplus? \'none\': \'block\');\n' +
            'this.textContent = isplus ? \'-\' : \'+\';\"';
        if (obj.constructor === Object) {
            if (count != 0) {
                this.html += '<div style="margin-left: 18px;"><div>' + 
                    '<button style="padding:0px; width:18px; height:18px" ' + onclickstr + '>+</button>' + prefix;
            } else {
                this.html +='<div>';
            }       
            for (let ii = 0; ii < k.length; ii++) {
                this._tree_create(obj[k[ii]], count + 1, count == 0 ? k[ii] : prefix + '.' + k[ii]);
            }
            this.html += '</div></div>';
        } else {
            this.html += '<div style="margin-left: 18px;">' + prefix + ': ' + this._make_editor(prefix, obj) + '</div>';
            this.names.push(prefix);
        }
    }
    
    /**
     * @brief   Make an editor based on id matching rules.
     *
     * @param   id      ID name (to match against rules).
     * @param   value   The current value.
     */
    _make_editor(id, value) {
        for (let ii = 0; ii < this.rules.length; ii++) {
            if (id.endsWith(this.rules[ii].k)) {
                let data = ''; //'data-id_path="' + id + '"';
                if (this.rules[ii].v === 'color') {
                    return '<input type="color" ' + 
                        'style="padding: 0px; border: 0px; background-color: transparent; vertical-align: middle;"' + 
                        ' value="' +value + '">';
                }
                if (this.rules[ii].v === 'number') {
                    return '<input type="number"  style="width:60px" value="' + value + '">';
                }
                if (this.rules[ii].v === 'percent') {
                    return '<input type="number"style="width:60px" min="0" max="100" value="' + value + '">';
                }
                if (this.rules[ii].v === 'text') {
                    return '<input type="text" style="max-width: 120px" value="' +value + '">';
                }
                if (this.rules[ii].v === 'show') {
                    return '<select><option>Show</option><option>Hide</option></select>';
                }
                if (this.rules[ii].v === 'bool') {
                    return '<select><option>True</option><option>False</option></select>';
                }
                if (this.rules[ii].v.startsWith('select:')) {
                    let options = this.rules[ii].v.substring(7).split('|');
                    let rv = ''
                    for (let ii = 0; ii < options.length; ii++) {
                        rv += '<option>' + options[ii] + '</option>';
                    }
                    return '<select>' + rv + '</select>';
                }
            }
        }
        return value;
    }
        
    /**
     * @brief   Set a value in an object tree by key.
     *
     * @param   obj     Object.
     * @param   key     Key to use.
     * @param   value   Value.
     */
    set(key, value) {
        let obj = this.obj;
        let keys = key.split('.');
        let klen = keys.length;
        let klast = klen - 1;
        for (let ii = 0; ii < klen; ii++) {
            // Last one? set it.
            let k_ii = keys[ii];
            if (ii === klast) {
                obj[k_ii] = value;
                return;
            }
            
            // Not the last one?
            let levelsKeys = Object.keys(obj);
            if (levelsKeys.includes(k_ii)) {
                obj = obj[k_ii];
            } else {
                obj[k_ii] = {};
            }
        }
    }

    /**
     * @brief   Set a value in an object tree by key.
     *
     * @param   obj     Object.
     * @param   key     Key to use.
     *
     * @return  Value or undefined.
     */
    get(key) {
        let obj = this.obj;
        let keys = key.split('.');
        let klen = keys.length;
        let klast = klen - 1;
        for (let ii = 0; ii < klen; ii++) {
            // Last one? get it.
            let k_ii = keys[ii];
            if (ii === klast) {
                return obj[k_ii];
            }
            
            // Not the last one?
            let levelsKeys = Object.keys(obj);
            if (!levelsKeys.includes(k_ii)) {
                return undefined;
            }
            obj = obj[k_ii];            
        }
    }
}


