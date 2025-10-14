import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CodingPage() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");

  const runCode = () => {
    try {
      if (language === "javascript") {
        const result = eval(code);
        setOutput(String(result));
      } else if (language === "html") {
        setOutput("HTML preview loaded below");
      } else {
        setOutput("Language execution coming soon");
      }
    } catch (error: any) {
      setOutput(`Error: ${error.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-serif text-4xl text-primary mb-6">Code Editor</h1>
      
      <div className="mb-4 flex gap-4">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="python">Python</SelectItem>
            <SelectItem value="html">HTML/CSS</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={runCode} data-testid="button-run">Run Code</Button>
        <Button variant="outline">Save</Button>
      </div>

      <textarea
        className="w-full h-96 p-4 font-mono text-sm bg-card border border-border rounded-lg resize-none"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Write your code here..."
        data-testid="textarea-code"
      />

      <div className="mt-4 p-4 bg-card border border-border rounded-lg min-h-32">
        <h3 className="font-semibold mb-2">Output:</h3>
        <pre className="text-sm font-mono whitespace-pre-wrap">{output}</pre>
      </div>
    </div>
  );
}
