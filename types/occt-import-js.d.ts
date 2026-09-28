declare module "occt-import-js" {
  export type OcctMesh = {
    name: string;
    color?: [number, number, number];
    attributes: {
      position: { array: number[] };
      normal?: { array: number[] };
    };
    index: { array: number[] };
  };

  export type OcctResult = {
    success: boolean;
    meshes: OcctMesh[];
  };

  export type OcctModule = {
    ReadStepFile: (
      content: Uint8Array,
      params: {
        linearUnit: "millimeter";
        linearDeflectionType: "bounding_box_ratio";
        linearDeflection: number;
        angularDeflection: number;
      },
    ) => OcctResult;
  };

  const createOcctModule: (options?: {
    locateFile?: (filename: string) => string;
  }) => Promise<OcctModule>;

  export default createOcctModule;
}
