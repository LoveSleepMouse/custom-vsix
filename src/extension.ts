import * as vscode from "vscode";
import * as output from "./lib/output";
import createConventionalCommits from "./lib/conventional-commits";
import CommitProvider from "./lib/editor/provider";

export function activate(context: vscode.ExtensionContext) {
  output.initialize();

  let disposable = vscode.commands.registerCommand(
    "extension.tripCommits",
    createConventionalCommits()
  );

  context.subscriptions.push(disposable);
  vscode.workspace.registerFileSystemProvider("commit-message", CommitProvider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
