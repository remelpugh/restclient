interface ISchemaDefinition {
    args?: string[];
    autoGenerateCrud?: boolean;
    parse(data: string): any;
    sort?: any;
    url: string;
}
export = ISchemaDefinition;
