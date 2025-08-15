declare module "*.svg" {
  import * as React from "react";
  const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  export default ReactComponent;
}

declare module "*.webp" {
  import type { StaticImageData } from "next/image";
  const value: string | StaticImageData;
  export default value;
}

declare module "*.png" {
  const content: string;
  export default content;
}
