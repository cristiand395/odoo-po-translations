import * as vscode from 'vscode';
import { computeDiagnostics } from './diagnostics';
import { dropFromCache } from './parseCache';
import { PoCodeActionProvider } from './codeActions';
import { PoDefinitionProvider } from './references';
import { PoStatusBar } from './statusBar';
import { WorkspaceScanner } from './workspaceScanner';
import { WorkspaceStatusBar } from './workspaceStatusBar';
import { PoProblemsTree } from './problemsTree';
import { PoCodeLensProvider } from './codeLens';
import { PoDecorations } from './decorations';

const LANG = 'po';
let collection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext): void {
  collection = vscode.languages.createDiagnosticCollection('odooPo');
  context.subscriptions.push(collection);

  const statusBar = new PoStatusBar();
  const codeLens = new PoCodeLensProvider();
  const decorations = new PoDecorations();
  const scanner = new WorkspaceScanner();
  const workspaceStatusBar = new WorkspaceStatusBar(scanner);
  const problemsTree = new PoProblemsTree(scanner);

  context.subscriptions.push(
    statusBar,
    decorations,
    scanner,
    workspaceStatusBar,
    vscode.window.registerTreeDataProvider('poProblems', problemsTree)
  );

  // Debounced workspace rescan so saving several files doesn't pile up scans.
  let scanTimer: ReturnType<typeof setTimeout> | undefined;
  const scheduleScan = (delay = 800) => {
    if (scanTimer) {
      clearTimeout(scanTimer);
    }
    scanTimer = setTimeout(() => void scanner.scan(), delay);
  };

  const isActive = (doc: vscode.TextDocument) =>
    vscode.window.activeTextEditor?.document === doc;

  const refresh = (doc: vscode.TextDocument) => {
    if (doc.languageId !== LANG) {
      return;
    }
    const diags = computeDiagnostics(doc);
    collection.set(doc.uri, diags);
    if (isActive(doc)) {
      statusBar.update(diags);
      decorations.update(vscode.window.activeTextEditor);
    }
    codeLens.refresh();
  };

  // Reflect the file status bar / decorations for the focused PO editor.
  const syncActiveEditor = () => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === LANG) {
      const diags =
        collection.get(editor.document.uri) ??
        computeDiagnostics(editor.document);
      statusBar.update(diags);
      decorations.update(editor);
    } else {
      statusBar.hide();
    }
  };

  // Lint already-open documents. Diagnostics only ever run on OPEN documents;
  // the full-workspace scan is manual (command / status bar / view button) so
  // it never freezes large Odoo projects with thousands of translations.
  vscode.workspace.textDocuments.forEach(refresh);
  syncActiveEditor();

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(refresh),
    vscode.workspace.onDidChangeTextDocument((e) => refresh(e.document)),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      collection.delete(doc.uri);
      dropFromCache(doc);
    }),
    vscode.window.onDidChangeActiveTextEditor(syncActiveEditor),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.languageId !== LANG) {
        return;
      }
      // Always re-analyze the saved file itself (cheap, single document).
      refresh(doc);
      // The full-workspace scan only re-runs on save if the user opts in, and
      // only after it has been run manually at least once.
      const onSave = vscode.workspace
        .getConfiguration('odooPo')
        .get('scanWorkspaceOnSave', false);
      if (onSave && scanner.hasScanned) {
        scheduleScan();
      }
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('odooPo')) {
        vscode.workspace.textDocuments.forEach(refresh);
        syncActiveEditor();
      }
    })
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(LANG, new PoCodeActionProvider(), {
      providedCodeActionKinds: PoCodeActionProvider.kinds,
    }),
    vscode.languages.registerDefinitionProvider(LANG, new PoDefinitionProvider()),
    vscode.languages.registerCodeLensProvider(LANG, codeLens)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('odooPo.validateFile', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== LANG) {
        vscode.window.showInformationMessage(
          'Abre un archivo .po o .pot para validarlo.'
        );
        return;
      }
      const diags = computeDiagnostics(editor.document);
      collection.set(editor.document.uri, diags);
      const errors = diags.filter(
        (d) => d.severity === vscode.DiagnosticSeverity.Error
      ).length;
      const warnings = diags.length - errors;
      vscode.window.showInformationMessage(
        `PO validado: ${errors} error(es), ${warnings} advertencia(s).`
      );
    }),
    vscode.commands.registerCommand('odooPo.scanWorkspace', () =>
      scanner.scan()
    )
  );
}

export function deactivate(): void {
  collection?.dispose();
}
