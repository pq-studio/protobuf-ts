import * as ts from "typescript";
import {
    addCommentBlockAsJsDoc,
    addCommentBlocksAsLeadingDetachedLines,
    AnyDescriptorProto,
    DescriptorRegistry,
    EnumValueDescriptorProto,
    FieldDescriptorProto,
    isAnyTypeDescriptorProto,
    MethodDescriptorProto,
    OneofDescriptorProto
} from "@pqstudio/protobuf_ts_framework";


export class CommentGenerator {


    constructor(
        private readonly registry: DescriptorRegistry
    ) {
    }


    /**
     * Adds comments from the .proto as a JSDoc block.
     *
     * Looks up comments for the given descriptor in
     * the source code info.
     *
     * Adds `@deprecated` tag if the element is
     * marked deprecated. Also adds @deprecated if
     * the descriptor is a type (enum, message) and
     * the entire .proto file is marked deprecated.
     *
     * Adds `@generated` tag with source code
     * information.
     *
     * Leading detached comments are added as line
     * comments in front of the JSDoc block.
     *
     * Trailing comments are a bit weird. For .proto
     * enums and messages, they sit between open
     * bracket and first member. A message seems to
     * only ever have a trailing comment if it is
     * empty. For a simple solution, trailing
     * comments on enums and messages should simply
     * be appended to the leading block so that the
     * information is not discarded.
     */
    addCommentsForDescriptor(node: ts.Node, descriptor: AnyDescriptorProto, trailingCommentsMode: 'appendToLeadingBlock' | 'trailingLines'): void {
        const source = this.registry.sourceCodeComments(descriptor);

        // add leading detached comments as line comments
        addCommentBlocksAsLeadingDetachedLines(node, ...source.leadingDetached);

        // start with leading block
        let leading = this.getCommentBlock(descriptor, trailingCommentsMode === "appendToLeadingBlock");

        // add leading block as jsdoc comment block
        addCommentBlockAsJsDoc(node, leading);

        // add trailing comments as trailing line comments
        if (source.trailing && trailingCommentsMode === 'trailingLines') {
            let lines = source.trailing.split('\n').map(l => l[0] !== ' ' ? ` ${l}` : l);
            for (let line of lines) {
                ts.addSyntheticTrailingComment(node, ts.SyntaxKind.SingleLineCommentTrivia, line, true);
            }
        }
    }

    /**
     * Returns a block of source comments (no leading detached!),
     * with @generated tags and @deprecated tag (if applicable).
     */
    getCommentBlock(descriptor: AnyDescriptorProto, appendTrailingComments = false): string {
        const source = this.registry.sourceCodeComments(descriptor);

        // start with leading block
        let commentBlock = source.leading ?? '';

        // add trailing comments to the leading block
        if (source.trailing && appendTrailingComments) {
            if (commentBlock.length > 0) {
                commentBlock += '\n\n';
            }
            commentBlock += source.trailing;
        }

        // if there were any leading comments, we need some space
        if (commentBlock.length > 0) {
            commentBlock += '\n\n'
        }

        // add deprecated information to the leading block
        commentBlock += this.makeDeprecatedTag(descriptor);

        // add source info to the leading block
        commentBlock += this.makeGeneratedTag(descriptor);

        return commentBlock;
    }


    /**
     * Returns "@deprecated\n" if explicitly deprecated.
     * For top level types, also returns "@deprecated\n" if entire file is deprecated.
     * Otherwise, returns "".
     */
    makeDeprecatedTag(descriptor: AnyDescriptorProto) {
        let deprecated = this.registry.isExplicitlyDeclaredDeprecated(descriptor);

        if (!deprecated && isAnyTypeDescriptorProto(descriptor)) {
            // an entire .proto file can be marked deprecated.
            // this means all types within are deprecated.
            // we mark them as deprecated, but dont touch members.
            deprecated = this.registry.isExplicitlyDeclaredDeprecated(this.registry.fileOf(descriptor));
        }
        if (deprecated) {
            return '@deprecated\n';
        }
        return '';
    }


    /**
     * Creates string like "@generated from protobuf field: string foo = 1;"
     */
    makeGeneratedTag(descriptor: AnyDescriptorProto): string {
        if (OneofDescriptorProto.is(descriptor)) {
            return `@generated from protobuf oneof: ${descriptor.name}`;
        } else if (EnumValueDescriptorProto.is(descriptor)) {
            return `@generated from protobuf enum value: ${this.registry.formatEnumValueDeclaration(descriptor)}`;
        } else if (FieldDescriptorProto.is(descriptor)) {
            return `@generated from protobuf field: ${this.registry.formatFieldDeclaration(descriptor)}`;
        } else if (MethodDescriptorProto.is(descriptor)) {
            return `@generated from protobuf rpc: ${this.registry.formatRpcDeclaration(descriptor)}`;
        } else {
            return `@generated from protobuf ${this.registry.formatQualifiedName(descriptor)}`;
        }
    }


}
