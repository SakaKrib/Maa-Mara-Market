import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";

import { useTheme, Box, Button, Stack } from "@mui/material";
import { tokens } from "../../theme";

const MenuBar = ({ editor, colors }) => {
  if (!editor) return null;

  const btnStyle = (active) => ({
    minWidth: "36px",
    height: "36px",
    padding: 0,
    fontSize: "12px",
    fontWeight: 700,
    borderRadius: "8px",
    backgroundColor: active
      ? colors.greenAccent[500]
      : colors.primary[500],
    color: colors.gray[100],
    border: `1px solid ${colors.gray[400]}`,
    "&:hover": {
      backgroundColor: colors.primary[400],
    },
  });

  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      gap={1}
      sx={{
        mb: 1,
        p: 1,
        borderRadius: 2,
        backgroundColor: colors.primary[600],
        border: `1px solid ${colors.gray[400]}`,
      }}
    >
      {/* TEXT STYLE */}
      <Button
        sx={btnStyle(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </Button>

      <Button
        sx={btnStyle(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        I
      </Button>

      <Button
        sx={btnStyle(editor.isActive("strike"))}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        S
      </Button>

      <Button
        sx={btnStyle(editor.isActive("underline"))}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        U
      </Button>

      {/* HEADINGS */}
      <Button
        sx={btnStyle(editor.isActive("paragraph"))}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        P
      </Button>

      <Button
        sx={btnStyle(editor.isActive("heading", { level: 1 }))}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
      >
        H1
      </Button>

      <Button
        sx={btnStyle(editor.isActive("heading", { level: 2 }))}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        H2
      </Button>

      <Button
        sx={btnStyle(editor.isActive("heading", { level: 3 }))}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      >
        H3
      </Button>

      {/* LISTS */}
      <Button
        sx={btnStyle(editor.isActive("bulletList"))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </Button>

      <Button
        sx={btnStyle(editor.isActive("orderedList"))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </Button>

      <Button
        sx={btnStyle(editor.isActive("taskList"))}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        ☑
      </Button>

      {/* BLOCKS */}
      <Button
        sx={btnStyle(editor.isActive("blockquote"))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        ❝
      </Button>

      <Button
        sx={btnStyle(editor.isActive("codeBlock"))}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        {"</>"}
      </Button>

      {/* ALIGNMENT */}
      <Button
        sx={btnStyle(false)}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        L
      </Button>

      <Button
        sx={btnStyle(false)}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        C
      </Button>

      <Button
        sx={btnStyle(false)}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        R
      </Button>

      {/* HISTORY */}
      <Button
        sx={btnStyle(false)}
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↩
      </Button>

      <Button
        sx={btnStyle(false)}
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↪
      </Button>
    </Stack>
  );
};

const RichTextEditor = ({ value, onChange, placeholder = "Start writing here..." }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TaskList,
      TaskItem,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <Box>
      <MenuBar editor={editor} colors={colors} />

      <Box
        sx={{
          minHeight: 220,
          p: 2,
          borderRadius: 2,
          border: `1px solid ${colors.gray[400]}`,
          backgroundColor: "transparent",
          color: colors.gray[100],

          "& .ProseMirror": {
            outline: "none",
            minHeight: 200,
          },

          "& h1": { fontSize: "28px", fontWeight: 700 },
          "& h2": { fontSize: "22px", fontWeight: 600 },
          "& h3": { fontSize: "18px", fontWeight: 600 },

          "& blockquote": {
            borderLeft: `4px solid ${colors.greenAccent[500]}`,
            paddingLeft: 12,
            color: colors.gray[300],
          },

          "& ul, & ol": {
            paddingLeft: 20,
          },
        }}
      >
        <Box sx={{ position: "relative" }}>\n          <EditorContent editor={editor} />\n          {showPlaceholder && (\n            <Box\n              onClick={() => editor?.chain().focus().run()}\n              sx={{\n                position: "absolute",\n                top: 0,\n                left: 0,\n                pointerEvents: "none",\n                color: colors.gray[400],\n                fontSize: "14px",\n                lineHeight: 1.6,\n              }}\n            >\n              {placeholder}\n            </Box>\n          )}\n        </Box>
      </Box>
    </Box>
  );
};

export default RichTextEditor;