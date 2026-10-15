"use client";

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { controlLibraryAttributes } from "./control-library-links";
import "./native-fields.css";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;
type TextInputProps = InputProps & { type?: "text" | "email" | "url" | "tel" };
const fieldClass = (className?: string) => `studio-native-field${className ? ` ${className}` : ""}`;

/** Pass native props and DOM refs unchanged; owners retain state, validation and commands. */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput({ className, type = "text", ...props }, ref) {
  return <input {...props} ref={ref} type={type} className={fieldClass(className)} {...controlLibraryAttributes("text-input")} />;
});
export const SearchInput = forwardRef<HTMLInputElement, InputProps>(function SearchInput({ className, ...props }, ref) {
  return <input {...props} ref={ref} type="search" className={fieldClass(className)} {...controlLibraryAttributes("search-field")} />;
});
export const NumberInput = forwardRef<HTMLInputElement, InputProps>(function NumberInput({ className, ...props }, ref) {
  return <input {...props} ref={ref} type="number" className={fieldClass(className)} {...controlLibraryAttributes("number-field")} />;
});
export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, ...props }, ref) {
  return <textarea {...props} ref={ref} className={fieldClass(className)} {...controlLibraryAttributes("text-area")} />;
});
export const SelectControl = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { showIndicator?: boolean }>(function SelectControl({ className, showIndicator = true, ...props }, ref) {
  return <select {...props} data-select-indicator={showIndicator ? "inset" : "none"} ref={ref} className={fieldClass(className)} {...controlLibraryAttributes("select-dropdown")} />;
});
