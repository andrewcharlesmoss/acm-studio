export type StyleViewport = "desktop" | "tablet" | "mobile";
export type FontFamily = "inter" | "helvetica-neue" | "helvetica" | "arial" | "sans-serif" | "system-sans" | "georgia";
export type FontSizeUnit = "px" | "em" | "rem" | "vw" | "vh";
export type LineHeightUnit = "number";
export type LetterSpacingUnit = "px" | "%" | "em" | "rem" | "vw" | "vh";
export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize";

export type ResponsiveValue<T> = {
  desktop: T;
  tablet?: T;
  mobile?: T;
};

export type FontSizeValue = { value: number; unit: FontSizeUnit };
export type LineHeightValue = { value: number; unit: LineHeightUnit };
export type LetterSpacingValue = { value: number; unit: LetterSpacingUnit };
export type LayoutUnit = "px" | "%" | "em" | "rem" | "vw" | "vh";
export type LayoutSpacingValue = { value: number; unit: LayoutUnit };
export type LayoutContentWidthValue = { value: number; unit: LayoutUnit };
export type LayoutRadiusValue = { value: number; unit: "px" | "%" | "em" | "rem" };
export type LayoutBorderWidthValue = { value: number; unit: "px" };

export type TypographyStyle = {
  family: FontFamily;
  weight: number;
  style: "normal" | "italic";
  size: ResponsiveValue<FontSizeValue>;
  lineHeight: ResponsiveValue<LineHeightValue>;
  letterSpacing: ResponsiveValue<LetterSpacingValue>;
  transform: TextTransform;
};

export type UniversalStylePreset = {
  version: "0.12.0";
  palette: {
    surface: string;
    surfaceRaised: string;
    surfaceSubtle: string;
    workspaceBackground: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    accent: string;
    onAccent: string;
    success: string;
    information: string;
    alert: string;
    warning: string;
    rating: string;
  };
  typography: {
    body: TypographyStyle;
    h1: TypographyStyle;
    h2: TypographyStyle;
    h3: TypographyStyle;
    h4: TypographyStyle;
    h5: TypographyStyle;
    h6: TypographyStyle;
    button: TypographyStyle;
    navigation: TypographyStyle;
    metadata: TypographyStyle;
  };
  buttons: {
    base: ButtonStyle;
    secondary: ButtonStyle;
    outline: ButtonStyle;
  };
  interactions: {
    neutralHoverBackground: string;
    selectionColour: string;
    blockSelectionColour: string;
    controlAccentColour: string;
  };
  layout: {
    spacing: LayoutSpacingValue;
    contentWidth: LayoutContentWidthValue;
    radius: LayoutRadiusValue;
    borderWidth: LayoutBorderWidthValue;
  };
};

export type HoverTreatment = "none" | "text-icon" | "background";

type InterfaceColours = {
    surface: string;
    raisedSurface: string;
    subtleSurface: string;
    workspaceBackground: string;
    primaryText: string;
    secondaryText: string;
    label: string;
    border: string;
    actionAccent: string;
    controlAccent: string;
    selection: string;
    blockSelection: string;
    neutralHover: string;
};

export type InterfaceStylePreset = (
  | { version: "0.1.0"; colours: InterfaceColours & { sharedBlockSelection?: never } }
  | { version: "0.2.0"; colours: InterfaceColours & { sharedBlockSelection: string } }
) & {
  typography: {
    control: { family: "system-sans" | "inter"; size: number; weight: number };
    header: { family: "inter" | "system-sans"; size: number; weight: number };
  };
  fields: { radius: number };
  buttons: { base: InterfaceButtonStyle; secondary: InterfaceButtonStyle; outline: InterfaceButtonStyle };
  interactions: {
    textActions: { treatment: HoverTreatment; foreground: string; background: string };
    iconActions: { treatment: HoverTreatment; foreground: string; background: string };
    inspectorOptions: { treatment: HoverTreatment; foreground: string; background: string };
    colourRows: { treatment: HoverTreatment; foreground: string; background: string };
    neutralRows: { treatment: HoverTreatment; foreground: string; background: string };
    fields: { treatment: HoverTreatment; foreground: string; background: string };
    buttons: { treatment: HoverTreatment; foreground: string; background: string };
  };
};

export type InterfaceButtonStyle = {
  background: string;
  foreground: string;
  border: string;
  borderWidth: number;
};

export type ButtonBorderWidthUnit = "px" | "em" | "rem" | "vw" | "vh";

export type ButtonStyle = {
  background: string;
  foreground: string;
  border: string;
  borderWidth: number;
  borderWidthUnit?: ButtonBorderWidthUnit;
  hoverBackground: string;
  hoverForeground: string;
};
