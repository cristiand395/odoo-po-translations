import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parsePo } from './parser';

/**
 * Lets Ctrl/Cmd-click on a `#: addons/sale/models/sale.py:142` reference jump
 * to that file:line. Odoo references are relative to an addons root, so we walk
 * up the workspace looking for a matching path.
 */
export class PoDefinitionProvider implements vscode.DefinitionProvider {
  async provideDefinition(
    doc: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Definition | undefined> {
    const entries = parsePo(doc.getText());
    for (const entry of entries) {
      for (const ref of entry.references) {
        if (
          ref.docLine === position.line &&
          position.character >= ref.startCol &&
          position.character <= ref.endCol
        ) {
          const target = await resolveReference(doc.uri, ref.file);
          if (target) {
            const line = Math.max(0, ref.line - 1);
            return new vscode.Location(target, new vscode.Position(line, 0));
          }
        }
      }
    }
    return undefined;
  }
}

async function resolveReference(
  poUri: vscode.Uri,
  relFile: string
): Promise<vscode.Uri | undefined> {
  const folder = vscode.workspace.getWorkspaceFolder(poUri);
  const roots: string[] = [];
  if (folder) {
    roots.push(folder.uri.fsPath);
  }
  // Also try directories above the .po file (typical: <addon>/i18n/xx.po).
  let dir = path.dirname(poUri.fsPath);
  for (let i = 0; i < 4; i++) {
    roots.push(dir);
    dir = path.dirname(dir);
  }

  const normalized = relFile.replace(/\\/g, '/');
  for (const root of roots) {
    const candidate = path.join(root, normalized);
    if (fs.existsSync(candidate)) {
      return vscode.Uri.file(candidate);
    }
  }
  return undefined;
}
