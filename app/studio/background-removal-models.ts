export type BackgroundRemovalMode = "general" | "people";
export const backgroundRemovalModels = {
  general: {
    url: "https://huggingface.co/Heliosoph/u2net-onnx/resolve/7fc34deee10329bc039c10a73b98090d0c6f5c59/u2net.onnx",
    bytes: 175_997_641,
    sha256: "8d10d2f3bb75ae3b6d527c77944fc5e7dcd94b29809d47a739a7a728a912b491",
  },
  people: {
    url: "https://huggingface.co/onnx-community/modnet-webnn/resolve/6af52070d14deafc5e55ce6cc4d752a322cdff76/onnx/model.onnx",
    bytes: 25_888_640,
    sha256: "07c308cf0fc7e6e8b2065a12ed7fc07e1de8febb7dc7839d7b7f15dd66584df9",
  },
} as const;
