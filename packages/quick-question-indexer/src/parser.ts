import fs from "fs";
import path from "path";

import TreeSitter, { SyntaxNode } from "tree-sitter";
import TreeSitterPython from "tree-sitter-python";
import TreeSitterTypescript from "tree-sitter-typescript";
import { TextBuffer, Location } from "superstring";

export interface Chunk {
  language: string;
  code: string;
  range: {
    start: Location;
    end: Location;
  };
}

interface LanguageInfo {
  language: any;
  languageName: string;
  extensions: Array<string>;
  nodeTypes: Array<string>;
  maxLevel: number;
  minLoc: number;
}

const LanguageInfos: Array<LanguageInfo> = [
  {
    language: TreeSitterPython,
    languageName: "python",
    extensions: [".py"],
    nodeTypes: ["function_definition", "class_definition"],
    maxLevel: 3,
    minLoc: 4,
  },
  {
    language: TreeSitterTypescript.tsx,
    languageName: "javascript",
    extensions: [".js", ".jsm", ".cjs", ".mjs"],
    nodeTypes: ["function_declaration", "class_declaration"],
    maxLevel: 1,
    minLoc: 4,
  },
  {
    language: TreeSitterTypescript.tsx,
    languageName: "typescript",
    extensions: [".ts"],
    nodeTypes: ["function_declaration", "class_declaration"],
    maxLevel: 1,
    minLoc: 4,
  },
  {
    language: TreeSitterTypescript.tsx,
    languageName: "jsx",
    extensions: [".jsx"],
    nodeTypes: ["function_declaration", "class_declaration"],
    maxLevel: 1,
    minLoc: 4,
  },
  {
    language: TreeSitterTypescript.tsx,
    languageName: "tsx",
    extensions: [".tsx"],
    nodeTypes: ["function_declaration", "class_declaration"],
    maxLevel: 1,
    minLoc: 4,
  },
];

export async function parseFile(file: string): Promise<Chunk[]> {
  const ext = path.extname(file);
  const langInfo = LanguageInfos.find((x) => x.extensions.includes(ext));
  if (!langInfo) {
    return [];
  }

  const parser = new TreeSitter();
  parser.setLanguage(langInfo.language);

  const code = fs.readFileSync(file, "utf-8");
  const tree = parser.parse(code);

  return await toArray(
    walkTree(new TextBuffer(code), langInfo, 0, tree.rootNode)
  );
}

async function toArray(asyncIterator: AsyncIterable<Chunk>): Promise<Chunk[]> {
  const arr = [];
  for await (const i of asyncIterator) arr.push(i);
  return arr;
}

async function* walkTree(
  code: TextBuffer,
  info: LanguageInfo,
  level: number,
  node: SyntaxNode
): AsyncIterable<Chunk> {
  if (level > info.maxLevel) return;

  if (
    info.nodeTypes.includes(node.type) &&
    node.endPosition.row - node.startPosition.row + 1 >= info.minLoc
  ) {
    yield {
      language: info.languageName,
      code: code.getTextInRange({
        start: node.startPosition,
        end: node.endPosition,
      }),
      range: {
        start: node.startPosition,
        end: node.startPosition,
      },
    };
  }

  for (const x of node.children) {
    yield* walkTree(code, info, level + 1, x);
  }
}
