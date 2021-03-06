/**
 * @brief   ggTreeEdit
 *
 * @author  Phil Braica  HoshiKata@aol.com
 *
 * @copyright 2020, Philip Braica, MIT License
 *
 */

/**
 * @brief   All registered object for changes.
 */
let ggTreeHive = {};

/**
 * @brief   JSON tree object editor.
 */
class ggTreeEdit {
    
    /**
     * @brief   Constructor.
     *
     * @param   obj     Takes an object.
     * @param   id      ID to track this.
     * @param   rules   Html rules.
     * @param   width   Width for rules 
     */
    constructor(obj, id, rules, width) {
        this.id = id;
        this.names = [];
        this.obj = obj;
        this.html = '';
        this.rules = rules;
        this.changed_callback = undefined;
        width = (width === null) || (width === undefined) ? '40%' : width;
        this._tree_create(obj, id, 0, undefined, width);
        if ((id !== null) && (id !== undefined)) {
            ggTreeHive[id] = this;
        }
    }
    
    /** 
     * @brief   Remove from the tree.
     */
    remove() {
        if (this.id in ggTreeHive) {
            delete ggTreeHive[this.id];
        }
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
     * @param   id          Object id.
     * @param   count       Indention.
     * @param   prefix      Prefix to use in the name.     
     * @param   width       Desired label width.
     *
     * @return  Array of strings.
     */
    _tree_create(obj, id, count, prefix, width) {
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
            if (count !== 0) {
                if (count === 1) {
                    this.html += '<div><div>' + 
                        '<button style="padding:0; margin: 0 4px 0 0; width:18px; height:18px" ' + onclickstr + '>+</button>' + prefix;
                } else {
                    this.html += '<div style="margin-left: 18px;"><div>' + 
                        '<button style="padding:0; margin: 0 4px 0 0; width:18px; height:18px" ' + onclickstr + '>+</button>' + prefix;
                }
            } else {
                this.html +='<div>';
            }       
         
            for (let ii = 0; ii < k.length; ii++) {
                this._tree_create(
                    obj[k[ii]], 
                    id, 
                    count + 1, 
                    count == 0 ? k[ii] : prefix + '.' + k[ii],
                    width);
            }
            this.html += '</div></div>';
        } else {
            // Get the editor, if it's none, then it was a noshow so skip it, else append it.
            let editor = this._make_editor(prefix, obj, id);
            let widthStr = width === undefined ? '"' : 'width: ' + width + ';" ';
            if (editor !== '') {
                this.html += '<div style="margin-left: 22px;"><div style="display: inline-block; ' + widthStr + '>' + this.prettyPrintPrefix(prefix) + ': </div>' + this._make_editor(prefix, obj, id) + '</div>';
            }
            this.names.push(prefix);
        }
    }
    
    /**
     * @brief   Fixup a prefix for a friendly thing at an editor.
     *
     * @param   prefix  The object prefix string like foo.bar.someOtherString
     *
     * @return  Nicer looking text such as "Some other string" from foo.bar.someOtherString.
     */
    prettyPrintPrefix(prefix) {
        let period = prefix.lastIndexOf('.');
        prefix = period < 0 ? prefix : prefix.substring(period + 1);
        let output = '';
        let upper = prefix.toUpperCase();
        let lower = prefix.toLowerCase();
        for (let ii = 0; ii < prefix.length; ii++) {
            let p_ii = prefix[ii];
            if (ii === 0) {
                // Capitalize.
                output += upper[ii];
                continue;
            }
            if (p_ii < 'a') {
                output += ' ';                
            } 
            output += lower[ii];  
        }
        return output;
    }
    
    /**
     * @brief   Make an editor based on id matching rules.
     *
     * @param   item_id     ID name (to match against rules).
     * @param   value       The current value.
     * @param   obj_id      The object ID.
     */
    _make_editor(item_id, value, obj_id) {
        let eventHandler = 'onchange=\"ggTree_itemEdited(\'' + obj_id + '\', \'' + item_id + '\', this); \"';
        let eventHandler2 = '" ' + eventHandler + '>';;
        for (let ii = 0; ii < this.rules.length; ii++) {
            if (item_id.endsWith(this.rules[ii].k)) {
                if (this.rules[ii].v === 'noshow') {
                    return '';
                }
                if (this.rules[ii].v === 'color') {
                    if (value === 'none') {
                        // Pure transparent white.
                        value = '#FFFFFF00';
                    }
                    // Split value into color and transparency.
                    // Value is #rrggbbaa where aa is optional opacity
                    let clr = value.substring(0, 7);
                    clr = clr !== '' ? clr : '#FFFFFF';
                    let tra = parseInt(value.length > 7 ? value.substring(7) : 'FF', 16);
                    
                    return '<input type="color" ' + 
                        'style="width: 60px; padding: 0px; border: 0px; background-color: transparent; vertical-align: middle;"' + 
                        ' title="Color" ' + 
                        ' value="' + clr + eventHandler2 + 
                        '<input style="width: 80px; vertical-align:middle; outline:none;" ' + 
                        ' title="Transparency" ' +
                        'type="range" min="0" max="255" value="' + tra + eventHandler2;
                }
                if (this.rules[ii].v === 'number') {
                    return '<input type="number"  style="width:140px; padding:0 2px;" value="' + value + eventHandler2;
                }
                if (this.rules[ii].v === 'percent') {
                    return '<input type="number" title="Percent" style="width:140px padding:0 2px;" min="0" max="100" value="' + value + eventHandler2;
                }
                if (this.rules[ii].v === 'text') {
                    return '<input type="text" style="width: 140px; padding:0 2px;" value="' + value + eventHandler2;
                }
                if (this.rules[ii].v === 'show') {
                    return '<select style=width: 140px;" class="gg_itemedit_showhide" ' + eventHandler + '><option>Show</option><option>Hide</option></select>';
                }
                if (this.rules[ii].v === 'bool') {
                    return '<select style=width: 140px;" class="gg_itemedit_bool" ' + eventHandler + '><option>True</option><option>False</option></select>';
                }
                if (this.rules[ii].v.startsWith('select:')) {
                    let options = this.rules[ii].v.substring(7).split('|');
                    let rv = ''
                    for (let ii = 0; ii < options.length; ii++) {
                        rv += '<option>' + options[ii] + '</option>';
                    }
                    return '<select style="width: 140px;" ' + eventHandler + '>' + rv + '</select>';
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
                let old_value = obj[k_ii];
                obj[k_ii] = value;
                if (this.changed_callback !== undefined) {
                    this.changed_callback(this, key, old_value, value);
                }
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
     * @brief   Set onchanged
     *
     * @param   func    Function, call signature: something(this, key, old_value, value);
     */
    onchange(func){
        this.changed_callback = func;
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

/**
 * @brief   Called when an item is edited.
 *
 * @param   obj_id      Which object ID to lookup and change.
 * @param   item_id     Which item in the object, by path.
 * @param   that        HTML element firing the event.
 */
function ggTree_itemEdited(obj_id, item_id, that) {
    if (!(obj_id in ggTreeHive)) {
        // Old or not yet defined.
        return;
    }
    
    // Something to do...
    
    if (that.type === 'number') {
        ggTreeHive[obj_id].set(item_id, that.valueAsNumber);
        return;
    }

    // Things best w/ jquery ...
    let $tht = $(that);
    if ((that.type === 'color') || (that.type === 'range')) {
        let $sib = $tht.siblings('input');
        let tra = '';
        let clr = '';
        if (($sib.length > 0) && ($sib[0].type === 'range')) {
           tra = $sib[0].valueAsNumber.toString(16).toUpperCase(); 
           clr = that.value;
        }
        if (($sib.length > 0) && ($sib[0].type === 'color')) {
           clr = $sib[0].value;           
           tra = that.valueAsNumber.toString(16).toUpperCase(); 
        }
        tra = (tra === 'FF') ? '' : tra;
        ggTreeHive[obj_id].set(item_id, clr + tra);
        return;
    }
    
    if ($tht.hasClass('gg_itemedit_showhide')) {            
        ggTreeHive[obj_id].set(item_id, that.value === 'Show');
        return;
    }
    if ($tht.hasClass('gg_itemedit_bool')) {            
        ggTreeHive[obj_id].set(item_id, that.value === 'True');
        return;
    }
    ggTreeHive[obj_id].set(item_id, that.value);
}
