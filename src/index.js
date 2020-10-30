"use strict";

import { parse as _parse } from 'jspeg'

import { Document } from './grammar.js'
import { Visitor } from './visitor.js'


export function parse(text) {
    let i = text.indexOf('\n');
    let tags = text.substring(0, i);
    let doc = text.substring(i);

    return {
        tags: tags.split(' ').filter(x => x.length > 0),
        body: parseWithoutTags(doc),
    }
}

export function parseWithoutTags(text) {
    return _parse(Document, text.trim('\n')).accept(new Visitor());
}
