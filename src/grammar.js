"use strict";

import {
    apply,
    one,
    collect,
    some,
    maybeSome,
    csl,
    attr,
    ignore,
    optional,
} from 'jspeg'


let r_inline = /([^\n\[\]]|(?<=\\)[\[\]])*/m

let r_line = /([^\n\[\]]|(?<=\\)[\[\]])+/m

let r_paragraph = /([^\n\[\]]|(?<=\\)[\[\]]|(?<!\n)\n(?!\n))+/m

let r_paragraph_condition = /(^(?!(\t+\*|( {4})+\*|\||``(?!`)|````(?!`))))/m

let r_list_condition = /(^(?=(\t+|( {4})+)\*))/m

let r_table_line = /([^\n\[\]\|]|(?<=\\)[\[\]\|])+/m

let r_table_line_condition = /(^(?=\|.*\|$))/m

let r_rawblock_line_condition = /(^(?!```$))/m

let r_block_line_condition = /(^(?!````$))/


class Nullary {
    accept(visitor) {
        let tags = [];

        if (this.tags !== undefined) {
            tags = this.tags.map(x => x.accept(visitor));
        }

        return visitor.visit(this, tags)
    }
}

class Nary {
    accept(visitor) {
        let tags = [];

        if (this.tags !== undefined) {
            tags = this.tags.map(x => x.accept(visitor));
        }

        return visitor.visit(this, tags, this.content.map(x => x.accept(visitor)))
    }
}

export class Tag extends Nullary {}
Tag.grammar = apply(
        attr('tag', /\w+/),
        optional(
            one(
                apply(ignore(/"/), attr('value', /[^"]*/), ignore(/"/)),
                apply(ignore(/'/), attr('value', /[^']*/), ignore(/'/)),
            )
        )
    )


export class Inline extends Nullary {}
Inline.grammar = apply(
        /\[/,
        //attr('tags', csl(Tag, / +/)),
        attr('tags', some(one(ignore(/ +/), Tag))),
        /\]/,
        /\[/,
        attr('content', r_inline),
        /\]/,
    )


export class ParagraphText extends Nullary {}
ParagraphText.grammar = attr('content', r_paragraph)


export class Paragraph extends Nary {}
Paragraph.grammar = apply(
    ignore(r_paragraph_condition),
    attr('content', some(one(Inline, ParagraphText)))
)


export class ListLineText extends Nullary {}
ListLineText.grammar = attr('content', r_line)


export class ListLine extends Nary {}
ListLine.grammar = apply(
    attr('indentation', /^(\t| {4})+/m),
    ignore(/\* */m),
    attr('content', some(one(Inline, ListLineText)))
)


export class List extends Nary {}
List.grammar = apply(
    ignore(r_list_condition),
    optional(apply(
        ignore(/^(\t| {4})+\*[ \t]*!:/),
        attr('tags', some(one(ignore(/ +/), Tag))),
        /\n/
    )),
    attr('content', collect(
            ListLine,
            maybeSome(
                collect(ignore(/\n/), ListLine)
            )
        )
    )
)

export class TableCellText extends Nullary {}
TableCellText.grammar = attr('content', r_table_line)

export class TableCell extends Nary {}
TableCell.grammar = attr('content', some(one(Inline, TableCellText)))

export class TableLine extends Nary {}
TableLine.grammar = apply(
    ignore(r_table_line_condition),
    attr('content', some(one(ignore(/\|/), TableCell)))
)

export class Table extends Nary {}
Table.grammar = apply(
    optional(apply(
        ignore(/^\|[ \t]*!:/),
        attr('tags', some(one(ignore(/ +/), Tag))),
        /\n/
    )),
    attr('content', collect(
            TableLine,
            maybeSome(
                collect(ignore(/\n/), TableLine)
            )
        )
    )
)

export class RawBlockLine extends Nullary {}
RawBlockLine.grammar = apply(
    ignore(r_rawblock_line_condition),
    attr('content', /^.*\n/m)
)

export class RawBlock extends Nary {}
RawBlock.grammar = apply(
    one(
        ignore(/^```$/m),
        apply(
            ignore(/^```[\t ]*!:/m),
            attr('tags', some(one(ignore(/ +/), Tag)))
        )
    ),
    attr('content', maybeSome(RawBlockLine)),
    ignore(/^```$/m)
)

export class BlockText extends Nullary {}
BlockText.grammar = attr('content', r_line)

export class BlockLine extends Nary {}
BlockLine.grammar = apply(
    ignore(r_block_line_condition),
    attr('content', some(one(Inline, BlockText)))
)

export class Block extends Nary {}
Block.grammar = apply(
    one(
        ignore(/^````$/m),
        apply(
            ignore(/^````[\t ]*!:/m),
            attr('tags', some(one(ignore(/ +/), Tag)))
        )
    ),
    attr('content', some(one(ignore(/\n/m), BlockLine))),
    ignore(/^````$/m)
)

export class HeadingText extends Nullary {}
HeadingText.grammar = attr('content', r_line)


export class Heading extends Nary {}
Heading.grammar = apply(
    attr('heading', /#+/m),
    ignore(/ */m),
    attr('content', some(one(Inline, HeadingText)))
)


export class Part extends Nullary {}
Part.grammar = one(
    List, Table, RawBlock, Block, Heading, Paragraph
)


export class NewLines extends Nullary {}
NewLines.grammar = attr('foo', /\n\n+/m)


export class Document extends Nary {}
Document.grammar = attr('content', maybeSome(one(Part, NewLines)))


/*
console.log('TAG TEST');
console.log(parse(Tag, 'code'));
console.log(parse(Tag, 'code"python"'));
console.log(parse(Tag, "code'python'"));
console.log();


console.log('INLINE TEST');
console.dir(parse(Inline, '[bold][This is a test]'), {depth: null})
console.log();


console.log('PARAGRAPH TEST');
console.dir(parse(Paragraph, 'This is a paragraph test.'), {depth: null})
console.log();


console.log('LISTLINE TEST');
console.dir(parse(ListLine, '    * Line 1'), {depth: null});
console.log();


console.log('LIST TEST');
console.dir(parse(List, '    * Line 1\n    * Line 2'), {depth: null});
console.log();


console.log('TABLELINE TEST');
console.dir(parse(TableLine, '|foo|bar|baz|'), {depth: null});
console.log();

console.log('TABLE TEST');
console.dir(parse(Table, '|foo|bar|baz|\n|apple|banana|mango|'), {depth: null});
console.log();


console.log('RAWBLOCK TEST');
console.dir(parse(RawBlock, '```\nrawblock here\n```'), {depth: null});
console.log()


console.log('BLOCK TEST');
console.dir(parse(Block, '````\nThis is a block\n````'), {depth: null});
console.log()


console.log('HEADING TEST');
console.dir(parse(Heading, '# WUHU'), {depth: null});
console.log();


console.log('DOCUMENT TEST');
console.dir(parse(Document, '# Wuhu\n\nParagraph1\n\nParagraph2'), {depth: null});
console.log();
*/
