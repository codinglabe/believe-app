"use client"
import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Editor } from "primereact/editor"
import { X } from "lucide-react"

interface RichTextEditorProps {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  className?: string
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ id, label, value, onChange, error, className }) => {
  const [isEditorReady, setIsEditorReady] = useState(false)
  const editorRef = useRef<any>(null)
  const contentSet = useRef(false)

  // Initialize editor with value when it's ready
  useEffect(() => {
    if (isEditorReady && editorRef.current && value && !contentSet.current) {
      const quill = editorRef.current.getQuill()
      if (quill) {
        // Set the HTML content directly (your original working method)
        quill.clipboard.dangerouslyPasteHTML(value)
        contentSet.current = true

        // Fix cursor positioning - set to end of content
        setTimeout(() => {
          const length = quill.getLength()
          quill.setSelection(length - 1, 0)
        }, 50)
      }
    }
  }, [isEditorReady, value])

  const handleTextChange = useCallback(
    (e: { htmlValue: string | null }) => {
      const html = e.htmlValue || ""
      onChange(html)
    },
    [onChange],
  )

  const handleEditorReady = useCallback(() => {
    setIsEditorReady(true)
  }, [])

  const headerTemplate = (
    <div className="flex flex-wrap items-center gap-1 p-3 bg-muted/20">
      {/* Text Formatting */}
      <span className="ql-formats flex items-center gap-0.5">
        <button className="ql-bold" aria-label="Bold" title="Bold" />
        <button className="ql-italic" aria-label="Italic" title="Italic" />
        <button className="ql-underline" aria-label="Underline" title="Underline" />
        <button className="ql-strike" aria-label="Strike" title="Strikethrough" />
      </span>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Headers */}
      <span className="ql-formats flex items-center gap-0.5">
        <select className="ql-header" defaultValue="0" aria-label="Header Size" title="Header Size">
          <option value="1">Header 1</option>
          <option value="2">Header 2</option>
          <option value="3">Header 3</option>
          <option value="4">Header 4</option>
          <option value="5">Header 5</option>
          <option value="6">Header 6</option>
          <option value="0">Normal</option>
        </select>
      </span>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Lists and Quote */}
      <span className="ql-formats flex items-center gap-0.5">
        <button className="ql-list" value="ordered" aria-label="Ordered List" title="Numbered List" />
        <button className="ql-list" value="bullet" aria-label="Bullet List" title="Bullet List" />
        <button className="ql-blockquote" aria-label="Blockquote" title="Quote" />
      </span>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Indent */}
      <span className="ql-formats flex items-center gap-0.5">
        <button className="ql-indent" value="-1" aria-label="Decrease Indent" title="Decrease Indent" />
        <button className="ql-indent" value="+1" aria-label="Increase Indent" title="Increase Indent" />
      </span>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Colors */}
      <span className="ql-formats flex items-center gap-0.5">
        <select className="ql-color" aria-label="Text Color" title="Text Color" />
        <select className="ql-background" aria-label="Background Color" title="Background Color" />
      </span>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Alignment */}
      <span className="ql-formats flex items-center gap-0.5">
        <select className="ql-align" aria-label="Align Text" title="Text Alignment" />
      </span>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Media and Links */}
      <span className="ql-formats flex items-center gap-0.5">
        <button className="ql-link" aria-label="Insert Link" title="Insert Link" />
        <button className="ql-image" aria-label="Insert Image" title="Insert Image" />
        <button className="ql-video" aria-label="Insert Video" title="Insert Video" />
      </span>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Clean */}
      <span className="ql-formats flex items-center gap-0.5">
        <button className="ql-clean" aria-label="Clear Formatting" title="Clear Formatting" />
      </span>
    </div>
  )

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label htmlFor={id || "rich-text-editor"} className="text-sm font-semibold text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <div className="rounded-lg border border-input bg-background overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <Editor
            ref={editorRef}
            id={id || "rich-text-editor"}
            value={value || ""}
            onTextChange={handleTextChange}
            onLoad={handleEditorReady}
            headerTemplate={headerTemplate}
            style={{
              height: "320px",
              border: "none",
            }}
            className="rich-text-editor-complete"
            formats={[
              "header",
              "font",
              "size",
              "bold",
              "italic",
              "underline",
              "strike",
              "blockquote",
              "list",
              "bullet",
              "indent",
              "link",
              "image",
              "video",
              "color",
              "background",
              "align",
            ]}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive flex items-center gap-1 mt-2">
            <X className="h-3 w-3" />
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

export default RichTextEditor
