"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"

export interface RichEmailEditorHandle {
  insertTextAtCursor: (text: string) => void
  insertHtmlAtCursor: (html: string) => void
}

interface RichEmailEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const QUILL_MODULES = {
  toolbar: [
    [{ font: ["", "arial", "aptos", "calibri", "serif", "monospace"] }],
    [{ size: ["small", false, "large", "huge"] }],
    ["bold", "italic", "underline"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link", "image"],
    ["clean"],
  ],
}

const QUILL_FORMATS = [
  "font",
  "size",
  "bold",
  "italic",
  "underline",
  "color",
  "background",
  "list",
  "bullet",
  "align",
  "link",
  "image",
]

let fontsRegistered = false

function registerFonts() {
  if (fontsRegistered) return
  try {
    const Quill = require("quill") as any
    const FontAttr = Quill.import("formats/font") as any
    FontAttr.whitelist = ["arial", "aptos", "calibri", "serif", "monospace"]
    Quill.register(FontAttr, true)
    fontsRegistered = true
  } catch (e) {
    console.warn("Could not register Quill fonts:", e)
  }
}

export const RichEmailEditor = forwardRef<RichEmailEditorHandle, RichEmailEditorProps>(
  function RichEmailEditor({ value, onChange, placeholder, className }, ref) {
    const quillRef = useRef<any>(null)
    const [QuillComponent, setQuillComponent] = useState<any>(null)

    useEffect(() => {
      let cancelled = false
      async function load() {
        try {
          registerFonts()
          const mod = await import("react-quill")
          if (!cancelled) {
            setQuillComponent(() => mod.default)
          }
        } catch (e) {
          console.error("Failed to load react-quill:", e)
        }
      }
      load()
      return () => { cancelled = true }
    }, [])

    useImperativeHandle(ref, () => ({
      insertTextAtCursor: (text: string) => {
        const editor = quillRef.current?.getEditor?.()
        if (!editor) return
        const range = editor.getSelection(true)
        const index = range ? range.index : editor.getLength()
        editor.insertText(index, text, "user")
        editor.setSelection(index + text.length, 0, "user")
      },
      insertHtmlAtCursor: (html: string) => {
        const editor = quillRef.current?.getEditor?.()
        if (!editor) return
        const range = editor.getSelection(true)
        const index = range ? range.index : editor.getLength()
        editor.clipboard.dangerouslyPasteHTML(index, html, "user")
        editor.setSelection(index + 1, 0, "user")
      },
    }))

    if (!QuillComponent) {
      return (
        <div className={className}>
          <div className="min-h-[300px] border rounded-md bg-muted/30 flex items-center justify-center text-muted-foreground text-sm">
            Loading editor…
          </div>
        </div>
      )
    }

    return (
      <div className={className}>
        <style>{`
          .ql-container { min-height: 300px; }
          .ql-editor { min-height: 280px; }
          .ql-font-arial { font-family: Arial, Helvetica, sans-serif; }
          .ql-font-aptos { font-family: Aptos, Calibri, Arial, sans-serif; }
          .ql-font-calibri { font-family: Calibri, 'Segoe UI', Arial, sans-serif; }
          .ql-font-serif { font-family: Georgia, 'Times New Roman', serif; }
          .ql-font-monospace { font-family: 'Courier New', Courier, monospace; }
          .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="arial"]::before,
          .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="arial"]::before { content: "Arial"; font-family: Arial, Helvetica, sans-serif; }
          .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="aptos"]::before,
          .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="aptos"]::before { content: "Aptos"; font-family: Aptos, Calibri, Arial, sans-serif; }
          .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="calibri"]::before,
          .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="calibri"]::before { content: "Calibri"; font-family: Calibri, 'Segoe UI', Arial, sans-serif; }
          .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="serif"]::before,
          .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="serif"]::before { content: "Serif"; font-family: Georgia, 'Times New Roman', serif; }
          .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="monospace"]::before,
          .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="monospace"]::before { content: "Monospace"; font-family: 'Courier New', Courier, monospace; }
          .ql-snow .ql-picker.ql-font .ql-picker-label::before,
          .ql-snow .ql-picker.ql-font .ql-picker-item::before { content: "Sans Serif"; }
        `}</style>
        <QuillComponent
          ref={quillRef}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          modules={QUILL_MODULES}
          formats={QUILL_FORMATS}
          theme="snow"
        />
      </div>
    )
  }
)
