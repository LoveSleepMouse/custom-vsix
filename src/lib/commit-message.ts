export class CommitMessage {
  private _scope: string = "";
  private _gitmoji: string = "";
  private _subject: string = "";
  private _body: string = "";
  private _footer: string = "";

  get scope() {
    return this._scope;
  }

  set scope(input: string) {
    this._scope = input.trim();
  }

  get gitmoji() {
    return this._gitmoji;
  }

  set gitmoji(input: string) {
    this._gitmoji = input.trim();
  }

  get subject() {
    return this._subject;
  }

  set subject(input: string) {
    this._subject = input.trim();
  }

  get body() {
    return this._body;
  }

  set body(input: string) {
    this._body = input.trim();
  }

  get footer() {
    return this._footer;
  }

  set footer(input: string) {
    this._footer = input.trim();
  }
}

export function serializeSubject(partialCommitMessage: {
  gitmoji: string;
  subject: string;
}) {
  let result = "";
  const { gitmoji, subject } = partialCommitMessage;
  if (gitmoji) {
    result += `${gitmoji}`;
  }
  if (gitmoji && subject) {
    result += " ";
  }
  if (subject) {
    result += subject;
  }
  return result;
}

export function serializeHeader(partialCommitMessage: {
  scope: string;
  gitmoji: string;
  subject: string;
}) {
  let result = "";
  const { scope, gitmoji, subject } = partialCommitMessage;
  if (gitmoji) {
    result += `${gitmoji}`;
  }
  if (scope) {
    result += `【${scope}】`;
  }
  if (subject) {
    result += subject;
  }

  return result;
}

export function serialize(commitMessage: CommitMessage) {
  let message = serializeHeader(commitMessage);
  const { body, footer } = commitMessage;
  if (body) {
    message += `\n\n${body}`;
  }
  if (footer) {
    message += `\n\n${footer}`;
  }
  return message;
}
