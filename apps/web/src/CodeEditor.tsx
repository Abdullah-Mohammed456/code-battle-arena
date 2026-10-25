import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";

export default function CodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange(value: string): void;
}) {
  return (
    <CodeMirror
      value={value}
      height="440px"
      extensions={[cpp()]}
      onChange={onChange}
      theme="dark"
      basicSetup={{ lineNumbers: true, foldGutter: false }}
    />
  );
}
