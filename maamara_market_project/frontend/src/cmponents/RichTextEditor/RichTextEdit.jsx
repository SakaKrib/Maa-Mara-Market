import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import { Bold, Italic, Strikethrough, Underline as UnderlineIcon, Pilcrow, Heading1, Heading2, Heading3, List, ListOrdered, ListChecks, Quote, Code2, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2 } from "lucide-react";

const toolbarButton = (active = false) =>
  [
    "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-xs font-semibold transition",
    active
      ? "border-[#2563eb] bg-[#2563eb] text-white"
      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    "focus:outline-none focus:ring-2 focus:ring-[#2563eb]/10",
  ].join(" ");

const RichTextEditor = ({ value, onChange, placeholder = "Start writing here..." }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TaskList,
      TaskItem,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const nextValue = value || "";
    if (nextValue !== editor.getHTML()) {
      editor.commands.setContent(nextValue, false);
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div className="w-full overflow-hidden rounded-[20px] border border-gray-300 bg-white">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-[#f8f8f6] p-3">
        <button type="button" aria-label="Bold" className={toolbarButton(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></button>
        <button type="button" aria-label="Italic" className={toolbarButton(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></button>
        <button type="button" aria-label="Strikethrough" className={toolbarButton(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></button>
        <button type="button" aria-label="Underline" className={toolbarButton(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={16} /></button>
        <button type="button" aria-label="Paragraph" className={toolbarButton(editor.isActive("paragraph"))} onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow size={16} /></button>
        <button type="button" aria-label="Heading 1" className={toolbarButton(editor.isActive("heading", { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={16} /></button>
        <button type="button" aria-label="Heading 2" className={toolbarButton(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></button>
        <button type="button" aria-label="Heading 3" className={toolbarButton(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></button>
        <button type="button" aria-label="Bulleted list" className={toolbarButton(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></button>
        <button type="button" aria-label="Numbered list" className={toolbarButton(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></button>
        <button type="button" aria-label="Task list" className={toolbarButton(editor.isActive("taskList"))} onClick={() => editor.chain().focus().toggleTaskList().run()}><ListChecks size={16} /></button>
        <button type="button" aria-label="Blockquote" className={toolbarButton(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} /></button>
        <button type="button" aria-label="Code block" className={toolbarButton(editor.isActive("codeBlock"))} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 size={16} /></button>
        <button type="button" aria-label="Align left" className={toolbarButton(false)} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft size={16} /></button>
        <button type="button" aria-label="Align center" className={toolbarButton(false)} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter size={16} /></button>
        <button type="button" aria-label="Align right" className={toolbarButton(false)} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight size={16} /></button>
        <button type="button" aria-label="Undo" className={toolbarButton(false)} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></button>
        <button type="button" aria-label="Redo" className={toolbarButton(false)} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></button>
      </div>

      <div className="min-h-[220px] bg-white px-4 py-3 text-sm text-gray-900">
        <EditorContent
          editor={editor}
          className="[&_.ProseMirror]:min-h-[190px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:leading-7 [&_.ProseMirror_p]:mb-3 [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_ul]:mb-3 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:mb-3 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_blockquote]:my-4 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-[#2563eb] [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_pre]:my-4 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-xl [&_.ProseMirror_pre]:bg-gray-900 [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:text-gray-100 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:bg-gray-100 [&_.ProseMirror_code]:px-1"
        />
        {editor.isEmpty && (
          <p className="pointer-events-none -mt-[190px] text-sm text-gray-400">
            {placeholder}
          </p>
        )}
      </div>
    </div>
  );
};

export default RichTextEditor;
