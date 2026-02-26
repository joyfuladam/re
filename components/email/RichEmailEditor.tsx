"use client"

import dynamic from "next/dynamic"
import { forwardRef, useImperativeHandle, useRef } from "react"
import type ReactQuillType from "react-quill"

const ReactQuill = dynamic(async () => (await import("react-quill")).default, { ssr: false }) as unknown as typeof ReactQuillType

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

const modules = {
  toolbar: [
    [{ font: [] }, { size: [] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link"],
    ["clean"],
  ],
}

const formats = [
  "font",
  "size",
  "bold",
  "italic",
  "underline",
  "list",
  "bullet",
  "align",
  "link",
]

export const RichEmailEditor = forwardRef<RichEmailEditorHandle, RichEmailEditorProps>(
  function RichEmailEditor({ value, onChange, placeholder, className }, ref) {
    const quillRef = useRef<any>(null)

    useImperativeHandle(ref, () => ({
      insertTextAtCursor: (text: string) => {
        const quill = quillRef.current?.getEditor?.()
        if (!quill) return
        const range = quill.getSelection(true)
        const index = range ? range.index : quill.getLength()
        quill.insertText(index, text, "user")
        quill.setSelection(index + text.length, 0, "user")
      },
      insertHtmlAtCursor: (html: string) => {
        const quill = quillRef.current?.getEditor?.()
        if (!quill) return
        const range = quill.getSelection(true)
        const index = range ? range.index : quill.getLength()
        quill.clipboard.dangerouslyPasteHTML(index, html, "user")
        quill.setSelection(index + 1, 0, "user")
      },
    }))

    return (
      <div className={className}>
        <ReactQuill
          ref={quillRef}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          modules={modules}
          formats={formats}
          theme="snow"
        />
      </div>
    )
  }
)

