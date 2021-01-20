import {
    DescriptorRegistry,
    FileDescriptorProto,
    FileDescriptorProtoFields,
    GeneratedFile,
    TypescriptFile,
} from "@protobuf-ts/plugin-framework";
import { InternalOptions } from "./our-options";


/**
 * A protobuf-ts output file.
 */
export class OutFile extends TypescriptFile implements GeneratedFile {


    constructor(
        name: string,
        public readonly fileDescriptor: FileDescriptorProto,
        private readonly registry: DescriptorRegistry,
        private readonly options: InternalOptions,
    ) {
        super(name);
    }


    getContent(): string {
        if (this.isEmpty()) {
            return "";
        }
        let props = [];
        if (this.fileDescriptor.package) {
            props.push('package "' + this.fileDescriptor.package + '"');
        }
        props.push('syntax ' + (this.fileDescriptor.syntax ?? 'proto2'));
        let header = [
            `/**`,
            `  * PQStudio A group of unknown boys who create happy games`,
            `  * PQStudio The first stage 2021-2031`,
            `  */`,
            ``,
            ``,
            `// @generated ${this.options.pluginCredit}`,
            `// @generated from protobuf file "${this.fileDescriptor.name}" (${props.join(', ')})`,
            `// @ts-nocheck`,
            `// tslint:disable`,
        ];
        if (this.registry.isExplicitlyDeclaredDeprecated(this.fileDescriptor)) {
            header.push('// @deprecated');
        }
        
        if (this.fileDescriptor.name != "PQMessages.proto") {
            header.push(`import { register } from "@pqstudio/pq_serializer";`);
            header.push(`import { PQMessages } from "./PQMessages";`);
        }

        [
            ...this.registry.sourceCodeComments(this.fileDescriptor, FileDescriptorProtoFields.syntax).leadingDetached,
            ...this.registry.sourceCodeComments(this.fileDescriptor, FileDescriptorProtoFields.package).leadingDetached
        ].every(block => header.push('//', ...block.split('\n').map(l => '//' + l), '//'));
        // 定死协议信息的proto文件为PQMessages

        let head = header.join('\n');
        if (head.length > 0 && !head.endsWith('\n')) {
            head += '\n';
        }
        return head + super.getContent();
    }


}
