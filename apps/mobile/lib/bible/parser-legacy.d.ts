declare module "bible-passage-reference-parser/js/en_bcv_parser.min.js" {
  export class bcv_parser {
    set_options(options: Record<string, unknown>): this;
    parse(text: string): {
      osis(): string;
      parsed_entities(): Array<{
        osis: string;
        indices: [number, number];
      }>;
    };
  }
}
