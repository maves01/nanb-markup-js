"use strict";

import {
    Inline, HeadingText, Heading, Tag, Paragraph,
    ParagraphText, ListLineText, ListLine, List,
    TableCellText, TableCell, TableLine, Table,
    RawBlock, RawBlockLine,
    BlockText, BlockLine, Block,
    Part, NewLines, Document
} from './grammar.js'


function _create_list_body(list_lines) {
    let lines = [];
    let current_indentation = 0;
    let append_target = {0: lines};

    for (let line of list_lines) {
        if (line['indentation'] > current_indentation) {
            let tmp = {'body': [], 'parameters': {'list': true}}
            let l = append_target[current_indentation].length;
            append_target[current_indentation][l-1]['body'].push(tmp);
            append_target[line['indentation']] = tmp['body'];
            current_indentation = line['indentation'];
        } else if (line['indentation'] < current_indentation) {
            current_indentation = line['indentation'];
        }

        let tmp = {...line};
        delete tmp['indentation'];
        append_target[current_indentation].push(tmp);
    }

    return lines
}


export class Visitor {
    constructor() {
        this.excludes_inline = new Set(['mathinline']);
    }

    visit() {
        // The visit function will get either 2 or 3 arguments
        let args = [...arguments];

        switch (args[0].constructor.name) {

            case 'Tag':
                return this.visitTag(...args)
            case 'Inline':
                return this.visitInline(...args)
            case 'HeadingText':
                return this.visitHeadingText(...args)
            case 'Heading':
                return this.visitHeading(...args)
            case 'ParagraphText':
                return this.visitParagraphText(...args)
            case 'Paragraph':
                return this.visitParagraph(...args)
            case 'ListLineText':
                return this.visitListLineText(...args)
            case 'ListLine':
                return this.visitListLine(...args)
            case 'List':
                return this.visitList(...args)
            case 'TableCellText':
                return this.visitTableCellText(...args)
            case 'TableCell':
                return this.visitTableCell(...args)
            case 'TableLine':
                return this.visitTableLine(...args)
            case 'Table':
                return this.visitTable(...args)
            case 'RawBlockLine':
                return this.visitRawBlockLine(...args)
            case 'RawBlock':
                return this.visitRawBlock(...args)
            case 'BlockText':
                return this.visitBlockText(...args)
            case 'BlockLine':
                return this.visitBlockLine(...args)
            case 'Block':
                return this.visitBlock(...args)
            case 'Part':
                return this.visitPart(...args)
            case 'NewLines':
                return this.visitNewLines(...args)
            case 'Document':
                return this.visitDocument(...args)

        }
    }

    visitTag(nullary, tags) {
        let res = {}
        if (nullary.value !== undefined) {
            res[nullary.tag] = nullary.value;
        } else {
            res[nullary.tag] = true;
        }
        return res
    }

    visitInline(nullary, tags) {
        let parameters = {};
        for (let tag of tags) {
            for (let [key, val] of Object.entries(tag)) {
                parameters[key] = val;
            }
        }

        let intersection = Object.keys(parameters).filter(x => this.excludes_inline.has(x));
        if (intersection.length == 0) {
            parameters['inline'] = true;
        }

        let content = nullary.content.replace('\\[', '[').replace('\\]', ']');
        return {'parameters': parameters, 'body': [content]}
    }

    visitHeadingText(nullary, tags) {
        return nullary.content.replace('\\[', '[').replace('\\]', ']')
    }

    visitHeading(nary, tags, content) {
        return {'parameters': {'heading': nary.heading.length},
                'body': content}
    }

    visitParagraphText(nullary, tags) {
        return nullary.content.replace('\\[', '[').replace('\\]', ']')
    }

    visitParagraph(nary, tags, content) {
        return {'parameters': {'paragraph': true}, 'body': content}
    }

    visitListLineText(nullary, tags) {
        return nullary.content.replace('\\[', '[').replace('\\]', ']')
    }

    visitListLine(nary, tags, content) {
        let indentation;
        if (nary.indentation.match(/( {4})+/) !== null) {
            indentation = (nary.indentation.length / 4) - 1;
        } else {
            indentation = nary.indentation.length - 1;
        }

        return {'parameters': {'listitem': true}, 'body': content,
                'indentation': indentation}
    }

    visitList(nary, tags, content) {
        let parameters = {};
        for (let tag of tags) {
            for (let [key, val] of Object.entries(tag)) {
                parameters[key] = val;
            }
        }
        parameters['list'] = true;

        let body = _create_list_body(content);

        return {'parameters': parameters, 'body': body}
    }

    visitTableCellText(nullary, tags) {
        return nullary.content.replace('\\[', '[')
                               .replace('\\]', ']')
                               .replace('\\|', '|')
    }

    visitTableCell(nary, tags, content) {
        return {'parameters': {'tablecell': true}, 'body': content}
    }

    visitTableLine(nary, tags, content) {
        return {'parameters': {'tablerow': true}, 'body': content}
    }

    visitTable(nary, tags, content) {
        let parameters = {};
        for (let tag of tags) {
            for (let [key, val] of Object.entries(tag)) {
                parameters[key] = val;
            }
        }
        parameters['table'] = true;

        delete content[0]['parameters']['tablerow'];
        content[0]['parameters']['tablehead'] = true;

        return {'parameters': parameters, 'body': content}
    }

    visitRawBlockLine(nullary, tags) {
        return nullary.content
    }

    visitRawBlock(nary, tags, content) {
        let parameters = {};
        for (let tag of tags) {
            for (let [key, val] of Object.entries(tag)) {
                parameters[key] = val;
            }
        }
        parameters['rawblock'] = true;

        return {'parameters': parameters,
                'body': [content.join('').trim()]}
    }

    visitBlockText(nullary, tags) {
        return nullary.content
    }

    visitBlockLine(nary, tags, content) {
        return {'parameters': {'inline': true}, 'body': content}
    }

    visitBlock(nary, tags, content) {
        let parameters = {};
        for (let tag of tags) {
            for (let [key, val] of Object.entries(tag)) {
                parameters[key] = val;
            }
        }
        parameters['block'] = true;

        return {'parameters': parameters, 'body': content}
    }

    visitPart(nullary, tags) {
        return nullary.content.accept(this)
    }

    visitNewLines(nullary, tags) {
        return null  
    }

    visitDocument(nary, tags, content) {
        return content.filter(x => x !== null)
    }
}
