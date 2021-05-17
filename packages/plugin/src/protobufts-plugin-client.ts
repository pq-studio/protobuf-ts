import { ProtobuftsPlugin } from "./protobufts-plugin";

export class ProtobuftsPluginClient extends ProtobuftsPlugin {
    constructor(version: string, type: string) {
        super(version, type);
    }
}